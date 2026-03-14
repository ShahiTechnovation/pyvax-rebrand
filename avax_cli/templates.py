"""Contract templates for PyVax -- single source of truth."""

TEMPLATES = {
    "SimpleStorage": (
        '"""SimpleStorage -- minimal PyVax contract."""\n'
        "from pyvax import Contract, action\n\n\n"
        "class SimpleStorage(Contract):\n"
        '    """Simple storage contract -- stores a single integer."""\n\n'
        "    stored_data: int = 0\n\n"
        "    @action\n"
        "    def set(self, value: int):\n"
        '        """Set stored data."""\n'
        "        self.stored_data = value\n"
        '        self.emit("DataStored", value)\n\n'
        "    @action\n"
        "    def get(self) -> int:\n"
        '        """Get stored data."""\n'
        "        return self.stored_data\n"
    ),
    "Counter": (
        '"""Counter -- increment/decrement contract."""\n'
        "from pyvax import Contract, action\n\n\n"
        "class Counter(Contract):\n"
        '    """Simple counter contract."""\n\n'
        "    count: int = 0\n\n"
        "    @action\n"
        "    def increment(self):\n"
        '        """Increment counter."""\n'
        "        self.count = self.count + 1\n"
        '        self.emit("Incremented", self.count)\n\n'
        "    @action\n"
        "    def decrement(self):\n"
        '        """Decrement counter (floor of 0)."""\n'
        "        if self.count > 0:\n"
        "            self.count = self.count - 1\n"
        '            self.emit("Decremented", self.count)\n\n'
        "    @action\n"
        "    def get_count(self) -> int:\n"
        '        """Return current count."""\n'
        "        return self.count\n\n"
        "    @action\n"
        "    def reset(self):\n"
        '        """Reset counter to zero."""\n'
        "        self.count = 0\n"
        '        self.emit("Reset")\n'
    ),
    "ERC20": (
        '"""ERC20 -- standard fungible token contract."""\n'
        "from pyvax import Contract, action\n\n\n"
        "class ERC20(Contract):\n"
        '    """ERC-20 compatible token contract."""\n\n'
        "    total_supply: int = 0\n"
        "    balances: dict = {}\n"
        "    allowances: dict = {}\n"
        "    decimals_: int = 18\n\n"
        "    @action\n"
        "    def mint(self, to: str, amount: int):\n"
        '        """Mint new tokens to an address."""\n'
        '        self.require(amount > 0, "Amount must be positive")\n'
        "        self.balances[to] = self.balances.get(to, 0) + amount\n"
        "        self.total_supply = self.total_supply + amount\n"
        '        self.emit("Transfer", 0, to, amount)\n\n'
        "    @action\n"
        "    def transfer(self, to: str, amount: int):\n"
        '        """Transfer tokens to an address."""\n'
        "        sender = self.msg_sender()\n"
        '        self.require(self.balances.get(sender, 0) >= amount, "Insufficient balance")\n'
        "        self.balances[sender] = self.balances[sender] - amount\n"
        "        self.balances[to] = self.balances.get(to, 0) + amount\n"
        '        self.emit("Transfer", sender, to, amount)\n\n'
        "    @action\n"
        "    def balance_of(self, owner: str) -> int:\n"
        '        """Get token balance for an address."""\n'
        "        return self.balances.get(owner, 0)\n\n"
        "    @action\n"
        "    def total_supply_of(self) -> int:\n"
        '        """Get total token supply."""\n'
        "        return self.total_supply\n"
    ),
    "AgentVault": (
        '"""AgentVault -- production vault for PyVax AgentWallets."""\n'
        "from pyvax import Contract, action, agent_action, human_action\n\n\n"
        "class AgentVault(Contract):\n"
        '    """Production-ready vault for PyVax AgentWallets."""\n\n'
        "    balances: dict = {}\n"
        "    total_deposits: int = 0\n\n"
        "    @action\n"
        "    def deposit(self, amount: int):\n"
        '        """Deposit AVAX into this vault."""\n'
        '        self.require(amount > 0, "Amount must be positive")\n'
        "        sender = self.msg_sender()\n"
        "        self.balances[sender] = self.balances.get(sender, 0) + amount\n"
        "        self.total_deposits = self.total_deposits + amount\n"
        '        self.emit("Deposit", sender, amount)\n\n'
        "    @agent_action\n"
        "    def autonomous_rebalance(self):\n"
        '        """Rebalance logic for AgentWallet only."""\n'
        "        pass\n\n"
        "    @human_action\n"
        "    def withdraw(self, amount: int):\n"
        '        """Withdraw AVAX -- only callable by human EOA."""\n'
        "        sender = self.msg_sender()\n"
        '        self.require(self.balances.get(sender, 0) >= amount, "Insufficient balance")\n'
        "        self.balances[sender] = self.balances[sender] - amount\n"
        "        self.total_deposits = self.total_deposits - amount\n"
        '        self.emit("Withdraw", sender, amount)\n\n'
        "    @action\n"
        "    def balance_of(self, user: str) -> int:\n"
        '        """Get balance for a specific address."""\n'
        "        return self.balances.get(user, 0)\n\n"
        "    @action\n"
        "    def get_total_deposits(self) -> int:\n"
        '        """Get total deposits across all users."""\n'
        "        return self.total_deposits\n"
    ),
    "Voting": (
        '"""Voting -- decentralized voting contract."""\n'
        "from pyvax import Contract, action\n\n\n"
        "class Voting(Contract):\n"
        '    """Simple on-chain voting contract."""\n\n'
        "    votes: dict = {}\n"
        "    voter_status: dict = {}\n"
        "    total_votes: int = 0\n\n"
        "    @action\n"
        "    def vote(self, candidate_id: int):\n"
        '        """Cast a vote for a candidate."""\n'
        "        sender = self.msg_sender()\n"
        '        self.require(self.voter_status.get(sender, 0) == 0, "Already voted")\n'
        "        self.voter_status[sender] = 1\n"
        "        self.votes[candidate_id] = self.votes.get(candidate_id, 0) + 1\n"
        "        self.total_votes = self.total_votes + 1\n"
        '        self.emit("VoteCast", sender, candidate_id)\n\n'
        "    @action\n"
        "    def get_votes(self, candidate_id: int) -> int:\n"
        '        """Get vote count for a candidate."""\n'
        "        return self.votes.get(candidate_id, 0)\n\n"
        "    @action\n"
        "    def get_total_votes(self) -> int:\n"
        '        """Get total votes cast."""\n'
        "        return self.total_votes\n"
    ),
}
