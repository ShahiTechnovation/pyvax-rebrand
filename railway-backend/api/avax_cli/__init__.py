"""PyVax — Python to EVM transpiler for Avalanche smart contracts.

The #1 Python toolchain for writing, deploying, and interacting with
smart contracts on Avalanche C-Chain.

Usage:
    pyvax new Token          → scaffold project
    pyvax compile --opt=3    → transpile Python → EVM bytecode
    pyvax deploy Token       → deploy to Fuji or Mainnet
    pyvax call Token get     → interact with deployed contract
"""

__version__ = "1.0.0"
__author__ = "PyVax Team"
__email__ = "team@pyvax.io"

from .py_contracts import (
    Contract,
    action,
    agent_action,
    human_action,
    view_function,
    public_function,
    Uint8,
    Uint16,
    Uint32,
    Uint64,
    Uint128,
    Uint256,
    Address,
    Bytes32,
)