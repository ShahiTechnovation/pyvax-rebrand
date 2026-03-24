from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, Any
from pydantic import BaseModel
import sys
import os

from api.cli import parse_command, execute_new, execute_compile, execute_test, execute_deploy_dry_run, TEMPLATES

app = FastAPI(title="PyVax CLI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CommandRequest(BaseModel):
    command: str
    source: Optional[str] = ""
    contract_name: Optional[str] = "Contract"
    wallet_address: Optional[str] = None

@app.get("/api/cli")
async def health_check():
    return {
        "status": "ok",
        "service": "pyvax-playground",
        "version": "1.0.0",
        "commands": ["new", "compile", "test", "deploy", "help", "version", "templates"],
    }

@app.post("/api/cli")
async def execute_cli(req: CommandRequest):
    command = req.command.strip()
    source_code = req.source
    contract_name = req.contract_name

    if not command:
        return JSONResponse(status_code=400, content={"success": False, "error": "No command provided"})

    action, kwargs, positional = parse_command(command)

    try:
        if action == "new":
            name = positional[0] if positional else "MyProject"
            template = kwargs.get("template") or kwargs.get("t") or None
            result = execute_new(name, template)
            return result

        elif action == "compile":
            if not source_code:
                return JSONResponse(status_code=400, content={"success": False, "error": "No source code provided for compilation"})
            opt_level = int(kwargs.get("optimizer", kwargs.get("opt", 1)))
            overflow = kwargs.get("no_overflow_safe") is None
            name = positional[0] if positional else contract_name
            result = execute_compile(source_code, name, opt_level, overflow)
            return result

        elif action == "test":
            if not source_code:
                return JSONResponse(status_code=400, content={"success": False, "error": "No source code provided for testing"})
            name = positional[0] if positional else contract_name
            result = execute_test(source_code, name)
            return result

        elif action == "deploy":
            if not source_code:
                return JSONResponse(status_code=400, content={"success": False, "error": "No source code provided for deployment simulation"})
            name = positional[0] if positional else contract_name
            chain = kwargs.get("chain", kwargs.get("n", "fuji"))
            result = execute_deploy_dry_run(source_code, name, chain, req.wallet_address)
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
        import traceback
        return JSONResponse(status_code=500, content={
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
            "stdout": f"Internal error: {str(e)}\n",
        })
