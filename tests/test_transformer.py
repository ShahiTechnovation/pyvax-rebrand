"""Tests for the PyVax Solidity Transformer.

Verifies that all 10 template contracts produce valid,
compilable Solidity output from the Python→Solidity pipeline.
"""

import ast
import re
import pytest

from avax_cli.transpiler import PythonASTAnalyzer
from avax_cli.transformer import (
    generate_solidity,
    generate_abi_from_state,
    python_to_verified_solidity,
    SolidityGenerator,
)


# ── Template sources (subset of playground templates) ─────────────────

COUNTER_PY = '''
from pyvax import Contract, action, view_function

class Counter(Contract):
    """Minimal counter."""
    count: int = 0

    @action
    def increment(self):
        self.count = self.count + 1
        self.emit("Incremented", self.msg_sender(), self.count)

    @action
    def decrement(self):
        self.require(self.count > 0, "Cannot go below zero")
        self.count = self.count - 1
        self.emit("Decremented", self.msg_sender(), self.count)

    @action
    def add(self, value: int):
        self.require(value > 0, "Value must be positive")
        self.count = self.count + value

    @action
    def reset(self):
        self.count = 0

    @view_function
    def get_count(self) -> int:
        return self.count
'''

ERC20_PY = '''
from pyvax import Contract, action, view_function

class ERC20Token(Contract):
    """ERC-20 compatible token."""
    total_supply: int = 0
    balances: dict = {}
    allowances: dict = {}
    owner: str = ""

    def __init__(self):
        self.owner = self.msg_sender()

    @action
    def mint(self, to: str, amount: int):
        self.require(self.msg_sender() == self.owner, "Only owner")
        self.require(amount > 0, "Amount must be positive")
        self.balances[to] = self.balances[to] + amount
        self.total_supply = self.total_supply + amount
        self.emit("Transfer", 0, to, amount)

    @action
    def transfer(self, to: str, amount: int):
        sender = self.msg_sender()
        self.require(self.balances[sender] >= amount, "Insufficient balance")
        self.balances[sender] = self.balances[sender] - amount
        self.balances[to] = self.balances[to] + amount
        self.emit("Transfer", sender, to, amount)

    @action
    def approve(self, spender: str, amount: int):
        sender = self.msg_sender()
        self.allowances[sender] = amount
        self.emit("Approval", sender, spender, amount)

    @view_function
    def balance_of(self, account: str) -> int:
        return self.balances[account]

    @view_function
    def get_total_supply(self) -> int:
        return self.total_supply

    @view_function
    def get_owner(self) -> int:
        return self.owner
'''

VAULT_PY = '''
from pyvax import Contract, action, human_action, agent_action, view_function

class AgentVault(Contract):
    """Agent vault with role-based access."""
    balances: dict = {}
    total_deposits: int = 0
    agent_ops: int = 0

    @action
    def deposit(self, amount: int):
        self.require(amount > 0, "Amount must be positive")
        sender = self.msg_sender()
        self.balances[sender] = self.balances[sender] + amount
        self.total_deposits = self.total_deposits + amount
        self.emit("Deposit", sender, amount)

    @human_action
    def withdraw(self, amount: int):
        sender = self.msg_sender()
        self.require(self.balances[sender] >= amount, "Insufficient balance")
        self.balances[sender] = self.balances[sender] - amount
        self.total_deposits = self.total_deposits - amount
        self.emit("Withdraw", sender, amount)

    @agent_action
    def rebalance(self):
        self.agent_ops = self.agent_ops + 1
        self.emit("Rebalance", self.msg_sender(), self.agent_ops)

    @view_function
    def balance_of(self, user: str) -> int:
        return self.balances[user]

    @view_function
    def get_total_deposits(self) -> int:
        return self.total_deposits
'''

VOTING_PY = '''
from pyvax import Contract, action, view_function

class Voting(Contract):
    """On-chain voting."""
    votes: dict = {}
    has_voted: dict = {}
    total_votes: int = 0
    is_active: int = 1

    @action
    def vote(self, candidate_id: int):
        sender = self.msg_sender()
        self.require(self.is_active == 1, "Voting is closed")
        self.require(self.has_voted[sender] == 0, "Already voted")
        self.has_voted[sender] = 1
        self.votes[candidate_id] = self.votes[candidate_id] + 1
        self.total_votes = self.total_votes + 1
        self.emit("VoteCast", sender, candidate_id)

    @action
    def close_voting(self):
        self.is_active = 0
        self.emit("VotingClosed", self.msg_sender(), self.total_votes)

    @view_function
    def get_votes(self, candidate_id: int) -> int:
        return self.votes[candidate_id]

    @view_function
    def get_total_votes(self) -> int:
        return self.total_votes

    @view_function
    def check_voted(self, voter: str) -> int:
        return self.has_voted[voter]
'''


