"""PyVax CLI Backend — FastAPI server for the PyVax IDE.

Accepts compilation requests from the Next.js frontend and runs the
real Python transpiler. Deployed on Railway (or any Docker host).

Routes:
    GET  /api/cli        → Health check
    POST /api/cli        → Execute pyvax commands (compile, test, deploy, new, help, etc.)
    POST /api/transform  → Python → Verified Solidity + Snowtrace payload
    POST /api/verify     → Submit Snowtrace verification for deployed contract
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
    execute_transform,
    execute_verify,
    execute_unknown,
    TEMPLATES,
)

app = FastAPI(title="PyVax CLI API", version="2.1.0")

# In production, restrict CORS to your Vercel deployment domain
ALLOWED_ORIGINS = os.environ.get(
    "CORS_ORIGINS",
    "https://pyvax.xyz,https://pyvax.io,https://pyvax-rebrand.vercel.app,http://localhost:3000"
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


class TransformRequest(BaseModel):
    """Request body for Python → Verified Solidity transformation."""
    source: str
    contract_name: Optional[str] = "Contract"


class VerifyRequest(BaseModel):
    """Request body for Snowtrace verification submission."""
    address: str
    payload: dict
    chain: Optional[str] = "fuji"


# ─── Health Check ────────────────────────────────────────────────────────────

@app.get("/api/cli")
async def health_check():
    return {
        "status": "ok",
        "service": "pyvax-backend",
        "version": "2.1.0",
        "commands": ["new", "compile", "test", "deploy", "transform", "verify", "help", "version", "templates"],
    }


# ─── CLI Command Execution ───────────────────────────────────────────────────

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
    simple_actions = {"compile", "test", "deploy", "new", "help", "version", "templates", "transform"}
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

        elif action == "transform":
            if not source_code:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "error": "No source code provided for transformation"},
                )
            name = positional[0] if positional else contract_name
            return execute_transform(source_code, name)

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


# ─── Dedicated Transform Endpoint ───────────────────────────────────────────

@app.post("/api/transform")
async def transform_python(req: TransformRequest):
    """Python → Verified Solidity + Snowtrace payload.

    Returns the generated Solidity source, ABI, and a ready-to-submit
    Snowtrace verification payload with evmVersion: "paris".
    """
    if not req.source:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "No source code provided"},
        )

    try:
        result = execute_transform(req.source, req.contract_name)
        return result
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "stdout": f"Internal error: {str(e)}\n",
            },
        )


# ─── Dedicated Verify Endpoint ──────────────────────────────────────────────

@app.post("/api/verify")
async def verify_contract(req: VerifyRequest):
    """Submit Snowtrace verification for a deployed contract.

    Expects a payload from the /api/transform response's snowtrace_payload
    field, plus the deployed contract address.
    """
    if not req.address:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Contract address required"},
        )

    try:
        result = execute_verify(req.address, req.payload, req.chain)
        return result
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "stdout": f"Verification error: {str(e)}\n",
            },
        )
