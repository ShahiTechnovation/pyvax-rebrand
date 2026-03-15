"""Tests for wallet security edge cases.

Covers private key validation, malformed inputs, and keystore handling.
"""

import os
import sys
import json
import tempfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from avax_cli.wallet import WalletManager


# ── Key validation tests ──────────────────────────────────────────────


class TestPrivateKeyValidation:
    """Verify private key format validation."""

    def test_valid_hex_key(self):
        wm = WalletManager()
        # 64 hex chars (32 bytes)
        key = "0x" + "ab" * 32
        assert wm.validate_private_key(key) is True

    def test_valid_hex_key_no_prefix(self):
        wm = WalletManager()
        key = "ab" * 32
        assert wm.validate_private_key(key) is True

    def test_invalid_short_key(self):
        wm = WalletManager()
        assert wm.validate_private_key("0x1234") is False

    def test_invalid_empty_key(self):
        wm = WalletManager()
        assert wm.validate_private_key("") is False

    def test_invalid_non_hex_key(self):
        wm = WalletManager()
        assert wm.validate_private_key("0x" + "zz" * 32) is False

    def test_oversized_key_rejected(self):
        """A key longer than 32 bytes should be rejected."""
        wm = WalletManager()
        assert wm.validate_private_key("0x" + "ab" * 33) is False


# ── Keystore tests ────────────────────────────────────────────────────


class TestKeystoreOperations:
    """Verify keystore create/load cycle."""

    def test_create_and_load_wallet(self, tmp_path):
        wm = WalletManager()
        keystore_file = str(tmp_path / "test_keystore.json")
        password = "test_password_123!"

        address = wm.create_wallet(password, keystore_file)
        assert address.startswith("0x")
        assert len(address) == 42

        loaded_address = wm.load_wallet(keystore_file, password)
        assert loaded_address == address

    def test_wrong_password_fails(self, tmp_path):
        wm = WalletManager()
        keystore_file = str(tmp_path / "test_keystore.json")

        wm.create_wallet("correct_password", keystore_file)

        with pytest.raises(ValueError, match="decrypt"):
            wm.load_wallet(keystore_file, "wrong_password")

    def test_corrupted_keystore_fails(self, tmp_path):
        wm = WalletManager()
        keystore_file = str(tmp_path / "bad_keystore.json")

        # Write invalid JSON
        with open(keystore_file, "w") as f:
            json.dump({"version": 3, "encrypted_key": "not_valid", "salt": "bad"}, f)

        with pytest.raises((ValueError, Exception)):
            wm.load_wallet(keystore_file, "any_password")

    def test_missing_keystore_file(self):
        wm = WalletManager()
        with pytest.raises(FileNotFoundError):
            wm.load_wallet("/nonexistent/keystore.json", "password")


# ── Mnemonic wallet tests ─────────────────────────────────────────────


class TestMnemonicWallet:
    """Verify BIP39 mnemonic wallet creation."""

    def test_mnemonic_wallet_creation(self, tmp_path):
        wm = WalletManager()
        keystore_file = str(tmp_path / "mnemonic_keystore.json")

        address, mnemonic = wm.create_wallet_with_mnemonic(
            "password123", keystore_file
        )

        assert address.startswith("0x")
        assert len(address) == 42
        # BIP39 mnemonic should have 12 words
        words = mnemonic.split()
        assert len(words) == 12

    def test_mnemonic_wallet_loadable(self, tmp_path):
        wm = WalletManager()
        keystore_file = str(tmp_path / "mnemonic_keystore.json")

        address, _ = wm.create_wallet_with_mnemonic("password123", keystore_file)
        loaded = wm.load_wallet(keystore_file, "password123")
        assert loaded == address


# ── Environment variable fallback tests ───────────────────────────────


class TestEnvVarFallback:
    """Verify private key resolution from environment."""

    def test_env_var_priority(self, monkeypatch):
        wm = WalletManager()
        # Valid key (from a test-only account, not a real key)
        test_key = "0x" + "ab" * 32

        monkeypatch.setenv("PRIVATE_KEY", test_key)
        result = wm.get_private_key()
        assert result == test_key

    def test_pyvax_env_var_fallback(self, monkeypatch):
        wm = WalletManager()
        test_key = "ab" * 32

        monkeypatch.delenv("PRIVATE_KEY", raising=False)
        monkeypatch.setenv("PYVAX_PRIVATE_KEY", test_key)

        result = wm.get_private_key()
        assert result == f"0x{test_key}"

    def test_no_key_available_raises(self, monkeypatch):
        wm = WalletManager()
        monkeypatch.delenv("PRIVATE_KEY", raising=False)
        monkeypatch.delenv("PYVAX_PRIVATE_KEY", raising=False)

        with pytest.raises(ValueError, match="No private key found"):
            wm.get_private_key()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
