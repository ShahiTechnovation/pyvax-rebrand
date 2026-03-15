"""Tool abstraction and registry for Project Classified.

Every capability exposed to the LLM is a :class:`Tool` subclass with
a JSON-Schema ``input_schema`` that maps directly to Claude / OpenAI
function-calling specifications.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from classified_agent.core.context import AgentContext


# ──────────────────────────────────────────────────────────────────────
# Data classes
# ──────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class ToolResult:
    """Value returned by every tool invocation.

    Attributes:
        success: Whether the tool completed without error.
        output:  JSON-serialisable payload (shown to the LLM).
        error:   Human-readable error message when ``success`` is False.
    """

    success: bool
    output: Any = None
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Serialise for inclusion in the LLM message stream."""
        d: dict[str, Any] = {"success": self.success}
        if self.output is not None:
            d["output"] = self.output
        if self.error is not None:
            d["error"] = self.error
        return d


@dataclass(frozen=True)
class ToolSpec:
    """LLM-ready tool specification (name + description + JSON Schema).

    Passed to the model's ``tools`` parameter so it can emit
    ``tool_use`` blocks.
    """

    name: str
    description: str
    input_schema: dict[str, Any]


# ──────────────────────────────────────────────────────────────────────
# Tool base class
# ──────────────────────────────────────────────────────────────────────


class Tool(ABC):
    """Abstract base for all agent tools.

    Subclasses must define ``name``, ``description``, ``input_schema``,
    and implement :meth:`run`.
    """

    name: str
    description: str
    input_schema: dict[str, Any]

    @abstractmethod
    async def run(self, ctx: "AgentContext", **kwargs: Any) -> ToolResult:
        """Execute the tool with the given arguments.

        Args:
            ctx: The current agent context (config, wallet, logger, …).
            **kwargs: Tool-specific arguments validated against
                      ``input_schema`` before this is called.

        Returns:
            A :class:`ToolResult` with structured output or an error.
        """

    def to_spec(self) -> ToolSpec:
        """Convert this tool to an LLM-ready :class:`ToolSpec`."""
        return ToolSpec(
            name=self.name,
            description=self.description,
            input_schema=self.input_schema,
        )


# ──────────────────────────────────────────────────────────────────────
# Tool registry
# ──────────────────────────────────────────────────────────────────────


class ToolRegistry:
    """Named collection of :class:`Tool` instances.

    The registry is passed to the LLM client so it can generate
    ``tool_use`` blocks, and to the agent loop so it can dispatch
    calls by name.
    """

    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}

    # -- Mutators ----------------------------------------------------------

    def register(self, tool: Tool) -> None:
        """Add a tool to the registry.

        Raises:
            ValueError: If a tool with the same name is already registered.
        """
        if tool.name in self._tools:
            raise ValueError(
                f"Tool '{tool.name}' is already registered. "
                "Use unique names for each tool."
            )
        self._tools[tool.name] = tool

    def register_many(self, tools: list[Tool]) -> None:
        """Convenience: register several tools at once."""
        for tool in tools:
            self.register(tool)

    # -- Accessors ---------------------------------------------------------

    def get(self, name: str) -> Tool:
        """Look up a tool by name.

        Raises:
            KeyError: If no tool with *name* is registered.
        """
        try:
            return self._tools[name]
        except KeyError:
            available = ", ".join(sorted(self._tools)) or "(none)"
            raise KeyError(
                f"Unknown tool '{name}'. Available: {available}"
            ) from None

    def list_specs(self) -> list[ToolSpec]:
        """Return :class:`ToolSpec` objects for all registered tools."""
        return [t.to_spec() for t in self._tools.values()]

    def list_names(self) -> list[str]:
        """Return sorted list of registered tool names."""
        return sorted(self._tools)

    def __len__(self) -> int:
        return len(self._tools)

    def __contains__(self, name: str) -> bool:
        return name in self._tools
