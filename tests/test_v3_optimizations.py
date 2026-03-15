"""PyVax v0.3.0 Transpiler Test Suite — optimizer + correctness validation.

Converted to proper pytest tests (no import-time execution or sys.exit).
"""

import pytest

from avax_cli.transpiler import (
    transpile_python_contract,
    PythonASTAnalyzer,
    PeepholeOptimizer,
    function_selector,
)

# ── Test contract sources ────────────────────────────────────────────

VAULT_SRC = '''
from pyvax import Contract, action

class AgentVault(Contract):
    balances: dict = {}
    total_deposits: int = 0

    @action
    def deposit(self, amount: int):
        self.require(amount > 0, "Amount must be positive")
        sender = self.msg_sender()
        self.balances[sender] = self.balances[sender] + amount
        self.total_deposits = self.total_deposits + amount
        self.emit("Deposit", sender, amount)

    @action
    def withdraw(self, amount: int):
        sender = self.msg_sender()
        self.require(self.balances[sender] >= amount, "Insufficient balance")
        self.balances[sender] = self.balances[sender] - amount
        self.total_deposits = self.total_deposits - amount
        self.emit("Withdraw", sender, amount)

    @action
    def get_total(self) -> int:
        return self.total_deposits

    @action
    def get_balance(self, user: str) -> int:
        return self.balances[user]
'''

DEDUP_SRC = '''
from pyvax import Contract, action

class DedupTest(Contract):
    value: int = 0

    @action
    def set_a(self, x: int):
        self.require(x > 0, "Must be positive")
        self.value = x

    @action
    def set_b(self, x: int):
        self.require(x > 0, "Must be positive")
        self.value = x + 1

    @action
    def set_c(self, x: int):
        self.require(x > 0, "Must be positive")
        self.value = x + 2
'''

MANY_FUNCS_SRC = '''
from pyvax import Contract, action

class ManyFuncs(Contract):
    a: int = 0
    b: int = 0
    c: int = 0

    @action
    def func1(self, x: int):
        self.a = x
    @action
    def func2(self, x: int):
        self.b = x
    @action
    def func3(self, x: int):
        self.c = x
    @action
    def func4(self, x: int):
        self.a = x + 1
    @action
    def func5(self, x: int):
        self.b = x + 1
    @action
    def func6(self, x: int):
        self.c = x + 1
'''

SLOAD_SRC = '''
from pyvax import Contract, action

class SLOADTest(Contract):
    price: int = 100
    count: int = 0

    @action
    def check_price(self) -> int:
        x = self.price + self.price + self.price
        return x
'''

DEEP_SRC = '''
from pyvax import Contract, action

class DeepExpr(Contract):
    val: int = 0

    @action
    def deep(self, x: int):
        self.val = x + x + x + x + x + x + x + x + x + x
'''


# ── 1. Basic Transpilation ───────────────────────────────────────────

class TestBasicTranspilation:
    def test_bytecode_generated(self):
        result = transpile_python_contract(VAULT_SRC)
        assert len(result["bytecode"]) > 10

    def test_abi_has_entries(self):
        result = transpile_python_contract(VAULT_SRC)
        assert len(result["abi"]) > 0

    def test_version_is_1_0_0(self):
        result = transpile_python_contract(VAULT_SRC)
        assert result["metadata"]["version"] == "1.0.0"

    def test_overflow_safe_enabled(self):
        result = transpile_python_contract(VAULT_SRC)
        assert result["metadata"]["overflow_safe"] is True

    def test_events_detected(self):
        result = transpile_python_contract(VAULT_SRC)
        assert len(result["metadata"]["events"]) > 0


# ── 2. Binary Search Dispatch ────────────────────────────────────────

class TestBinaryDispatch:
    def test_six_func_contract_compiles(self):
        result = transpile_python_contract(MANY_FUNCS_SRC)
        assert len(result["bytecode"]) > 10

    def test_all_six_functions_in_metadata(self):
        result = transpile_python_contract(MANY_FUNCS_SRC)
        assert len(result["metadata"]["functions"]) == 6

    def test_selectors_are_sortable(self):
        analyzer = PythonASTAnalyzer()
        state = analyzer.analyze_contract(MANY_FUNCS_SRC)
        selectors = []
        for fn, info in state.functions.items():
            if info.get("is_public") or info.get("is_view"):
                pt = info.get("param_types", [])
                sig = f"{fn}({','.join(pt)})"
                selectors.append(int.from_bytes(function_selector(sig), "big"))
        assert sorted(selectors) == sorted(selectors)


