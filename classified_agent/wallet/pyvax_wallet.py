"""PyVax local-keystore wallet backend.

Wraps the existing ``avax_cli.wallet.WalletManager``, ``avax_cli.deployer``,
and ``avax_cli.interactor`` modules to provide on-chain capabilities
through the :class:`WalletBackend` interface.
"""

from __future__ import annotations

import logging
from decimal import Decimal
from pathlib import Path
from typing import Any

from classified_agent.wallet.base import WalletBackend, WalletPolicy

logger = logging.getLogger("classified")

# Chain-name → network config mapping
_CHAIN_CONFIGS: dict[str, dict[str, Any]] = {
    "avalanche_fuji": {
        "network": "fuji",
        "rpc_url": "https://api.avax-test.network/ext/bc/C/rpc",
        "chain_id": 43113,
    },
    "avalanche_mainnet": {
        "network": "cchain",
        "rpc_url": "https://api.avax.network/ext/bc/C/rpc",
        "chain_id": 43114,
    },
}


class PyVaxWalletBackend(WalletBackend):
    """Wallet backend using PyVax's existing WalletManager + deployer.

    This implementation wraps ``avax_cli.wallet.WalletManager`` for key
    management and ``avax_cli.deployer.get_web3_connection`` for RPC.

    For now only Avalanche Fuji/mainnet is supported; the interface is
    designed so Ethereum chains can be added later by extending
    ``_CHAIN_CONFIGS``.
    """

    def __init__(
        self,
        policy: WalletPolicy,
        workspace_dir: Path,
        rpc_url: str | None = None,
        default_chain: str = "avalanche_fuji",
    ) -> None:
        super().__init__(policy, workspace_dir)
        self._rpc_url = rpc_url
        self._default_chain = default_chain
        self._wallet_manager = None  # lazy-loaded
        self._w3 = None  # lazy-loaded

    # ── Lazy initialisation ───────────────────────────────────────

    def _get_wallet_manager(self) -> Any:
        """Lazy-load avax_cli.wallet.WalletManager."""
        if self._wallet_manager is None:
            try:
                from avax_cli.wallet import WalletManager
                self._wallet_manager = WalletManager()
            except ImportError:
                raise ImportError(
                    "PyVax CLI (avax_cli) is required for the 'pyvax_local' wallet backend. "
                    "Ensure you're running inside the PyVax monorepo."
                )
        return self._wallet_manager

    def _get_web3(self, chain: str | None = None) -> Any:
        """Get a Web3 connection (cached)."""
        try:
            from avax_cli.deployer import get_web3_connection
        except ImportError:
            raise ImportError(
                "avax_cli.deployer is required for the 'pyvax_local' wallet backend."
            )

        config = self._build_chain_config(chain or self._default_chain)
        return get_web3_connection(config)

    def _build_chain_config(self, chain: str) -> dict[str, Any]:
        """Build a config dict compatible with avax_cli.deployer."""
        if chain in _CHAIN_CONFIGS:
            cfg = dict(_CHAIN_CONFIGS[chain])
        else:
            # Fall back to the configured RPC URL with unknown chain
            cfg = {
                "network": chain,
                "rpc_url": self._rpc_url or "https://api.avax-test.network/ext/bc/C/rpc",
                "chain_id": 43113,
            }

        # Allow RPC override from config
        if self._rpc_url:
            cfg["rpc_url"] = self._rpc_url

        return cfg

    # ── Public interface ──────────────────────────────────────────

    async def get_address(self) -> str:
        """Return the wallet address from the environment or keystore."""
        wm = self._get_wallet_manager()
        try:
            return wm.get_address_from_env()
        except ValueError:
            # TODO: Support keystore-based address resolution
            #       when keystore_file + password are provided via config.
            raise ValueError(
                "No wallet address available. Set PRIVATE_KEY or PYVAX_PRIVATE_KEY "
                "in your environment, or configure a keystore."
            )

    async def get_balance(self, chain: str) -> Decimal:
        """Return native token balance on the given chain."""
        w3 = self._get_web3(chain)
        address = await self.get_address()
        balance_wei = w3.eth.get_balance(address)
        return Decimal(str(w3.from_wei(balance_wei, "ether")))

    # ── Security helpers ────────────────────────────────────────────

    _MAX_GAS_LIMIT: int = 500_000  # Configurable max gas per tx

    def _validate_gas_limit(self, gas: int) -> None:
        """Ensure gas limit is within safe bounds."""
        if gas > self._MAX_GAS_LIMIT:
            raise ValueError(
                f"Gas limit {gas:,} exceeds maximum allowed ({self._MAX_GAS_LIMIT:,}). "
                f"Increase _MAX_GAS_LIMIT if this is intentional."
            )

    def _check_nonce_gap(self, w3: "Any", address: str) -> int:
        """Check for nonce gaps and return the correct nonce.

        Warns if pending nonce differs from latest confirmed nonce,
        which can indicate stuck transactions.
        """
        pending_nonce = w3.eth.get_transaction_count(address, "pending")
        latest_nonce = w3.eth.get_transaction_count(address, "latest")

        if pending_nonce != latest_nonce:
            logger.warning(
                "Nonce gap detected for %s: pending=%d, latest=%d. "
                "%d transaction(s) may be stuck.",
                address, pending_nonce, latest_nonce,
                pending_nonce - latest_nonce,
            )
        return pending_nonce

    def _simulate_tx(self, w3: "Any", tx: dict) -> None:
        """Simulate a transaction via eth_call to catch reverts early.

        Raises:
            RuntimeError: If the simulation indicates the tx would revert.
        """
        try:
            w3.eth.call(tx)
            logger.debug("Tx simulation passed for %s", tx.get("to", "deploy"))
        except Exception as exc:
            raise RuntimeError(
                f"Transaction simulation failed (would revert on-chain): {exc}"
            ) from exc

    # ── Internal implementations ──────────────────────────────────

    async def _do_send_native(self, to: str, amount: Decimal, chain: str) -> dict[str, Any]:
        """Send native tokens (AVAX) with pre-flight simulation and safety checks."""
        w3 = self._get_web3(chain)
        wm = self._get_wallet_manager()
        account = wm.get_account()

        config = self._build_chain_config(chain)
        nonce = self._check_nonce_gap(w3, account.address)
        value_wei = w3.to_wei(float(amount), "ether")

        # Use EIP-1559 gas pricing from PyVax deployer
        try:
            from avax_cli.deployer import _build_eip1559_gas_params
            gas_info = _build_eip1559_gas_params(w3)
        except ImportError:
            gas_info = {"params": {"gasPrice": w3.eth.gas_price}, "effective_price": w3.eth.gas_price}

        gas_limit = 21_000
        self._validate_gas_limit(gas_limit)

        tx = {
            "from": account.address,
            "to": w3.to_checksum_address(to),
            "value": value_wei,
            "gas": gas_limit,
            "nonce": nonce,
            "chainId": config["chain_id"],
            **gas_info["params"],
        }

        # Simulate before signing
        self._simulate_tx(w3, tx)

        logger.info("Sending %s native to %s on %s", amount, to, chain)
        signed = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

        return {
            "tx_hash": tx_hash.hex(),
            "amount": str(amount),
            "to": to,
            "gas_used": receipt.gasUsed,
            "status": "success" if receipt.status == 1 else "reverted",
        }

    async def _do_erc20_transfer(
        self, token: str, to: str, amount: int, chain: str
    ) -> dict[str, Any]:
        """Transfer ERC-20 tokens with pre-flight simulation."""
        w3 = self._get_web3(chain)
        wm = self._get_wallet_manager()
        account = wm.get_account()
        config = self._build_chain_config(chain)

        # Minimal ERC-20 transfer ABI
        erc20_abi = [
            {
                "constant": False,
                "inputs": [
                    {"name": "_to", "type": "address"},
                    {"name": "_value", "type": "uint256"},
                ],
                "name": "transfer",
                "outputs": [{"name": "", "type": "bool"}],
                "type": "function",
            }
        ]

        contract = w3.eth.contract(address=w3.to_checksum_address(token), abi=erc20_abi)
        nonce = self._check_nonce_gap(w3, account.address)
        gas_limit = 100_000
        self._validate_gas_limit(gas_limit)

        tx = contract.functions.transfer(
            w3.to_checksum_address(to), amount
        ).build_transaction({
            "from": account.address,
            "nonce": nonce,
            "gas": gas_limit,
            "chainId": config["chain_id"],
        })

        # Simulate before signing
        self._simulate_tx(w3, tx)

        logger.info("ERC-20 transfer: %d of %s to %s", amount, token, to)
        signed = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

        return {
            "tx_hash": tx_hash.hex(),
            "token": token,
            "to": to,
            "amount": amount,
            "status": "success" if receipt.status == 1 else "reverted",
        }

    async def _do_erc20_approve(
        self, token: str, spender: str, amount: int, chain: str
    ) -> dict[str, Any]:
        """Approve ERC-20 allowance with pre-flight simulation."""
        w3 = self._get_web3(chain)
        wm = self._get_wallet_manager()
        account = wm.get_account()
        config = self._build_chain_config(chain)

        erc20_abi = [
            {
                "constant": False,
                "inputs": [
                    {"name": "_spender", "type": "address"},
                    {"name": "_value", "type": "uint256"},
                ],
                "name": "approve",
                "outputs": [{"name": "", "type": "bool"}],
                "type": "function",
            }
        ]

        contract = w3.eth.contract(address=w3.to_checksum_address(token), abi=erc20_abi)
        nonce = self._check_nonce_gap(w3, account.address)
        gas_limit = 100_000
        self._validate_gas_limit(gas_limit)

        tx = contract.functions.approve(
            w3.to_checksum_address(spender), amount
        ).build_transaction({
            "from": account.address,
            "nonce": nonce,
            "gas": gas_limit,
            "chainId": config["chain_id"],
        })

        # Simulate before signing
        self._simulate_tx(w3, tx)

        logger.info("ERC-20 approve: %d of %s for spender %s", amount, token, spender)
        signed = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

        return {
            "tx_hash": tx_hash.hex(),
            "token": token,
            "spender": spender,
            "amount": amount,
            "status": "success" if receipt.status == 1 else "reverted",
        }

    async def _do_call_contract(
        self,
        address: str,
        abi: list[dict],
        function: str,
        args: list[Any],
        chain: str,
        *,
        write: bool = False,
    ) -> dict[str, Any]:
        """Call a contract function using Web3 with pre-flight simulation."""
        w3 = self._get_web3(chain)
        contract = w3.eth.contract(address=w3.to_checksum_address(address), abi=abi)

        fn = getattr(contract.functions, function)

        if not write:
            # Read-only call
            result = fn(*args).call()
            return {"result": result, "function": function, "type": "read"}

        # Write call
        wm = self._get_wallet_manager()
        account = wm.get_account()
        config = self._build_chain_config(chain)
        nonce = self._check_nonce_gap(w3, account.address)
        gas_limit = 200_000
        self._validate_gas_limit(gas_limit)

        tx = fn(*args).build_transaction({
            "from": account.address,
            "nonce": nonce,
            "gas": gas_limit,
            "chainId": config["chain_id"],
        })

        # Simulate before signing
        self._simulate_tx(w3, tx)

        signed = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

        return {
            "tx_hash": tx_hash.hex(),
            "function": function,
            "gas_used": receipt.gasUsed,
            "status": "success" if receipt.status == 1 else "reverted",
            "type": "write",
        }
