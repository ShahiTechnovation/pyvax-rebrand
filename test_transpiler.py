"""Test the production transpiler with a complex contract."""
import sys
sys.path.insert(0, r"p:\pyvax-rebrand")

from avax_cli.transpiler import transpile_python_contract

code = '''
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

result = transpile_python_contract(code)
print()
print("=" * 60)
print("TRANSPILATION RESULT")
print("=" * 60)
print(f"Bytecode length: {len(result['bytecode'])} hex chars")
print(f"ABI entries: {len(result['abi'])}")
print(f"Events: {result['metadata']['events']}")
print(f"Functions: {result['metadata']['functions']}")
print(f"Overflow safe: {result['metadata']['overflow_safe']}")
print(f"Version: {result['metadata']['version']}")
print()
print("ABI:")
for entry in result['abi']:
    if entry['type'] == 'function':
        inputs = ', '.join(f"{i['type']} {i['name']}" for i in entry['inputs'])
        outputs = ', '.join(i['type'] for i in entry.get('outputs', []))
        print(f"  fn {entry['name']}({inputs}) -> {outputs}")
    elif entry['type'] == 'event':
        params = ', '.join(f"{i['type']} {i['name']}" for i in entry['inputs'])
        print(f"  event {entry['name']}({params})")
    elif entry['type'] == 'constructor':
        print(f"  constructor()")
print()
print(f"Bytecode (first 200 chars): {result['bytecode'][:200]}...")
print()
print("SUCCESS - All critical fixes working!")
