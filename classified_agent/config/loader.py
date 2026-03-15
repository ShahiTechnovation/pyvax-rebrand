"""Load, validate, and create ``classified.toml`` configuration files.

The loader uses ``tomli`` (stdlib ``tomllib`` on 3.11+) for parsing and
``tomli_w`` for writing default configs during ``classified-agent init``.
"""

from __future__ import annotations

import os
import sys
from decimal import Decimal
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from .models import (
    AgentConfig,
    ClassifiedConfig,
    LLMConfig,
    LoggingConfig,
    SynthesisConfig,
    WalletConfig,
    WalletPolicyConfig,
)

# Use stdlib tomllib on 3.11+, fall back to tomli on 3.9/3.10
if sys.version_info >= (3, 11):
    import tomllib
else:
    try:
        import tomli as tomllib  # type: ignore[no-redef]
    except ImportError as exc:
        raise ImportError(
            "Python < 3.11 requires the 'tomli' package. "
            "Install it with: pip install tomli"
        ) from exc


# ──────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────

def load_config(path: Path = Path("classified.toml")) -> ClassifiedConfig:
    """Read and validate a ``classified.toml`` file.

    Args:
        path: Filesystem path to the TOML config file.

    Returns:
        A fully validated :class:`ClassifiedConfig` instance.

    Raises:
        FileNotFoundError: If *path* does not exist.
        ValueError: If the TOML file fails Pydantic validation
            (wraps :class:`pydantic.ValidationError` with a
            human-readable message).
    """
    path = Path(path).resolve()

    if not path.exists():
        raise FileNotFoundError(
            f"Config file not found: {path}\n"
            "Run 'classified-agent init' to create a default config."
        )

    with open(path, "rb") as fh:
        raw: dict[str, Any] = tomllib.load(fh)

    try:
        return ClassifiedConfig.model_validate(raw)
    except ValidationError as exc:
        # Re-raise with a friendlier message that includes the file path
        raise ValueError(
            f"Invalid configuration in {path}:\n{exc}"
        ) from exc


def create_default_config(path: Path = Path("classified.toml")) -> ClassifiedConfig:
    """Write a sane-default ``classified.toml`` and return the parsed model.

    The generated file includes all sections with commented explanations
    so that a first-time user can understand each knob without reading docs.

    Args:
        path: Where to write the file.  Parent dirs are created as needed.

    Returns:
        The :class:`ClassifiedConfig` that was written.

    Raises:
        FileExistsError: If *path* already exists (never overwrites).
    """
    path = Path(path).resolve()

    if path.exists():
        raise FileExistsError(
            f"Config file already exists: {path}\n"
            "Delete it first or use a different path."
        )

    path.parent.mkdir(parents=True, exist_ok=True)

    toml_content = _build_default_toml()
    path.write_text(toml_content, encoding="utf-8")

    # Round-trip through the loader to guarantee consistency
    return load_config(path)


def resolve_api_key(config: LLMConfig) -> str:
    """Read the LLM API key from the environment variable named in *config*.

    Args:
        config: The ``[llm]`` section of the classified config.

    Returns:
        The API key string.

    Raises:
        EnvironmentError: If the env var is unset or empty.
    """
    key = os.environ.get(config.api_key_env, "").strip()
    if not key:
        raise EnvironmentError(
            f"LLM API key not found. Set the '{config.api_key_env}' "
            "environment variable before running the agent.\n"
            "Example:  export ANTHROPIC_API_KEY='sk-ant-...'"
        )
    return key


# ──────────────────────────────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────────────────────────────

def _build_default_toml() -> str:
    """Return the contents of a fresh ``classified.toml`` with comments."""

    return '''\
# ╔══════════════════════════════════════════════════════════════════╗
# ║  Project Classified — Agent Configuration                       ║
# ║  https://github.com/ShahiTechnovation/pyvax-rebrand             ║
# ╚══════════════════════════════════════════════════════════════════╝
#
# This file is the single source of truth for the agent runtime.
# Edit the values below and run:  classified-agent run

# ── Agent identity & runtime bounds ──────────────────────────────

[agent]
name = "classified-001"
description = "A web3-native AI agent powered by PyVax"
workspace_dir = "./workspace"
# max_tokens_per_thought = 4096      # uncomment to cap LLM response length
max_steps = 50                        # hard limit on agent loop iterations

# ── LLM provider ──────────────────────────────────────────────────

[llm]
provider = "anthropic"                # "anthropic" | "openai" | "custom"
model = "claude-sonnet-4-20250514"
api_key_env = "ANTHROPIC_API_KEY"     # name of env var (NOT the key itself)
# base_url = "https://custom-proxy.example.com/v1"  # optional override

# ── Wallet ────────────────────────────────────────────────────────

[wallet]
backend = "pyvax_local"              # "pyvax_local" | "managed_vincent" | "managed_sequence" | "mock"
default_chain = "avalanche_fuji"     # "avalanche_fuji" | "avalanche_mainnet" | "ethereum_mainnet"
rpc_url = "https://api.avax-test.network/ext/bc/C/rpc"

[wallet.policy]
max_native_per_tx = "0.1"            # max AVAX/ETH per single transaction
max_native_per_day = "1.0"           # daily spend cap across all transactions
allowed_contracts = []               # empty = no restriction; add "0x..." addresses
allowed_methods = []                 # empty = no restriction; add method names or 4-byte selectors

# ── Synthesis.md hackathon ────────────────────────────────────────

[synthesis]
enabled = false
skill_url = "https://synthesis.md/skill.md"
track = "open"                       # "open" or a partner-track string
agent_profile = ""                   # e.g. "DeFi yield optimizer on Avalanche"

# ── Logging ───────────────────────────────────────────────────────

[logging]
level = "INFO"                       # "DEBUG" | "INFO" | "WARN"
log_dir = "./logs"
'''
