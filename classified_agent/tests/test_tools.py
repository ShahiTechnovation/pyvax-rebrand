"""Tests for tools: base registry + fs + dry-run behaviour."""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

import pytest

from classified_agent.core.context import AgentContext
from classified_agent.tools.base import Tool, ToolRegistry, ToolResult, ToolSpec
from classified_agent.tools.fs_tools import FsListTool, FsReadTool, FsWriteTool


# ══════════════════════════════════════════════════════════════════════
# ToolRegistry tests
# ══════════════════════════════════════════════════════════════════════


class _DummyTool(Tool):
    """Minimal tool for testing the registry."""

    name = "dummy"
    description = "A dummy tool."
    input_schema = {"type": "object", "properties": {}}

    async def run(self, ctx: "AgentContext", **kwargs: Any) -> ToolResult:
        return ToolResult(success=True, output="dummy_output")


class TestToolRegistry:
    def test_register_and_get(self):
        reg = ToolRegistry()
        tool = _DummyTool()
        reg.register(tool)
        assert reg.get("dummy") is tool
        assert "dummy" in reg
        assert len(reg) == 1

    def test_duplicate_raises(self):
        reg = ToolRegistry()
        reg.register(_DummyTool())
        with pytest.raises(ValueError, match="already registered"):
            reg.register(_DummyTool())

    def test_unknown_tool_raises(self):
        reg = ToolRegistry()
        with pytest.raises(KeyError, match="Unknown tool"):
            reg.get("nonexistent")

    def test_list_specs(self):
        reg = ToolRegistry()
        reg.register(_DummyTool())
        specs = reg.list_specs()
        assert len(specs) == 1
        assert specs[0].name == "dummy"
        assert isinstance(specs[0], ToolSpec)

    def test_list_names(self):
        reg = ToolRegistry()
        reg.register(_DummyTool())
        assert reg.list_names() == ["dummy"]

    def test_register_many(self):
        reg = ToolRegistry()

        class AnotherTool(_DummyTool):
            name = "another"

        reg.register_many([_DummyTool(), AnotherTool()])
        assert len(reg) == 2


# ══════════════════════════════════════════════════════════════════════
# Filesystem tool tests
# ══════════════════════════════════════════════════════════════════════


class TestFsReadTool:
    @pytest.mark.asyncio
    async def test_read_existing_file(self, agent_context: AgentContext):
        ws = Path(agent_context.config.agent.workspace_dir)
        test_file = ws / "hello.txt"
        test_file.write_text("hello world", encoding="utf-8")

        tool = FsReadTool()
        result = await tool.run(agent_context, path="hello.txt")
        assert result.success
        assert result.output["content"] == "hello world"

    @pytest.mark.asyncio
    async def test_read_nonexistent_file(self, agent_context: AgentContext):
        tool = FsReadTool()
        result = await tool.run(agent_context, path="nope.txt")
        assert not result.success
        assert "not found" in result.error.lower()

    @pytest.mark.asyncio
    async def test_path_traversal_blocked(self, agent_context: AgentContext):
        tool = FsReadTool()
        result = await tool.run(agent_context, path="../../etc/passwd")
        assert not result.success
        assert "outside" in result.error.lower()


class TestFsWriteTool:
    @pytest.mark.asyncio
    async def test_write_creates_file(self, agent_context: AgentContext):
        tool = FsWriteTool()
        result = await tool.run(
            agent_context, path="output.txt", content="test content"
        )
        assert result.success
        ws = Path(agent_context.config.agent.workspace_dir)
        assert (ws / "output.txt").read_text(encoding="utf-8") == "test content"

    @pytest.mark.asyncio
    async def test_write_creates_subdirs(self, agent_context: AgentContext):
        tool = FsWriteTool()
        result = await tool.run(
            agent_context, path="sub/dir/file.txt", content="nested"
        )
        assert result.success
        ws = Path(agent_context.config.agent.workspace_dir)
        assert (ws / "sub" / "dir" / "file.txt").exists()

    @pytest.mark.asyncio
    async def test_write_dry_run(self, agent_context: AgentContext):
        agent_context.dry_run = True
        tool = FsWriteTool()
        result = await tool.run(
            agent_context, path="no_write.txt", content="should not exist"
        )
        assert result.success
        assert result.output["dry_run"] is True
        ws = Path(agent_context.config.agent.workspace_dir)
        assert not (ws / "no_write.txt").exists()

    @pytest.mark.asyncio
    async def test_path_traversal_blocked(self, agent_context: AgentContext):
        tool = FsWriteTool()
        result = await tool.run(
            agent_context, path="../../../tmp/evil.txt", content="bad"
        )
        assert not result.success
        assert "outside" in result.error.lower()


class TestFsListTool:
    @pytest.mark.asyncio
    async def test_list_workspace(self, agent_context: AgentContext):
        ws = Path(agent_context.config.agent.workspace_dir)
        (ws / "a.txt").write_text("a")
        (ws / "b.txt").write_text("b")

        tool = FsListTool()
        result = await tool.run(agent_context, path=".")
        assert result.success
        names = [e["name"] for e in result.output["entries"]]
        assert "a.txt" in names
        assert "b.txt" in names

    @pytest.mark.asyncio
    async def test_list_nonexistent(self, agent_context: AgentContext):
        tool = FsListTool()
        result = await tool.run(agent_context, path="nonexistent_dir")
        assert not result.success