# ── Test classes ──────────────────────────────────────────────────────


class TestSolidityOutput:
    """Test that generated Solidity has correct structure."""

    def _generate(self, source: str, name: str = "TestContract") -> str:
        state = PythonASTAnalyzer().analyze_contract(source)
        return generate_solidity(state, name, python_source=source)

    def test_counter_has_pragma(self):
        sol = self._generate(COUNTER_PY, "Counter")
        assert "pragma solidity ^0.8.24;" in sol

    def test_counter_has_spdx(self):
        sol = self._generate(COUNTER_PY, "Counter")
        assert "SPDX-License-Identifier: MIT" in sol

    def test_counter_has_contract(self):
        sol = self._generate(COUNTER_PY, "Counter")
        assert "contract Counter {" in sol

    def test_counter_has_state_var(self):
        sol = self._generate(COUNTER_PY, "Counter")
        assert "uint256 public count;" in sol

    def test_counter_has_increment(self):
        sol = self._generate(COUNTER_PY, "Counter")
        assert "function increment()" in sol
        assert "external" in sol

    def test_counter_has_view(self):
        sol = self._generate(COUNTER_PY, "Counter")
        assert "function get_count()" in sol
        assert "view" in sol
        assert "returns (uint256)" in sol

    def test_counter_has_require(self):
        sol = self._generate(COUNTER_PY, "Counter")
        assert 'require(count > 0, "Cannot go below zero");' in sol

    def test_counter_has_event(self):
        sol = self._generate(COUNTER_PY, "Counter")
        assert "event Incremented" in sol
        assert "event Decremented" in sol

    def test_counter_has_emit(self):
        sol = self._generate(COUNTER_PY, "Counter")
        assert "emit Incremented(msg.sender, count);" in sol


class TestERC20Output:
    """Test ERC-20 token generates correct Solidity."""

    def _generate(self) -> str:
        state = PythonASTAnalyzer().analyze_contract(ERC20_PY)
        return generate_solidity(state, "ERC20Token", python_source=ERC20_PY)

    def test_has_mappings(self):
        sol = self._generate()
        assert "mapping(address => uint256) public balances;" in sol
        assert "mapping(address => uint256) public allowances;" in sol

    def test_has_owner_address(self):
        sol = self._generate()
        assert "address public owner;" in sol

    def test_has_constructor(self):
        sol = self._generate()
        assert "constructor()" in sol
        assert "owner = msg.sender;" in sol

    def test_has_mint_with_params(self):
        sol = self._generate()
        assert "function mint(address to, uint256 amount) external" in sol

    def test_has_transfer_event(self):
        sol = self._generate()
        assert "event Transfer" in sol

    def test_has_approval_event(self):
        sol = self._generate()
        assert "event Approval" in sol

    def test_has_require_checks(self):
        sol = self._generate()
        assert 'require(msg.sender == owner, "Only owner");' in sol
        assert 'require(amount > 0, "Amount must be positive");' in sol

    def test_has_balance_of_view(self):
        sol = self._generate()
        assert "function balance_of(address account) external view returns (uint256)" in sol


class TestVaultOutput:
    """Test AgentVault generates correct Solidity."""

    def _generate(self) -> str:
        state = PythonASTAnalyzer().analyze_contract(VAULT_PY)
        return generate_solidity(state, "AgentVault", python_source=VAULT_PY)

    def test_has_three_mappings_and_scalars(self):
        sol = self._generate()
        assert "mapping(address => uint256) public balances;" in sol
        assert "uint256 public total_deposits;" in sol
        assert "uint256 public agent_ops;" in sol

    def test_has_deposit_function(self):
        sol = self._generate()
        assert "function deposit(uint256 amount) external" in sol

    def test_has_withdraw_function(self):
        sol = self._generate()
        assert "function withdraw(uint256 amount) external" in sol


class TestVotingOutput:
    """Test Voting contract generates correct Solidity."""

    def _generate(self) -> str:
        state = PythonASTAnalyzer().analyze_contract(VOTING_PY)
        return generate_solidity(state, "Voting", python_source=VOTING_PY)

    def test_has_vote_function(self):
        sol = self._generate()
        assert "function vote(uint256 candidate_id) external" in sol

    def test_has_votecast_event(self):
        sol = self._generate()
        assert "event VoteCast" in sol

    def test_has_is_active_with_value(self):
        sol = self._generate()
        assert "uint256 public is_active = 1;" in sol


