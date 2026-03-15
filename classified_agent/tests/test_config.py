"""Tests for classified_agent.config — models + loader."""

from __future__ import annotations

import os
from decimal import Decimal
from pathlib import Path

import pytest

from classified_agent.config.loader import (
    create_default_config,
    load_config,
    resolve_api_key,
)
from classified_agent.config.models import (
    AgentConfig,
    ClassifiedConfig,
    LLMConfig,
    LoggingConfig,
    SynthesisConfig,
    WalletConfig,
    WalletPolicyConfig,
)


# ══════════════════════════════════════════════════════════════════════
# Model tests
# ══════════════════════════════════════════════════════════════════════


class TestAgentConfig:
    def test_defaults(self):
        cfg = AgentConfig(name="classified-001")
        assert cfg.name == "classified-001"
        assert cfg.max_steps == 50
        assert cfg.workspace_dir == Path("./workspace")

    def test_custom_values(self):
        cfg = AgentConfig(name="my-agent", max_steps=10)
        assert cfg.name == "my-agent"
        assert cfg.max_steps == 10


class TestLLMConfig:
    def test_defaults(self):
        cfg = LLMConfig()
        assert cfg.provider == "anthropic"
        assert cfg.api_key_env == "ANTHROPIC_API_KEY"
        assert cfg.base_url is None

    def test_custom_provider(self):
        cfg = LLMConfig(provider="openai", model="gpt-4", api_key_env="OPENAI_KEY")
        assert cfg.provider == "openai"
        assert cfg.model == "gpt-4"


class TestWalletPolicyConfig:
    def test_decimal_conversion(self):
        cfg = WalletPolicyConfig(max_native_per_tx="0.5", max_native_per_day="2.0")
        assert cfg.max_native_per_tx == Decimal("0.5")
        assert cfg.max_native_per_day == Decimal("2.0")

    def test_defaults(self):
        cfg = WalletPolicyConfig()
        assert cfg.max_native_per_tx == Decimal("0.1")
        assert len(cfg.allowed_contracts) == 0


class TestClassifiedConfig:
    def test_full_construction(self):
        cfg = ClassifiedConfig(
            agent=AgentConfig(name="test"),
            llm=LLMConfig(provider="anthropic"),
            wallet=WalletConfig(backend="mock"),
            synthesis=SynthesisConfig(enabled=False),
            logging=LoggingConfig(level="DEBUG"),
        )
        assert cfg.agent.name == "test"
        assert cfg.llm.provider == "anthropic"
        assert cfg.wallet.backend == "mock"
        assert cfg.synthesis.enabled is False
        assert cfg.logging.level == "DEBUG"


# ══════════════════════════════════════════════════════════════════════
# Loader tests
# ══════════════════════════════════════════════════════════════════════


class TestCreateDefaultConfig:
    def test_creates_file(self, tmp_path: Path):
        cfg_path = tmp_path / "classified.toml"
        config = create_default_config(cfg_path)
        assert cfg_path.exists()
        assert isinstance(config, ClassifiedConfig)
        assert config.agent.name == "classified-001"

    def test_refuses_overwrite(self, tmp_path: Path):
        cfg_path = tmp_path / "classified.toml"
        create_default_config(cfg_path)
        with pytest.raises(FileExistsError):
            create_default_config(cfg_path)

    def test_round_trip_consistency(self, tmp_path: Path):
        cfg_path = tmp_path / "classified.toml"
        config1 = create_default_config(cfg_path)
        config2 = load_config(cfg_path)
        assert config1.agent.name == config2.agent.name
        assert config1.llm.provider == config2.llm.provider
        assert config1.wallet.backend == config2.wallet.backend


class TestLoadConfig:
    def test_file_not_found(self, tmp_path: Path):
        with pytest.raises(FileNotFoundError, match="Config file not found"):
            load_config(tmp_path / "nonexistent.toml")

    def test_valid_config(self, tmp_path: Path):
        cfg_path = tmp_path / "classified.toml"
        create_default_config(cfg_path)
        config = load_config(cfg_path)
        assert config.agent.name == "classified-001"


class TestResolveApiKey:
    def test_key_from_env(self, monkeypatch):
        monkeypatch.setenv("TEST_API_KEY", "sk-test-12345")
        cfg = LLMConfig(api_key_env="TEST_API_KEY")
        key = resolve_api_key(cfg)
        assert key == "sk-test-12345"

    def test_missing_key_raises(self, monkeypatch):
        monkeypatch.delenv("MISSING_KEY", raising=False)
        cfg = LLMConfig(api_key_env="MISSING_KEY")
        with pytest.raises(EnvironmentError, match="LLM API key not found"):
            resolve_api_key(cfg)

    def test_empty_key_raises(self, monkeypatch):
        monkeypatch.setenv("EMPTY_KEY", "  ")
        cfg = LLMConfig(api_key_env="EMPTY_KEY")
        with pytest.raises(EnvironmentError, match="LLM API key not found"):
            resolve_api_key(cfg)
