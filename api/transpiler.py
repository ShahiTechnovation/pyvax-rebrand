"""Python to EVM bytecode transpiler for PyVax smart contracts."""

import ast
import json
import hashlib
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, field
from enum import Enum

from Crypto.Hash import keccak
from rich.console import Console

console = Console()


def keccak256(data: bytes) -> bytes:
    """Calculate keccak256 hash."""
    k = keccak.new(digest_bits=256)
    k.update(data)
    return k.digest()


def function_selector(signature: str) -> bytes:
    """Generate 4-byte function selector from ABI signature."""
    return keccak256(signature.encode("utf-8"))[:4]


def event_topic(signature: str) -> bytes:
    """Generate 32-byte event topic hash from event signature."""
    return keccak256(signature.encode("utf-8"))


class EVMOpcode(Enum):
    """Complete EVM opcode set for bytecode generation."""
    # ── Stop & Arithmetic ──
    STOP        = 0x00
    ADD         = 0x01
    MUL         = 0x02
    SUB         = 0x03
    DIV         = 0x04
    SDIV        = 0x05
    MOD         = 0x06
    SMOD        = 0x07
    ADDMOD      = 0x08
    MULMOD      = 0x09
    EXP         = 0x0a
    SIGNEXTEND  = 0x0b

    # ── Comparison ──
    LT          = 0x10
    GT          = 0x11
    SLT         = 0x12
    SGT         = 0x13
    EQ          = 0x14
    ISZERO      = 0x15

    # ── Bitwise ──
    AND         = 0x16
    OR          = 0x17
    XOR         = 0x18
    NOT         = 0x19
    BYTE        = 0x1a
    SHL         = 0x1b
    SHR         = 0x1c
    SAR         = 0x1d

    # ── Hashing ──
    SHA3        = 0x20

    # ── Environment ──
    ADDRESS     = 0x30
    BALANCE     = 0x31
    ORIGIN      = 0x32
    CALLER      = 0x33
    CALLVALUE   = 0x34
    CALLDATALOAD = 0x35
    CALLDATASIZE = 0x36
    CALLDATACOPY = 0x37
    CODESIZE    = 0x38
    CODECOPY    = 0x39
    GASPRICE    = 0x3a
    EXTCODESIZE = 0x3b
    RETURNDATASIZE = 0x3d
    RETURNDATACOPY = 0x3e

    # ── Block ──
    BLOCKHASH   = 0x40
    COINBASE    = 0x41
    TIMESTAMP   = 0x42
    NUMBER      = 0x43
    DIFFICULTY  = 0x44
    GASLIMIT    = 0x45
    CHAINID     = 0x46
    SELFBALANCE = 0x47
    BASEFEE     = 0x48

    # ── Stack (POP) ──
    POP         = 0x50

    # ── Memory ──
    MLOAD       = 0x51
    MSTORE      = 0x52
    MSTORE8     = 0x53

    # ── Storage ──
    SLOAD       = 0x54
    SSTORE      = 0x55

    # ── Control Flow ──
    JUMP        = 0x56
    JUMPI       = 0x57
    PC          = 0x58
    MSIZE       = 0x59
    GAS         = 0x5a
    JUMPDEST    = 0x5b

    # ── Push ──
    PUSH1       = 0x60
    PUSH2       = 0x61
    PUSH4       = 0x63
    PUSH20      = 0x73
    PUSH32      = 0x7f

    # ── Dup ──
    DUP1        = 0x80
    DUP2        = 0x81
    DUP3        = 0x82
    DUP4        = 0x83
    DUP5        = 0x84
    DUP6        = 0x85

    # ── Swap ──
    SWAP1       = 0x90
    SWAP2       = 0x91
    SWAP3       = 0x92
    SWAP4       = 0x93

    # ── Log (Events) ──
    LOG0        = 0xa0
    LOG1        = 0xa1
    LOG2        = 0xa2
    LOG3        = 0xa3
    LOG4        = 0xa4

    # ── System ──
    CREATE      = 0xf0
    CALL        = 0xf1
    CALLCODE    = 0xf2
    RETURN      = 0xf3
    DELEGATECALL = 0xf4
    CREATE2     = 0xf5
    STATICCALL  = 0xfa
    REVERT      = 0xfd
    INVALID     = 0xfe
    SELFDESTRUCT = 0xff


@dataclass
class ContractState:
    """Represents PyVax smart contract state variables."""
    variables: Dict[str, int]        # Variable name → storage slot
    functions: Dict[str, int]        # Function name → bytecode offset
    events: Dict[str, List[str]]     # Event name → parameter types
    initial_values: Dict[str, Any]   # Variable initial values
    variable_types: Dict[str, str]   # Variable name → EVM type
    mappings: Dict[str, Dict] = None # Mapping/Array metadata
    next_slot: int = 0


@dataclass
class GasCost:
    """Gas costs for different EVM operations."""
    SLOAD = 100
    SSTORE_SET = 20000
    SSTORE_RESET = 2900
    SHA3 = 30
    ARITHMETIC = 3
    MEMORY = 3
    CALL = 700


# ─────────────────────────────────────────────────────────
# PyVax AST Analyzer
# ─────────────────────────────────────────────────────────

# All decorator names recognized as "public function" variants
PYVAX_ACTION_DECORATORS = {"action", "agent_action", "human_action", "public_function"}
PYVAX_VIEW_DECORATORS = {"view_function"}

# Base class names recognized as PyVax contracts
PYVAX_BASE_CLASSES = {"Contract", "PySmartContract"}


