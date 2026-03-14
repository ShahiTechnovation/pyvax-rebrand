#!/usr/bin/env python3
"""JSON API wrapper for the PyVax transpiler v2.0.0.

Reads a JSON request from stdin and writes the result to stdout.
Used by the Next.js API route to execute CLI commands locally via child process.

Usage:
    echo '{"command": "compile", "source": "class Token(Contract): ...", "contract_name": "Token"}' | python -m avax_cli.api_wrapper

Request format:
    {
        "command":        "compile" | "test" | "deploy" | "new" | "help" | "version" | "templates",
        "source":         "<python source>",          // required for compile/test/deploy
        "contract_name":  "ContractName",             // optional, default "Contract"
        "optimizer_level": 1,                         // optional, 0-3
        "overflow_safe":  true,                       // optional
        "template":       "ERC20",                    // optional, for 'new' command
        "chain":          "fuji"                      // optional, for 'deploy' command
    }

Response format (always JSON on stdout):
    {
        "success": true/false,
        "command": "compile",
        "stdout":  "...",            // human-readable output for terminal
        "bytecode": "0x...",         // on compile/test/deploy success
        "abi": [...],
        "metadata": {...},
        ...
    }
"""

import sys
import json
import shlex
import traceback
from io import StringIO
from contextlib import redirect_stdout, redirect_stderr
from .transpiler import transpile_python_contract
from .templates import TEMPLATES


# ─── Command Parser ──────────────────────────────────────────────────────────

def parse_command(raw_command):
    """Parse a 'pyvax compile --optimizer=2' style command string.

    Returns (action, kwargs, positional).
    """
    try:
        parts = shlex.split(raw_command.strip())
    except ValueError:
        parts = raw_command.strip().split()

    # Strip leading 'pyvax' if present
    if parts and parts[0].lower() == "pyvax":
        parts = parts[1:]

    if not parts:
        return "help", {}, []

    action = parts[0].lower()
    args = parts[1:]
    kwargs = {}
    positional = []

    i = 0
    while i < len(args):
        if args[i].startswith("--"):
            key = args[i].lstrip("-").replace("-", "_")
            if "=" in key:
                k, v = key.split("=", 1)
                kwargs[k] = v
            elif i + 1 < len(args) and not args[i + 1].startswith("--"):
                kwargs[key] = args[i + 1]
                i += 1
            else:
                kwargs[key] = True
        elif args[i].startswith("-") and len(args[i]) == 2:
            key = args[i][1]
            if i + 1 < len(args) and not args[i + 1].startswith("-"):
                kwargs[key] = args[i + 1]
                i += 1
            else:
                kwargs[key] = True
        else:
            positional.append(args[i])
        i += 1

    return action, kwargs, positional


# ─── Command Handlers ────────────────────────────────────────────────────────

def execute_compile(source_code, contract_name="Contract", optimizer_level=1, overflow_safe=True):
    """Run the real PyVax transpiler on source code."""
    stdout_capture = StringIO()
    stderr_capture = StringIO()

    try:
        with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
            result = transpile_python_contract(
                source_code,
                overflow_safe=overflow_safe,
                optimizer_level=optimizer_level,
            )

        bytecode = result["bytecode"]
        size_bytes = (
            (len(bytecode) - 2) // 2
            if bytecode.startswith("0x")
            else len(bytecode) // 2
        )

        meta = result.get("metadata", {})
        before = meta.get("bytecode_size_before_opt", size_bytes)
        savings = ""
        if before > size_bytes:
            pct = (before - size_bytes) / before * 100
            savings = f" (-{pct:.0f}%)"

        compile_stdout = (
            f"Transpiling: {contract_name}.py\n"
            f"✓ {contract_name}: {size_bytes / 1024:.1f}kb{savings} "
            f"(optimizer=L{optimizer_level})\n\n"
            f"Compilation Results:\n"
            f"  Contract:  {contract_name}\n"
            f"  Status:    OK\n"
            f"  Size:      {size_bytes} bytes ({size_bytes / 1024:.1f}kb)\n"
            f"  Functions: {len(meta.get('functions', []))}\n"
            f"  Events:    {len(meta.get('events', []))}\n"
            f"  Optimizer: L{optimizer_level}\n\n"
            f"1/1 contracts compiled! Artifacts → build/\n"
        )

        return {
            "success": True,
            "command": "compile",
            "contract": contract_name,
            "bytecode": result["bytecode"],
            "abi": result["abi"],
            "metadata": result["metadata"],
            "size_bytes": size_bytes,
            "stdout": compile_stdout,
            "stderr": stderr_capture.getvalue(),
        }

    except Exception as e:
        return {
            "success": False,
            "command": "compile",
            "contract": contract_name,
            "error": str(e),
            "traceback": traceback.format_exc(),
            "stdout": stdout_capture.getvalue(),
            "stderr": stderr_capture.getvalue(),
        }


