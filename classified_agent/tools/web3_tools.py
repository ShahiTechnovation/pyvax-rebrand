"""Web3 and PyVax integration tools.

These tools let the agent compile, deploy, and interact with smart
contracts through the PyVax toolchain, and manage wallet operations
(balance, send, ERC-20) through the :class:`WalletBackend`.
"""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path
from typing import TYPE_CHECKING, Any

from classified_agent.tools.base import Tool, ToolResult

if TYPE_CHECKING:
    from classified_agent.core.context import AgentContext


# ══════════════════════════════════════════════════════════════════════
# PyVax compilation / deployment tools
# ══════════════════════════════════════════════════════════════════════


class PyvaxCompileTool(Tool):
    """Compile a Python smart contract via the PyVax transpiler."""

    name = "pyvax_compile"
    description = (
        "Compile a Python contract file (.py) to EVM bytecode + ABI "
        "using the PyVax transpiler. The file must be in the workspace."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Relative path to the .py contract file in the workspace.",
            },
            "optimizer_level": {
                "type": "integer",
                "description": "Optimizer level 0-3 (default 1).",
                "default": 1,
            },
        },
        "required": ["path"],
    }

    async def run(self, ctx: "AgentContext", **kwargs: Any) -> ToolResult:
        path_str: str = kwargs["path"]
        optimizer: int = kwargs.get("optimizer_level", 1)
        workspace = Path(ctx.config.agent.workspace_dir).resolve()

        source_file = (workspace / path_str).resolve()
        if not str(source_file).startswith(str(workspace)):
            return ToolResult(success=False, error="Path escapes workspace.")
        if not source_file.exists():
            return ToolResult(success=False, error=f"File not found: {path_str}")

        try:
            from avax_cli.compiler import compile_contracts

            # Compile from the file's parent directory with a filter
            contracts_dir = source_file.parent
            build_dir = workspace / "build"

            results = compile_contracts(
                contracts_dir=contracts_dir,
                output_dir=build_dir,
                optimizer_level=optimizer,
                overflow_safe=True,
                contract_filter=source_file.stem,
            )

            if not results:
                return ToolResult(success=False, error="No compilation results returned.")

            contract_name = source_file.stem
            if contract_name not in results:
                return ToolResult(success=False, error=f"Contract '{contract_name}' not in results.")

            result = results[contract_name]
            if not result.get("success"):
                return ToolResult(success=False, error=result.get("error", "Unknown error"))

            return ToolResult(
                success=True,
                output={
                    "contract_name": contract_name,
                    "abi": result["abi"],
                    "bytecode_size": len(result.get("bytecode", "")) // 2,
                    "metadata": result.get("metadata", {}),
                    "artifact_path": str(result.get("output_file", "")),
                },
            )

        except ImportError:
            return ToolResult(
                success=False,
                error="PyVax compiler (avax_cli) not available. Is it installed?",
            )
        except Exception as exc:
            return ToolResult(success=False, error=f"Compilation failed: {exc}")


class PyvaxDeployTool(Tool):
    """Deploy a compiled contract to an EVM chain."""

    name = "pyvax_deploy"
    description = (
        "Deploy a previously compiled PyVax contract to the configured "
        "chain (default: Avalanche Fuji). Requires a funded wallet."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "contract_name": {
                "type": "string",
                "description": "Name of the compiled contract (must match build/ artifact).",
            },
            "constructor_args": {
                "type": "array",
                "description": "Constructor arguments (empty array if none).",
                "items": {},
                "default": [],
            },
            "chain": {
                "type": "string",
                "description": "Target chain (e.g. 'avalanche_fuji', 'avalanche_mainnet').",
            },
        },
        "required": ["contract_name"],
    }

    async def run(self, ctx: "AgentContext", **kwargs: Any) -> ToolResult:
        contract_name: str = kwargs["contract_name"]
        constructor_args: list = kwargs.get("constructor_args", [])
        chain: str = kwargs.get("chain", ctx.config.wallet.default_chain)

        if ctx.dry_run:
            ctx.logger.info(
                "DRY RUN: would deploy %s to %s with args %s",
                contract_name, chain, constructor_args,
            )
            return ToolResult(
                success=True,
                output={
                    "contract_name": contract_name,
                    "address": "0x_dry_run_address",
                    "tx_hash": "0x_dry_run_tx",
                    "chain": chain,
                    "dry_run": True,
                },
            )

        try:
            from avax_cli.compiler import get_contract_artifacts
            from avax_cli.deployer import deploy_contract
            from avax_cli.wallet import WalletManager

            # Build a config dict compatible with avax_cli
            chain_to_network = {
                "avalanche_fuji": "fuji",
                "avalanche_mainnet": "cchain",
            }
            network = chain_to_network.get(chain, chain)
            config = {
                "network": network,
                "rpc_url": ctx.config.wallet.rpc_url,
                "chain_id": 43113 if "fuji" in chain else 43114,
            }

            wallet = WalletManager()
            result = deploy_contract(
                contract_name=contract_name,
                constructor_args=constructor_args,
                config=config,
                wallet=wallet,
            )

            if result:
                return ToolResult(
                    success=True,
                    output={
                        "contract_name": contract_name,
                        "address": result["address"],
                        "tx_hash": result["tx_hash"],
                        "gas_used": result["gas_used"],
                        "chain": chain,
                    },
                )
            else:
                return ToolResult(success=False, error="Deployment returned no result.")

        except ImportError:
            return ToolResult(
                success=False,
                error="PyVax deployer (avax_cli) not available.",
            )
        except Exception as exc:
            return ToolResult(success=False, error=f"Deployment failed: {exc}")


