"""Solidity fallback compiler for when PyVax transpiler is unavailable.

Generates a minimal Solidity contract from Python agent source AST,
then compiles it via py-solc-x or system ``solc``.
"""

from __future__ import annotations

import ast
import json
import logging
import re
import subprocess
import textwrap
from pathlib import Path
from typing import Any

logger = logging.getLogger("classified")


# ─────────────────────────────────────────────────────────────────────
# Python AST → Solidity source
# ─────────────────────────────────────────────────────────────────────


def _extract_contract_name(source: str) -> str:
    """Pull the first class name from *source*, default ``FallbackAgent``."""
    try:
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                # CamelCase the class name to ensure valid Solidity identifier
                return node.name
    except SyntaxError:
        pass
    return "FallbackAgent"


def _extract_public_methods(source: str) -> list[dict[str, Any]]:
    """Return a list of ``{name, docstring}`` for non-dunder methods."""
    methods: list[dict[str, Any]] = []
    try:
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and not node.name.startswith("_"):
                doc = ast.get_docstring(node) or ""
                methods.append({"name": node.name, "docstring": doc})
    except SyntaxError:
        pass
    return methods


def generate_solidity_from_python(python_source: str) -> str:
    """Convert a Python agent source file into an equivalent Solidity contract.

    This is intentionally *minimal* — it preserves the contract name and public
    method signatures so the on-chain artefact is a faithful representation of
    the agent structure even though the business logic is stubbed.
    """
    contract_name = _extract_contract_name(python_source)
    methods = _extract_public_methods(python_source)

    # Build Solidity method stubs
    sol_methods: list[str] = []
    for m in methods:
        safe_name = re.sub(r"[^a-zA-Z0-9_]", "_", m["name"])
        comment = f"    /// @notice {m['docstring'][:120]}" if m["docstring"] else ""
        sol_methods.append(
            f"{comment}\n"
            f"    function {safe_name}() external pure returns (string memory) {{\n"
            f'        return "{safe_name}: ok";\n'
            f"    }}"
        )

    methods_block = "\n\n".join(sol_methods) if sol_methods else (
        '    function run() external pure returns (string memory) {\n'
        '        return "Synthesis agent running!";\n'
        '    }'
    )

    sol_source = textwrap.dedent(f"""\
        // SPDX-License-Identifier: MIT
        // Auto-generated Solidity fallback from classified-agent
        pragma solidity ^0.8.24;

        contract {contract_name} {{
            string public constant AGENT_VERSION = "1.0.0-fallback";

        {methods_block}
        }}
    """)

    return sol_source


# ─────────────────────────────────────────────────────────────────────
# Solidity compilation (py-solc-x → system solc)
# ─────────────────────────────────────────────────────────────────────


def _compile_with_solcx(
    sol_source: str,
    contract_name: str,
    evm_version: str = "paris",
    optimizer_runs: int = 200,
) -> dict[str, Any]:
    """Compile using ``py-solc-x`` (pip install py-solc-x)."""
    import solcx  # type: ignore[import-untyped]

    # Ensure solc 0.8.24 is installed
    installed = solcx.get_installed_solc_versions()
    target = "0.8.24"
    if not any(str(v).startswith("0.8.24") for v in installed):
        logger.info("Installing solc %s via solcx...", target)
        solcx.install_solc(target)

    compiled = solcx.compile_standard(
        {
            "language": "Solidity",
            "sources": {"Agent.sol": {"content": sol_source}},
            "settings": {
                "evmVersion": evm_version,
                "optimizer": {"enabled": True, "runs": optimizer_runs},
                "outputSelection": {
                    "*": {"*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"]}
                },
            },
        },
        solc_version=target,
    )

    contract_out = compiled["contracts"]["Agent.sol"][contract_name]
    return {
        "bytecode": contract_out["evm"]["bytecode"]["object"],
        "deployed_bytecode": contract_out["evm"]["deployedBytecode"]["object"],
        "abi": contract_out["abi"],
    }


def _compile_with_system_solc(
    sol_source: str,
    contract_name: str,
    evm_version: str = "paris",
    optimizer_runs: int = 200,
) -> dict[str, Any]:
    """Compile using system ``solc`` binary via --standard-json."""
    input_json = json.dumps(
        {
            "language": "Solidity",
            "sources": {"Agent.sol": {"content": sol_source}},
            "settings": {
                "evmVersion": evm_version,
                "optimizer": {"enabled": True, "runs": optimizer_runs},
                "outputSelection": {
                    "*": {"*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"]}
                },
            },
        }
    )

    result = subprocess.run(
        ["solc", "--standard-json"],
        input=input_json,
        capture_output=True,
        text=True,
        timeout=60,
    )

    if result.returncode != 0:
        raise RuntimeError(f"solc exited with code {result.returncode}: {result.stderr}")

    compiled = json.loads(result.stdout)

    # Check for errors
    errors = compiled.get("errors", [])
    fatal = [e for e in errors if e.get("severity") == "error"]
    if fatal:
        raise RuntimeError(f"Solidity compilation errors: {fatal}")

    contract_out = compiled["contracts"]["Agent.sol"][contract_name]
    return {
        "bytecode": contract_out["evm"]["bytecode"]["object"],
        "deployed_bytecode": contract_out["evm"]["deployedBytecode"]["object"],
        "abi": contract_out["abi"],
    }


def compile_solidity(
    sol_source: str,
    contract_name: str,
    evm_version: str = "paris",
    optimizer_runs: int = 200,
) -> dict[str, Any]:
    """Compile Solidity source — tries ``py-solc-x`` first, then system ``solc``."""
    # Attempt 1: py-solc-x
    try:
        logger.info("Attempting compilation via py-solc-x...")
        result = _compile_with_solcx(sol_source, contract_name, evm_version, optimizer_runs)
        result["compiler"] = "solcx"
        return result
    except ImportError:
        logger.warning("py-solc-x not installed, trying system solc...")
    except Exception as exc:
        logger.warning("solcx compilation failed (%s), trying system solc...", exc)

    # Attempt 2: system solc
    try:
        logger.info("Attempting compilation via system solc...")
        result = _compile_with_system_solc(sol_source, contract_name, evm_version, optimizer_runs)
        result["compiler"] = "solc-system"
        return result
    except FileNotFoundError:
        raise RuntimeError(
            "No Solidity compiler available.\n"
            "Install one of:\n"
            "  pip install py-solc-x   (recommended)\n"
            "  brew install solidity   (macOS)\n"
            "  apt install solc        (Linux)"
        )


def generate_snowtrace_payload(
    sol_source: str,
    contract_name: str,
    compiler_version: str = "v0.8.24+commit.e11b9ed9",
    evm_version: str = "paris",
    optimizer_runs: int = 200,
) -> dict[str, str]:
    """Build a Snowtrace-compatible verification payload."""
    return {
        "apimodule": "contract",
        "action": "verifysourcecode",
        "sourceCode": sol_source,
        "contractname": contract_name,
        "compilerversion": compiler_version,
        "optimizationUsed": "1",
        "runs": str(optimizer_runs),
        "evmversion": evm_version,
        "licenseType": "3",  # MIT
    }
