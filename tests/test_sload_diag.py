"""Quick SLOAD cache diagnostic"""
import sys
sys.path.insert(0, r"p:\pyvax-rebrand")
from avax_cli.transpiler import transpile_python_contract

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
result = transpile_python_contract(SLOAD_SRC)
bc = bytes.fromhex(result["bytecode"][2:])
has_mload = 0x51 in bc
print(f"Bytecode length: {len(bc)} bytes")
print(f"Has MLOAD (0x51): {has_mload}")
print(f"MLOAD count: {bc.count(0x51)}")
print(f"SLOAD count: {bc.count(0x54)}")
