"""Tests for the AgentLoop."""

from __future__ import annotations

import pytest

from classified_agent.core.context import AgentContext
from classified_agent.core.llm import LLMMessage, ToolCall
from classified_agent.core.loop import AgentLoop, DONE_SENTINEL
from classified_agent.tools.base import Tool, ToolResult

from .conftest import MockLLMClient

from typing import Any


class _EchoTool(Tool):
    """Tool that returns its input as output, for testing the loop."""

    name = "echo"
    description = "Echoes input."
    input_schema = {
        "type": "object",
        "properties": {"text": {"type": "string"}},
        "required": ["text"],
    }

    async def run(self, ctx: AgentContext, **kwargs: Any) -> ToolResult:
        return ToolResult(success=True, output={"echoed": kwargs["text"]})


class TestAgentLoop:
    @pytest.mark.asyncio
    async def test_stops_on_done_sentinel(self, agent_context: AgentContext):
        """Loop should stop when the LLM response contains <DONE>."""
        agent_context.llm = MockLLMClient([
            LLMMessage(role="assistant", content="Task complete. <DONE>"),
        ])
        loop = AgentLoop(agent_context)
        result = await loop.run(initial_message="do something")
        assert DONE_SENTINEL in result
        assert loop.current_step == 1

    @pytest.mark.asyncio
    async def test_stops_at_max_steps(self, agent_context: AgentContext):
        """Loop should stop when max_steps is reached."""
        # Return messages without DONE sentinel
        agent_context.config.agent.max_steps = 3
        agent_context.llm = MockLLMClient([
            LLMMessage(role="assistant", content="thinking..."),
            LLMMessage(role="assistant", content="still thinking..."),
            LLMMessage(role="assistant", content="more thinking..."),
        ])
        loop = AgentLoop(agent_context)
        result = await loop.run()
        assert loop.current_step == 3

    @pytest.mark.asyncio
    async def test_executes_tool_calls(self, agent_context: AgentContext):
        """Loop should execute tools and feed results back."""
        agent_context.tools.register(_EchoTool())
        agent_context.llm = MockLLMClient([
            # Step 1: LLM requests a tool call
            LLMMessage(
                role="assistant",
                content="Let me echo something.",
                tool_calls=[
                    ToolCall(id="tc_1", name="echo", arguments={"text": "hello"}),
                ],
            ),
            # Step 2: LLM sees the result and finishes
            LLMMessage(role="assistant", content="Got the echo. <DONE>"),
        ])
        loop = AgentLoop(agent_context)
        result = await loop.run(initial_message="echo test")
        assert DONE_SENTINEL in result
        assert loop.current_step == 2

    @pytest.mark.asyncio
    async def test_unknown_tool_returns_error(self, agent_context: AgentContext):
        """Loop should handle unknown tool names gracefully."""
        agent_context.llm = MockLLMClient([
            LLMMessage(
                role="assistant",
                content="Using unknown tool.",
                tool_calls=[
                    ToolCall(id="tc_1", name="nonexistent_tool", arguments={}),
                ],
            ),
            LLMMessage(role="assistant", content="<DONE>"),
        ])
        loop = AgentLoop(agent_context)
        result = await loop.run()
        assert DONE_SENTINEL in result
        # Verify the error was communicated back
        tool_result_msgs = [
            m for m in agent_context.get_conversation_window()
            if m.role == "tool_result"
        ]
        assert len(tool_result_msgs) == 1
        assert "Unknown tool" in tool_result_msgs[0].content

    @pytest.mark.asyncio
    async def test_stop_signal(self, agent_context: AgentContext):
        """Loop should respect external stop signal."""
        agent_context.llm = MockLLMClient([
            LLMMessage(role="assistant", content="step 1"),
            LLMMessage(role="assistant", content="step 2"),
        ])
        loop = AgentLoop(agent_context)
        loop.stop()  # Signal before starting
        result = await loop.run()
        assert loop.current_step == 0  # should not have run any steps

    @pytest.mark.asyncio
    async def test_memory_flush_on_completion(self, agent_context: AgentContext):
        """Memory should be flushed when the loop completes."""
        agent_context.llm = MockLLMClient([
            LLMMessage(role="assistant", content="<DONE>"),
        ])
        loop = AgentLoop(agent_context)
        await loop.run(initial_message="test memory")
        # Check that the short-term buffer was flushed
        memory_dir = (
            agent_context.memory._workspace / ".memory" / "_short_term_buffer.json"
        )
        assert memory_dir.exists()
