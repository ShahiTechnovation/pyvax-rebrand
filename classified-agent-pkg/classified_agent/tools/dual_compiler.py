"""Dual-path compiler: PyVax → Solidity fallback.

Tries the PyVax transpiler first (offline, embedded). If that fails for *any*
reason (not installed, transpiler bug, unsupported syntax), it seamlessly falls
back to generating an equivalent Solidity contract and compiling with solc.

Usage::

    from classified_agent.tools.dual_compiler import compile_flexible

    result = compile_flexible(python_source, workspace)
    # result.method  → "pyvax" | "solidity"
    # result.bytecode, result.abi, ...
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger("classified")


@dataclass
class CompileResult:
    """Unified output from either compilation path."""

    success: bool
    method: str  # "pyvax" | "solidity"
    bytecode: str = ""
    abi: list[dict[str, Any]] = field(default_factory=list)
    contract_name: str = ""
    bytecode_size: int = 0
    artifact_path: str = ""
    solidity_source: str | None = None
    snowtrace_payload: dict[str, str] | None = None
    error: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


def _try_pyvax(
    source_file: Path,
    workspace: Path,
    optimizer_level: int = 1,
) -> CompileResult:
    """Attempt compilation via the PyVax transpiler (``avax_cli``)."""
    from avax_cli.compiler import compile_contracts  # type: ignore[import-untyped]

    contracts_dir = source_file.parent
    build_dir = workspace / "build"

    results = compile_contracts(
        contracts_dir=contracts_dir,
        output_dir=build_dir,
        optimizer_level=optimizer_level,
        overflow_safe=True,
        contract_filter=source_file.stem,
    )

    if not results:
        raise RuntimeError("PyVax returned empty results.")

    contract_name = source_file.stem
    if contract_name not in results:
        raise RuntimeError(f"Contract '{contract_name}' not in PyVax output.")

    result = results[contract_name]
    if not result.get("success"):
        raise RuntimeError(result.get("error", "Unknown PyVax error"))

    return CompileResult(
        success=True,
        method="pyvax",
        bytecode=result.get("bytecode", ""),
        abi=result.get("abi", []),
        contract_name=contract_name,
        bytecode_size=len(result.get("bytecode", "")) // 2,
        artifact_path=str(result.get("output_file", "")),
        metadata=result.get("metadata", {}),
    )


def _try_solidity(
    python_source: str,
    workspace: Path,
) -> CompileResult:
    """Fallback: generate Solidity from Python AST and compile with solc."""
    from classified_agent.tools.solidity_fallback import (
        compile_solidity,
        generate_snowtrace_payload,
        generate_solidity_from_python,
    )

    # 1. Generate Solidity source
    sol_source = generate_solidity_from_python(python_source)

    # 2. Extract contract name (first class name in source)
    import ast
    contract_name = "FallbackAgent"
    try:
        tree = ast.parse(python_source)
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                contract_name = node.name
                break
    except SyntaxError:
        pass

    # 3. Compile
    compiled = compile_solidity(sol_source, contract_name)

    # 4. Save artefacts
    build_dir = workspace / "build"
    build_dir.mkdir(parents=True, exist_ok=True)

    sol_path = build_dir / f"{contract_name}.sol"
    sol_path.write_text(sol_source, encoding="utf-8")

    artifact = {
        "contract_name": contract_name,
        "abi": compiled["abi"],
        "bytecode": compiled["bytecode"],
        "deployed_bytecode": compiled.get("deployed_bytecode", ""),
        "compiler": compiled.get("compiler", "solc"),
        "solidity_source": sol_source,
    }
    artifact_path = build_dir / f"{contract_name}.json"
    artifact_path.write_text(json.dumps(artifact, indent=2), encoding="utf-8")

    # 5. Snowtrace verification payload
    snowtrace = generate_snowtrace_payload(sol_source, contract_name)

    return CompileResult(
        success=True,
        method="solidity",
        bytecode=compiled["bytecode"],
        abi=compiled["abi"],
        contract_name=contract_name,
        bytecode_size=len(compiled["bytecode"]) // 2,
        artifact_path=str(artifact_path),
        solidity_source=sol_source,
        snowtrace_payload=snowtrace,
        metadata={"compiler": compiled.get("compiler", "solc")},
    )


# ─────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────


def compile_flexible(
    source_file: Path,
    workspace: Path,
    *,
    optimizer_level: int = 1,
) -> CompileResult:
    """Compile a Python contract — PyVax first, Solidity fallback second.

    Args:
        source_file: Absolute path to the ``.py`` contract.
        workspace: Agent workspace root directory.
        optimizer_level: PyVax optimizer level (0–3).

    Returns:
        A :class:`CompileResult` indicating which path succeeded.
    """
    python_source = source_file.read_text(encoding="utf-8")

    # ── Path 1: PyVax ────────────────────────────────────────────────
    try:
        logger.info("Attempting PyVax compilation for %s...", source_file.name)
        result = _try_pyvax(source_file, workspace, optimizer_level)
        logger.info("✅ PyVax compilation succeeded (%d bytes)", result.bytecode_size)
        return result
    except ImportError:
        logger.warning("PyVax transpiler (avax_cli) not installed — switching to Solidity fallback.")
    except Exception as exc:
        logger.warning("PyVax compilation failed: %s — switching to Solidity fallback.", exc)

    # ── Path 2: Solidity fallback ────────────────────────────────────
    try:
        logger.info("Attempting Solidity fallback compilation...")
        result = _try_solidity(python_source, workspace)
        logger.info(
            "✅ Solidity fallback succeeded (%s, %d bytes)",
            result.metadata.get("compiler", "solc"),
            result.bytecode_size,
        )
        return result
    except Exception as exc:
        logger.error("Solidity fallback also failed: %s", exc)
        return CompileResult(
            success=False,
            method="none",
            error=(
                f"Both compilation paths failed.\n"
                f"  Solidity error: {exc}\n\n"
                f"Install PyVax (pip install pyvax-cli) or a Solidity compiler "
                f"(pip install py-solc-x) to resolve."
            ),
        )
