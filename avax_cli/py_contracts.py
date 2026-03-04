"""Python smart contract base classes for PyVax."""

from typing import Any, Dict


class Contract:
    """Base class for all PyVax smart contracts.

    Any class inheriting from Contract is transpiled into an EVM-compatible
    smart contract that can be deployed to Avalanche via `pyvax deploy`.

    Usage:
        class MyContract(Contract):
            balance: int = 0

            @action
            def deposit(self, amount: int):
                self.balance += amount
    """

    def __init__(self):
        self._state: Dict[str, Any] = {}
        self._storage_slots: Dict[str, int] = {}
        self._slot_counter: int = 0

    def state_var(self, name: str, initial_value: Any = 0) -> Any:
        """Declare a persistent EVM storage variable."""
        slot = self._slot_counter
        self._storage_slots[name] = slot
        self._state[name] = initial_value
        self._slot_counter += 1
        setattr(self, name, initial_value)
        return initial_value

    def emit(self, name: str, *params):
        """Emit an onchain event (compiled to Solidity `emit Event(...)`)."""
        pass  # Resolved during transpilation

    def msg_sender(self) -> str:
        """Return the calling wallet address (EVM: msg.sender)."""
        return "0x0000000000000000000000000000000000000000"

    def msg_value(self) -> int:
        """Return AVAX wei sent with the call (EVM: msg.value)."""
        return 0

    def block_number(self) -> int:
        """Return current Avalanche block number."""
        return 1

    def require(self, condition: bool, message: str = "Requirement failed"):
        """Revert the transaction if condition is False (EVM: require)."""
        if not condition:
            raise Exception(message)

    def _mint(self, to: str, token_id: int, amount: int = 1):
        """Mint ERC1155 or ERC20 tokens (transpiled to _mint call)."""
        pass

    def chainlink_vrf(self, max_value: int = 100) -> int:
        """Request a verifiable random number via Chainlink VRF."""
        return 0  # Resolved at compile time to VRF callback


# Decorator shorthands — resolved by the transpiler at compile time
def action(func):
    """Mark a method as a public EVM function callable by any address."""
    func._pyvax_visibility = "external"
    func._pyvax_access = "all"
    return func


def agent_action(func):
    """Mark a method as callable only by verified PyVax AgentWallets."""
    func._pyvax_visibility = "external"
    func._pyvax_access = "agent"
    return func


def human_action(func):
    """Mark a method as callable only by non-agent human EOA wallets."""
    func._pyvax_visibility = "external"
    func._pyvax_access = "human"
    return func


# Backwards aliases — for contracts still using the old decorator names
public_function = action
view_function = action

# EVM type aliases for explicit storage optimization
Uint8 = int
Uint16 = int
Uint32 = int
Uint64 = int
Uint128 = int
Uint256 = int
Address = str
Bytes32 = bytes


# ─────────────────────────────────────────────
# Example PyVax contracts (shipped with the SDK)
# ─────────────────────────────────────────────

class SimpleStorage(Contract):
    """Minimal storage contract — stores a single integer."""

    stored_data: int = 0

    @action
    def set(self, value: int):
        """Set stored data."""
        self.stored_data = value
        self.emit("DataStored", value)

    @action
    def get(self) -> int:
        """Get stored data."""
        return self.stored_data


class Counter(Contract):
    """Simple counter contract."""

    count: int = 0

    @action
    def increment(self):
        """Increment counter."""
        self.count = self.count + 1
        self.emit("Incremented", self.count)

    @action
    def decrement(self):
        """Decrement counter (floor of 0)."""
        if self.count > 0:
            self.count = self.count - 1
            self.emit("Decremented", self.count)

    @action
    def get_count(self) -> int:
        """Return current count."""
        return self.count

    @action
    def reset(self):
        """Reset counter to zero."""
        self.count = 0
        self.emit("Reset")


class AgentVault(Contract):
    """Production-ready vault contract used by PyVax AgentWallets."""

    balances: dict = {}
    total_deposits: int = 0

    @action
    def deposit(self, amount: int):
        """Deposit AVAX into this vault."""
        self.require(amount > 0, "Amount must be positive")
        sender = self.msg_sender()
        self.balances[sender] = self.balances.get(sender, 0) + amount
        self.total_deposits = self.total_deposits + amount
        self.emit("Deposit", sender, amount)

    @agent_action
    def autonomous_rebalance(self):
        """Rebalance logic exec'd exclusively by an AgentWallet."""
        pass

    @human_action
    def withdraw(self, amount: int):
        """Withdraw AVAX — only callable by human EOA, not agents."""
        sender = self.msg_sender()
        self.require(self.balances.get(sender, 0) >= amount, "Insufficient balance")
        self.balances[sender] = self.balances[sender] - amount
        self.total_deposits = self.total_deposits - amount
        self.emit("Withdraw", sender, amount)

    @action
    def balance_of(self, user: str) -> int:
        """Get balance for a specific address."""
        return self.balances.get(user, 0)

    @action
    def get_total_deposits(self) -> int:
        """Get total deposits across all users."""
        return self.total_deposits


def get_sample_contracts() -> Dict[str, str]:
    """Return sample PyVax Python contract source strings."""

    simple_storage_source = '''
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

    agent_vault_source = '''
from pyvax import Contract, action, agent_action, human_action

class AgentVault(Contract):
    balances: dict = {}
    total_deposits: int = 0

    @action
    def deposit(self, amount: int):
        sender = self.msg_sender()
        self.require(amount > 0, "Amount must be positive")
        self.balances[sender] = self.balances.get(sender, 0) + amount
        self.total_deposits += amount
        self.emit("Deposit", sender, amount)

    @agent_action
    def autonomous_rebalance(self):
        pass  # AI-driven rebalancing logic here

    @human_action
    def withdraw(self, amount: int):
        sender = self.msg_sender()
        self.require(self.balances.get(sender, 0) >= amount, "Insufficient balance")
        self.balances[sender] -= amount
        self.total_deposits -= amount
        self.emit("Withdraw", sender, amount)
'''

    return {
        "SimpleStorage": simple_storage_source,
        "AgentVault": agent_vault_source,
    }