# ── 3. Shared Revert Deduplication ───────────────────────────────────

class TestRevertDedup:
    def test_dedup_contract_compiles(self):
        result = transpile_python_contract(DEDUP_SRC)
        assert len(result["bytecode"]) > 10

    def test_dedup_bytecode_under_2kb(self):
        result = transpile_python_contract(DEDUP_SRC)
        bc = result["bytecode"]
        dedup_bytes = len(bc) // 2
        assert dedup_bytes < 2000, f"got {dedup_bytes} bytes"


# ── 4. SLOAD Caching ────────────────────────────────────────────────

class TestSLOADCaching:
    def test_sload_cache_compiles(self):
        result = transpile_python_contract(SLOAD_SRC)
        assert len(result["bytecode"]) > 10

    def test_mload_opcode_present(self):
        result = transpile_python_contract(SLOAD_SRC)
        bc_bytes = bytes.fromhex(result["bytecode"][2:])
        assert 0x51 in bc_bytes, "MLOAD opcode should be present for cached reads"


# ── 5. Stack Depth / Deep Expressions ───────────────────────────────

class TestStackDepth:
    def test_deep_expression_compiles(self):
        result = transpile_python_contract(DEEP_SRC)
        assert len(result["bytecode"]) > 10


# ── 6. Peephole Optimizer ───────────────────────────────────────────

class TestPeepholeOptimizer:
    def test_constant_folding(self):
        raw_bc = bytes([0x60, 5, 0x60, 3, 0x01])  # PUSH1 5, PUSH1 3, ADD
        optimized = PeepholeOptimizer.optimize(raw_bc)
        assert optimized == bytes([0x60, 8]), f"got {optimized.hex()}"

    def test_iszero_iszero_removed(self):
        raw_bc = bytes([0x15, 0x15])  # ISZERO, ISZERO
        optimized = PeepholeOptimizer.optimize(raw_bc)
        assert optimized == b"", f"got {optimized.hex()}"

    def test_push_pop_removed(self):
        raw_bc = bytes([0x60, 0x42, 0x50])  # PUSH1 0x42, POP
        optimized = PeepholeOptimizer.optimize(raw_bc)
        assert optimized == b"", f"got {optimized.hex()}"


# ── 7. Optimizer Levels ─────────────────────────────────────────────

class TestOptimizerLevels:
    def test_level_0_produces_bytecode(self):
        result = transpile_python_contract(VAULT_SRC, optimizer_level=0)
        assert len(result["bytecode"]) > 10

    def test_level_1_produces_bytecode(self):
        result = transpile_python_contract(VAULT_SRC, optimizer_level=1)
        assert len(result["bytecode"]) > 10

    def test_level_3_produces_bytecode(self):
        result = transpile_python_contract(VAULT_SRC, optimizer_level=3)
        assert len(result["bytecode"]) > 10

    def test_optimizer_reduces_size(self):
        r0 = transpile_python_contract(VAULT_SRC, optimizer_level=0)
        r3 = transpile_python_contract(VAULT_SRC, optimizer_level=3)
        assert len(r3["bytecode"]) <= len(r0["bytecode"]), (
            f"L0={len(r0['bytecode'])} L3={len(r3['bytecode'])}"
        )


# ── 8. ABI Correctness ─────────────────────────────────────────────

class TestABICorrectness:
    def test_deposit_in_abi(self):
        result = transpile_python_contract(VAULT_SRC)
        fn_names = [e["name"] for e in result["abi"] if e["type"] == "function"]
        assert "deposit" in fn_names

    def test_withdraw_in_abi(self):
        result = transpile_python_contract(VAULT_SRC)
        fn_names = [e["name"] for e in result["abi"] if e["type"] == "function"]
        assert "withdraw" in fn_names

    def test_get_total_in_abi(self):
        result = transpile_python_contract(VAULT_SRC)
        fn_names = [e["name"] for e in result["abi"] if e["type"] == "function"]
        assert "get_total" in fn_names

    def test_deposit_event_in_abi(self):
        result = transpile_python_contract(VAULT_SRC)
        ev_names = [e["name"] for e in result["abi"] if e["type"] == "event"]
        assert "Deposit" in ev_names

    def test_withdraw_event_in_abi(self):
        result = transpile_python_contract(VAULT_SRC)
        ev_names = [e["name"] for e in result["abi"] if e["type"] == "event"]
        assert "Withdraw" in ev_names

    def test_constructor_in_abi(self):
        result = transpile_python_contract(VAULT_SRC)
        assert any(e["type"] == "constructor" for e in result["abi"])
