"""Tests for the PyVax Snowtrace Verification Pipeline.

Verifies that the full transform → verify pipeline produces
correct Snowtrace-compatible payloads with evmVersion: "paris".
"""

import json
import pytest

from avax_cli.transformer import python_to_verified_solidity
from avax_cli.snowtrace import generate_snowtrace_payload


# ── Test Sources ──────────────────────────────────────────────────────

COUNTER_PY = '''
from pyvax import Contract, action, view_function

class Counter(Contract):
    """Minimal counter."""
    count: int = 0

    @action
    def increment(self):
        self.count = self.count + 1
        self.emit("Incremented", self.msg_sender(), self.count)

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

    @view_function
    def balance_of(self, account: str) -> int:
        return self.balances[account]
'''

STAKING_PY = '''
from pyvax import Contract, action, view_function

class StakingPool(Contract):
    """Staking pool with reward tracking."""
    staked: dict = {}
    rewards: dict = {}
    total_staked: int = 0
    reward_rate: int = 5

    @action
    def stake(self, amount: int):
        self.require(amount > 0, "Amount must be positive")
        sender = self.msg_sender()
        self.staked[sender] = self.staked[sender] + amount
        self.total_staked = self.total_staked + amount
        self.emit("Staked", sender, amount)

    @action
    def unstake(self, amount: int):
        sender = self.msg_sender()
        self.require(self.staked[sender] >= amount, "Not enough staked")
        self.staked[sender] = self.staked[sender] - amount
        self.total_staked = self.total_staked - amount
        self.emit("Unstaked", sender, amount)

    @view_function
    def get_staked(self, user: str) -> int:
        return self.staked[user]

    @view_function
    def get_total_staked(self) -> int:
        return self.total_staked
'''


# ── Snowtrace Payload Tests ──────────────────────────────────────────


class TestSnowtracePayload:
    """Test that generate_snowtrace_payload() produces correct JSON."""

    def test_has_required_fields(self):
        payload = generate_snowtrace_payload(
            source="pragma solidity ^0.8.24; contract C {}",
            contract_name="TestContract",
        )
        assert payload["module"] == "contract"
        assert payload["action"] == "verifysourcecode"
        assert payload["codeformat"] == "solidity-standard-json-input"
        assert payload["compilerversion"] == "v0.8.24+commit.e11b9ed9"
        assert payload["contractname"] == "TestContract.sol:TestContract"
        assert payload["licenseType"] == 1

    def test_address_is_none(self):
        """contractaddress should be None — caller fills it post-deploy."""
        payload = generate_snowtrace_payload(source="contract C {}")
        assert payload["contractaddress"] is None

    def test_source_code_is_valid_json(self):
        payload = generate_snowtrace_payload(source="contract C {}")
        source_json = json.loads(payload["sourceCode"])
        assert isinstance(source_json, dict)
        assert source_json["language"] == "Solidity"

    def test_evm_version_is_paris(self):
        """CRITICAL: evmVersion must be 'paris' for Avalanche C-Chain."""
        payload = generate_snowtrace_payload(source="contract C {}")
        source_json = json.loads(payload["sourceCode"])
        assert source_json["settings"]["evmVersion"] == "paris"

    def test_optimizer_settings(self):
        payload = generate_snowtrace_payload(
            source="contract C {}",
            optimization_runs=200,
        )
        source_json = json.loads(payload["sourceCode"])
        assert source_json["settings"]["optimizer"]["enabled"] is True
        assert source_json["settings"]["optimizer"]["runs"] == 200

    def test_source_is_embedded(self):
        sol = "pragma solidity ^0.8.24; contract MyTest {}"
        payload = generate_snowtrace_payload(source=sol, contract_name="MyTest")
        source_json = json.loads(payload["sourceCode"])
        assert source_json["sources"]["MyTest.sol"]["content"] == sol

    def test_custom_compiler_version(self):
        payload = generate_snowtrace_payload(
            source="contract C {}",
            compiler_version="v0.8.20+commit.a1b79de6",
        )
        assert payload["compilerversion"] == "v0.8.20+commit.a1b79de6"

    def test_output_selection_present(self):
        payload = generate_snowtrace_payload(source="contract C {}")
        source_json = json.loads(payload["sourceCode"])
        output_sel = source_json["settings"]["outputSelection"]
        assert "*" in output_sel
        assert "*" in output_sel["*"]
        assert "abi" in output_sel["*"]["*"]
        assert "evm.bytecode.object" in output_sel["*"]["*"]


