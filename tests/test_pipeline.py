"""End-to-end pipeline tests for PyVax CLI v1.0.0.

Tests the full workflow: new → compile → transpile with optimizer levels.
Network-dependent tests (deploy/call) are skipped without RPC connectivity.
"""

import json
import os
import sys
import shutil
import tempfile
from pathlib import Path

import pytest

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from avax_cli.transpiler import transpile_python_contract, PeepholeOptimizer
from avax_cli.compiler import compile_contracts
from avax_cli.py_contracts import (
    Contract, action, agent_action, human_action,
    SimpleStorage, Counter, AgentVault, ERC20, Voting,
)


# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def tmp_project(tmp_path):
    """Create a temporary PyVax project structure."""
    contracts_dir = tmp_path / "contracts"
    contracts_dir.mkdir()
    build_dir = tmp_path / "build"
    build_dir.mkdir()
    return tmp_path, contracts_dir, build_dir


@pytest.fixture
def simple_storage_source():
    """SimpleStorage contract source."""
    return '''
from pyvax import Contract, action

class SimpleStorage(Contract):
    stored_data: int = 0

    @action
    def set(self, value: int):
        self.stored_data = value
        self.emit("DataStored", value)

    @action
    def get(self) -> int:
        return self.stored_data
'''


@pytest.fixture
def counter_source():
    """Counter contract source."""
    return '''
from pyvax import Contract, action

class Counter(Contract):
    count: int = 0

    @action
    def increment(self):
        self.count = self.count + 1
        self.emit("Incremented", self.count)

    @action
    def decrement(self):
        if self.count > 0:
            self.count = self.count - 1
            self.emit("Decremented", self.count)

    @action
    def get_count(self) -> int:
        return self.count

    @action
    def reset(self):
        self.count = 0
        self.emit("Reset")
'''


@pytest.fixture
def erc20_source():
    """ERC20 contract source."""
    return '''
from pyvax import Contract, action

class ERC20(Contract):
    total_supply: int = 0
    balances: dict = {}
    decimals_: int = 18

    @action
    def mint(self, to: str, amount: int):
        self.require(amount > 0, "Amount must be positive")
        self.balances[to] = self.balances.get(to, 0) + amount
        self.total_supply = self.total_supply + amount
        self.emit("Transfer", 0, to, amount)

    @action
    def transfer(self, to: str, amount: int):
        sender = self.msg_sender()
        self.require(self.balances.get(sender, 0) >= amount, "Insufficient balance")
        self.balances[sender] = self.balances[sender] - amount
        self.balances[to] = self.balances.get(to, 0) + amount
        self.emit("Transfer", sender, to, amount)

    @action
    def balance_of(self, owner: str) -> int:
        return self.balances.get(owner, 0)

    @action
    def total_supply_of(self) -> int:
        return self.total_supply
'''


@pytest.fixture
def agent_vault_source():
    """AgentVault contract source."""
    return '''
from pyvax import Contract, action, agent_action, human_action

class AgentVault(Contract):
    balances: dict = {}
    total_deposits: int = 0

    @action
    def deposit(self, amount: int):
        self.require(amount > 0, "Amount must be positive")
        sender = self.msg_sender()
        self.balances[sender] = self.balances.get(sender, 0) + amount
        self.total_deposits = self.total_deposits + amount
        self.emit("Deposit", sender, amount)

    @agent_action
    def autonomous_rebalance(self):
        pass

    @human_action
    def withdraw(self, amount: int):
        sender = self.msg_sender()
        self.require(self.balances.get(sender, 0) >= amount, "Insufficient balance")
        self.balances[sender] = self.balances[sender] - amount
        self.total_deposits = self.total_deposits - amount
        self.emit("Withdraw", sender, amount)

    @action
    def balance_of(self, user: str) -> int:
        return self.balances.get(user, 0)

    @action
    def get_total_deposits(self) -> int:
        return self.total_deposits
'''


# ─── Transpiler Tests ────────────────────────────────────────────────────────

