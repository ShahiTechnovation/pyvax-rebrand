"""Tests for template resource loading and wheel contents verification."""

from __future__ import annotations

from importlib.resources import files as pkg_files
from pathlib import Path

import pytest


class TestImportlibResources:
    """Verify templates are locatable via importlib.resources."""

    def test_templates_traversable(self):
        """importlib.resources should find the templates directory."""
        templates = pkg_files("classified_agent").joinpath("templates")
        assert templates is not None

    def test_templates_has_classified_toml(self):
        templates = pkg_files("classified_agent").joinpath("templates")
        config = templates.joinpath("classified.toml")
        # Should be readable
        content = config.read_text(encoding="utf-8")
        assert "[agent]" in content
        assert "[llm]" in content

    def test_templates_has_agent_yaml(self):
        templates = pkg_files("classified_agent").joinpath("templates")
        agent = templates.joinpath("agent.yaml")
        content = agent.read_text(encoding="utf-8")
        assert "identity:" in content
        assert "mission:" in content

    def test_templates_has_skill_file(self):
        templates = pkg_files("classified_agent").joinpath("templates")
        skill = templates.joinpath("skills").joinpath("PROJECT_CLASSIFIED_SKILL.md")
        content = skill.read_text(encoding="utf-8")
        assert "Project Classified" in content
        assert "wallet" in content.lower()

    def test_templates_has_env_example(self):
        templates = pkg_files("classified_agent").joinpath("templates")
        env = templates.joinpath(".env.example")
        content = env.read_text(encoding="utf-8")
        assert "ANTHROPIC_API_KEY" in content

    def test_templates_has_workspace_state(self):
        templates = pkg_files("classified_agent").joinpath("templates")
        state = templates.joinpath("workspace").joinpath("state.json")
        content = state.read_text(encoding="utf-8")
        assert content.strip() == "{}"

    def test_templates_has_quickstart(self):
        templates = pkg_files("classified_agent").joinpath("templates")
        qs = templates.joinpath("examples").joinpath("quickstart.py")
        content = qs.read_text(encoding="utf-8")
        assert "classified_agent" in content

    def test_templates_has_prompts(self):
        templates = pkg_files("classified_agent").joinpath("templates")
        sys_prompt = templates.joinpath("prompts").joinpath("system.md")
        tool_prompt = templates.joinpath("prompts").joinpath("tool-use.md")
        assert "system prompt" in sys_prompt.read_text(encoding="utf-8").lower()
        assert "tool" in tool_prompt.read_text(encoding="utf-8").lower()


class TestPackageVersion:
    """Verify version consistency."""

    def test_version_exists(self):
        import classified_agent
        assert hasattr(classified_agent, "__version__")

    def test_version_format(self):
        import classified_agent
        parts = classified_agent.__version__.split(".")
        assert len(parts) == 3
        assert all(p.isdigit() for p in parts)

    def test_version_matches_expected(self):
        import classified_agent
        assert classified_agent.__version__ == "1.2.0"


class TestTemplateCompleteness:
    """Verify every expected template file exists."""

    EXPECTED_FILES = [
        "classified.toml",
        "agent.yaml",
        ".env.example",
        "README.md",
        "skills/PROJECT_CLASSIFIED_SKILL.md",
        "skills/README.md",
        "workspace/README.md",
        "workspace/state.json",
        "workspace/notes.md",
        "logs/.gitkeep",
        "examples/quickstart.py",
        "examples/mission.md",
        "examples/memory.md",
        "prompts/system.md",
        "prompts/tool-use.md",
    ]

    @pytest.mark.parametrize("rel_path", EXPECTED_FILES)
    def test_template_file_exists(self, rel_path: str):
        """Each template file must exist in the package."""
        templates = pkg_files("classified_agent").joinpath("templates")
        parts = rel_path.split("/")
        resource = templates
        for part in parts:
            resource = resource.joinpath(part)
        # Attempt to read it — if it doesn't exist, this will fail
        content = resource.read_text(encoding="utf-8")
        # .gitkeep files are intentionally empty; all others must have content
        if not rel_path.endswith(".gitkeep"):
            assert len(content) > 0, f"Template file is empty: {rel_path}"
