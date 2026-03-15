"""Tests for transpiler AST sandbox — defense-in-depth (HIGH-1).

Verifies that the PyVax transpiler rejects or safely handles malicious
Python source code patterns that could escape the compilation sandbox.

NOTE: The transpiler already uses `ast.parse()` only (no eval/exec),
so these tests validate the blocklist enforcement layer added as
defense-in-depth.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from avax_cli.transpiler import transpile_python_contract


# ── Dangerous import tests ────────────────────────────────────────────


class TestBlockedImports:
    """Verify that dangerous imports are rejected by the transpiler."""

    @pytest.mark.parametrize("module", ["os", "sys", "subprocess", "shutil", "socket"])
    def test_blocked_import(self, module):
        """Importing dangerous stdlib modules must raise an error."""
        source = f'''
import {module}
from pyvax import Contract, action

class Evil(Contract):
    @action
    def exploit(self):
        pass
'''
        with pytest.raises((ValueError, RuntimeError)):
            transpile_python_contract(source)

    @pytest.mark.parametrize("module", ["os", "sys", "subprocess", "shutil", "socket"])
    def test_blocked_from_import(self, module):
        """'from X import ...' with dangerous modules must raise an error."""
        source = f'''
from {module} import *
from pyvax import Contract, action

class Evil(Contract):
    @action
    def exploit(self):
        pass
'''
        with pytest.raises((ValueError, RuntimeError)):
            transpile_python_contract(source)


# ── Dangerous builtin tests ──────────────────────────────────────────


class TestBlockedBuiltins:
    """Verify that dangerous builtin function calls are rejected."""

    def test_eval_blocked(self):
        """eval() calls must be rejected."""
        source = '''
from pyvax import Contract, action

class Evil(Contract):
    @action
    def exploit(self):
        eval("__import__('os').system('rm -rf /')")
'''
        with pytest.raises((ValueError, RuntimeError)):
            transpile_python_contract(source)

    def test_exec_blocked(self):
        """exec() calls must be rejected."""
        source = '''
from pyvax import Contract, action

class Evil(Contract):
    @action
    def exploit(self):
        exec("import os; os.system('whoami')")
'''
        with pytest.raises((ValueError, RuntimeError)):
            transpile_python_contract(source)

    def test_compile_blocked(self):
        """compile() calls must be rejected."""
        source = '''
from pyvax import Contract, action

class Evil(Contract):
    @action
    def exploit(self):
        code = compile("print('pwned')", "<string>", "exec")
'''
        with pytest.raises((ValueError, RuntimeError)):
            transpile_python_contract(source)

    def test_dunder_import_blocked(self):
        """__import__() calls must be rejected."""
        source = '''
from pyvax import Contract, action

class Evil(Contract):
    @action
    def exploit(self):
        __import__("os").system("whoami")
'''
        with pytest.raises((ValueError, RuntimeError)):
            transpile_python_contract(source)


# ── Safe code passes ─────────────────────────────────────────────────


class TestSafeCodeAllowed:
    """Verify that legitimate contract code still compiles successfully."""

    def test_normal_contract_compiles(self):
        """A standard contract with no dangerous patterns compiles fine."""
        source = '''
from pyvax import Contract, action

class SafeContract(Contract):
    value: int = 0

    @action
    def set_value(self, v: int):
        self.value = v

    @action
    def get_value(self) -> int:
        return self.value
'''
        result = transpile_python_contract(source)
        assert result["bytecode"].startswith("0x")

    def test_pyvax_import_allowed(self):
        """Importing from pyvax is always allowed."""
        source = '''
from pyvax import Contract, action, agent_action

class AllowedImport(Contract):
    x: int = 0

    @action
    def noop(self):
        pass
'''
        result = transpile_python_contract(source)
        assert result["bytecode"].startswith("0x")

    def test_math_operations_allowed(self):
        """Math operations compile correctly."""
        source = '''
from pyvax import Contract, action

class MathContract(Contract):
    result: int = 0

    @action
    def compute(self, a: int, b: int):
        self.result = a + b * 2
'''
        result = transpile_python_contract(source)
        assert result["bytecode"].startswith("0x")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
