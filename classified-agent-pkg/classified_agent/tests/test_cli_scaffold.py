"""Tests for the classified-agent init scaffolding and template copy."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from classified_agent.cli.main import app, _get_template_dir, _copy_template_file

runner = CliRunner()


class TestGetTemplateDir:
    """Verify that the template directory is locatable from the package."""

    def test_template_dir_exists(self):
        tpl = _get_template_dir()
        assert tpl.exists(), f"Template directory not found at {tpl}"

    def test_template_dir_has_agent_yaml(self):
        tpl = _get_template_dir()
        assert (tpl / "agent.yaml").exists(), "agent.yaml missing from templates"

    def test_template_dir_has_skill_file(self):
        tpl = _get_template_dir()
        skill = tpl / "skills" / "PROJECT_CLASSIFIED_SKILL.md"
        assert skill.exists(), "PROJECT_CLASSIFIED_SKILL.md missing from templates"

    def test_template_dir_has_env_example(self):
        tpl = _get_template_dir()
        assert (tpl / ".env.example").exists(), ".env.example missing from templates"

    def test_template_dir_has_workspace_state(self):
        tpl = _get_template_dir()
        state = tpl / "workspace" / "state.json"
        assert state.exists(), "workspace/state.json missing from templates"

    def test_template_dir_has_examples(self):
        tpl = _get_template_dir()
        assert (tpl / "examples" / "quickstart.py").exists()
        assert (tpl / "examples" / "mission.md").exists()
        assert (tpl / "examples" / "memory.md").exists()

    def test_template_dir_has_prompts(self):
        tpl = _get_template_dir()
        assert (tpl / "prompts" / "system.md").exists()
        assert (tpl / "prompts" / "tool-use.md").exists()


class TestCopyTemplateFile:
    """Verify single-file template copying."""

    def test_copies_file(self, tmp_path: Path):
        tpl = _get_template_dir()
        result = _copy_template_file(tpl, "agent.yaml", tmp_path)
        assert result is not None
        assert result.exists()
        assert result.name == "agent.yaml"

    def test_skips_existing(self, tmp_path: Path):
        tpl = _get_template_dir()
        # First copy
        _copy_template_file(tpl, "agent.yaml", tmp_path)
        # Second copy — should skip
        result = _copy_template_file(tpl, "agent.yaml", tmp_path)
        assert result is None

    def test_overwrites_when_requested(self, tmp_path: Path):
        tpl = _get_template_dir()
        _copy_template_file(tpl, "agent.yaml", tmp_path)
        result = _copy_template_file(tpl, "agent.yaml", tmp_path, overwrite=True)
        assert result is not None

    def test_renames_file(self, tmp_path: Path):
        tpl = _get_template_dir()
        result = _copy_template_file(
            tpl, "skills/PROJECT_CLASSIFIED_SKILL.md",
            tmp_path, dest_name="SKILL.md"
        )
        assert result is not None
        assert result.name == "SKILL.md"

    def test_returns_none_for_missing_source(self, tmp_path: Path):
        tpl = _get_template_dir()
        result = _copy_template_file(tpl, "nonexistent.txt", tmp_path)
        assert result is None


class TestInitCommand:
    """Integration tests for `classified-agent init`."""

    def test_init_creates_config(self, tmp_path: Path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        result = runner.invoke(app, ["init"])
        assert result.exit_code == 0
        assert (tmp_path / "classified.toml").exists()

    def test_init_creates_workspace(self, tmp_path: Path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        runner.invoke(app, ["init"])
        assert (tmp_path / "workspace").is_dir()

    def test_init_creates_logs(self, tmp_path: Path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        runner.invoke(app, ["init"])
        assert (tmp_path / "logs").is_dir()

    def test_init_creates_agent_yaml(self, tmp_path: Path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        runner.invoke(app, ["init"])
        assert (tmp_path / "agent.yaml").exists()

    def test_init_creates_skill_file(self, tmp_path: Path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        runner.invoke(app, ["init"])
        assert (tmp_path / "SKILL.md").exists()

    def test_init_creates_env_example(self, tmp_path: Path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        runner.invoke(app, ["init"])
        assert (tmp_path / ".env.example").exists()

    def test_init_creates_readme(self, tmp_path: Path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        runner.invoke(app, ["init"])
        assert (tmp_path / "README.md").exists()

    def test_init_creates_examples(self, tmp_path: Path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        runner.invoke(app, ["init"])
        assert (tmp_path / "examples" / "quickstart.py").exists()
        assert (tmp_path / "examples" / "mission.md").exists()
        assert (tmp_path / "examples" / "memory.md").exists()

    def test_init_creates_workspace_files(self, tmp_path: Path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        runner.invoke(app, ["init"])
        assert (tmp_path / "workspace" / "state.json").exists()
        # state.json should be valid JSON
        state = json.loads((tmp_path / "workspace" / "state.json").read_text())
        assert isinstance(state, dict)

    def test_init_creates_skills_dir(self, tmp_path: Path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        runner.invoke(app, ["init"])
        assert (tmp_path / "skills").is_dir()
        assert (tmp_path / "skills" / "PROJECT_CLASSIFIED_SKILL.md").exists()

    def test_init_refuses_overwrite(self, tmp_path: Path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        runner.invoke(app, ["init"])
        result = runner.invoke(app, ["init"])
        assert result.exit_code == 1

    def test_init_custom_config_path(self, tmp_path: Path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        result = runner.invoke(app, ["init", "--config", "custom.toml"])
        assert result.exit_code == 0
        assert (tmp_path / "custom.toml").exists()


class TestDoctorCommand:
    """Tests for `classified-agent doctor`."""

    def test_doctor_without_config_fails(self, tmp_path: Path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        result = runner.invoke(app, ["doctor"])
        assert result.exit_code == 1
        # Should still pass Python version check
        assert "Python version" in result.output

    def test_doctor_with_init_partially_passes(self, tmp_path: Path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        runner.invoke(app, ["init"])
        result = runner.invoke(app, ["doctor"])
        # Config should parse, but API key likely missing
        assert "Config file" in result.output
        assert "Python version" in result.output

    def test_doctor_shows_all_checks(self, tmp_path: Path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        runner.invoke(app, ["init"])
        result = runner.invoke(app, ["doctor"])
        checks = [
            "Python version",
            "CLI version",
            "Config file",
            "LLM API key",
            "Wallet backend",
            "RPC connectivity",
            "Package templates",
            "Skill file",
            "Workspace directory",
            "Logs directory",
        ]
        for check in checks:
            assert check in result.output, f"Missing check: {check}"