class TestTranspiler:
    """Test the PyVax transpiler directly."""

    def test_simple_storage_transpile(self, simple_storage_source):
        """Test transpiling a simple storage contract."""
        result = transpile_python_contract(simple_storage_source)
        assert result["bytecode"].startswith("0x")
        assert len(result["abi"]) > 0
        assert result["metadata"]["compiler"] == "pyvax-transpiler"

    def test_counter_transpile(self, counter_source):
        """Test transpiling a counter contract."""
        result = transpile_python_contract(counter_source)
        assert result["bytecode"].startswith("0x")
        # Counter has 4 functions: increment, decrement, get_count, reset
        func_names = [f["name"] for f in result["abi"] if f["type"] == "function"]
        assert "increment" in func_names
        assert "get_count" in func_names

    def test_erc20_transpile(self, erc20_source):
        """Test transpiling an ERC20 contract."""
        result = transpile_python_contract(erc20_source)
        assert result["bytecode"].startswith("0x")
        func_names = [f["name"] for f in result["abi"] if f["type"] == "function"]
        assert "mint" in func_names
        assert "transfer" in func_names
        assert "balance_of" in func_names

    def test_agent_vault_transpile(self, agent_vault_source):
        """Test transpiling an AgentVault contract with agent/human decorators."""
        result = transpile_python_contract(agent_vault_source)
        assert result["bytecode"].startswith("0x")
        func_names = [f["name"] for f in result["abi"] if f["type"] == "function"]
        assert "deposit" in func_names
        assert "withdraw" in func_names

    def test_optimizer_level_0(self, simple_storage_source):
        """Test transpilation with no optimization."""
        result = transpile_python_contract(simple_storage_source, optimizer_level=0)
        assert result["bytecode"].startswith("0x")
        assert result["metadata"]["optimizer_level"] == 0

    def test_optimizer_level_1(self, simple_storage_source):
        """Test transpilation with level 1 optimization."""
        result = transpile_python_contract(simple_storage_source, optimizer_level=1)
        assert result["bytecode"].startswith("0x")

    def test_optimizer_level_3(self, simple_storage_source):
        """Test transpilation with aggressive optimization."""
        r0 = transpile_python_contract(simple_storage_source, optimizer_level=0)
        r3 = transpile_python_contract(simple_storage_source, optimizer_level=3)
        # Optimized should be same size or smaller
        assert len(r3["bytecode"]) <= len(r0["bytecode"])

    def test_overflow_safe_mode(self, simple_storage_source):
        """Test overflow-safe compilation."""
        result = transpile_python_contract(
            simple_storage_source, overflow_safe=True
        )
        assert result["metadata"]["overflow_safe"] is True

    def test_no_overflow_safe_mode(self, simple_storage_source):
        """Test compilation without overflow checks."""
        result = transpile_python_contract(
            simple_storage_source, overflow_safe=False
        )
        assert result["metadata"]["overflow_safe"] is False

    def test_abi_has_constructor(self, simple_storage_source):
        """Test that ABI includes constructor entry."""
        result = transpile_python_contract(simple_storage_source)
        constructors = [f for f in result["abi"] if f["type"] == "constructor"]
        assert len(constructors) == 1

    def test_abi_has_events(self, simple_storage_source):
        """Test that ABI includes event entries from emit() calls."""
        result = transpile_python_contract(simple_storage_source)
        events = [f for f in result["abi"] if f["type"] == "event"]
        event_names = [e["name"] for e in events]
        assert "DataStored" in event_names

    def test_metadata_completeness(self, simple_storage_source):
        """Test metadata contains all expected fields."""
        result = transpile_python_contract(simple_storage_source)
        meta = result["metadata"]
        assert "storage_vars" in meta
        assert "functions" in meta
        assert "events" in meta
        assert "gas_estimate" in meta
        assert "version" in meta


# ─── Compiler Pipeline Tests ────────────────────────────────────────────────

