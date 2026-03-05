"""AgentWallet management for PyVax v1.0.0 — encrypted keystores for autonomous agents.

Supports:
  - PBKDF2-encrypted keystores (Fernet AES-128)
  - BIP39 mnemonic generation
  - .env / environment variable fallback
  - Private key validation
"""

import json
import os
import secrets
from pathlib import Path
from typing import Optional, Tuple

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from eth_account import Account
from web3 import Web3
import base64


class WalletManager:
    """Manage PyVax AgentWallets with PBKDF2-encrypted keystores."""

    def __init__(self):
        """Initialize the wallet manager."""
        Account.enable_unaudited_hdwallet_features()

    def create_wallet(self, password: str, keystore_file: str = "pyvax_key.json") -> str:
        """
        Generate a new AgentWallet and save the encrypted keystore.

        Args:
            password:      Encryption password
            keystore_file: Output keystore path

        Returns:
            New wallet address (0x...)
        """
        private_key = secrets.token_hex(32)
        account = Account.from_key(private_key)
        self._save_encrypted_key(private_key, password, keystore_file)
        return account.address

    def create_wallet_with_mnemonic(
        self, password: str, keystore_file: str = "pyvax_key.json"
    ) -> Tuple[str, str]:
        """
        Generate a new AgentWallet with BIP39 mnemonic phrase.

        Args:
            password:      Encryption password
            keystore_file: Output keystore path

        Returns:
            Tuple of (address, mnemonic_phrase)
        """
        account, mnemonic = Account.create_with_mnemonic()
        private_key = account.key.hex()
        if private_key.startswith("0x"):
            private_key = private_key[2:]
        self._save_encrypted_key(private_key, password, keystore_file)
        return account.address, mnemonic

    def load_wallet(self, keystore_file: str, password: str) -> str:
        """
        Load a wallet address from an encrypted keystore.

        Returns:
            Wallet address (0x...)
        """
        private_key = self._load_encrypted_key(keystore_file, password)
        return Account.from_key(private_key).address

    def get_private_key(
        self,
        keystore_file: str = None,
        password: str = None,
    ) -> str:
        """
        Resolve the private key from environment variables or keystore.

        Priority:
          1. PRIVATE_KEY env var
          2. PYVAX_PRIVATE_KEY env var
          3. .env file (PRIVATE_KEY=...)
          4. Provided keystore_file + password
          5. Default pyvax_key.json

        Returns:
            Private key as hex string (0x-prefixed)
        """
        # 1. Environment variables
        for env_key_name in ("PRIVATE_KEY", "PYVAX_PRIVATE_KEY"):
            env_key = os.getenv(env_key_name)
            if env_key:
                return env_key if env_key.startswith("0x") else f"0x{env_key}"

        # 2. .env file
        env_key = self._load_from_env_file()
        if env_key:
            return env_key if env_key.startswith("0x") else f"0x{env_key}"

        # 3. Provided keystore
        if keystore_file and password:
            return self._load_encrypted_key(keystore_file, password)

        # 4. Default keystore
        default_keystore = "pyvax_key.json"
        if Path(default_keystore).exists() and password:
            return self._load_encrypted_key(default_keystore, password)

        raise ValueError(
            "No private key found. Set PRIVATE_KEY in your environment or .env file, "
            "or run 'pyvax wallet new <id>' to generate a new AgentWallet."
        )

    def get_address_from_env(self) -> str:
        """Return the wallet address derived from the PRIVATE_KEY env var."""
        private_key = os.getenv("PRIVATE_KEY") or os.getenv("PYVAX_PRIVATE_KEY")
        if not private_key:
            raise ValueError(
                "PRIVATE_KEY or PYVAX_PRIVATE_KEY environment variable not set. "
                "Run 'pyvax wallet new <id>' to create a wallet."
            )
        if not private_key.startswith("0x"):
            private_key = f"0x{private_key}"
        return Account.from_key(private_key).address

    def get_account(self, keystore_file: str = None, password: str = None) -> Account:
        """
        Return a Web3 Account object for signing PyVax transactions.

        Args:
            keystore_file: Optional keystore path
            password:      Optional keystore password

        Returns:
            eth_account.Account instance
        """
        private_key = self.get_private_key(keystore_file, password)
        return Account.from_key(private_key)

    # ─── Internal helpers ───────────────────────────────────────────────────

    def _derive_key(self, password: str, salt: bytes) -> bytes:
        """Derive an AES encryption key from a password using PBKDF2-SHA256."""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100_000,
        )
        return base64.urlsafe_b64encode(kdf.derive(password.encode()))

    def _save_encrypted_key(
        self, private_key: str, password: str, keystore_file: str
    ) -> None:
        """Encrypt and persist a private key to a PyVax keystore JSON file."""
        salt = os.urandom(16)
        key = self._derive_key(password, salt)
        f = Fernet(key)
        encrypted_key = f.encrypt(private_key.encode())

        keystore_data = {
            "version": 3,
            "tool": "pyvax",
            "pyvax_version": "1.0.0",
            "encrypted_key": base64.b64encode(encrypted_key).decode(),
            "salt": base64.b64encode(salt).decode(),
            "kdf": "pbkdf2-sha256",
            "iterations": 100_000,
        }

        with open(keystore_file, "w") as fh:
            json.dump(keystore_data, fh, indent=2)

        try:
            os.chmod(keystore_file, 0o600)
        except OSError:
            pass  # Windows doesn't support Unix permissions

    def _load_encrypted_key(self, keystore_file: str, password: str) -> str:
        """Decrypt and return a private key from a PyVax keystore JSON file."""
        if not Path(keystore_file).exists():
            raise FileNotFoundError(
                f"Keystore '{keystore_file}' not found. "
                f"Run 'pyvax wallet new <id>' to create one."
            )

        try:
            with open(keystore_file) as fh:
                keystore_data = json.load(fh)

            encrypted_key = base64.b64decode(keystore_data["encrypted_key"])
            salt = base64.b64decode(keystore_data["salt"])

            key = self._derive_key(password, salt)
            f = Fernet(key)
            private_key = f.decrypt(encrypted_key).decode()

            if not private_key.startswith("0x"):
                private_key = f"0x{private_key}"

            return private_key

        except Exception as e:
            raise ValueError(
                f"Failed to decrypt keystore '{keystore_file}': {e}\n"
                "Ensure your password is correct."
            )

    def _load_from_env_file(self) -> Optional[str]:
        """Scan .env files for PRIVATE_KEY or PYVAX_PRIVATE_KEY."""
        search_paths = [".env", "../.env", "../../.env"]
        keys_to_find = ("PYVAX_PRIVATE_KEY", "PRIVATE_KEY")

        for env_file in search_paths:
            env_path = Path(env_file)
            if env_path.exists():
                try:
                    with open(env_path, "r") as fh:
                        for line in fh:
                            line = line.strip()
                            if line.startswith("#") or "=" not in line:
                                continue
                            for key_name in keys_to_find:
                                if line.startswith(f"{key_name}="):
                                    value = line.split("=", 1)[1].strip("\"'").strip()
                                    if value:
                                        return value
                except Exception:
                    continue

        return None

    def validate_private_key(self, private_key: str) -> bool:
        """Validate that a private key string is correctly formatted."""
        try:
            if not private_key.startswith("0x"):
                private_key = f"0x{private_key}"
            Account.from_key(private_key)
            return True
        except Exception:
            return False