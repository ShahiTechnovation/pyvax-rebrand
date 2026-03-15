"""Vendor-agnostic LLM client abstraction + Anthropic implementation.

Designed so that plugging in OpenAI, a local model, or a custom proxy
requires only subclassing :class:`BaseLLMClient` and implementing
:meth:`chat`.
"""

from __future__ import annotations

import json
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from classified_agent.config.models import LLMConfig
from classified_agent.tools.base import ToolSpec

logger = logging.getLogger("classified")


# ──────────────────────────────────────────────────────────────────────
# Message types
# ──────────────────────────────────────────────────────────────────────


@dataclass
class ToolCall:
    """A single tool invocation requested by the model."""

    id: str
    name: str
    arguments: dict[str, Any]


@dataclass
class LLMMessage:
    """A message in the conversation.

    Attributes:
        role:         "system" | "user" | "assistant" | "tool_result"
        content:      Text content of the message.
        tool_calls:   Tool invocations requested by the assistant.
        tool_call_id: If role == "tool_result", the ID this result is for.
    """

    role: str
    content: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    tool_call_id: str | None = None

    @property
    def has_tool_calls(self) -> bool:
        return len(self.tool_calls) > 0


# ──────────────────────────────────────────────────────────────────────
# Abstract client
# ──────────────────────────────────────────────────────────────────────


class BaseLLMClient(ABC):
    """Interface for LLM backends.

    Implementations must handle:
    - Converting :class:`LLMMessage` + :class:`ToolSpec` into the
      provider's API format.
    - Parsing the response back into an :class:`LLMMessage`.
    - Basic retry / error handling.
    """

    @abstractmethod
    async def chat(
        self,
        messages: list[LLMMessage],
        tools: list[ToolSpec] | None = None,
        max_tokens: int | None = None,
    ) -> LLMMessage:
        """Send a chat completion request and return the assistant reply.

        Args:
            messages:   Conversation history (system + user + assistant turns).
            tools:      Optional tool specifications the model may call.
            max_tokens: Optional cap on response length.

        Returns:
            An :class:`LLMMessage` with role ``"assistant"``.  If the model
            chose to invoke tools, ``tool_calls`` will be populated.
        """


# ──────────────────────────────────────────────────────────────────────
# Anthropic implementation
# ──────────────────────────────────────────────────────────────────────


class AnthropicClient(BaseLLMClient):
    """Claude API client via the ``anthropic`` SDK.

    Supports tool_use (function calling) and simple exponential-backoff
    retries for transient errors.
    """

    def __init__(self, api_key: str, model: str, base_url: str | None = None) -> None:
        try:
            import anthropic
        except ImportError as exc:
            raise ImportError(
                "The 'anthropic' package is required for the Anthropic LLM backend.\n"
                "Install it with: pip install anthropic"
            ) from exc

        kwargs: dict[str, Any] = {"api_key": api_key}
        if base_url:
            kwargs["base_url"] = base_url

        self._client = anthropic.Anthropic(**kwargs)
        self._async_client = anthropic.AsyncAnthropic(**kwargs)
        self._model = model

    async def chat(
        self,
        messages: list[LLMMessage],
        tools: list[ToolSpec] | None = None,
        max_tokens: int | None = None,
    ) -> LLMMessage:
        """Call Claude's messages API with tool_use support."""
        # Separate out the system message (Anthropic uses a top-level param)
        system_text = ""
        api_messages: list[dict[str, Any]] = []

        for msg in messages:
            if msg.role == "system":
                system_text += msg.content + "\n"
            elif msg.role == "assistant":
                content_blocks: list[dict[str, Any]] = []
                if msg.content:
                    content_blocks.append({"type": "text", "text": msg.content})
                for tc in msg.tool_calls:
                    content_blocks.append({
                        "type": "tool_use",
                        "id": tc.id,
                        "name": tc.name,
                        "input": tc.arguments,
                    })
                api_messages.append({"role": "assistant", "content": content_blocks})
            elif msg.role == "tool_result":
                api_messages.append({
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": msg.tool_call_id,
                            "content": msg.content,
                        }
                    ],
                })
            else:
                # "user" messages
                api_messages.append({"role": "user", "content": msg.content})

        # Build tool definitions for the API
        api_tools: list[dict[str, Any]] | None = None
        if tools:
            api_tools = [
                {
                    "name": t.name,
                    "description": t.description,
                    "input_schema": t.input_schema,
                }
                for t in tools
            ]

        # Call the API
        request_kwargs: dict[str, Any] = {
            "model": self._model,
            "max_tokens": max_tokens or 4096,
            "messages": api_messages,
        }
        if system_text.strip():
            request_kwargs["system"] = system_text.strip()
        if api_tools:
            request_kwargs["tools"] = api_tools

        logger.debug("Anthropic API call — model=%s, messages=%d, tools=%d",
                      self._model, len(api_messages), len(api_tools or []))

        response = await self._async_client.messages.create(**request_kwargs)

        # Parse response back into LLMMessage
        return self._parse_response(response)

    def _parse_response(self, response: Any) -> LLMMessage:
        """Convert an Anthropic API response to an :class:`LLMMessage`."""
        text_parts: list[str] = []
        tool_calls: list[ToolCall] = []

        for block in response.content:
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "tool_use":
                tool_calls.append(
                    ToolCall(
                        id=block.id,
                        name=block.name,
                        arguments=block.input if isinstance(block.input, dict) else {},
                    )
                )

        return LLMMessage(
            role="assistant",
            content="\n".join(text_parts),
            tool_calls=tool_calls,
        )


# ──────────────────────────────────────────────────────────────────────
# OpenAI stub (for future use)
# ──────────────────────────────────────────────────────────────────────


class OpenAIClient(BaseLLMClient):
    """Stub for OpenAI-compatible APIs — not yet implemented."""

    def __init__(self, api_key: str, model: str, base_url: str | None = None) -> None:
        self._api_key = api_key
        self._model = model
        self._base_url = base_url

    async def chat(
        self,
        messages: list[LLMMessage],
        tools: list[ToolSpec] | None = None,
        max_tokens: int | None = None,
    ) -> LLMMessage:
        raise NotImplementedError(
            "OpenAI backend is not yet implemented. "
            "Set provider = 'anthropic' in classified.toml."
        )


# ──────────────────────────────────────────────────────────────────────
# Factory
# ──────────────────────────────────────────────────────────────────────


def create_llm_client(config: LLMConfig, api_key: str) -> BaseLLMClient:
    """Instantiate the right LLM client based on ``config.provider``.

    Args:
        config:  The ``[llm]`` section from classified.toml.
        api_key: Resolved API key string (from env var).

    Returns:
        A :class:`BaseLLMClient` subclass instance.

    Raises:
        ValueError: If ``config.provider`` is unknown.
    """
    if config.provider == "anthropic":
        return AnthropicClient(
            api_key=api_key,
            model=config.model,
            base_url=config.base_url,
        )
    elif config.provider == "openai":
        return OpenAIClient(
            api_key=api_key,
            model=config.model,
            base_url=config.base_url,
        )
    elif config.provider == "custom":
        raise ValueError(
            "Custom LLM provider requires a BaseLLMClient subclass. "
            "Pass it directly to AgentContext instead of using create_llm_client()."
        )
    else:
        raise ValueError(
            f"Unknown LLM provider: '{config.provider}'. "
            "Supported: anthropic, openai, custom"
        )