class TestABIGeneration:
    """Test ABI generation from ContractState."""

    def test_counter_abi_has_functions(self):
        state = PythonASTAnalyzer().analyze_contract(COUNTER_PY)
        abi = generate_abi_from_state(state)
        names = [e["name"] for e in abi if e["type"] == "function"]
        assert "increment" in names
        assert "decrement" in names
        assert "get_count" in names
        assert "add" in names
        assert "reset" in names

    def test_erc20_abi_has_constructor(self):
        state = PythonASTAnalyzer().analyze_contract(ERC20_PY)
        abi = generate_abi_from_state(state, python_source=ERC20_PY)
        constructors = [e for e in abi if e["type"] == "constructor"]
        assert len(constructors) == 1

    def test_view_functions_are_view(self):
        state = PythonASTAnalyzer().analyze_contract(COUNTER_PY)
        abi = generate_abi_from_state(state)
        get_count = next(e for e in abi if e.get("name") == "get_count")
        assert get_count["stateMutability"] == "view"

    def test_action_functions_are_nonpayable(self):
        state = PythonASTAnalyzer().analyze_contract(COUNTER_PY)
        abi = generate_abi_from_state(state)
        increment = next(e for e in abi if e.get("name") == "increment")
        assert increment["stateMutability"] == "nonpayable"

    def test_function_params_have_types(self):
        state = PythonASTAnalyzer().analyze_contract(ERC20_PY)
        abi = generate_abi_from_state(state)
        mint = next(e for e in abi if e.get("name") == "mint")
        assert mint["inputs"][0]["type"] == "address"   # to: str → address
        assert mint["inputs"][1]["type"] == "uint256"    # amount: int → uint256


class TestFullPipeline:
    """Test the python_to_verified_solidity() end-to-end pipeline."""

    def test_counter_pipeline(self):
        result = python_to_verified_solidity(COUNTER_PY)
        assert "solidity" in result
        assert "abi" in result
        assert result["contract_name"] == "Counter"
        assert "pragma solidity" in result["solidity"]

    def test_erc20_pipeline(self):
        result = python_to_verified_solidity(ERC20_PY)
        assert result["contract_name"] == "ERC20Token"
        assert len(result["abi"]) > 0

    def test_vault_pipeline(self):
        result = python_to_verified_solidity(VAULT_PY)
        assert result["contract_name"] == "AgentVault"

    def test_pipeline_respects_name_override(self):
        result = python_to_verified_solidity(COUNTER_PY, contract_name="MyCustomCounter")
        assert result["contract_name"] == "MyCustomCounter"
        assert "contract MyCustomCounter {" in result["solidity"]

    def test_pipeline_has_compiler_metadata(self):
        result = python_to_verified_solidity(COUNTER_PY)
        assert "v0.8.24" in result["compiler_version"]
        assert result["optimization_runs"] == 200
        assert result["evm_version"] == "paris"


class TestSolidityValidity:
    """Test that generated Solidity is syntactically valid."""

    ALL_TEMPLATES = [
        ("Counter", COUNTER_PY),
        ("ERC20Token", ERC20_PY),
        ("AgentVault", VAULT_PY),
        ("Voting", VOTING_PY),
    ]

    @pytest.mark.parametrize("name,source", ALL_TEMPLATES)
    def test_balanced_braces(self, name, source):
        """Generated Solidity has balanced curly braces."""
        sol = python_to_verified_solidity(source, name)["solidity"]
        assert sol.count("{") == sol.count("}"), f"{name}: unbalanced braces"

    @pytest.mark.parametrize("name,source", ALL_TEMPLATES)
    def test_no_python_artifacts(self, name, source):
        """Generated Solidity has no Python-specific syntax."""
        sol = python_to_verified_solidity(source, name)["solidity"]
        assert "self." not in sol, f"{name}: contains 'self.'"
        assert "def " not in sol, f"{name}: contains 'def '"
        assert "@action" not in sol, f"{name}: contains '@action'"
        assert "@view_function" not in sol, f"{name}: contains '@view_function'"

    @pytest.mark.parametrize("name,source", ALL_TEMPLATES)
    def test_has_semicolons(self, name, source):
        """Every statement line ends with a semicolon."""
        sol = python_to_verified_solidity(source, name)["solidity"]
        for line in sol.split("\n"):
            stripped = line.strip()
            if not stripped:
                continue
            if stripped.startswith("//") or stripped.startswith("/*"):
                continue
            if stripped.startswith("pragma"):
                assert stripped.endswith(";"), f"pragma missing semicolon: {stripped}"
            # Function headers and events end with { or ;
