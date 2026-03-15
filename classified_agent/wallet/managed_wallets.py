"""Stub wallet backends for third-party managed wallet services.

These are interface-only stubs that raise ``NotImplementedError``.
They exist so the config system can reference them, and so that
future contributors know exactly what to implement.
"""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path
from typing import Any

from classified_agent.wallet.base import WalletBackend, WalletPolicy


class MockWalletBackend(WalletBackend):
    """In-memory mock wallet for testing and dry-run scenarios.

    Tracks a simulated balance and records all operations in a list.
    No real blockchain interaction occurs.
    """

    def __init__(
        self,
        policy: WalletPolicy,
        workspace_dir: Path,
        *,
        initial_balance: Decimal = Decimal("10.0"),
        address: str = "0x" + "0" * 40,
    ) -> None:
        super().__init__(policy, workspace_dir)
        self._address = address
        self._balance = initial_balance
        self.operations: list[dict[str, Any]] = []

    async def get_address(self) -> str:
        return self._address

    async def get_balance(self, chain: str) -> Decimal:
        return self._balance

    async def _do_send_native(self, to: str, amount: Decimal, chain: str) -> dict[str, Any]:
        self._balance -= amount
        op = {"type": "send_native", "to": to, "amount": str(amount), "chain": chain}
        self.operations.append(op)
        return {**op, "tx_hash": f"0xmock_{len(self.operations):04d}", "status": "success"}

    async def _do_erc20_transfer(
        self, token: str, to: str, amount: int, chain: str
    ) -> dict[str, Any]:
        op = {"type": "erc20_transfer", "token": token, "to": to, "amount": amount}
        self.operations.append(op)
        return {**op, "tx_hash": f"0xmock_{len(self.operations):04d}", "status": "success"}

    async def _do_erc20_approve(
        self, token: str, spender: str, amount: int, chain: str
    ) -> dict[str, Any]:
        op = {"type": "erc20_approve", "token": token, "spender": spender, "amount": amount}
        self.operations.append(op)
        return {**op, "tx_hash": f"0xmock_{len(self.operations):04d}", "status": "success"}

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
        op = {"type": "call_contract", "address": address, "function": function, "args": args}
        self.operations.append(op)
        return {**op, "result": "mock_result", "status": "success"}


class VincentWalletBackend(WalletBackend):
    """Stub for Vincent / AgentWallet Protocol managed wallets.

    See: https://github.com/AgentwWallet/vincent

    Not yet implemented — raises :class:`NotImplementedError` on all operations.
    """

    async def get_address(self) -> str:
        raise NotImplementedError("Vincent wallet backend is not yet implemented.")

    async def get_balance(self, chain: str) -> Decimal:
        raise NotImplementedError("Vincent wallet backend is not yet implemented.")

    async def _do_send_native(self, to: str, amount: Decimal, chain: str) -> dict[str, Any]:
        raise NotImplementedError("Vincent wallet backend is not yet implemented.")

    async def _do_erc20_transfer(
        self, token: str, to: str, amount: int, chain: str
    ) -> dict[str, Any]:
        raise NotImplementedError("Vincent wallet backend is not yet implemented.")

    async def _do_erc20_approve(
        self, token: str, spender: str, amount: int, chain: str
    ) -> dict[str, Any]:
        raise NotImplementedError("Vincent wallet backend is not yet implemented.")

    async def _do_call_contract(
        self, address: str, abi: list[dict], function: str, args: list[Any],
        chain: str, *, write: bool = False,
    ) -> dict[str, Any]:
        raise NotImplementedError("Vincent wallet backend is not yet implemented.")


class SequenceWalletBackend(WalletBackend):
    """Stub for Sequence managed wallets.

    See: https://sequence.xyz

    Not yet implemented — raises :class:`NotImplementedError` on all operations.
    """

    async def get_address(self) -> str:
        raise NotImplementedError("Sequence wallet backend is not yet implemented.")

    async def get_balance(self, chain: str) -> Decimal:
        raise NotImplementedError("Sequence wallet backend is not yet implemented.")

    async def _do_send_native(self, to: str, amount: Decimal, chain: str) -> dict[str, Any]:
        raise NotImplementedError("Sequence wallet backend is not yet implemented.")

    async def _do_erc20_transfer(
        self, token: str, to: str, amount: int, chain: str
    ) -> dict[str, Any]:
        raise NotImplementedError("Sequence wallet backend is not yet implemented.")

    async def _do_erc20_approve(
        self, token: str, spender: str, amount: int, chain: str
    ) -> dict[str, Any]:
        raise NotImplementedError("Sequence wallet backend is not yet implemented.")

    async def _do_call_contract(
        self, address: str, abi: list[dict], function: str, args: list[Any],
        chain: str, *, write: bool = False,
    ) -> dict[str, Any]:
        raise NotImplementedError("Sequence wallet backend is not yet implemented.")