def execute_test(source_code, contract_name="Contract"):
    """Run a compile-only test (no deploy) to validate a contract."""
    result = execute_compile(source_code, contract_name, optimizer_level=1)

    if result["success"]:
        result["stdout"] = (
            f"Test Results:\n"
            f"  Contract:  {contract_name}\n"
            f"  Status:    PASS ✓\n"
            f"  Size:      {result['size_bytes']} bytes\n"
            f"  Functions: {len(result['metadata'].get('functions', []))}\n\n"
            f"All 1 test(s) passed!\n"
        )
        result["command"] = "test"
    else:
        result["stdout"] = (
            f"Test Results:\n"
            f"  Contract:  {contract_name}\n"
            f"  Status:    FAIL ✗\n"
            f"  Error:     {result.get('error', 'Unknown error')}\n\n"
            f"1 test(s) failed, 0 passed\n"
        )
        result["command"] = "test"

    return result


def execute_deploy_dry_run(source_code, contract_name="Contract", chain="fuji"):
    """Simulate a dry-run deploy (gas estimation only, no real deployment)."""
    compile_result = execute_compile(source_code, contract_name, optimizer_level=1)

    if not compile_result["success"]:
        return compile_result

    bytecode_size = compile_result["size_bytes"]
    estimated_gas = 21000 + (bytecode_size * 200) + 32000

    return {
        "success": True,
        "command": "deploy",
        "mode": "dry-run",
        "contract": contract_name,
        "chain": chain,
        "estimated_gas": estimated_gas,
        "bytecode": compile_result["bytecode"],
        "abi": compile_result["abi"],
        "metadata": compile_result.get("metadata", {}),
        "size_bytes": bytecode_size,
        "stdout": (
            f"Gas Simulation for {contract_name}\n\n"
            f"  Estimated gas: {estimated_gas:,}\n"
            f"  Network: {chain} (Chain ID: {'43113' if chain == 'fuji' else '43114'})\n"
            f"  Bytecode size: {bytecode_size} bytes\n\n"
            f"⚠ Dry run mode — no transaction was sent.\n"
            f"To deploy for real, connect a wallet with AVAX.\n"
        ),
    }


def execute_new(project_name, template=None):
    """Simulate `pyvax new <project_name>` — returns template source code."""
    template_name = template or project_name
    if template_name in TEMPLATES:
        source = TEMPLATES[template_name]
    else:
        source = TEMPLATES["SimpleStorage"]
        template_name = "SimpleStorage"

    return {
        "success": True,
        "command": "new",
        "project": project_name,
        "template": template_name,
        "source": source,
        "config": {
            "network": "fuji",
            "rpc_url": "https://api.avax-test.network/ext/bc/C/rpc",
            "chain_id": 43113,
            "optimizer_level": 1,
            "overflow_safe": True,
        },
        "stdout": (
            f"✓ Project '{project_name}' initialized!\n"
            f"  Template: {template_name}\n"
            f"  Network: fuji (Chain ID: 43113)\n\n"
            f"Next steps:\n"
            f"  1. Edit contracts/{template_name}.py\n"
            f"  2. pyvax compile\n"
            f"  3. pyvax deploy {template_name} --chain fuji\n"
        ),
    }


