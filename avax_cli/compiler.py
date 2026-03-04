"""Python contract compilation and transpilation pipeline for PyVax."""

import json
import shutil
from pathlib import Path
from typing import Dict, Any, Optional

from rich.console import Console

from .transpiler import transpile_python_contract

console = Console()


def compile_contracts(
    contracts_dir: Path,
    output_dir: Path,
    solc_version: Optional[str] = None,
) -> Dict[str, Dict[str, Any]]:
    """
    Transpile all PyVax Python contracts in the given directory.

    Args:
        contracts_dir: Directory containing .py contract files
        output_dir:    Directory to save build artifacts
        solc_version:  Unused (kept for API compatibility)

    Returns:
        Dictionary with transpilation results for each contract
    """
    results: Dict[str, Dict[str, Any]] = {}

    output_dir.mkdir(parents=True, exist_ok=True)

    py_files = list(contracts_dir.glob("*.py"))

    if not py_files:
        console.print(f"[yellow]No .py contract files found in {contracts_dir}[/yellow]")
        return results

    for py_file in py_files:
        contract_name = py_file.stem
        console.print(f"[blue]Transpiling: {py_file.name}[/blue]")

        try:
            with open(py_file, "r", encoding="utf-8") as f:
                py_source = f.read()

            result = transpile_python_contract(py_source)

            contract_output_dir = output_dir / contract_name
            contract_output_dir.mkdir(exist_ok=True)

            # Main artifact JSON
            artifact_file = contract_output_dir / f"{contract_name}.json"
            with open(artifact_file, "w") as f:
                json.dump(
                    {
                        "contractName": contract_name,
                        "sourceName": py_file.name,
                        "abi": result["abi"],
                        "bytecode": result["bytecode"],
                        "metadata": result["metadata"],
                        "compiler": {
                            "type": "pyvax-transpiler",
                            "version": "0.1.2",
                        },
                    },
                    f,
                    indent=2,
                )

            # Separate ABI file
            abi_file = contract_output_dir / f"{contract_name}_abi.json"
            with open(abi_file, "w") as f:
                json.dump(result["abi"], f, indent=2)

            # Bytecode file
            bytecode_file = contract_output_dir / f"{contract_name}_bytecode.txt"
            with open(bytecode_file, "w") as f:
                f.write(result["bytecode"])

            results[contract_name] = {
                "success": True,
                "output_file": artifact_file,
                "abi_file": abi_file,
                "bytecode_file": bytecode_file,
                "abi": result["abi"],
                "bytecode": result["bytecode"],
                "source_file": py_file.name,
                "contract_type": "python",
            }

            console.print(f"[green]✓[/green] Transpiled {contract_name}")

        except Exception as e:
            results[contract_name] = {
                "success": False,
                "error": str(e),
                "source_file": py_file.name,
                "contract_type": "python",
            }
            console.print(f"[red]✗[/red] Failed to transpile {contract_name}: {e}")

    return results


def get_contract_artifacts(
    contract_name: str,
    build_dir: Path = Path("build"),
) -> Dict[str, Any]:
    """
    Load compiled PyVax contract artifacts.

    Args:
        contract_name: Name of the contract (e.g. 'SimpleStorage')
        build_dir:     Build directory containing artifact subdirectories

    Returns:
        Dictionary containing ABI, bytecode, metadata
    """
    contract_dir = build_dir / contract_name
    artifact_file = contract_dir / f"{contract_name}.json"

    if not artifact_file.exists():
        raise FileNotFoundError(
            f"Artifacts not found for '{contract_name}'. "
            f"Run 'pyvax compile' first."
        )

    with open(artifact_file) as f:
        artifacts = json.load(f)

    return {
        "abi": artifacts["abi"],
        "bytecode": artifacts["bytecode"],
        "metadata": artifacts.get("metadata", {}),
        "source_name": artifacts.get("sourceName", ""),
        "compiler_version": artifacts.get("compiler", {}).get("version", "unknown"),
    }