class TestCompiler:
    """Test the compilation pipeline."""

    def test_compile_single_contract(self, tmp_project, simple_storage_source):
        """Test compiling a single contract from filesystem."""
        _, contracts_dir, build_dir = tmp_project

        with open(contracts_dir / "SimpleStorage.py", "w") as f:
            f.write(simple_storage_source)

        results = compile_contracts(contracts_dir, build_dir)
        assert "SimpleStorage" in results
        assert results["SimpleStorage"]["success"] is True

    def test_compile_multiple_contracts(
        self, tmp_project, simple_storage_source, counter_source
    ):
        """Test compiling multiple contracts."""
        _, contracts_dir, build_dir = tmp_project

        with open(contracts_dir / "SimpleStorage.py", "w") as f:
            f.write(simple_storage_source)
        with open(contracts_dir / "Counter.py", "w") as f:
            f.write(counter_source)

        results = compile_contracts(contracts_dir, build_dir)
        assert len(results) == 2
        assert results["SimpleStorage"]["success"] is True
        assert results["Counter"]["success"] is True

    def test_compile_with_filter(self, tmp_project, simple_storage_source, counter_source):
        """Test compile with contract_filter selects only one."""
        _, contracts_dir, build_dir = tmp_project

        with open(contracts_dir / "SimpleStorage.py", "w") as f:
            f.write(simple_storage_source)
        with open(contracts_dir / "Counter.py", "w") as f:
            f.write(counter_source)

        results = compile_contracts(contracts_dir, build_dir, contract_filter="Counter")
        assert len(results) == 1
        assert "Counter" in results

    def test_compile_with_optimizer(self, tmp_project, simple_storage_source):
        """Test compilation with different optimizer levels."""
        _, contracts_dir, build_dir = tmp_project

        with open(contracts_dir / "SimpleStorage.py", "w") as f:
            f.write(simple_storage_source)

        results = compile_contracts(
            contracts_dir, build_dir, optimizer_level=3
        )
        assert results["SimpleStorage"]["success"] is True

    def test_compile_output_files(self, tmp_project, simple_storage_source):
        """Test that compilation produces expected output files."""
        _, contracts_dir, build_dir = tmp_project

        with open(contracts_dir / "SimpleStorage.py", "w") as f:
            f.write(simple_storage_source)

        compile_contracts(contracts_dir, build_dir)

        # Check output files exist
        assert (build_dir / "SimpleStorage" / "SimpleStorage.json").exists()
        assert (build_dir / "SimpleStorage" / "SimpleStorage_abi.json").exists()
        assert (build_dir / "SimpleStorage" / "SimpleStorage_bytecode.txt").exists()

    def test_compile_artifact_format(self, tmp_project, simple_storage_source):
        """Test compiled artifact JSON format."""
        _, contracts_dir, build_dir = tmp_project

        with open(contracts_dir / "SimpleStorage.py", "w") as f:
            f.write(simple_storage_source)

        compile_contracts(contracts_dir, build_dir)

        with open(build_dir / "SimpleStorage" / "SimpleStorage.json") as f:
            artifact = json.load(f)

        assert artifact["contractName"] == "SimpleStorage"
        assert "abi" in artifact
        assert "bytecode" in artifact
        assert artifact["compiler"]["type"] == "pyvax-transpiler"
        assert artifact["compiler"]["version"] == "1.0.0"

    def test_compile_empty_directory(self, tmp_project):
        """Test compiling an empty contracts directory."""
        _, contracts_dir, build_dir = tmp_project
        results = compile_contracts(contracts_dir, build_dir)
        assert len(results) == 0


# ─── Peephole Optimizer Tests ───────────────────────────────────────────────

class TestPeepholeOptimizer:
    """Test the peephole bytecode optimizer."""

    def test_constant_folding(self):
        """Test PUSH a / PUSH b / ADD → PUSH (a+b)."""
        # PUSH1 5 / PUSH1 3 / ADD → should fold to PUSH1 8
        code = bytes([0x60, 0x05, 0x60, 0x03, 0x01])
        optimized = PeepholeOptimizer.optimize(code, passes=1)
        # Result should be shorter (PUSH1 8 = 2 bytes vs 5 bytes)
        assert len(optimized) < len(code)

    def test_identity_removal_double_iszero(self):
        """Test ISZERO/ISZERO removal (double negation)."""
        # ISZERO / ISZERO → remove both
        code = bytes([0x15, 0x15])
        optimized = PeepholeOptimizer.optimize(code, passes=1)
        assert len(optimized) == 0

    def test_identity_removal_push_pop(self):
        """Test PUSH1/POP removal."""
        # PUSH1 0x42 / POP → remove both
        code = bytes([0x60, 0x42, 0x50])
        optimized = PeepholeOptimizer.optimize(code, passes=1)
        assert len(optimized) == 0

    def test_no_false_optimization(self):
        """Test that non-pattern sequences are not modified."""
        # PUSH1 5 / ADD (no second push before ADD — don't fold)
        code = bytes([0x60, 0x05, 0x01])
        optimized = PeepholeOptimizer.optimize(code, passes=1)
        assert optimized == code

    def test_multi_pass(self):
        """Test that multiple passes can find additional optimizations."""
        # PUSH1 2 / PUSH1 3 / ADD / PUSH1 4 / MUL
        # Pass 1: fold ADD → PUSH1 5, then PUSH1 5 / PUSH1 4 / MUL
        # Pass 2: fold MUL → PUSH1 20
        code = bytes([0x60, 0x02, 0x60, 0x03, 0x01, 0x60, 0x04, 0x02])
        optimized = PeepholeOptimizer.optimize(code, passes=3)
        assert len(optimized) <= 2  # Should be PUSH1 20


