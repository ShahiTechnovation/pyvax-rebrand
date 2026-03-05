"""ERC20 — standard fungible token contract."""
from pyvax import Contract, action


class ERC20(Contract):
    """ERC-20 compatible token contract."""

    total_supply: int = 0
    balances: dict = {}
    allowances: dict = {}
    name_: int = 0
    decimals_: int = 18

    @action
    def mint(self, to: str, amount: int):
        """Mint new tokens to an address."""
        self.require(amount > 0, "Amount must be positive")
        self.balances[to] = self.balances.get(to, 0) + amount
        self.total_supply = self.total_supply + amount
        self.emit("Transfer", 0, to, amount)

    @action
    def transfer(self, to: str, amount: int):
        """Transfer tokens to an address."""
        sender = self.msg_sender()
        self.require(self.balances.get(sender, 0) >= amount, "Insufficient balance")
        self.balances[sender] = self.balances[sender] - amount
        self.balances[to] = self.balances.get(to, 0) + amount
        self.emit("Transfer", sender, to, amount)

    @action
    def balance_of(self, owner: str) -> int:
        """Get token balance for an address."""
        return self.balances.get(owner, 0)

    @action
    def total_supply_of(self) -> int:
        """Get total token supply."""
        return self.total_supply