class PyvaxCallTool(Tool):
    """Call a function on a deployed contract."""

    name = "pyvax_call"
    description = (
        "Call a function on a deployed smart contract. Supports both "
        "read-only (view) and state-changing (write) calls."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "address": {
                "type": "string",
                "description": "Contract address (0x...).",
            },
            "abi": {
                "type": "array",
                "description": "Contract ABI (JSON array of function defs).",
                "items": {"type": "object"},
            },
            "function": {
                "type": "string",
                "description": "Function name to call.",
            },
            "args": {
                "type": "array",
                "description": "Function arguments.",
                "items": {},
                "default": [],
            },
            "write": {
                "type": "boolean",
                "description": "True for state-changing call, False for read-only.",
                "default": False,
            },
        },
        "required": ["address", "abi", "function"],
    }

    async def run(self, ctx: "AgentContext", **kwargs: Any) -> ToolResult:
        address: str = kwargs["address"]
        abi: list = kwargs["abi"]
        function: str = kwargs["function"]
        args: list = kwargs.get("args", [])
        write: bool = kwargs.get("write", False)
        chain = ctx.config.wallet.default_chain

        try:
            result = await ctx.wallet.call_contract(
                address=address,
                abi=abi,
                function=function,
                args=args,
                chain=chain,
                write=write,
                dry_run=ctx.dry_run,
            )
            return ToolResult(success=True, output=result)
        except Exception as exc:
            return ToolResult(success=False, error=f"Contract call failed: {exc}")


# ══════════════════════════════════════════════════════════════════════
# Wallet operation tools
# ══════════════════════════════════════════════════════════════════════


class WalletGetBalanceTool(Tool):
    """Check the wallet's native token balance."""

    name = "wallet_get_balance"
    description = "Get the native token balance (AVAX/ETH) of the agent's wallet."
    input_schema = {
        "type": "object",
        "properties": {
            "chain": {
                "type": "string",
                "description": "Chain to check (defaults to config default_chain).",
            },
        },
    }

    async def run(self, ctx: "AgentContext", **kwargs: Any) -> ToolResult:
        chain = kwargs.get("chain", ctx.config.wallet.default_chain)
        try:
            balance = await ctx.wallet.get_balance(chain)
            address = await ctx.wallet.get_address()
            return ToolResult(
                success=True,
                output={"address": address, "balance": str(balance), "chain": chain},
            )
        except Exception as exc:
            return ToolResult(success=False, error=f"Balance check failed: {exc}")


class WalletSendNativeTool(Tool):
    """Send native tokens (AVAX/ETH) to an address."""

    name = "wallet_send_native"
    description = (
        "Send native tokens to an address. Subject to wallet policy limits."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "to": {"type": "string", "description": "Recipient address (0x...)."},
            "amount": {"type": "string", "description": "Amount to send (e.g. '0.05')."},
            "chain": {"type": "string", "description": "Target chain."},
        },
        "required": ["to", "amount"],
    }

    async def run(self, ctx: "AgentContext", **kwargs: Any) -> ToolResult:
        to: str = kwargs["to"]
        amount = Decimal(kwargs["amount"])
        chain = kwargs.get("chain", ctx.config.wallet.default_chain)

        try:
            result = await ctx.wallet.send_native(
                to=to, amount=amount, chain=chain, dry_run=ctx.dry_run
            )
            return ToolResult(success=True, output=result)
        except Exception as exc:
            return ToolResult(success=False, error=str(exc))


class WalletErc20TransferTool(Tool):
    """Transfer ERC-20 tokens."""

    name = "wallet_erc20_transfer"
    description = (
        "Transfer ERC-20 tokens from the agent wallet. "
        "Subject to contract allowlist policy."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "token_address": {"type": "string", "description": "ERC-20 contract address."},
            "to": {"type": "string", "description": "Recipient address."},
            "amount": {"type": "integer", "description": "Amount in smallest unit (wei/base units)."},
        },
        "required": ["token_address", "to", "amount"],
    }

    async def run(self, ctx: "AgentContext", **kwargs: Any) -> ToolResult:
        token: str = kwargs["token_address"]
        to: str = kwargs["to"]
        amount: int = kwargs["amount"]
        chain = ctx.config.wallet.default_chain

        try:
            result = await ctx.wallet.erc20_transfer(
                token=token, to=to, amount=amount, chain=chain, dry_run=ctx.dry_run
            )
            return ToolResult(success=True, output=result)
        except Exception as exc:
            return ToolResult(success=False, error=str(exc))


class WalletErc20ApproveTool(Tool):
    """Approve an ERC-20 allowance."""

    name = "wallet_erc20_approve"
    description = (
        "Approve a spender to use ERC-20 tokens from the agent wallet. "
        "Subject to contract allowlist policy."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "token_address": {"type": "string", "description": "ERC-20 contract address."},
            "spender": {"type": "string", "description": "Spender address to approve."},
            "amount": {"type": "integer", "description": "Amount to approve (in base units)."},
        },
        "required": ["token_address", "spender", "amount"],
    }

    async def run(self, ctx: "AgentContext", **kwargs: Any) -> ToolResult:
        token: str = kwargs["token_address"]
        spender: str = kwargs["spender"]
        amount: int = kwargs["amount"]
        chain = ctx.config.wallet.default_chain

        try:
            result = await ctx.wallet.erc20_approve(
                token=token, spender=spender, amount=amount, chain=chain, dry_run=ctx.dry_run
            )
            return ToolResult(success=True, output=result)
        except Exception as exc:
            return ToolResult(success=False, error=str(exc))
