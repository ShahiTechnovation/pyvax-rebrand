#!/usr/bin/env python3
"""JSON API wrapper for the PyVax transpiler v1.0.0.

Reads a JSON request from stdin and writes transpilation result to stdout.
Used by the Next.js web interface for server-side transpilation.

Usage:
    echo '{"code": "class Token(Contract): ..."}' | python -m avax_cli.api_wrapper

Request format:
    {
        "code": "<python source>",
        "optimizer_level": 1,        // optional, 0-3
        "overflow_safe": true         // optional
    }

Response format:
    {
        "success": true,
        "bytecode": "0x...",
        "abi": [...],
        "metadata": {...}
    }
"""

import sys
import json
from .transpiler import transpile_python_contract


def main():
    """Process a transpilation request from stdin."""
    input_data = sys.stdin.read()

    try:
        request = json.loads(input_data)
    except json.JSONDecodeError as e:
        result = {
            "success": False,
            "errors": [f"Invalid JSON input: {str(e)}"],
        }
        print(json.dumps(result))
        return

    code = request.get("code", "")
    optimizer_level = request.get("optimizer_level", 1)
    overflow_safe = request.get("overflow_safe", True)

    if not code:
        result = {
            "success": False,
            "errors": ["No code provided"],
        }
    else:
        try:
            transpile_result = transpile_python_contract(
                code,
                overflow_safe=overflow_safe,
                optimizer_level=optimizer_level,
            )
            result = {
                "success": True,
                **transpile_result,
            }
        except Exception as e:
            result = {
                "success": False,
                "errors": [str(e)],
            }

    print(json.dumps(result))


if __name__ == "__main__":
    main()