class PythonASTAnalyzer(ast.NodeVisitor):
    """Analyzes Python AST to extract PyVax contract components."""

    def __init__(self):
        self.state_vars: Dict[str, int] = {}
        self.initial_values: Dict[str, Any] = {}
        self.variable_types: Dict[str, str] = {}
        self.functions: Dict[str, Any] = {}
        self.events: Dict[str, List[str]] = {}
        self.mappings: Dict[str, Dict] = {}
        self.current_function: Optional[str] = None
        self.next_slot: int = 0
        self.bytecode_chunks: list = []

    def analyze_contract(self, source_code: str) -> ContractState:
        """Analyze PyVax Python source code and return a ContractState."""
        tree = ast.parse(source_code)
        self.visit(tree)

        return ContractState(
            variables=self.state_vars,
            functions=self.functions,
            events=self.events,
            initial_values=self.initial_values,
            variable_types=self.variable_types,
            mappings=self.mappings,
        )

    def visit_ClassDef(self, node: ast.ClassDef):
        """Visit class definition (PyVax contract)."""
        console.print(f"[blue]Analyzing contract: {node.name}[/blue]")

        # Check inheritance from Contract or PySmartContract
        for base in node.bases:
            if isinstance(base, ast.Name) and base.id in PYVAX_BASE_CLASSES:
                self.generic_visit(node)
                break

    def visit_FunctionDef(self, node: ast.FunctionDef):
        """Visit function definition."""
        if node.name == "__init__":
            self.current_function = node.name
            console.print(f"[green]Found constructor: {node.name}[/green]")
            self.generic_visit(node)
            self.current_function = None
            return

        if node.name.startswith("_"):
            return  # Skip private helpers

        self.current_function = node.name
        console.print(f"[green]Found function: {node.name}[/green]")

        # Resolve visibility from decorators
        is_public = any(
            (isinstance(d, ast.Name) and d.id in PYVAX_ACTION_DECORATORS) or
            (isinstance(d, ast.Attribute) and d.attr in PYVAX_ACTION_DECORATORS)
            for d in node.decorator_list
        )
        is_view = any(
            (isinstance(d, ast.Name) and d.id in PYVAX_VIEW_DECORATORS) or
            (isinstance(d, ast.Attribute) and d.attr in PYVAX_VIEW_DECORATORS)
            for d in node.decorator_list
        )
        is_agent_only = any(
            (isinstance(d, ast.Name) and d.id == "agent_action") or
            (isinstance(d, ast.Attribute) and d.attr == "agent_action")
            for d in node.decorator_list
        )
        is_human_only = any(
            (isinstance(d, ast.Name) and d.id == "human_action") or
            (isinstance(d, ast.Attribute) and d.attr == "human_action")
            for d in node.decorator_list
        )

        # Default to public if no explicit decorator
        if not is_public and not is_view:
            is_public = True
            console.print(f"[cyan]Assuming public: {node.name}[/cyan]")

        # Resolve parameter types from type annotations
        param_types = []
        for arg in node.args.args:
            if arg.arg == "self":
                continue
            if arg.annotation:
                if isinstance(arg.annotation, ast.Name):
                    ann = arg.annotation.id
                    if ann == "str":
                        param_types.append("address")
                    elif ann == "int":
                        param_types.append("uint256")
                    elif ann == "bool":
                        param_types.append("bool")
                    else:
                        param_types.append("uint256")
                else:
                    param_types.append("uint256")
            else:
                param_types.append("uint256")

        # Resolve return type
        has_return = any(
            isinstance(stmt, ast.Return) and stmt.value is not None
            for stmt in ast.walk(node)
        )
        return_type = "uint256"

        if node.returns:
            if isinstance(node.returns, ast.Name):
                rmap = {"int": "uint256", "bool": "bool", "str": "string", "list": "bytes32[]"}
                return_type = rmap.get(node.returns.id, "uint256")

        self.functions[node.name] = {
            "is_public": is_public,
            "is_view": is_view,
            "is_agent_only": is_agent_only,
            "is_human_only": is_human_only,
            "args": [arg.arg for arg in node.args.args if arg.arg != "self"],
            "param_types": param_types,
            "body": node.body,
            "has_return": has_return,
            "return_type": return_type,
        }

        self.generic_visit(node)
        self.current_function = None

    def visit_AnnAssign(self, node: ast.AnnAssign):
        """Visit annotated class-level assignment (e.g. balance: int = 0)."""
        # Only handle class-body annotations (not inside methods)
        if self.current_function is not None:
            return
        if not isinstance(node.target, ast.Name):
            return

        var_name = node.target.id
        if var_name not in self.state_vars:
            self.state_vars[var_name] = self.next_slot
            self.next_slot += 1
            console.print(f"[yellow]State var (annotated): {var_name}[/yellow]")

        # Resolve type from annotation
        if isinstance(node.annotation, ast.Name):
            ann = node.annotation.id
            if ann == "dict":
                self.variable_types[var_name] = "mapping"
                self.mappings[var_name] = {
                    "key_type": "address",
                    "value_type": "uint256",
                    "base_slot": self.state_vars[var_name],
                }
                self.initial_values[var_name] = {}
            elif ann in ("int", "Uint256", "Uint128", "Uint64", "Uint32", "Uint16", "Uint8"):
                self.variable_types[var_name] = "uint256"
                self.initial_values[var_name] = 0
            elif ann in ("str", "Address"):
                self.variable_types[var_name] = "address"
                self.initial_values[var_name] = 0
            elif ann == "bool":
                self.variable_types[var_name] = "bool"
                self.initial_values[var_name] = False
            else:
                self.variable_types[var_name] = "uint256"
                self.initial_values[var_name] = 0
        else:
            self.variable_types[var_name] = "uint256"
            self.initial_values[var_name] = 0

        # Override with default value if provided
        if node.value is not None:
            if isinstance(node.value, ast.Constant):
                self.initial_values[var_name] = node.value.value
            elif isinstance(node.value, ast.Dict):
                self.initial_values[var_name] = {}
                self.variable_types[var_name] = "mapping"

    def visit_Assign(self, node: ast.Assign):
        """Visit assignment operations inside __init__ to capture state vars."""
        if len(node.targets) == 1 and isinstance(node.targets[0], ast.Attribute):
            attr = node.targets[0]
            if isinstance(attr.value, ast.Name) and attr.value.id == "self":
                var_name = attr.attr

                if var_name not in self.state_vars:
                    self.state_vars[var_name] = self.next_slot
                    self.next_slot += 1
                    console.print(f"[yellow]State variable: {var_name}[/yellow]")

                if isinstance(node.value, ast.Dict):
                    self.initial_values[var_name] = {}
                    self.variable_types[var_name] = "mapping"
                    self.mappings[var_name] = {
                        "key_type": "address",
                        "value_type": "uint256",
                        "base_slot": self.state_vars[var_name],
                    }
                elif isinstance(node.value, ast.Constant):
                    val = node.value.value
                    if isinstance(val, str):
                        if len(val) == 42 and val.startswith("0x"):
                            self.initial_values[var_name] = int(val, 16)
                            self.variable_types[var_name] = "address"
                        else:
                            str_bytes = val.encode("utf-8")[:32]
                            self.initial_values[var_name] = int.from_bytes(
                                str_bytes.ljust(32, b"\x00"), "big"
                            )
                            self.variable_types[var_name] = "bytes32"
                    elif isinstance(val, bool):
                        self.initial_values[var_name] = int(val)
                        self.variable_types[var_name] = "bool"
                    else:
                        self.initial_values[var_name] = val
                        self.variable_types[var_name] = "uint256"
                elif isinstance(node.value, ast.List):
                    self.initial_values[var_name] = len(node.value.elts)
                    self.variable_types[var_name] = "bytes32[]"
                    self.mappings[var_name] = {
                        "type": "array",
                        "value_type": "bytes32",
                        "base_slot": self.state_vars[var_name],
                    }
                else:
                    self.initial_values[var_name] = 0
                    self.variable_types[var_name] = "uint256"

                if self.current_function == "__init__":
                    console.print(
                        f"[cyan]Constructor init: {var_name} = {self.initial_values.get(var_name, 0)}[/cyan]"
                    )

        self.generic_visit(node)


# ─────────────────────────────────────────────────────────
# EVM Bytecode Generator (unchanged logic, renamed refs)
# ─────────────────────────────────────────────────────────

