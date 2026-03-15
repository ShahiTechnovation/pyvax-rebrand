"""Shared test fixtures for the classified_agent test suite."""

from __future__ import annotations

import asyncio
import logging
from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest

from classified_agent.config.models import (
    AgentConfig,
    ClassifiedConfig,
    LLMConfig,
    LoggingConfig,
    SynthesisConfig,
    WalletConfig,
    WalletPolicyConfig,
)
from classified_agent.core.context import AgentContext
from classified_agent.core.llm import BaseLLMClient, LLMMessage, ToolCall
from classified_agent.core.memory import MemoryStore
from classified_agent.tools.base import ToolRegistry, ToolSpec
from classified_agent.wallet.base import WalletPolicy
from classified_agent.wallet.managed_wallets import MockWalletBackend


# ──────────────────────────────────────────────────────────────────────
# Mock LLM client
# ──────────────────────────────────────────────────────────────────────


class MockLLMClient(BaseLLMClient):
    """LLM client that returns pre-programmed responses for testing.

    Attributes:
        responses: Queue of responses to return in order.
        calls:     Record of all chat() calls made.
    """

    def __init__(self, responses: list[LLMMessage] | None = None) -> None:
        self.responses: list[LLMMessage] = responses or [
            LLMMessage(role="assistant", content="I have completed the task. <DONE>")
        ]
        self.calls: list[dict[str, Any]] = []
        self._call_idx = 0

    async def chat(
        self,
        messages: list[LLMMessage],
        tools: list[ToolSpec] | None = None,
        max_tokens: int | None = None,
    ) -> LLMMessage:
        self.calls.append({
            "messages": messages,
            "tools": tools,
            "max_tokens": max_tokens,
        })
        if self._call_idx < len(self.responses):
            resp = self.responses[self._call_idx]
            self._call_idx += 1
            return resp
        # Default: signal done
        return LLMMessage(role="assistant", content="<DONE>")


# ──────────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────────


@pytest.fixture
def tmp_workspace(tmp_path: Path) -> Path:
    """Create a temporary workspace directory."""
    ws = tmp_path / "workspace"
    ws.mkdir()
    return ws


@pytest.fixture
def sample_config(tmp_workspace: Path) -> ClassifiedConfig:
    """Return a ClassifiedConfig with sane test defaults."""
    return ClassifiedConfig(
        agent=AgentConfig(
            name="test-agent",
            description="A test agent",
            workspace_dir=str(tmp_workspace),
            max_steps=5,
        ),
        llm=LLMConfig(
            provider="anthropic",
            model="claude-sonnet-4-20250514",
            api_key_env="TEST_API_KEY",
        ),
        wallet=WalletConfig(
            backend="mock",
            default_chain="avalanche_fuji",
            rpc_url="https://api.avax-test.network/ext/bc/C/rpc",
            policy=WalletPolicyConfig(
                max_native_per_tx=Decimal("0.1"),
                max_native_per_day=Decimal("1.0"),
            ),
        ),
        synthesis=SynthesisConfig(enabled=False),
        logging=LoggingConfig(level="DEBUG", log_dir=str(tmp_workspace / "logs")),
    )


@pytest.fixture
def mock_wallet(tmp_workspace: Path) -> MockWalletBackend:
    """Return a MockWalletBackend with test policy."""
    policy = WalletPolicy(
        max_native_per_tx=Decimal("0.1"),
        max_native_per_day=Decimal("1.0"),
    )
    return MockWalletBackend(policy=policy, workspace_dir=tmp_workspace)


@pytest.fixture
def mock_llm() -> MockLLMClient:
    """Return a MockLLMClient with a default DONE response."""
    return MockLLMClient()


@pytest.fixture
def tool_registry() -> ToolRegistry:
    """Return an empty ToolRegistry."""
    return ToolRegistry()


@pytest.fixture
def memory_store(tmp_workspace: Path) -> MemoryStore:
    """Return a MemoryStore backed by the tmp workspace."""
    return MemoryStore(tmp_workspace)


@pytest.fixture
def agent_context(
    sample_config: ClassifiedConfig,
    mock_llm: MockLLMClient,
    mock_wallet: MockWalletBackend,
    tool_registry: ToolRegistry,
    memory_store: MemoryStore,
) -> AgentContext:
    """Return a fully wired AgentContext for testing."""
    log = logging.getLogger("classified_test")
    log.setLevel(logging.DEBUG)
    return AgentContext(
        config=sample_config,
        llm=mock_llm,
        wallet=mock_wallet,
        tools=tool_registry,
        memory=memory_store,
        logger=log,
        dry_run=False,
    )
