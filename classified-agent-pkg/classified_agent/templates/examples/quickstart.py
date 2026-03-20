#!/usr/bin/env python3
"""Quickstart example — run a minimal Classified agent programmatically.

This script shows how to use the classified_agent library directly,
without the CLI.  Useful for embedding the agent in a larger application.

Usage:
    export ANTHROPIC_API_KEY='sk-ant-...'
    python quickstart.py
"""

from __future__ import annotations

import asyncio
import logging
from decimal import Decimal
from pathlib import Path

from classified_agent.config.models import (
    AgentConfig,
    ClassifiedConfig,
    LLMConfig,
    LoggingConfig,
    WalletConfig,
    WalletPolicyConfig,
)
from classified_agent.config.loader import resolve_api_key
from classified_agent.core.context import AgentContext
from classified_agent.core.llm import create_llm_client
from classified_agent.core.loop import AgentLoop
from classified_agent.core.memory import MemoryStore
from classified_agent.tools.base import ToolRegistry
from classified_agent.tools.fs_tools import FsReadTool, FsWriteTool, FsListTool
from classified_agent.wallet.base import WalletPolicy
from classified_agent.wallet.managed_wallets import MockWalletBackend


async def main() -> None:
    """Run a minimal agent that reads workspace and signals done."""

    # 1. Build config programmatically
    config = ClassifiedConfig(
        agent=AgentConfig(
            name="quickstart-agent",
            description="A minimal demo agent",
            workspace_dir="./workspace",
            max_steps=5,
        ),
        llm=LLMConfig(
            provider="anthropic",
            model="claude-sonnet-4-20250514",
            api_key_env="ANTHROPIC_API_KEY",
        ),
        wallet=WalletConfig(
            backend="mock",
            policy=WalletPolicyConfig(
                max_native_per_tx=Decimal("0"),
                max_native_per_day=Decimal("0"),
            ),
        ),
        logging=LoggingConfig(level="DEBUG"),
    )

    # 2. Resolve API key from environment
    api_key = resolve_api_key(config.llm)

    # 3. Create subsystems
    workspace = Path(config.agent.workspace_dir).resolve()
    workspace.mkdir(parents=True, exist_ok=True)

    llm = create_llm_client(config.llm, api_key)
    wallet = MockWalletBackend(
        policy=WalletPolicy(
            max_native_per_tx=config.wallet.policy.max_native_per_tx,
            max_native_per_day=config.wallet.policy.max_native_per_day,
        ),
        workspace_dir=workspace,
    )
    tools = ToolRegistry()
    tools.register_many([FsReadTool(), FsWriteTool(), FsListTool()])
    memory = MemoryStore(workspace)

    log = logging.getLogger("classified")
    log.setLevel(logging.DEBUG)
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(levelname)s | %(message)s"))
    log.addHandler(handler)

    # 4. Create context and run loop
    ctx = AgentContext(
        config=config,
        llm=llm,
        wallet=wallet,
        tools=tools,
        memory=memory,
        logger=log,
        dry_run=True,
    )

    loop = AgentLoop(ctx)
    result = await loop.run(
        initial_message="List all files in the workspace directory, then signal <DONE>."
    )
    print(f"\n{'='*60}")
    print(f"Agent finished: {result[:200]}")


if __name__ == "__main__":
    asyncio.run(main())
