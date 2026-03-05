"""AgentVault -- production vault for PyVax AgentWallets."""
from pyvax import Contract, action, agent_action, human_action


class AgentVault(Contract):
    """Production-ready vault for PyVax AgentWallets."""

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
        """Rebalance logic for AgentWallet only."""
        pass

    @human_action
    def withdraw(self, amount: int):
        """Withdraw AVAX -- only callable by human EOA."""
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
