"""AgentLoop — the plan → tool → observe → update cycle.

This is the core runtime loop.  It takes an :class:`AgentContext`,
builds a prompt, calls the LLM, executes requested tools, feeds
results back, and repeats until a stopping condition is met.
"""

from __future__ import annotations

import asyncio
import json
import logging
import traceback
from typing import Any

from classified_agent.core.context import AgentContext
from classified_agent.core.llm import LLMMessage
from classified_agent.tools.base import ToolResult

logger = logging.getLogger("classified")

# Sentinel substring: if the assistant's text contains this, we stop.
DONE_SENTINEL = "<DONE>"


class AgentLoop:
    """Main execution loop for the Classified agent.

    The loop:

    1. Builds ``messages = [system] + conversation_window``.
    2. Calls the LLM with the current tool specifications.
    3. If the LLM returns ``tool_use`` blocks → executes each tool
       **sequentially** (important for nonce ordering on-chain).
    4. Feeds tool results back into the conversation.
    5. Repeats until:
       - ``max_steps`` reached, or
       - The assistant's text includes the ``<DONE>`` sentinel, or
       - :meth:`stop` is called externally.
    """

    def __init__(self, ctx: AgentContext) -> None:
        self.ctx = ctx
        self.max_steps = ctx.config.agent.max_steps
        self.current_step = 0
        self._stop_event = asyncio.Event()

    # ── Public API ────────────────────────────────────────────────

    async def run(self, initial_message: str | None = None) -> str:
        """Execute the agent loop and return the final assistant message.

        Args:
            initial_message: Optional user message to kick off the loop.
                             If not provided, the agent acts on its system
                             prompt alone.

        Returns:
            The text of the last assistant message.
        """
        ctx = self.ctx
        ctx.logger.info(
            "AgentLoop starting — max_steps=%d, dry_run=%s",
            self.max_steps,
            ctx.dry_run,
        )

        # Build the system prompt
        system_prompt = ctx.build_system_prompt()
        system_msg = LLMMessage(role="system", content=system_prompt)

        # Optionally inject a user message
        if initial_message:
            ctx.append_message(LLMMessage(role="user", content=initial_message))

        last_text = ""

        while self.current_step < self.max_steps and not self._stop_event.is_set():
            self.current_step += 1
            ctx.logger.info("──── Step %d / %d ────", self.current_step, self.max_steps)

            # 1. Build messages window
            messages = [system_msg] + ctx.get_conversation_window()

            # 2. Call LLM
            try:
                tool_specs = ctx.tools.list_specs()
                response = await ctx.llm.chat(
                    messages=messages,
                    tools=tool_specs if tool_specs else None,
                    max_tokens=ctx.config.agent.max_tokens_per_thought,
                )
            except Exception as exc:
                ctx.logger.error("LLM call failed: %s", exc)
                ctx.logger.debug(traceback.format_exc())
                # Surface error and stop
                last_text = f"LLM call failed: {exc}"
                break

            # Record assistant response
            ctx.append_message(response)
            last_text = response.content
            if last_text:
                ctx.logger.info("Assistant: %s", last_text[:300])

            # 3. Check for done sentinel
            if DONE_SENTINEL in (response.content or ""):
                ctx.logger.info("Agent signalled DONE.")
                break

            # 4. Execute tool calls (if any)
            if response.has_tool_calls:
                for tc in response.tool_calls:
                    if self._stop_event.is_set():
                        break

                    result = await self._execute_tool(tc.name, tc.arguments, tc.id)

                    # Feed result back as a tool_result message
                    result_text = json.dumps(result.to_dict(), default=str)
                    ctx.append_message(
                        LLMMessage(
                            role="tool_result",
                            content=result_text,
                            tool_call_id=tc.id,
                        )
                    )
            else:
                # No tool calls and no DONE sentinel → the model is just
                # talking.  In a more advanced version we might prompt it
                # to choose a tool; for v0 we let it continue.
                ctx.logger.debug("No tool calls in this step.")

            # Periodic memory flush (every 5 steps)
            if self.current_step % 5 == 0:
                ctx.memory.flush()

        # Final flush
        ctx.memory.flush()

        if self.current_step >= self.max_steps:
            ctx.logger.warning("Reached max_steps (%d) — stopping.", self.max_steps)

        ctx.logger.info("AgentLoop finished after %d steps.", self.current_step)
        return last_text

    def stop(self) -> None:
        """Signal the loop to stop gracefully after the current step."""
        self._stop_event.set()
        logger.info("Stop signal received.")

    # ── Internal ──────────────────────────────────────────────────

    async def _execute_tool(
        self, name: str, arguments: dict[str, Any], tool_call_id: str
    ) -> ToolResult:
        """Look up and run a single tool, catching all errors."""
        ctx = self.ctx
        ctx.logger.info("Tool call: %s(%s)", name, json.dumps(arguments, default=str)[:200])

        try:
            tool = ctx.tools.get(name)
        except KeyError as exc:
            ctx.logger.warning("Unknown tool requested: %s", name)
            return ToolResult(success=False, error=str(exc))

        try:
            result = await tool.run(ctx, **arguments)
            if result.success:
                ctx.logger.info(
                    "Tool %s succeeded: %s",
                    name,
                    json.dumps(result.output, default=str)[:200],
                )
            else:
                ctx.logger.warning("Tool %s failed: %s", name, result.error)
            return result
        except Exception as exc:
            ctx.logger.error("Tool %s raised: %s", name, exc)
            ctx.logger.debug(traceback.format_exc())
            return ToolResult(success=False, error=f"Tool execution error: {exc}")