def execute_version():
    """Return version info response."""
    return {
        "success": True,
        "command": "version",
        "stdout": (
            "PyVax CLI v1.0.0\n\n"
            "Python to EVM transpiler for Avalanche smart contracts\n"
            "https://pyvax.io\n"
        ),
    }


def execute_help():
    """Return help text response."""
    return {
        "success": True,
        "command": "help",
        "stdout": (
            "PyVax v1.0.0 — Python to EVM Transpiler\n\n"
            "Commands:\n"
            "  pyvax new <name>             Scaffold a new project\n"
            "  pyvax compile [contract]     Transpile Python → EVM bytecode\n"
            "  pyvax test [contract]        Run compilation tests\n"
            "  pyvax deploy <name>          Deploy to Avalanche (dry-run)\n"
            "  pyvax version                Show version info\n"
            "  pyvax templates              List available templates\n\n"
            "Options:\n"
            "  --optimizer=N    Optimizer level (0-3)\n"
            "  --template=T     Contract template for 'new'\n"
            "  --chain=C        Target chain (fuji | mainnet)\n"
            "  --gas-report     Show gas breakdown\n\n"
            "Workflow: new → compile → deploy → call\n"
        ),
    }


def execute_templates():
    """Return available templates response."""
    return {
        "success": True,
        "command": "templates",
        "templates": list(TEMPLATES.keys()),
        "stdout": (
            "Available Templates:\n"
            + "\n".join(f"  • {t}" for t in TEMPLATES.keys())
            + "\n\nUsage: pyvax new <name> --template <template>\n"
        ),
    }


def execute_unknown(command):
    """Return unknown command error response."""
    return {
        "success": False,
        "command": command,
        "error": f"Unknown command: '{command}'",
        "stdout": (
            f"Error: Unknown command '{command}'\n\n"
            "Available commands: new, compile, test, deploy, version, help, templates\n"
            "Run 'pyvax help' for more information.\n"
        ),
    }


# ─── Main Entry Point ────────────────────────────────────────────────────────

def main():
    """Process a CLI command request from stdin, write JSON result to stdout."""
    input_data = sys.stdin.read()

    try:
        request = json.loads(input_data)
    except json.JSONDecodeError as e:
        result = {"success": False, "error": f"Invalid JSON input: {str(e)}"}
        print(json.dumps(result))
        return

    command = request.get("command", "").strip()
    source_code = request.get("source", "")
    contract_name = request.get("contract_name", "Contract")
    optimizer_level = int(request.get("optimizer_level", 1))
    overflow_safe = request.get("overflow_safe", True)
    template = request.get("template", None)
    chain = request.get("chain", "fuji")

    if not command:
        result = {"success": False, "error": "No command provided"}
        print(json.dumps(result))
        return

    try:
        if command == "compile":
            if not source_code:
                result = {"success": False, "error": "No source code provided for compilation"}
            else:
                result = execute_compile(source_code, contract_name, optimizer_level, overflow_safe)

        elif command == "test":
            if not source_code:
                result = {"success": False, "error": "No source code provided for testing"}
            else:
                result = execute_test(source_code, contract_name)

        elif command in ("deploy", "deploy --dry-run"):
            if not source_code:
                result = {"success": False, "error": "No source code provided for deployment simulation"}
            else:
                result = execute_deploy_dry_run(source_code, contract_name, chain)

        elif command == "new":
            project_name = contract_name or "MyProject"
            result = execute_new(project_name, template)

        elif command == "version":
            result = execute_version()

        elif command == "templates":
            result = execute_templates()

        elif command == "help":
            result = execute_help()

        else:
            result = execute_unknown(command)

    except Exception as e:
        result = {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
            "stdout": f"Internal error: {str(e)}\n",
        }

    # Write JSON to stdout — this is what the Next.js API route reads
    print(json.dumps(result, default=str))


if __name__ == "__main__":
    main()
