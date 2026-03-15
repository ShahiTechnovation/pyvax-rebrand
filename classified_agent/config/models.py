"""Pydantic v2 configuration models for Project Classified.

These models map 1:1 to sections in ``classified.toml`` and provide
strict validation, sensible defaults, and JSON-Schema export so
the same schema can drive the future Next.js /agent settings UI.
"""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field


# ──────────────────────────────────────────────────────────────────────
# [agent]
# ──────────────────────────────────────────────────────────────────────

class AgentConfig(BaseModel):
    """Identity and runtime bounds for the agent."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=64,
        description="Short identifier for this agent instance.",
    )
    description: str = Field(
        default="",
        max_length=256,
        description="One-liner explaining what the agent does.",
    )
    workspace_dir: Path = Field(
        default=Path("./workspace"),
        description="Root directory for files, logs, and repos the agent creates.",
    )
    max_tokens_per_thought: int | None = Field(
        default=None,
        ge=256,
        description="Optional cap on tokens per LLM response.",
    )
    max_steps: int = Field(
        default=50,
        ge=1,
        le=500,
        description="Maximum agent loop iterations before forced stop.",
    )


# ──────────────────────────────────────────────────────────────────────
# [llm]
# ──────────────────────────────────────────────────────────────────────

class LLMConfig(BaseModel):
    """LLM provider configuration — vendor-agnostic."""

    provider: Literal["anthropic", "openai", "custom"] = Field(
        default="anthropic",
        description="Which LLM backend to use.",
    )
    model: str = Field(
        default="claude-sonnet-4-20250514",
        description="Model identifier passed to the provider API.",
    )
    api_key_env: str = Field(
        default="ANTHROPIC_API_KEY",
        description="Name of the environment variable holding the API key.",
    )
    base_url: str | None = Field(
        default=None,
        description="Optional base URL override (e.g. for a local proxy).",
    )


# ──────────────────────────────────────────────────────────────────────
# [wallet.policy]
# ──────────────────────────────────────────────────────────────────────

class WalletPolicyConfig(BaseModel):
    """Safety guardrails for on-chain operations."""

    max_native_per_tx: Decimal = Field(
        default=Decimal("0.1"),
        ge=0,
        description="Maximum native token (AVAX/ETH) per single transaction.",
    )
    max_native_per_day: Decimal = Field(
        default=Decimal("1.0"),
        ge=0,
        description="Maximum native token spend across all txs in a 24-hour window.",
    )
    allowed_contracts: list[str] = Field(
        default_factory=list,
        description="Contract addresses the agent may interact with (empty = no restriction).",
    )
    allowed_methods: list[str] = Field(
        default_factory=list,
        description="Method selectors or names the agent may call (empty = no restriction).",
    )


# ──────────────────────────────────────────────────────────────────────
# [wallet]
# ──────────────────────────────────────────────────────────────────────

class WalletConfig(BaseModel):
    """Wallet backend selection and chain defaults."""

    backend: Literal[
        "pyvax_local",
        "managed_vincent",
        "managed_sequence",
        "mock",
    ] = Field(
        default="pyvax_local",
        description="Which wallet implementation to use.",
    )
    default_chain: str = Field(
        default="avalanche_fuji",
        description="Default chain for all wallet operations.",
    )
    rpc_url: str = Field(
        default="https://api.avax-test.network/ext/bc/C/rpc",
        description="JSON-RPC endpoint for the default chain.",
    )
    policy: WalletPolicyConfig = Field(
        default_factory=WalletPolicyConfig,
        description="Safety policy for on-chain operations.",
    )


# ──────────────────────────────────────────────────────────────────────
# [synthesis]
# ──────────────────────────────────────────────────────────────────────

class SynthesisConfig(BaseModel):
    """Integration with the Synthesis.md hackathon platform."""

    enabled: bool = Field(
        default=False,
        description="Whether the agent should operate in Synthesis hackathon mode.",
    )
    skill_url: str = Field(
        default="https://synthesis.md/skill.md",
        description="URL to fetch the Synthesis skill definition.",
    )
    track: str = Field(
        default="open",
        description="Hackathon track: 'open' or a partner-track string.",
    )
    agent_profile: str = Field(
        default="",
        max_length=256,
        description="Short description of what this agent is entering as.",
    )


# ──────────────────────────────────────────────────────────────────────
# [logging]
# ──────────────────────────────────────────────────────────────────────

class LoggingConfig(BaseModel):
    """Logging verbosity and output location."""

    level: Literal["DEBUG", "INFO", "WARN"] = Field(
        default="INFO",
        description="Minimum log level.",
    )
    log_dir: Path = Field(
        default=Path("./logs"),
        description="Directory for per-run log files.",
    )


# ──────────────────────────────────────────────────────────────────────
# Top-level config — maps 1:1 to classified.toml
# ──────────────────────────────────────────────────────────────────────

class ClassifiedConfig(BaseModel):
    """Root configuration object for Project Classified.

    Mirrors the full ``classified.toml`` schema.  Every CLI command
    starts by calling ``load_config()`` which returns an instance
    of this model.
    """

    agent: AgentConfig
    llm: LLMConfig = Field(default_factory=LLMConfig)
    wallet: WalletConfig = Field(default_factory=WalletConfig)
    synthesis: SynthesisConfig = Field(default_factory=SynthesisConfig)
    logging: LoggingConfig = Field(default_factory=LoggingConfig)
