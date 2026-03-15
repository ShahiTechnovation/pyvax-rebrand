"""Tests for wallet policy enforcement and spend tracking."""

from __future__ import annotations

import asyncio
from decimal import Decimal
from pathlib import Path

import pytest

from classified_agent.wallet.base import PolicyViolation, WalletPolicy
from classified_agent.wallet.managed_wallets import MockWalletBackend


# ══════════════════════════════════════════════════════════════════════
# WalletPolicy tests
# ══════════════════════════════════════════════════════════════════════


class TestWalletPolicy:
    def setup_method(self):
        self.policy = WalletPolicy(
            max_native_per_tx=Decimal("0.5"),
            max_native_per_day=Decimal("2.0"),
            allowed_contracts=["0xaaaa", "0xBBBB"],
            allowed_methods=["transfer", "approve"],
        )

    def test_native_send_within_limits(self):
        """Should pass when under per-tx and daily limits."""
        self.policy.check_native_send(
            amount=Decimal("0.3"), daily_total=Decimal("0.5")
        )  # no exception

    def test_native_send_exceeds_per_tx(self):
        """Should reject when a single tx exceeds per-tx limit."""
        with pytest.raises(PolicyViolation, match="per-transaction limit"):
            self.policy.check_native_send(
                amount=Decimal("0.6"), daily_total=Decimal("0.0")
            )

    def test_native_send_exceeds_daily(self):
        """Should reject when daily cap would be exceeded."""
        with pytest.raises(PolicyViolation, match="daily limit"):
            self.policy.check_native_send(
                amount=Decimal("0.4"), daily_total=Decimal("1.8")
            )

    def test_contract_call_allowed(self):
        """Should pass for allowed contract + method."""
        self.policy.check_contract_call("0xaaaa", "transfer")  # no exception

    def test_contract_call_case_insensitive(self):
        """Contract addresses should be compared case-insensitively."""
        self.policy.check_contract_call("0xAAAA", "transfer")  # no exception

    def test_contract_not_allowed(self):
        """Should reject calls to contracts not in the allowlist."""
        with pytest.raises(PolicyViolation, match="not in the allowed list"):
            self.policy.check_contract_call("0xcccc", "transfer")

    def test_method_not_allowed(self):
        """Should reject calls with methods not in the allowlist."""
        with pytest.raises(PolicyViolation, match="not in the allowed list"):
            self.policy.check_contract_call("0xaaaa", "selfDestruct")

    def test_empty_allowlists_permit_all(self):
        """When allowlists are empty, any contract/method should be allowed."""
        policy = WalletPolicy(
            max_native_per_tx=Decimal("1.0"),
            max_native_per_day=Decimal("10.0"),
        )
        policy.check_contract_call("0xanything", "anyMethod")  # no exception


# ══════════════════════════════════════════════════════════════════════
# MockWalletBackend tests
# ══════════════════════════════════════════════════════════════════════


class TestMockWalletBackend:
    @pytest.fixture
    def wallet(self, tmp_path: Path) -> MockWalletBackend:
        policy = WalletPolicy(
            max_native_per_tx=Decimal("1.0"),
            max_native_per_day=Decimal("5.0"),
        )
        return MockWalletBackend(
            policy=policy,
            workspace_dir=tmp_path,
            initial_balance=Decimal("10.0"),
        )

    @pytest.mark.asyncio
    async def test_get_address(self, wallet):
        addr = await wallet.get_address()
        assert addr.startswith("0x")
        assert len(addr) == 42

    @pytest.mark.asyncio
    async def test_get_balance(self, wallet):
        bal = await wallet.get_balance("avalanche_fuji")
        assert bal == Decimal("10.0")

    @pytest.mark.asyncio
    async def test_send_native(self, wallet):
        result = await wallet.send_native(
            to="0x" + "1" * 40,
            amount=Decimal("0.5"),
            chain="avalanche_fuji",
        )
        assert result["status"] == "success"
        assert "tx_hash" in result
        bal = await wallet.get_balance("avalanche_fuji")
        assert bal == Decimal("9.5")

    @pytest.mark.asyncio
    async def test_send_native_policy_violation(self, wallet):
        with pytest.raises(PolicyViolation, match="per-transaction limit"):
            await wallet.send_native(
                to="0x" + "1" * 40,
                amount=Decimal("1.5"),  # exceeds 1.0 per-tx limit
                chain="avalanche_fuji",
            )

    @pytest.mark.asyncio
    async def test_dry_run_no_balance_change(self, wallet):
        result = await wallet.send_native(
            to="0x" + "1" * 40,
            amount=Decimal("0.5"),
            chain="avalanche_fuji",
            dry_run=True,
        )
        assert result["dry_run"] is True
        bal = await wallet.get_balance("avalanche_fuji")
        assert bal == Decimal("10.0")  # unchanged

    @pytest.mark.asyncio
    async def test_operations_recorded(self, wallet):
        await wallet.send_native("0x" + "1" * 40, Decimal("0.1"), "fuji")
        assert len(wallet.operations) == 1
        assert wallet.operations[0]["type"] == "send_native"

    @pytest.mark.asyncio
    async def test_erc20_transfer(self, wallet):
        result = await wallet.erc20_transfer(
            token="0x" + "a" * 40,
            to="0x" + "b" * 40,
            amount=1000,
            chain="avalanche_fuji",
        )
        assert result["status"] == "success"
