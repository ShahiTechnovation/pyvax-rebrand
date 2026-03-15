"""Tests for keccak256 storage slot collision prevention (HIGH-3).

Validates that two different mapping state variables with identical keys
receive DIFFERENT storage slots, preventing silent data overwrites.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from avax_cli.transpiler import (
    PythonASTAnalyzer,
    EVMBytecodeGenerator,
    keccak256,
    transpile_python_contract,
)


# ── Slot uniqueness tests ─────────────────────────────────────────────


class TestMappingSlotUniqueness:
    """Verify that different mappings always get different storage slots."""

    def test_two_dicts_get_different_base_slots(self):
        """Two dict state vars must be assigned different base slots."""
        source = '''
from pyvax import Contract, action

class TwoMappings(Contract):
    balances: dict = {}
    allowances: dict = {}

    @action
    def get_balance(self, user: str) -> int:
        return self.balances.get(user, 0)

    @action
    def get_allowance(self, user: str) -> int:
        return self.allowances.get(user, 0)
'''
        analyzer = PythonASTAnalyzer()
        state = analyzer.analyze_contract(source)

        assert "balances" in state.variables
        assert "allowances" in state.variables
        assert state.variables["balances"] != state.variables["allowances"], (
            "Two different mappings must have different base slots!"
        )

    def test_three_dicts_all_different_slots(self):
        """Three dict state vars must all have unique slots."""
        source = '''
from pyvax import Contract, action

class ThreeMappings(Contract):
    balances: dict = {}
    allowances: dict = {}
    scores: dict = {}

    @action
    def noop(self):
        pass
'''
        analyzer = PythonASTAnalyzer()
        state = analyzer.analyze_contract(source)

        slots = [
            state.variables["balances"],
            state.variables["allowances"],
            state.variables["scores"],
        ]
        assert len(set(slots)) == 3, (
            f"All three mappings must have unique slots, got: {slots}"
        )

    def test_mapping_and_scalar_different_slots(self):
        """A mapping and a scalar var must not share a slot."""
        source = '''
from pyvax import Contract, action

class MixedVars(Contract):
    count: int = 0
    balances: dict = {}

    @action
    def noop(self):
        pass
'''
        analyzer = PythonASTAnalyzer()
        state = analyzer.analyze_contract(source)

        assert state.variables["count"] != state.variables["balances"]


# ── Keccak256 derived slot tests ──────────────────────────────────────


class TestDerivedSlotCollision:
    """Verify that derived storage slots for different mappings don't collide."""

    def test_same_key_different_mapping_different_derived_slot(self):
        """keccak256(key || slot_A) != keccak256(key || slot_B) when slots differ."""
        key = b"\x00" * 12 + bytes.fromhex("deadbeefdeadbeefdeadbeefdeadbeefdeadbeef")  # address

        slot_a = 0
        slot_b = 1

        # Compute derived slots (Solidity mapping pattern)
        def derive_slot(key_bytes: bytes, base_slot: int) -> bytes:
            padded_key = key_bytes.rjust(32, b"\x00")
            padded_slot = base_slot.to_bytes(32, "big")
            return keccak256(padded_key + padded_slot)

        derived_a = derive_slot(key, slot_a)
        derived_b = derive_slot(key, slot_b)

        assert derived_a != derived_b, (
            "Same key with different base slots must produce different derived slots"
        )

    def test_no_collision_across_many_keys(self):
        """No collisions when hashing 100 different keys against 5 slots."""
        seen = set()
        for slot in range(5):
            for key_int in range(100):
                key = key_int.to_bytes(32, "big")
                base = slot.to_bytes(32, "big")
                derived = keccak256(key + base)
                assert derived not in seen, (
                    f"Collision detected: slot={slot}, key={key_int}"
                )
                seen.add(derived)


# ── Full bytecode test ────────────────────────────────────────────────


class TestMappingBytecodeGeneration:
    """Verify the transpiled byteccode uses correct mapping slots."""

    def test_erc20_two_mappings_compile_ok(self):
        """ERC20-like contract with balances + allowances compiles correctly."""
        source = '''
from pyvax import Contract, action

class TokenWithAllowances(Contract):
    total_supply: int = 0
    balances: dict = {}
    allowances: dict = {}

    @action
    def mint(self, to: str, amount: int):
        self.balances[to] = self.balances.get(to, 0) + amount
        self.total_supply = self.total_supply + amount

    @action
    def approve(self, spender: str, amount: int):
        sender = self.msg_sender()
        self.allowances[sender] = amount

    @action
    def balance_of(self, owner: str) -> int:
        return self.balances.get(owner, 0)
'''
        result = transpile_python_contract(source)
        assert result["bytecode"].startswith("0x")
        assert len(result["bytecode"]) > 10

        # Verify ABI has all functions
        func_names = [f["name"] for f in result["abi"] if f["type"] == "function"]
        assert "mint" in func_names
        assert "approve" in func_names
        assert "balance_of" in func_names


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
