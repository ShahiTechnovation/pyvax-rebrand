"""WalletBackend abstraction and policy enforcement.

All on-chain operations must go through a :class:`WalletBackend`
subclass.  The backend checks :class:`WalletPolicy` constraints
**before** signing or broadcasting anything.
"""

from __future__ import annotations

import json
import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from pathlib import Path
from typing import Any

logger = logging.getLogger("classified")


# ──────────────────────────────────────────────────────────────────────
# Exceptions
# ──────────────────────────────────────────────────────────────────────


class PolicyViolation(Exception):
    """Raised when a wallet operation violates the configured policy."""


# ──────────────────────────────────────────────────────────────────────
# Policy
# ──────────────────────────────────────────────────────────────────────


@dataclass
class WalletPolicy:
    """Safety guardrails for on-chain operations.

    Every method either returns silently (pass) or raises
    :class:`PolicyViolation`.
    """

    max_native_per_tx: Decimal
    max_native_per_day: Decimal
    allowed_contracts: list[str] = field(default_factory=list)
    allowed_methods: list[str] = field(default_factory=list)

    def check_native_send(self, amount: Decimal, daily_total: Decimal) -> None:
        """Check that a native-token send is within limits.

        Args:
            amount:      Amount for **this** transaction.
            daily_total: Total already spent in the current 24-hour window.

        Raises:
            PolicyViolation: If either per-tx or per-day limit is breached.
        """
        if amount > self.max_native_per_tx:
            raise PolicyViolation(
                f"Amount {amount} exceeds per-transaction limit "
                f"({self.max_native_per_tx})."
            )
        if (daily_total + amount) > self.max_native_per_day:
            raise PolicyViolation(
                f"Amount {amount} would push daily total to "
                f"{daily_total + amount}, exceeding the daily limit "
                f"({self.max_native_per_day})."
            )

    def check_contract_call(self, address: str, method: str) -> None:
        """Check that a contract call targets an allowed address/method.

        Args:
            address: Target contract address.
            method:  Method name or 4-byte selector.

        Raises:
            PolicyViolation: If the address or method is not allowed.
        """
        if self.allowed_contracts and address.lower() not in {
            a.lower() for a in self.allowed_contracts
        }:
            raise PolicyViolation(
                f"Contract {address} is not in the allowed list: "
                f"{self.allowed_contracts}"
            )
        if self.allowed_methods and method not in self.allowed_methods:
            raise PolicyViolation(
                f"Method '{method}' is not in the allowed list: "
                f"{self.allowed_methods}"
            )


# ──────────────────────────────────────────────────────────────────────
# Daily-spend tracker
# ──────────────────────────────────────────────────────────────────────


class _SpendTracker:
    """Track daily native-token spend in a local JSON file.

    Resets automatically when the date changes.
    """

    def __init__(self, path: Path) -> None:
        self._path = path
        self._today: str = ""
        self._total: Decimal = Decimal("0")
        self._load()

    def get_daily_total(self) -> Decimal:
        today = time.strftime("%Y-%m-%d")
        if today != self._today:
            self._today = today
            self._total = Decimal("0")
            self._save()
        return self._total

    def record_spend(self, amount: Decimal) -> None:
        self.get_daily_total()  # ensure date is current
        self._total += amount
        self._save()

    def _load(self) -> None:
        if self._path.exists():
            try:
                data = json.loads(self._path.read_text(encoding="utf-8"))
                self._today = data.get("date", "")
                self._total = Decimal(str(data.get("total", "0")))
            except (json.JSONDecodeError, Exception):
                pass

    def _save(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(
            json.dumps({"date": self._today, "total": str(self._total)}),
            encoding="utf-8",
        )


# ──────────────────────────────────────────────────────────────────────
# Abstract backend
# ──────────────────────────────────────────────────────────────────────


class WalletBackend(ABC):
    """Abstract base for wallet implementations.

    Subclasses must implement the low-level operations.  Policy
    enforcement is handled by the base class methods (``send_native``,
    etc.) which call ``_do_*`` methods after validation.
    """

    def __init__(self, policy: WalletPolicy, workspace_dir: Path) -> None:
        self.policy = policy
        self._spend_tracker = _SpendTracker(
            Path(workspace_dir).resolve() / ".wallet_spend.json"
        )

    # ── Public (policy-enforcing) API ─────────────────────────────

    @abstractmethod
    async def get_address(self) -> str:
        """Return the wallet's public address."""

    @abstractmethod
    async def get_balance(self, chain: str) -> Decimal:
        """Return native-token balance on *chain*."""

    async def send_native(
        self, to: str, amount: Decimal, chain: str, *, dry_run: bool = False
    ) -> dict[str, Any]:
        """Send native tokens, enforcing policy first.

        Returns:
            Dict with tx_hash, amount, etc.
        """
        daily = self._spend_tracker.get_daily_total()
        self.policy.check_native_send(amount, daily)

        if dry_run:
            logger.info("DRY RUN: would send %s native to %s on %s", amount, to, chain)
            return {"tx_hash": "0x_dry_run", "amount": str(amount), "to": to, "dry_run": True}

        result = await self._do_send_native(to, amount, chain)
        self._spend_tracker.record_spend(amount)
        return result

    async def erc20_transfer(
        self, token: str, to: str, amount: int, chain: str, *, dry_run: bool = False
    ) -> dict[str, Any]:
        """Transfer ERC-20 tokens, checking contract allowlist."""
        self.policy.check_contract_call(token, "transfer")

        if dry_run:
            logger.info("DRY RUN: would transfer %d of %s to %s", amount, token, to)
            return {"tx_hash": "0x_dry_run", "token": token, "dry_run": True}

        return await self._do_erc20_transfer(token, to, amount, chain)

    async def erc20_approve(
        self, token: str, spender: str, amount: int, chain: str, *, dry_run: bool = False
    ) -> dict[str, Any]:
        """Approve ERC-20 allowance, checking contract allowlist."""
        self.policy.check_contract_call(token, "approve")

        if dry_run:
            logger.info("DRY RUN: would approve %d of %s for %s", amount, token, spender)
            return {"tx_hash": "0x_dry_run", "token": token, "dry_run": True}

        return await self._do_erc20_approve(token, spender, amount, chain)

    async def call_contract(
        self,
        address: str,
        abi: list[dict],
        function: str,
        args: list[Any],
        chain: str,
        *,
        write: bool = False,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        """Call a contract function (read or write)."""
        if write:
            self.policy.check_contract_call(address, function)

            if dry_run:
                logger.info("DRY RUN: would call %s.%s(%s)", address, function, args)
                return {"result": "dry_run", "function": function, "dry_run": True}

        return await self._do_call_contract(address, abi, function, args, chain, write=write)

    # ── Abstract (implementation-specific) ────────────────────────

    @abstractmethod
    async def _do_send_native(self, to: str, amount: Decimal, chain: str) -> dict[str, Any]: ...

    @abstractmethod
    async def _do_erc20_transfer(
        self, token: str, to: str, amount: int, chain: str
    ) -> dict[str, Any]: ...

    @abstractmethod
    async def _do_erc20_approve(
        self, token: str, spender: str, amount: int, chain: str
    ) -> dict[str, Any]: ...

    @abstractmethod
    async def _do_call_contract(
        self,
        address: str,
        abi: list[dict],
        function: str,
        args: list[Any],
        chain: str,
        *,
        write: bool = False,
    ) -> dict[str, Any]: ...