# ── Full Pipeline Tests ──────────────────────────────────────────────


class TestTransformPipeline:
    """Test python_to_verified_solidity() returns all required fields."""

    ALL_CONTRACTS = [
        ("Counter", COUNTER_PY),
        ("ERC20Token", ERC20_PY),
        ("StakingPool", STAKING_PY),
    ]

    @pytest.mark.parametrize("name,source", ALL_CONTRACTS)
    def test_returns_solidity(self, name, source):
        result = python_to_verified_solidity(source)
        assert "solidity" in result
        assert "pragma solidity" in result["solidity"]

    @pytest.mark.parametrize("name,source", ALL_CONTRACTS)
    def test_returns_abi(self, name, source):
        result = python_to_verified_solidity(source)
        assert "abi" in result
        assert len(result["abi"]) > 0

    @pytest.mark.parametrize("name,source", ALL_CONTRACTS)
    def test_evm_version_paris(self, name, source):
        result = python_to_verified_solidity(source)
        assert result["evm_version"] == "paris"

    @pytest.mark.parametrize("name,source", ALL_CONTRACTS)
    def test_compiler_version(self, name, source):
        result = python_to_verified_solidity(source)
        assert "v0.8.24" in result["compiler_version"]

    @pytest.mark.parametrize("name,source", ALL_CONTRACTS)
    def test_optimization_runs(self, name, source):
        result = python_to_verified_solidity(source)
        assert result["optimization_runs"] == 200


# ── End-to-End Snowtrace Payload from Python ─────────────────────────


class TestE2ESnowtracePayload:
    """Test full pipeline: Python → Solidity → Snowtrace JSON."""

    def test_counter_snowtrace_payload(self):
        result = python_to_verified_solidity(COUNTER_PY)
        payload = generate_snowtrace_payload(
            source=result["solidity"],
            contract_name=result["contract_name"],
            evm_version=result["evm_version"],
        )

        # Validate structure
        assert payload["codeformat"] == "solidity-standard-json-input"
        assert payload["contractname"] == "Counter.sol:Counter"

        # Validate embedded JSON
        source_json = json.loads(payload["sourceCode"])
        assert source_json["settings"]["evmVersion"] == "paris"
        assert "pragma solidity" in source_json["sources"]["Counter.sol"]["content"]

    def test_erc20_snowtrace_payload_has_constructor(self):
        result = python_to_verified_solidity(ERC20_PY)
        payload = generate_snowtrace_payload(
            source=result["solidity"],
            contract_name=result["contract_name"],
        )

        source_json = json.loads(payload["sourceCode"])
        sol_content = source_json["sources"]["ERC20Token.sol"]["content"]
        assert "constructor()" in sol_content

    def test_staking_snowtrace_payload_has_events(self):
        result = python_to_verified_solidity(STAKING_PY)
        payload = generate_snowtrace_payload(
            source=result["solidity"],
            contract_name=result["contract_name"],
        )

        source_json = json.loads(payload["sourceCode"])
        sol_content = source_json["sources"]["StakingPool.sol"]["content"]
        assert "event Staked" in sol_content
        assert "event Unstaked" in sol_content

    def test_payload_ready_for_api_post(self):
        """Payload should be serializable and have all required Snowtrace fields."""
        result = python_to_verified_solidity(COUNTER_PY)
        payload = generate_snowtrace_payload(
            source=result["solidity"],
            contract_name=result["contract_name"],
        )

        # Should be JSON-serializable
        json_str = json.dumps(payload)
        assert len(json_str) > 0

        # Fill in address to make it complete
        payload["contractaddress"] = "0x1234567890123456789012345678901234567890"
        payload["apikey"] = "test-key"

        # All required fields present
        required = ["module", "action", "codeformat", "contractaddress",
                     "compilerversion", "contractname", "sourceCode"]
        for field in required:
            assert field in payload, f"Missing required field: {field}"
            assert payload[field] is not None, f"Field {field} is None"
