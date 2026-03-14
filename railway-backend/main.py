"""PyVax CLI Backend — FastAPI server for the PyVax IDE.

Accepts compilation requests from the Next.js frontend and runs the
real Python transpiler. Deployed on Railway (or any Docker host).

Routes:
    GET  /api/cli → Health check
    POST /api/cli → Execute pyvax commands (compile, test, deploy, new, help, etc.)
"""

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from pydantic import BaseModel
import os
import traceback

from avax_cli.api_wrapper import (
    parse_command,
    execute_compile,
    execute_test,
    execute_deploy_dry_run,
    execute_new,
    execute_version,
    execute_help,
    execute_templates,
    execute_unknown,
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
        action = raw_command.lower()
        kwargs = {}
        positional = []
    else:
        action, kwargs, positional = parse_command(raw_command)

    # Resolve parameters from kwargs or from structured request fields
    opt_level = req.optimizer_level or int(kwargs.get("optimizer", kwargs.get("opt", 1)))
    overflow = req.overflow_safe if req.overflow_safe is not None else (kwargs.get("no_overflow_safe") is None)
    template = req.template or kwargs.get("template") or kwargs.get("t")
    chain = req.chain or kwargs.get("chain", kwargs.get("n", "fuji"))

    try:
        if action == "new":
            name = positional[0] if positional else (contract_name or "MyProject")
            return execute_new(name, template)

        elif action == "compile":
            if not source_code:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "error": "No source code provided for compilation"},
                )
            name = positional[0] if positional else contract_name
            return execute_compile(source_code, name, opt_level, overflow)

        elif action == "test":
            if not source_code:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "error": "No source code provided for testing"},
                )
            name = positional[0] if positional else contract_name
            return execute_test(source_code, name)

        elif action == "deploy":
            if not source_code:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "error": "No source code provided for deployment simulation"},
                )
            name = positional[0] if positional else contract_name
            return execute_deploy_dry_run(source_code, name, chain)

        elif action == "version":
            return execute_version()

        elif action == "templates":
            return execute_templates()

        elif action == "help":
            return execute_help()

        else:
            return execute_unknown(action)

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "stdout": f"Internal error: {str(e)}\n",
            },
        )
