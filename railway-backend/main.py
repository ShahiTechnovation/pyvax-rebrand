"""PyVax CLI Backend — FastAPI server for the PyVax IDE.

Accepts compilation requests from the Next.js frontend and runs the
real Python transpiler. Deployed on Railway (or any Docker host).

Routes:
    GET  /api/cli → Health check
    POST /api/cli → Execute pyvax commands (compile, test, deploy, new, help, etc.)
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, Any
from pydantic import BaseModel
import sys
import os
import shlex
import traceback

# Add the api directory to the path so we can import avax_cli
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "api"))

from api.avax_cli.api_wrapper import (
    execute_compile,
    execute_test,
    execute_deploy_dry_run,
    execute_new,
    TEMPLATES,
)

app = FastAPI(title="PyVax CLI API")

# In production, restrict CORS to your Vercel deployment domain
ALLOWED_ORIGINS = os.environ.get(
    "CORS_ORIGINS",
    "https://pyvax.io,https://pyvax-rebrand.vercel.app,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class CommandRequest(BaseModel):
    """Request body for CLI command execution.
    
    Supports two protocols:
    1. Structured: { command: "compile", source: "...", contract_name: "..." }
    2. CLI-style: { command: "pyvax compile --optimizer=2", source: "..." }
    """
    command: str
    source: Optional[str] = ""
    contract_name: Optional[str] = "Contract"
    optimizer_level: Optional[int] = None
    overflow_safe: Optional[bool] = None
    template: Optional[str] = None
    chain: Optional[str] = None


def parse_cli_command(raw_command: str):
    """Parse a 'pyvax compile --optimizer=2' style command string."""
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


@app.get("/api/cli")
async def health_check():
    return {
        "status": "ok",
        "service": "pyvax-backend",
        "version": "1.0.0",
        "commands": ["new", "compile", "test", "deploy", "help", "version", "templates"],
    }


@app.post("/api/cli")
async def execute_cli(req: CommandRequest):
    raw_command = req.command.strip()
    source_code = req.source
    contract_name = req.contract_name

    if not raw_command:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "No command provided"},
        )

    # Check if the command is a simple action word or a full CLI string
    simple_actions = {"compile", "test", "deploy", "new", "help", "version", "templates"}
    if raw_command.lower() in simple_actions:
        # Structured protocol: action is the command directly
        action = raw_command.lower()
        kwargs = {}
        positional = []
    else:
        # CLI-style protocol: parse the full string
        action, kwargs, positional = parse_cli_command(raw_command)

    # Resolve parameters from kwargs or from structured request fields
    opt_level = req.optimizer_level or int(kwargs.get("optimizer", kwargs.get("opt", 1)))
    overflow = req.overflow_safe if req.overflow_safe is not None else (kwargs.get("no_overflow_safe") is None)
    template = req.template or kwargs.get("template") or kwargs.get("t")
    chain = req.chain or kwargs.get("chain", kwargs.get("n", "fuji"))

    try:
        if action == "new":
            name = positional[0] if positional else (contract_name or "MyProject")
            result = execute_new(name, template)
            return result

        elif action == "compile":
            if not source_code:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "error": "No source code provided for compilation"},
                )
            name = positional[0] if positional else contract_name
            result = execute_compile(source_code, name, opt_level, overflow)
            return result

        elif action == "test":
            if not source_code:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "error": "No source code provided for testing"},
                )
            name = positional[0] if positional else contract_name
            result = execute_test(source_code, name)
            return result

        elif action == "deploy":
            if not source_code:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "error": "No source code provided for deployment simulation"},
                )
            name = positional[0] if positional else contract_name
            result = execute_deploy_dry_run(source_code, name, chain)
            return result

        elif action == "version":
            return {
                "success": True,
                "command": "version",
                "stdout": (
                    "PyVax CLI v1.0.0\n\n"
                    "Python to EVM transpiler for Avalanche smart contracts\n"
                    "https://pyvax.io\n"
                ),
            }

        elif action == "templates":
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

        elif action == "help":
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

        else:
            return {
                "success": False,
                "command": action,
                "error": f"Unknown command: '{action}'",
                "stdout": (
                    f"Error: Unknown command '{action}'\n\n"
                    "Available commands: new, compile, test, deploy, version, help\n"
                    "Run 'pyvax help' for more information.\n"
                ),
            }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "stdout": f"Internal error: {str(e)}\n",
            },
        )