class EVMBytecodeGenerator:
    """Generates production-grade EVM bytecode from an analyzed PyVax contract."""

    def __init__(self, overflow_safe: bool = True):
        self.init_code = bytearray()
        self.runtime_code = bytearray()
        self.gas_used = 0
        self.jump_table: Dict[str, int] = {}
        self.function_offsets: Dict[str, int] = {}
        self.current_mode = "init"
        self.current_state: Optional[ContractState] = None
        self.current_function_args: list = []
        self.overflow_safe = overflow_safe
        self.is_view_function = False
        self._overflow_revert_offset: Optional[int] = None
        self._next_free_memory = 0x80  # Solidity-style free memory pointer
        self._local_vars: Dict[str, int] = {}  # var_name → memory offset
        self._overflow_jump_positions: List[int] = []  # byte positions to backpatch
        # ── SLOAD cache (Solc CSE-style) ──
        self._sload_cache: Dict[str, int] = {}  # var_name → memory offset of cached value
        # ── Shared revert dedup (Vyper-style) ──
        self._shared_revert_blocks: Dict[str, List[int]] = {}  # msg → [placeholder_positions]
        # ── Stack depth validator (py-evm-style) ──
        self._stack_depth = 0
        self._max_stack_depth = 0

    # Stack depth deltas per opcode value (py-evm reference)
    _STACK_DELTAS = {
        0x01: -1, 0x02: -1, 0x03: -1, 0x04: -1, 0x05: -1,  # ADD..SIGNEXTEND
        0x06: -1, 0x07: -1, 0x08: -2, 0x09: -2, 0x0a: -1, 0x0b: -1,
        0x10: -1, 0x11: -1, 0x12: -1, 0x13: -1, 0x14: -1,  # LT..EQ
        0x15: 0,   # ISZERO
        0x16: -1, 0x17: -1, 0x18: -1, 0x19: 0,  # AND..NOT
        0x1a: -1, 0x1b: -1, 0x1c: -1, 0x1d: -1, 0x20: -1,  # BYTE..SHA3
        0x30: 1, 0x31: 0, 0x32: 1, 0x33: 1, 0x34: 1,  # ADDRESS..CALLVALUE
        0x35: 0, 0x36: 1, 0x37: -3, 0x38: 1, 0x39: -3,  # CALLDATALOAD..CODECOPY
        0x3a: 1, 0x3b: 0, 0x3d: 1, 0x3e: -3,
        0x42: 1, 0x43: 1, 0x46: 1, 0x47: 1,  # TIMESTAMP..SELFBALANCE
        0x50: -1,  # POP
        0x51: 0, 0x52: -2, 0x53: -2,  # MLOAD, MSTORE, MSTORE8
        0x54: 0, 0x55: -2,  # SLOAD, SSTORE
        0x56: -1, 0x57: -2, 0x5b: 0,  # JUMP, JUMPI, JUMPDEST
        0xa0: -2, 0xa1: -3, 0xa2: -4, 0xa3: -5, 0xa4: -6,  # LOG0-4
        0xf3: -2, 0xfd: -2, 0xff: -1,  # RETURN, REVERT, SELFDESTRUCT
    }
    # DUP1-16 (+1) and SWAP1-16 (0) handled by range check in emit_opcode

    def emit_opcode(self, opcode: EVMOpcode, gas_cost: int = 0):
        if self.current_mode == "init":
            self.init_code.append(opcode.value)
        else:
            self.runtime_code.append(opcode.value)
        self.gas_used += gas_cost
        # Stack depth tracking
        v = opcode.value
        if 0x80 <= v <= 0x8f:    # DUP1-16
            delta = 1
        elif 0x90 <= v <= 0x9f:  # SWAP1-16
            delta = 0
        else:
            delta = self._STACK_DELTAS.get(v, 0)
        self._stack_depth += delta
        if self._stack_depth > self._max_stack_depth:
            self._max_stack_depth = self._stack_depth
        if self._stack_depth > 1024:
            raise RuntimeError(
                f"[PyVax CompileError] Stack overflow at depth {self._stack_depth} "
                f"(EVM max=1024). Simplify expression or split into sub-calls."
            )
        self._stack_depth = max(0, self._stack_depth)

    def emit_push(self, value: Union[int, bytes, str], size: int = None):
        if isinstance(value, int):
            if size is None:
                size = 1 if value == 0 else (value.bit_length() + 7) // 8
            value_bytes = value.to_bytes(size, "big")
        elif isinstance(value, str):
            str_bytes = value.encode("utf-8")[:32]
            value_bytes = str_bytes.ljust(32, b"\x00")
            size = 32
        else:
            value_bytes = value
            size = len(value_bytes)

        push_opcode = EVMOpcode.PUSH1.value + size - 1
        if self.current_mode == "init":
            self.init_code.append(push_opcode)
            self.init_code.extend(value_bytes)
        else:
            self.runtime_code.append(push_opcode)
            self.runtime_code.extend(value_bytes)
        self.gas_used += GasCost.ARITHMETIC
        self._stack_depth += 1  # PUSH adds one item
        if self._stack_depth > self._max_stack_depth:
            self._max_stack_depth = self._stack_depth

    def emit_bytes(self, data: bytes):
        if self.current_mode == "init":
            self.init_code.extend(data)
        else:
            self.runtime_code.extend(data)

    def get_current_offset(self) -> int:
        return len(self.init_code) if self.current_mode == "init" else len(self.runtime_code)

    def set_mode(self, mode: str):
        self.current_mode = mode

    def _alloc_memory(self, size: int = 32) -> int:
        """Allocate memory and return the offset."""
        offset = self._next_free_memory
        self._next_free_memory += size
        return offset

    def _record_overflow_jump(self):
        """Record next PUSH2 position for overflow revert backpatching.
        Must be called immediately before emit_push(0x0000, 2)."""
        pos = self.get_current_offset() + 1  # +1 skips the PUSH2 opcode byte
        self._overflow_jump_positions.append(pos)

    # ── SLOAD Cache (Solidity CSE pass #17) ────────────────────────

    def _prescan_sload_usage(self, stmts: list, state: ContractState) -> Dict[str, int]:
        """Pre-scan function body to find state vars read >1 time but never written.
        Returns {var_name: read_count} for cacheable variables."""
        reads: Dict[str, int] = {}
        writes: set = set()
        for node in ast.walk(ast.Module(body=stmts, type_ignores=[])):
            # Track reads: self.var
            if isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name):
                if node.value.id == "self" and node.attr in state.variables:
                    if isinstance(getattr(node, 'ctx', None), ast.Load) or not hasattr(node, 'ctx'):
                        reads[node.attr] = reads.get(node.attr, 0) + 1
            # Track writes: self.var = ...
            if isinstance(node, ast.Assign):
                for t in node.targets:
                    if isinstance(t, ast.Attribute) and isinstance(t.value, ast.Name):
                        if t.value.id == "self":
                            writes.add(t.attr)
            if isinstance(node, ast.AugAssign):
                if isinstance(node.target, ast.Attribute) and isinstance(node.target.value, ast.Name):
                    if node.target.value.id == "self":
                        writes.add(node.target.attr)
        # Only cache vars read >1x and never written
        return {v: c for v, c in reads.items() if c > 1 and v not in writes}

    def _preload_sload_cache(self, cacheable: Dict[str, int], state: ContractState):
        """Emit SLOAD + MSTORE for each cacheable var at function entry."""
        self._sload_cache = {}
        for var_name in cacheable:
            slot = state.variables[var_name]
            mem = self._alloc_memory(32)
            self._sload_cache[var_name] = mem
            self.emit_push(slot)
            self.emit_opcode(EVMOpcode.SLOAD)
            self.emit_push(mem)
            self.emit_opcode(EVMOpcode.MSTORE)

    # ── Binary Search Dispatch (Huff-style) ─────────────────────

    def _emit_binary_dispatch(self, sorted_entries, func_jump_placeholders):
        """Emit binary search tree dispatch for sorted (selector, func_name) pairs.
        Falls back to linear for ≤3 entries."""
        if len(sorted_entries) <= 3:
            # Linear leaf: DUP1/PUSH4/EQ/PUSH2/JUMPI per entry
            for selector, func_name in sorted_entries:
                self.emit_opcode(EVMOpcode.DUP1)
                self.emit_push(selector, 4)
                self.emit_opcode(EVMOpcode.EQ)
                placeholder = self.get_current_offset()
                self.emit_push(0xEEEE, 2)
                self.emit_opcode(EVMOpcode.JUMPI)
                func_jump_placeholders[func_name] = placeholder
            return

        # Binary split at midpoint
        mid = len(sorted_entries) // 2
        pivot_sel = sorted_entries[mid][0]

        # selector < pivot?  → jump to left subtree
        self.emit_opcode(EVMOpcode.DUP1)
        self.emit_push(pivot_sel, 4)
        self.emit_opcode(EVMOpcode.LT)
        left_placeholder = self.get_current_offset()
        self.emit_push(0xCCCC, 2)
        self.emit_opcode(EVMOpcode.JUMPI)

        # Right subtree (selector >= pivot) — falls through
        self._emit_binary_dispatch(sorted_entries[mid:], func_jump_placeholders)

        # Left subtree target
        left_target = self.get_current_offset()
        self.emit_opcode(EVMOpcode.JUMPDEST)
        self._backpatch_jump_target(left_placeholder + 1, left_target, 2)
        self._emit_binary_dispatch(sorted_entries[:mid], func_jump_placeholders)

    def compile_expr(self, node: ast.AST, arg_map: Dict[str, int] = None) -> None:
        if arg_map is None:
            arg_map = {}

        if isinstance(node, ast.Constant):
            if node.value is True:
                self.emit_push(1)
            elif node.value is False or node.value is None:
                self.emit_push(0)
            elif isinstance(node.value, int):
                self.emit_push(node.value)
            elif isinstance(node.value, str):
                self.emit_push(node.value)
            else:
                self.emit_push(0)
        elif isinstance(node, ast.Num):
            self.emit_push(node.n)
        elif isinstance(node, ast.NameConstant):
            if node.value is True:
                self.emit_push(1)
            else:
                self.emit_push(0)
        elif isinstance(node, ast.Name):
            if node.id in self._local_vars:
                mem_offset = self._local_vars[node.id]
                self.emit_push(mem_offset)
                self.emit_opcode(EVMOpcode.MLOAD)
            elif node.id in arg_map:
                offset = 4 + arg_map[node.id] * 32
                self.emit_push(offset)
                self.emit_opcode(EVMOpcode.CALLDATALOAD)
            elif node.id == "True":
                self.emit_push(1)
            elif node.id == "False":
                self.emit_push(0)
            else:
                self.emit_push(0)
        elif isinstance(node, ast.Call):
            # Handle self.msg_sender(), self.msg_value(), etc.
            if isinstance(node.func, ast.Attribute):
                if (isinstance(node.func.value, ast.Name) and
                        node.func.value.id == "self"):
                    method = node.func.attr
                    if method == "msg_sender":
                        self.emit_opcode(EVMOpcode.CALLER)
                        return
                    elif method == "msg_value":
                        self.emit_opcode(EVMOpcode.CALLVALUE)
                        return
                    elif method == "block_number":
                        self.emit_opcode(EVMOpcode.NUMBER)
                        return
                    elif method == "block_timestamp":
                        self.emit_opcode(EVMOpcode.TIMESTAMP)
                        return
                    elif method == "chain_id":
                        self.emit_opcode(EVMOpcode.CHAINID)
                        return
                    elif method == "address":
                        self.emit_opcode(EVMOpcode.ADDRESS)
                        return
                    elif method == "balance":
                        self.emit_opcode(EVMOpcode.SELFBALANCE)
                        return
            # Fallback for unhandled calls
            self.emit_push(0)
        elif isinstance(node, ast.Attribute):
            if (
                isinstance(node.value, ast.Name)
                and node.value.id == "self"
                and self.current_state
                and node.attr in self.current_state.variables
            ):
                # SLOAD cache hit → MLOAD from cache (3 gas vs 2100 gas cold)
                if node.attr in self._sload_cache:
                    mem = self._sload_cache[node.attr]
                    self.emit_push(mem)
                    self.emit_opcode(EVMOpcode.MLOAD)
                else:
                    slot = self.current_state.variables[node.attr]
                    self.emit_push(slot)
                    self.emit_opcode(EVMOpcode.SLOAD)
            else:
                self.emit_push(0)
        elif isinstance(node, ast.Subscript):
            if (
                isinstance(node.value, ast.Attribute)
                and isinstance(node.value.value, ast.Name)
                and node.value.value.id == "self"
                and self.current_state
            ):
                mapping_name = node.value.attr
                if mapping_name in self.current_state.variables:
                    base_slot = self.current_state.variables[mapping_name]
                    self.compile_expr(node.slice, arg_map)
                    self.emit_push(0x00)
                    self.emit_opcode(EVMOpcode.MSTORE)
                    self.emit_push(base_slot)
                    self.emit_push(0x20)
                    self.emit_opcode(EVMOpcode.MSTORE)
                    self.emit_push(0x40)
                    self.emit_push(0x00)
                    self.emit_opcode(EVMOpcode.SHA3)
                    self.emit_opcode(EVMOpcode.SLOAD)
                else:
                    self.emit_push(0)
            else:
                self.emit_push(0)
        elif isinstance(node, ast.BinOp):
            if self.overflow_safe:
                self._compile_safe_binop(node, arg_map)
            else:
                self.compile_expr(node.left, arg_map)
                self.compile_expr(node.right, arg_map)
                if isinstance(node.op, (ast.Sub, ast.Div, ast.Mod)):
                    self.emit_opcode(EVMOpcode.SWAP1)
                op_map = {
                    ast.Add: EVMOpcode.ADD, ast.Sub: EVMOpcode.SUB,
                    ast.Mult: EVMOpcode.MUL, ast.Div: EVMOpcode.DIV,
                    ast.Mod: EVMOpcode.MOD,
                }
                for op_type, opcode in op_map.items():
                    if isinstance(node.op, op_type):
                        self.emit_opcode(opcode)
                        break
        elif isinstance(node, ast.UnaryOp):
            if isinstance(node.op, ast.Not):
                self.compile_expr(node.operand, arg_map)
                self.emit_opcode(EVMOpcode.ISZERO)
            elif isinstance(node.op, ast.USub):
                self.emit_push(0)
                self.compile_expr(node.operand, arg_map)
                self.emit_opcode(EVMOpcode.SUB)
            elif isinstance(node.op, ast.Invert):
                self.compile_expr(node.operand, arg_map)
                self.emit_opcode(EVMOpcode.NOT)
        elif isinstance(node, ast.BoolOp):
            if isinstance(node.op, ast.And):
                for i, val in enumerate(node.values):
                    self.compile_expr(val, arg_map)
                    if i > 0:
                        self.emit_opcode(EVMOpcode.AND)
            elif isinstance(node.op, ast.Or):
                for i, val in enumerate(node.values):
                    self.compile_expr(val, arg_map)
                    if i > 0:
                        self.emit_opcode(EVMOpcode.OR)
        elif isinstance(node, ast.Compare):
            self.compile_expr(node.left, arg_map)
            if len(node.ops) == 1 and len(node.comparators) == 1:
                self.compile_expr(node.comparators[0], arg_map)
                op = node.ops[0]
                if isinstance(op, ast.Eq):
                    self.emit_opcode(EVMOpcode.EQ)
                elif isinstance(op, ast.NotEq):
                    self.emit_opcode(EVMOpcode.EQ)
                    self.emit_opcode(EVMOpcode.ISZERO)
                elif isinstance(op, ast.Lt):
                    self.emit_opcode(EVMOpcode.SWAP1)
                    self.emit_opcode(EVMOpcode.LT)
                elif isinstance(op, ast.Gt):
                    self.emit_opcode(EVMOpcode.SWAP1)
                    self.emit_opcode(EVMOpcode.GT)
                elif isinstance(op, ast.LtE):
                    self.emit_opcode(EVMOpcode.SWAP1)
                    self.emit_opcode(EVMOpcode.GT)
                    self.emit_opcode(EVMOpcode.ISZERO)
                elif isinstance(op, ast.GtE):
                    self.emit_opcode(EVMOpcode.SWAP1)
                    self.emit_opcode(EVMOpcode.LT)
                    self.emit_opcode(EVMOpcode.ISZERO)
        else:
            self.emit_push(0)

    def _compile_safe_binop(self, node: ast.BinOp, arg_map: Dict[str, int]):
        """Compile arithmetic with Solidity 0.8-style overflow/underflow checks."""
        if isinstance(node.op, ast.Add):
            # a + b: overflow if result < a
            self.compile_expr(node.left, arg_map)    # stack: [a]
            self.emit_opcode(EVMOpcode.DUP1)          # stack: [a, a]
            self.compile_expr(node.right, arg_map)    # stack: [a, a, b]
            self.emit_opcode(EVMOpcode.ADD)            # stack: [a, result]
            self.emit_opcode(EVMOpcode.DUP1)           # stack: [a, result, result]
            self.emit_opcode(EVMOpcode.SWAP2)          # stack: [result, result, a]
            self.emit_opcode(EVMOpcode.GT)             # stack: [result, (a > result)] → 1 if overflow
            self._record_overflow_jump()
            self.emit_push(0x0000, 2)
            self.emit_opcode(EVMOpcode.JUMPI)          # stack: [result]
        elif isinstance(node.op, ast.Sub):
            # a - b: underflow if b > a
            self.compile_expr(node.left, arg_map)     # stack: [a]
            self.compile_expr(node.right, arg_map)    # stack: [a, b]
            self.emit_opcode(EVMOpcode.DUP2)           # stack: [a, b, a]
            self.emit_opcode(EVMOpcode.DUP2)           # stack: [a, b, a, b]
            self.emit_opcode(EVMOpcode.GT)             # stack: [a, b, (b > a)] → 1 if underflow
            self._record_overflow_jump()
            self.emit_push(0x0000, 2)
            self.emit_opcode(EVMOpcode.JUMPI)          # stack: [a, b]
            self.emit_opcode(EVMOpcode.SWAP1)          # stack: [b, a]
            self.emit_opcode(EVMOpcode.SUB)            # stack: [a - b]
        elif isinstance(node.op, ast.Mult):
            # a * b: overflow if a != 0 && (a*b)/a != b
            self.compile_expr(node.left, arg_map)     # stack: [a]
            self.compile_expr(node.right, arg_map)    # stack: [a, b]
            self.emit_opcode(EVMOpcode.DUP2)           # stack: [a, b, a]
            self.emit_opcode(EVMOpcode.DUP2)           # stack: [a, b, a, b]
            self.emit_opcode(EVMOpcode.MUL)            # stack: [a, b, result]
            # Check a == 0 → skip (no overflow possible)
            self.emit_opcode(EVMOpcode.DUP3)           # stack: [a, b, result, a]
            self.emit_opcode(EVMOpcode.ISZERO)         # stack: [a, b, result, (a==0)]
            skip_placeholder = self.get_current_offset()
            self.emit_push(0xFFFB, 2)
            self.emit_opcode(EVMOpcode.JUMPI)          # stack: [a, b, result]
            # a != 0: check result / a == b
            self.emit_opcode(EVMOpcode.DUP1)           # stack: [a, b, result, result]
            self.emit_opcode(EVMOpcode.DUP4)           # stack: [a, b, result, result, a]
            self.emit_opcode(EVMOpcode.SWAP1)          # stack: [a, b, result, a, result]
            self.emit_opcode(EVMOpcode.DIV)            # stack: [a, b, result, result/a]
            self.emit_opcode(EVMOpcode.DUP3)           # stack: [a, b, result, result/a, b]
            self.emit_opcode(EVMOpcode.EQ)             # stack: [a, b, result, (result/a==b)]
            self.emit_opcode(EVMOpcode.ISZERO)         # stack: [a, b, result, overflow?]
            self._record_overflow_jump()
            self.emit_push(0x0000, 2)
            self.emit_opcode(EVMOpcode.JUMPI)          # stack: [a, b, result]
            # Skip target for a==0 case
            skip_target = self.get_current_offset()
            self.emit_opcode(EVMOpcode.JUMPDEST)
            self._backpatch_jump_target(skip_placeholder + 1, skip_target, 2)
            # Clean stack: keep only result
            self.emit_opcode(EVMOpcode.SWAP2)          # stack: [result, b, a]
            self.emit_opcode(EVMOpcode.POP)            # stack: [result, b]
            self.emit_opcode(EVMOpcode.POP)            # stack: [result]
        else:
            # DIV, MOD — no overflow, just fix operand order
            self.compile_expr(node.left, arg_map)
            self.compile_expr(node.right, arg_map)
            self.emit_opcode(EVMOpcode.SWAP1)
            op_map = {ast.Div: EVMOpcode.DIV, ast.Mod: EVMOpcode.MOD}
            for op_type, opcode in op_map.items():
                if isinstance(node.op, op_type):
                    self.emit_opcode(opcode)
                    break

    # _get_or_create_overflow_revert removed — replaced by _record_overflow_jump

    def compile_stmt(self, node: ast.AST, arg_map: Dict[str, int] = None) -> None:
        if arg_map is None:
            arg_map = {}

        if isinstance(node, ast.Assign):
            if len(node.targets) == 1:
                target = node.targets[0]
                if (
                    isinstance(target, ast.Attribute)
                    and isinstance(target.value, ast.Name)
                    and target.value.id == "self"
                ):
                    var_name = target.attr
                    if self.current_state and var_name in self.current_state.variables:
                        if self.is_view_function:
                            console.print(f"[red]Warning: view function writes to {var_name}[/red]")
                        slot = self.current_state.variables[var_name]
                        self.compile_expr(node.value, arg_map)
                        self.emit_push(slot)
                        self.emit_opcode(EVMOpcode.SSTORE)
                elif isinstance(target, ast.Subscript):
                    if (
                        isinstance(target.value, ast.Attribute)
                        and isinstance(target.value.value, ast.Name)
                        and target.value.value.id == "self"
                        and self.current_state
                    ):
                        mapping_name = target.value.attr
                        if mapping_name in self.current_state.variables:
                            base_slot = self.current_state.variables[mapping_name]
                            self.compile_expr(node.value, arg_map)
                            self.compile_expr(target.slice, arg_map)
                            self.emit_push(0x00)
                            self.emit_opcode(EVMOpcode.MSTORE)
                            self.emit_push(base_slot)
                            self.emit_push(0x20)
                            self.emit_opcode(EVMOpcode.MSTORE)
                            self.emit_push(0x40)
                            self.emit_push(0x00)
                            self.emit_opcode(EVMOpcode.SHA3)
                            self.emit_opcode(EVMOpcode.SSTORE)
                elif isinstance(target, ast.Name):
                    # Local variable assignment — store in memory
                    if target.id not in self._local_vars:
                        self._local_vars[target.id] = self._alloc_memory(32)
                    mem_offset = self._local_vars[target.id]
                    self.compile_expr(node.value, arg_map)
                    self.emit_push(mem_offset)
                    self.emit_opcode(EVMOpcode.MSTORE)

        elif isinstance(node, ast.AugAssign):
            if (
                isinstance(node.target, ast.Attribute)
                and isinstance(node.target.value, ast.Name)
                and node.target.value.id == "self"
                and self.current_state
                and node.target.attr in self.current_state.variables
            ):
                var_name = node.target.attr
                slot = self.current_state.variables[var_name]
                self.emit_push(slot)
                self.emit_opcode(EVMOpcode.SLOAD)
                if isinstance(node.op, ast.Add) and self.overflow_safe:
                    # Safe ADD: overflow if result < old_val
                    self.emit_opcode(EVMOpcode.DUP1)       # [old, old]
                    self.compile_expr(node.value, arg_map)  # [old, old, rhs]
                    self.emit_opcode(EVMOpcode.ADD)         # [old, result]
                    self.emit_opcode(EVMOpcode.DUP1)        # [old, result, result]
                    self.emit_opcode(EVMOpcode.SWAP2)       # [result, result, old]
                    self.emit_opcode(EVMOpcode.GT)          # [result, (old>result)]
                    self._record_overflow_jump()
                    self.emit_push(0x0000, 2)
                    self.emit_opcode(EVMOpcode.JUMPI)       # [result]
                elif isinstance(node.op, ast.Sub) and self.overflow_safe:
                    # Safe SUB: underflow if rhs > old_val
                    self.compile_expr(node.value, arg_map)  # [old, rhs]
                    self.emit_opcode(EVMOpcode.DUP2)        # [old, rhs, old]
                    self.emit_opcode(EVMOpcode.DUP2)        # [old, rhs, old, rhs]
                    self.emit_opcode(EVMOpcode.GT)           # [old, rhs, (rhs>old)]
                    self._record_overflow_jump()
                    self.emit_push(0x0000, 2)
                    self.emit_opcode(EVMOpcode.JUMPI)       # [old, rhs]
                    self.emit_opcode(EVMOpcode.SWAP1)       # [rhs, old]
                    self.emit_opcode(EVMOpcode.SUB)         # [old - rhs]
                else:
                    self.compile_expr(node.value, arg_map)
                    if isinstance(node.op, ast.Add):
                        self.emit_opcode(EVMOpcode.ADD)
                    elif isinstance(node.op, ast.Sub):
                        self.emit_opcode(EVMOpcode.SWAP1)
                        self.emit_opcode(EVMOpcode.SUB)
                    elif isinstance(node.op, ast.Mult):
                        self.emit_opcode(EVMOpcode.MUL)
                self.emit_push(slot)
                self.emit_opcode(EVMOpcode.SSTORE)

        elif isinstance(node, ast.Return):
            if node.value is not None:
                self.compile_expr(node.value, arg_map)
                self.emit_push(0)
                self.emit_opcode(EVMOpcode.MSTORE)
                self.emit_push(32)
                self.emit_push(0)
                self.emit_opcode(EVMOpcode.RETURN)
            else:
                self.emit_push(0)
                self.emit_push(0)
                self.emit_opcode(EVMOpcode.RETURN)

        elif isinstance(node, ast.If):
            self._compile_if(node, arg_map)

        elif isinstance(node, ast.While):
            self._compile_while(node, arg_map)

        elif isinstance(node, ast.For):
            self._compile_for(node, arg_map)

        elif isinstance(node, ast.Expr):
            if isinstance(node.value, ast.Call):
                func = node.value.func
                # ── self.require(condition, message) ──
                if (isinstance(func, ast.Attribute)
                        and isinstance(func.value, ast.Name)
                        and func.value.id == "self"
                        and func.attr == "require"):
                    self._compile_require(node.value, arg_map)
                # ── self.emit("EventName", arg1, arg2, ...) ──
                elif (isinstance(func, ast.Attribute)
                        and isinstance(func.value, ast.Name)
                        and func.value.id == "self"
                        and func.attr == "emit"):
                    self._compile_emit(node.value, arg_map)
                # ── list.append ──
                elif (isinstance(func, ast.Attribute)
                        and func.attr == "append"
                        and isinstance(func.value, ast.Attribute)
                        and isinstance(func.value.value, ast.Name)
                        and func.value.value.id == "self"):
                    list_name = func.value.attr
                    if self.current_state and list_name in self.current_state.variables:
                        base_slot = self.current_state.variables[list_name]
                        self.emit_push(base_slot)
                        self.emit_opcode(EVMOpcode.SLOAD)
                        self.emit_push(base_slot)
                        self.emit_push(0x00)
                        self.emit_opcode(EVMOpcode.MSTORE)
                        self.emit_push(0x20)
                        self.emit_push(0x00)
                        self.emit_opcode(EVMOpcode.SHA3)
                        self.emit_opcode(EVMOpcode.DUP2)
                        self.emit_opcode(EVMOpcode.ADD)
                        if node.value.args:
                            self.compile_expr(node.value.args[0], arg_map)
                            self.emit_opcode(EVMOpcode.SWAP1)
                            self.emit_opcode(EVMOpcode.SSTORE)
                            self.emit_push(1)
                            self.emit_opcode(EVMOpcode.ADD)
                            self.emit_push(base_slot)
                            self.emit_opcode(EVMOpcode.SSTORE)

        elif isinstance(node, ast.Pass):
            pass  # No-op

    # ── require() → REVERT ──────────────────────────────────────────────

    def _compile_require(self, call_node: ast.Call, arg_map: Dict[str, int]):
        """Compile self.require(condition, msg) → conditional REVERT.
        Uses shared revert dedup: identical messages emit one block at footer."""
        if not call_node.args:
            return
        # Compile condition
        self.compile_expr(call_node.args[0], arg_map)

        if len(call_node.args) >= 2 and isinstance(call_node.args[1], ast.Constant):
            msg = str(call_node.args[1].value)
            # Shared revert dedup: ISZERO → PUSH2 shared_block → JUMPI
            # If condition is false (ISZERO → 1), jump to shared revert block
            self.emit_opcode(EVMOpcode.ISZERO)
            if msg not in self._shared_revert_blocks:
                self._shared_revert_blocks[msg] = []
            pos = self.get_current_offset() + 1  # position of PUSH2 data
            self._shared_revert_blocks[msg].append(pos)
            self.emit_push(0x0000, 2)  # placeholder — backpatched at footer
            self.emit_opcode(EVMOpcode.JUMPI)
            # No inline revert — 6 bytes total vs ~80 bytes inline
            return  # No skip JUMPDEST needed; we jump away on failure
        else:
            # No message → inline empty revert (not worth dedup)
            skip_placeholder = self.get_current_offset()
            self.emit_push(0xFFFB, 2)
            self.emit_opcode(EVMOpcode.JUMPI)
            self.emit_push(0)
            self.emit_push(0)
            self.emit_opcode(EVMOpcode.REVERT)
            skip_target = self.get_current_offset()
            self.emit_opcode(EVMOpcode.JUMPDEST)
        self._backpatch_jump_target(skip_placeholder + 1, skip_target, 2)

    # ── emit() → LOG opcodes ────────────────────────────────────────────

    def _compile_emit(self, call_node: ast.Call, arg_map: Dict[str, int]):
        """Compile self.emit("Event", arg1, ...) → LOG1-4 with event topic."""
        if not call_node.args:
            return
        # First arg is the event name string
        event_name_node = call_node.args[0]
        if not isinstance(event_name_node, ast.Constant) or not isinstance(event_name_node.value, str):
            return
        event_name = event_name_node.value
        data_args = call_node.args[1:]
        num_data = len(data_args)

        # Infer parameter types for the event signature
        param_types = []
        for arg in data_args:
            param_types.append("uint256")  # Default; refined when we have type info
        sig = f"{event_name}({','.join(param_types)})"
        topic_hash = event_topic(sig)

        # Store data args in memory starting at 0x80 (scratch space)
        mem_base = self._alloc_memory(max(num_data * 32, 32))  # Safe scratch for event data
        for i, arg in enumerate(data_args):
            self.compile_expr(arg, arg_map)
            self.emit_push(mem_base + i * 32)
            self.emit_opcode(EVMOpcode.MSTORE)

        data_size = num_data * 32

        # Push: topic0, data_size, data_offset → LOG1
        topic_int = int.from_bytes(topic_hash, "big")
        self.emit_push(topic_int, 32)  # topic0
        self.emit_push(data_size)       # size
        self.emit_push(mem_base)        # offset
        self.emit_opcode(EVMOpcode.LOG1)

    # ── if / elif / else ────────────────────────────────────────────────

    def _compile_if(self, node: ast.If, arg_map: Dict[str, int]):
        """Compile if/elif/else chains with proper jump backpatching."""
        self.compile_expr(node.test, arg_map)
        self.emit_opcode(EVMOpcode.ISZERO)
        else_placeholder = self.get_current_offset()
        self.emit_push(0xFFFE, 2)
        self.emit_opcode(EVMOpcode.JUMPI)

        for stmt in node.body:
            self.compile_stmt(stmt, arg_map)

        # Jump to end of if/elif/else chain
        end_placeholder = self.get_current_offset()
        self.emit_push(0xFFFD, 2)
        self.emit_opcode(EVMOpcode.JUMP)

        # Else / elif target
        else_target = self.get_current_offset()
        self.emit_opcode(EVMOpcode.JUMPDEST)
        self._backpatch_jump_target(else_placeholder + 1, else_target, 2)

        if node.orelse:
            if len(node.orelse) == 1 and isinstance(node.orelse[0], ast.If):
                # elif → recursively compile the chained if
                self._compile_if(node.orelse[0], arg_map)
            else:
                for stmt in node.orelse:
                    self.compile_stmt(stmt, arg_map)

        end_target = self.get_current_offset()
        self.emit_opcode(EVMOpcode.JUMPDEST)
        self._backpatch_jump_target(end_placeholder + 1, end_target, 2)

    # ── while loops ─────────────────────────────────────────────────────

    def _compile_while(self, node: ast.While, arg_map: Dict[str, int]):
        """Compile while loops: JUMPDEST → condition → ISZERO → exit → body → JUMP."""
        loop_start = self.get_current_offset()
        self.emit_opcode(EVMOpcode.JUMPDEST)

        self.compile_expr(node.test, arg_map)
        self.emit_opcode(EVMOpcode.ISZERO)
        exit_placeholder = self.get_current_offset()
        self.emit_push(0xFFFC, 2)
        self.emit_opcode(EVMOpcode.JUMPI)

        for stmt in node.body:
            self.compile_stmt(stmt, arg_map)

        self.emit_push(loop_start, 2)
        self.emit_opcode(EVMOpcode.JUMP)

        exit_target = self.get_current_offset()
        self.emit_opcode(EVMOpcode.JUMPDEST)
        self._backpatch_jump_target(exit_placeholder + 1, exit_target, 2)

    # ── for loops (range-based) ─────────────────────────────────────────

    def _compile_for(self, node: ast.For, arg_map: Dict[str, int]):
        """Compile for i in range(n): body → memory counter loop."""
        if not (isinstance(node.iter, ast.Call)
                and isinstance(node.iter.func, ast.Name)
                and node.iter.func.id == "range"):
            console.print("[yellow]Warning: only for..range() loops are supported[/yellow]")
            return

        loop_var = node.target.id if isinstance(node.target, ast.Name) else "_i"
        range_args = node.iter.args

        # Allocate memory for loop counter
        if loop_var not in self._local_vars:
            self._local_vars[loop_var] = self._alloc_memory(32)
        counter_mem = self._local_vars[loop_var]

        # Determine start and end values
        if len(range_args) == 1:
            # range(n) → start=0, end=n
            self.emit_push(0)
            self.emit_push(counter_mem)
            self.emit_opcode(EVMOpcode.MSTORE)
            end_node = range_args[0]
        elif len(range_args) >= 2:
            # range(start, end)
            self.compile_expr(range_args[0], arg_map)
            self.emit_push(counter_mem)
            self.emit_opcode(EVMOpcode.MSTORE)
            end_node = range_args[1]
        else:
            return

        # Loop start
        loop_start = self.get_current_offset()
        self.emit_opcode(EVMOpcode.JUMPDEST)

        # Load counter, compile end, check counter < end
        self.emit_push(counter_mem)
        self.emit_opcode(EVMOpcode.MLOAD)
        self.compile_expr(end_node, arg_map)
        # Stack: [counter, end]. GT: end > counter ≡ counter < end
        self.emit_opcode(EVMOpcode.GT)
        self.emit_opcode(EVMOpcode.ISZERO)
        exit_placeholder = self.get_current_offset()
        self.emit_push(0xFFFC, 2)
        self.emit_opcode(EVMOpcode.JUMPI)

        # Body
        for stmt in node.body:
            self.compile_stmt(stmt, arg_map)

        # Increment counter: counter = counter + 1
        self.emit_push(counter_mem)
        self.emit_opcode(EVMOpcode.MLOAD)
        self.emit_push(1)
        self.emit_opcode(EVMOpcode.ADD)
        self.emit_push(counter_mem)
        self.emit_opcode(EVMOpcode.MSTORE)

        # Jump back
        self.emit_push(loop_start, 2)
        self.emit_opcode(EVMOpcode.JUMP)

        exit_target = self.get_current_offset()
        self.emit_opcode(EVMOpcode.JUMPDEST)
        self._backpatch_jump_target(exit_placeholder + 1, exit_target, 2)

    def _backpatch_jump_target(self, offset: int, target: int, size: int):
        target_bytes = target.to_bytes(size, "big")
        if self.current_mode == "init":
            self.init_code[offset : offset + size] = target_bytes
        else:
            self.runtime_code[offset : offset + size] = target_bytes

    def generate_complete_bytecode(self, state: ContractState) -> bytes:
        """Generate full contract bytecode (init + runtime)."""
        console.print("[blue]Generating EVM bytecode...[/blue]")
        self.set_mode("runtime")
        runtime_bytecode = self.generate_runtime_bytecode(state)
        self.set_mode("init")
        self.generate_init_code(state, len(runtime_bytecode))
        return bytes(self.init_code + self.runtime_code)

    def generate_init_code(self, state: ContractState, runtime_size: int) -> bytes:
        """
        Generate constructor / init code.

        Uses a two-pass approach for CODECOPY:
          Pass 1 — emit a 0xDEAD placeholder for the runtime offset.
          Pass 2 — after all init code is emitted, we know the exact byte offset
                   where runtime code starts (= len(init_code)), so we scan for
                   the placeholder and overwrite it with the real value.
        This avoids the old off-by-N approximation that broke deployed contracts.
        """
        self.current_state = state
        console.print("[blue]Generating init code (two-pass CODECOPY)...[/blue]")

        # ── Pass 1: initialise state storage variables ──────────────────────
        for var_name, slot in state.variables.items():
            initial_value = state.initial_values.get(var_name, 0)
            if initial_value and state.variable_types.get(var_name) != "mapping":
                self.emit_push(initial_value if isinstance(initial_value, int) else 0)
                self.emit_push(slot)
                self.emit_opcode(EVMOpcode.SSTORE)

        # ── Pass 1: emit CODECOPY sequence with 0xDEAD placeholder ──────────
        # Record the byte position of the placeholder so we can patch it later.
        self.emit_push(runtime_size, 2)   # PUSH2 <runtime_size>   — size to copy
        placeholder_pos = len(self.init_code)  # remember where we write the placeholder
        self.emit_push(0xDEAD, 2)         # PUSH2 0xDEAD           — PLACEHOLDER for offset
        self.emit_push(0)                 # PUSH1 0x00             — memory destination
        self.emit_opcode(EVMOpcode.CODECOPY)
        self.emit_push(runtime_size, 2)   # PUSH2 <runtime_size>   — bytes to return
        self.emit_push(0)                 # PUSH1 0x00             — memory offset
        self.emit_opcode(EVMOpcode.RETURN)

        # ── Pass 2: backpatch the runtime offset now that init_code is final ─
        # The runtime code immediately follows init_code in the full bytecode,
        # so its offset == len(init_code) at this point.
        actual_runtime_offset = len(self.init_code)
        console.print(f"[dim]CODECOPY backpatch: runtime offset = {actual_runtime_offset} bytes[/dim]")

        # placeholder_pos points at the PUSH2 opcode byte; the 2-byte value
        # lives at placeholder_pos+1 and placeholder_pos+2.
        actual_bytes = actual_runtime_offset.to_bytes(2, "big")
        self.init_code[placeholder_pos + 1] = actual_bytes[0]
        self.init_code[placeholder_pos + 2] = actual_bytes[1]

        return bytes(self.init_code)

    def generate_runtime_bytecode(self, state: ContractState) -> bytes:
        """Generate runtime dispatch + function bytecode."""
        self.current_state = state
        console.print("[blue]Generating runtime dispatcher...[/blue]")

        func_jump_placeholders: Dict[str, int] = {}

        # Check calldata size ≥ 4 (has a selector)
        self.emit_opcode(EVMOpcode.CALLDATASIZE)
        self.emit_push(4)
        self.emit_opcode(EVMOpcode.LT)
        fallback_placeholder = self.get_current_offset()
        self.emit_push(0xFFFF, 2)
        self.emit_opcode(EVMOpcode.JUMPI)

        # Load function selector (first 4 bytes of calldata)
        self.emit_push(0)
        self.emit_opcode(EVMOpcode.CALLDATALOAD)
        self.emit_push(0xE0)
        self.emit_opcode(EVMOpcode.SHR)

        # ── Build sorted selector list for binary dispatch ──
        selector_entries = []  # [(selector_int, func_name)]
        for func_name, func_info in state.functions.items():
            if not (func_info.get("is_public") or func_info.get("is_view")):
                continue
            param_types = func_info.get("param_types", [])
            sig = f"{func_name}({','.join(param_types)})"
            selector = int.from_bytes(function_selector(sig), "big")
            selector_entries.append((selector, func_name))
            console.print(f"  [dim]Selector: {func_name} → 0x{selector:08x}[/dim]")

        # Sort by selector for binary search
        selector_entries.sort(key=lambda x: x[0])
        num_funcs = len(selector_entries)

        if num_funcs > 4:
            console.print(f"  [green]Binary dispatch ({num_funcs} funcs, O(log n))[/green]")
        else:
            console.print(f"  [dim]Linear dispatch ({num_funcs} funcs)[/dim]")

        # Emit dispatch tree (binary for >4, linear for ≤4)
        self._emit_binary_dispatch(selector_entries, func_jump_placeholders)

        # Default REVERT (unknown selector)
        self.emit_opcode(EVMOpcode.POP)
        self.emit_push(0)
        self.emit_push(0)
        self.emit_opcode(EVMOpcode.REVERT)

        # Fallback (no calldata)
        fallback_dest = self.get_current_offset()
        self.emit_opcode(EVMOpcode.JUMPDEST)
        self._backpatch_jump_target(fallback_placeholder + 1, fallback_dest, 2)
        self.emit_opcode(EVMOpcode.STOP)

        # ── Emit per-function bytecode with SLOAD caching ──
        for func_name, func_info in state.functions.items():
            if not (func_info.get("is_public") or func_info.get("is_view")):
                continue

            # Reset per-function state
            self.is_view_function = func_info.get("is_view", False)
            self._local_vars = {}
            self._next_free_memory = 0x80
            self._sload_cache = {}
            self._stack_depth = 0

            func_offset = self.get_current_offset()
            self.emit_opcode(EVMOpcode.JUMPDEST)

            # Backpatch jump from dispatch table
            if func_name in func_jump_placeholders:
                self._backpatch_jump_target(
                    func_jump_placeholders[func_name] + 1, func_offset, 2
                )

            # Pop duplicate selector from stack
            self.emit_opcode(EVMOpcode.POP)

            # SLOAD cache: pre-scan + preload hot read-only vars into memory
            body = func_info.get("body", [])
            cacheable = self._prescan_sload_usage(body, state)
            if cacheable:
                console.print(
                    f"  [green]SLOAD cache ({func_name}): "
                    f"{', '.join(cacheable.keys())} (−2100gas/dup)[/green]"
                )
                self._preload_sload_cache(cacheable, state)

            # Build argument map
            arg_map = {
                arg: idx for idx, arg in enumerate(func_info.get("args", []))
            }

            # Compile function body
            for stmt in body:
                self.compile_stmt(stmt, arg_map)

            # If no explicit RETURN, emit STOP
            has_explicit_return = any(
                isinstance(s, ast.Return) and s.value is not None
                for s in body
            )
            if not has_explicit_return:
                self.emit_opcode(EVMOpcode.STOP)

            # Report max stack depth for this function
            if self._max_stack_depth > 16:
                console.print(
                    f"  [yellow]Stack depth ({func_name}): "
                    f"peak={self._max_stack_depth}[/yellow]"
                )

        # ── Footer: shared overflow revert block ──
        if self.overflow_safe and self._overflow_jump_positions:
            overflow_offset = self.get_current_offset()
            self.emit_opcode(EVMOpcode.JUMPDEST)
            self.emit_push(0)
            self.emit_push(0)
            self.emit_opcode(EVMOpcode.REVERT)
            target_bytes = overflow_offset.to_bytes(2, "big")
            for pos in self._overflow_jump_positions:
                self.runtime_code[pos] = target_bytes[0]
                self.runtime_code[pos + 1] = target_bytes[1]

        # ── Footer: shared require revert blocks (dedup) ──
        for msg, positions in self._shared_revert_blocks.items():
            block_offset = self.get_current_offset()
            self.emit_opcode(EVMOpcode.JUMPDEST)
            # ABI-encode Error(string)
            error_selector = function_selector("Error(string)")
            msg_bytes = msg.encode("utf-8")
            padded_len = ((len(msg_bytes) + 31) // 32) * 32
            mem = self.get_current_offset()  # Use offset as scratch hint
            scratch = 0x00  # Use memory 0x00 for shared revert encoding
            self.emit_push(int.from_bytes(error_selector, "big"), 4)
            self.emit_push(scratch)
            self.emit_opcode(EVMOpcode.MSTORE)
            self.emit_push(0x20)
            self.emit_push(scratch + 4)
            self.emit_opcode(EVMOpcode.MSTORE)
            self.emit_push(len(msg_bytes))
            self.emit_push(scratch + 36)
            self.emit_opcode(EVMOpcode.MSTORE)
            if padded_len > 0:
                str_int = int.from_bytes(msg_bytes.ljust(padded_len, b"\x00"), "big")
                self.emit_push(str_int, padded_len)
                self.emit_push(scratch + 68)
                self.emit_opcode(EVMOpcode.MSTORE)
            total_size = 4 + 32 + 32 + padded_len
            self.emit_push(total_size)
            self.emit_push(scratch)
            self.emit_opcode(EVMOpcode.REVERT)
            # Backpatch all references to this message
            target_bytes = block_offset.to_bytes(2, "big")
            for pos in positions:
                self.runtime_code[pos] = target_bytes[0]
                self.runtime_code[pos + 1] = target_bytes[1]

        return bytes(self.runtime_code)

# ─────────────────────────────────────────────────────────
# Peephole Bytecode Optimizer
# ─────────────────────────────────────────────────────────

class PeepholeOptimizer:
    """Multi-pass peephole optimizer for EVM bytecode.
    
    Passes:
      1. Constant folding: PUSH a / PUSH b / ADD → PUSH (a+b)
      2. Identity removal: PUSH/POP → nop, ISZERO/ISZERO → nop
      3. DUP compression: DUP1/SWAP1 → DUP1
    """

    # Opcodes that are PUSH1..PUSH32 (0x60..0x7f)
    PUSH_RANGE = range(0x60, 0x80)

    # Arithmetic opcodes we can fold
    FOLD_OPS = {
        0x01: lambda a, b: (a + b) % (2**256),           # ADD
        0x02: lambda a, b: (a * b) % (2**256),           # MUL
        0x03: lambda a, b: (a - b) % (2**256),           # SUB
        0x04: lambda a, b: a // b if b != 0 else 0,      # DIV
        0x06: lambda a, b: a % b if b != 0 else 0,       # MOD
    }

    @classmethod
    def optimize(cls, bytecode: bytes, passes: int = 3) -> bytes:
        """Run optimizer passes on raw bytecode."""
        code = bytearray(bytecode)
        for _ in range(passes):
            prev_len = len(code)
            code = cls._constant_fold(code)
            code = cls._remove_identity(code)
            if len(code) == prev_len:
                break  # No changes, stop early
        return bytes(code)

    @classmethod
    def _read_push(cls, code: bytearray, pos: int):
        """Read a PUSH instruction at pos. Returns (value, end_pos) or None."""
        if pos >= len(code):
            return None
        opcode = code[pos]
        if opcode not in cls.PUSH_RANGE:
            return None
        size = opcode - 0x60 + 1
        if pos + 1 + size > len(code):
            return None
        value = int.from_bytes(code[pos + 1: pos + 1 + size], "big")
        return value, pos + 1 + size

    @classmethod
    def _encode_push(cls, value: int) -> bytearray:
        """Encode a value as optimal PUSH instruction."""
        if value == 0:
            return bytearray([0x60, 0x00])
        size = (value.bit_length() + 7) // 8
        size = min(size, 32)
        result = bytearray([0x60 + size - 1])
        result.extend(value.to_bytes(size, "big"))
        return result

    @classmethod
    def _constant_fold(cls, code: bytearray) -> bytearray:
        """Fold PUSH a / PUSH b / OP → PUSH result."""
        result = bytearray()
        i = 0
        while i < len(code):
            push1 = cls._read_push(code, i)
            if push1 is not None:
                val_a, end_a = push1
                push2 = cls._read_push(code, end_a)
                if push2 is not None:
                    val_b, end_b = push2
                    if end_b < len(code) and code[end_b] in cls.FOLD_OPS:
                        op_fn = cls.FOLD_OPS[code[end_b]]
                        folded = op_fn(val_a, val_b)
                        result.extend(cls._encode_push(folded))
                        i = end_b + 1
                        continue
            result.append(code[i])
            i += 1
        return result

    @classmethod
    def _remove_identity(cls, code: bytearray) -> bytearray:
        """Remove identity patterns: ISZERO/ISZERO, PUSH/POP."""
        result = bytearray()
        i = 0
        while i < len(code):
            # ISZERO / ISZERO → remove both (double negation)
            if (i + 1 < len(code) and code[i] == 0x15 and code[i + 1] == 0x15):
                i += 2
                continue
            # PUSH1 x / POP → remove both
            if i + 2 < len(code) and code[i] == 0x60 and code[i + 2] == 0x50:
                i += 3
                continue
            result.append(code[i])
            i += 1
        return result


# ─────────────────────────────────────────────────────────
# ABI Builder
# ─────────────────────────────────────────────────────────

def generate_abi(state: ContractState) -> List[Dict[str, Any]]:
    """Generate JSON ABI from analyzed contract state."""
    abi = []

    for func_name, func_info in state.functions.items():
        if not (func_info.get("is_public") or func_info.get("is_view")):
            continue

        args = func_info.get("args", [])
        param_types = func_info.get("param_types", [])

        inputs = [
            {"name": arg, "type": ptype}
            for arg, ptype in zip(args, param_types)
        ]

        state_mutability = "view" if func_info.get("is_view") else "nonpayable"

        func_abi: Dict[str, Any] = {
            "type": "function",
            "name": func_name,
            "inputs": inputs,
            "outputs": [],
            "stateMutability": state_mutability,
        }

        if func_info.get("has_return"):
            func_abi["outputs"] = [
                {"name": "", "type": func_info.get("return_type", "uint256")}
            ]

        abi.append(func_abi)

    # Add constructor entry
    abi.append({"type": "constructor", "inputs": [], "stateMutability": "nonpayable"})

    return abi


# ─────────────────────────────────────────────────────────
# Top-level transpile entry point
# ─────────────────────────────────────────────────────────

def transpile_python_contract(
    source_code: str,
    overflow_safe: bool = True,
    optimizer_level: int = 1,
) -> Dict[str, Any]:
    """
    Transpile PyVax Python source into EVM bytecode + ABI.

    Args:
        source_code:     Python source string of a Contract subclass
        overflow_safe:   Enable Solidity 0.8-style overflow checks (default True)
        optimizer_level: 0=none, 1=peephole, 2=peephole+fold, 3=aggressive (default 1)

    Returns:
        dict with keys: bytecode (hex str), abi (list), metadata (dict)
    """
    console.print("[bold cyan]Starting PyVax transpilation...[/bold cyan]")

    analyzer = PythonASTAnalyzer()
    state = analyzer.analyze_contract(source_code)

    console.print(
        f"[green]Contract analysis complete:[/green] "
        f"{len(state.variables)} storage vars, {len(state.functions)} functions"
    )

    generator = EVMBytecodeGenerator(overflow_safe=overflow_safe)
    bytecode = generator.generate_complete_bytecode(state)

    # Apply peephole optimization
    original_size = len(bytecode)
    if optimizer_level > 0:
        bytecode = PeepholeOptimizer.optimize(bytecode, passes=optimizer_level)
        saved = original_size - len(bytecode)
        if saved > 0:
            console.print(
                f"[green]Optimizer:[/green] -{saved} bytes "
                f"({saved / original_size * 100:.1f}% reduction)"
            )

    abi = generate_abi(state)

    # Add event entries to ABI (extracted from emit() calls in functions)
    events_seen = set()
    for func_info in state.functions.values():
        for stmt in ast.walk(ast.Module(body=func_info.get("body", []), type_ignores=[])):
            if (isinstance(stmt, ast.Call)
                    and isinstance(stmt.func, ast.Attribute)
                    and stmt.func.attr == "emit"
                    and stmt.args
                    and isinstance(stmt.args[0], ast.Constant)
                    and isinstance(stmt.args[0].value, str)):
                ename = stmt.args[0].value
                if ename not in events_seen:
                    events_seen.add(ename)
                    event_inputs = []
                    for i, _ in enumerate(stmt.args[1:]):
                        event_inputs.append({
                            "name": f"param{i}",
                            "type": "uint256",
                            "indexed": False,
                        })
                    abi.append({
                        "type": "event",
                        "name": ename,
                        "inputs": event_inputs,
                        "anonymous": False,
                    })

    bytecode_hex = f"0x{bytecode.hex()}"
    console.print(f"[green]Bytecode generated:[/green] {len(bytecode)} bytes")

    return {
        "bytecode": bytecode_hex,
        "abi": abi,
        "metadata": {
            "storage_vars": list(state.variables.keys()),
            "functions": list(state.functions.keys()),
            "events": list(events_seen),
            "gas_estimate": generator.gas_used,
            "overflow_safe": overflow_safe,
            "optimizer_level": optimizer_level,
            "bytecode_size_before_opt": original_size,
            "compiler": "pyvax-transpiler",
            "version": "1.0.0",
        },
    }