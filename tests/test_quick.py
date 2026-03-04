"""Quick test to find failing test in v0.3.0"""
import sys
sys.path.insert(0, r"p:\pyvax-rebrand")
from avax_cli.transpiler import transpile_python_contract, PeepholeOptimizer

# Test optimizer reduces size
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

r0 = transpile_python_contract(VAULT_SRC, optimizer_level=0)
r1 = transpile_python_contract(VAULT_SRC, optimizer_level=1)
r3 = transpile_python_contract(VAULT_SRC, optimizer_level=3)
print(f"Level 0: {len(r0['bytecode'])} chars")
print(f"Level 1: {len(r1['bytecode'])} chars")
print(f"Level 3: {len(r3['bytecode'])} chars")
print(f"L3 <= L0? {len(r3['bytecode']) <= len(r0['bytecode'])}")