# ─── Contract Base Class Tests ──────────────────────────────────────────────

class TestContractBase:
    """Test the Contract base class and decorators."""

    def test_contract_instantiation(self):
        """Test that Contract base class can be instantiated."""
        c = Contract()
        assert hasattr(c, "_state")
        assert hasattr(c, "_storage_slots")

    def test_state_var_allocation(self):
        """Test state variable slot allocation."""
        c = Contract()
        c.state_var("balance", 0)
        c.state_var("owner", "0x0")
        assert c._storage_slots["balance"] == 0
        assert c._storage_slots["owner"] == 1

    def test_require_passes(self):
        """Test require with passing condition."""
        c = Contract()
        c.require(True, "Should pass")  # Should not raise

    def test_require_fails(self):
        """Test require with failing condition."""
        c = Contract()
        with pytest.raises(Exception, match="Must be positive"):
            c.require(False, "Must be positive")

    def test_action_decorator(self):
        """Test @action decorator sets visibility."""
        @action
        def my_func():
            pass
        assert my_func._pyvax_visibility == "external"
        assert my_func._pyvax_access == "all"

    def test_agent_action_decorator(self):
        """Test @agent_action decorator sets agent access."""
        @agent_action
        def my_func():
            pass
        assert my_func._pyvax_access == "agent"

    def test_human_action_decorator(self):
        """Test @human_action decorator sets human access."""
        @human_action
        def my_func():
            pass
        assert my_func._pyvax_access == "human"

    def test_msg_sender_returns_zero_address(self):
        """Test msg_sender returns zero address in local mode."""
        c = Contract()
        assert c.msg_sender() == "0x0000000000000000000000000000000000000000"

    def test_msg_value_returns_zero(self):
        """Test msg_value returns 0 in local mode."""
        c = Contract()
        assert c.msg_value() == 0


# ─── Integration Tests ──────────────────────────────────────────────────────

class TestEndToEnd:
    """Test the complete new → compile pipeline."""

    def test_full_pipeline_simple_storage(self, tmp_project, simple_storage_source):
        """Test full pipeline: write → compile → verify artifacts."""
        _, contracts_dir, build_dir = tmp_project

        # Step 1: Write contract
        with open(contracts_dir / "SimpleStorage.py", "w") as f:
            f.write(simple_storage_source)

        # Step 2: Compile with optimizer
        results = compile_contracts(
            contracts_dir, build_dir, optimizer_level=3
        )

        # Step 3: Verify
        assert results["SimpleStorage"]["success"] is True
        artifact_file = build_dir / "SimpleStorage" / "SimpleStorage.json"
        assert artifact_file.exists()

        with open(artifact_file) as f:
            artifact = json.load(f)

        assert artifact["bytecode"].startswith("0x")
        assert len(artifact["abi"]) > 0

    def test_full_pipeline_erc20(self, tmp_project, erc20_source):
        """Test full ERC20 pipeline."""
        _, contracts_dir, build_dir = tmp_project

        with open(contracts_dir / "ERC20.py", "w") as f:
            f.write(erc20_source)

        results = compile_contracts(
            contracts_dir, build_dir, optimizer_level=3
        )

        assert results["ERC20"]["success"] is True
        bytecode = results["ERC20"]["bytecode"]
        size = (len(bytecode) - 2) // 2
        assert size > 0
        print(f"ERC20 bytecode size: {size / 1024:.1f}kb")

    def test_full_pipeline_agent_vault(self, tmp_project, agent_vault_source):
        """Test full AgentVault pipeline with agent/human decorators."""
        _, contracts_dir, build_dir = tmp_project

        with open(contracts_dir / "AgentVault.py", "w") as f:
            f.write(agent_vault_source)

        results = compile_contracts(
            contracts_dir, build_dir, optimizer_level=3
        )

        assert results["AgentVault"]["success"] is True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
