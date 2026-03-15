"""AgentContext — the central state object for a running agent.

Holds references to every subsystem (config, LLM, wallet, tools,
memory, logger) and builds the system prompt that drives the agent's
behaviour.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import TYPE_CHECKING

from classified_agent.config.models import ClassifiedConfig
from classified_agent.core.llm import LLMMessage
from classified_agent.core.memory import MemoryStore
from classified_agent.tools.base import ToolRegistry

if TYPE_CHECKING:
    from classified_agent.core.llm import BaseLLMClient
    from classified_agent.wallet.base import WalletBackend


class AgentContext:
    """Centralised runtime state for the agent.

    Every tool and the :class:`AgentLoop` receive a reference to
    this object so they can access config, the wallet, memory, etc.
    without import spaghetti.
    """

    def __init__(
        self,
        config: ClassifiedConfig,
        llm: "BaseLLMClient",
        wallet: "WalletBackend",
        tools: ToolRegistry,
        memory: MemoryStore,
        logger: logging.Logger,
        *,
        dry_run: bool = False,
    ) -> None:
        self.config = config
        self.llm = llm
        self.wallet = wallet
        self.tools = tools
        self.memory = memory
        self.logger = logger
        self.dry_run = dry_run

        # Conversation history (full, used by the loop)
        self._messages: list[LLMMessage] = []

    # ── Conversation management ───────────────────────────────────

    def append_message(self, msg: LLMMessage) -> None:
        """Append a message to the conversation history."""
        self._messages.append(msg)
        self.memory.add_to_short_term({
            "role": msg.role,
            "content": msg.content[:500],  # truncate for memory
        })

    def get_conversation_window(self, n: int | None = None) -> list[LLMMessage]:
        """Return the last *n* non-system messages (or all if *n* is None)."""
        if n is None:
            return list(self._messages)
        return list(self._messages[-n:])

    # ── System prompt builder ─────────────────────────────────────

    def build_system_prompt(self) -> str:
        """Assemble the full system prompt from configuration.

        Includes:
        1. Core agent identity & instructions
        2. PyVax capabilities summary
        3. Wallet policy constraints
        4. Synthesis rules (if enabled + skill text available)
        """
        parts: list[str] = []

        # 1. Core identity
        parts.append(self._core_instructions())

        # 2. PyVax capabilities
        parts.append(self._pyvax_capabilities())

        # 3. Wallet policy
        parts.append(self._wallet_policy_section())

        # 4. Synthesis (optional)
        synthesis_fragment = self._synthesis_section()
        if synthesis_fragment:
            # Synthesis goes FIRST (per spec: top of system prompt)
            parts.insert(0, synthesis_fragment)

        # 5. Dry-run notice
        if self.dry_run:
            parts.append(
                "## DRY-RUN MODE\n"
                "You are operating in dry-run mode. All state-changing tools "
                "(on-chain transactions, file writes, git commits) will simulate "
                "their effects and return mock results. No real changes will be made."
            )

        return "\n\n---\n\n".join(parts)

    # ── Private prompt sections ───────────────────────────────────

    def _core_instructions(self) -> str:
        cfg = self.config.agent
        tool_names = ", ".join(self.tools.list_names()) if self.tools else "(none registered)"
        return (
            f"# Agent: {cfg.name}\n\n"
            f"{cfg.description}\n\n"
            "You are an autonomous AI agent with access to tools. "
            "Think step-by-step, use tools when needed, and report your "
            "progress clearly.\n\n"
            "## Rules\n"
            "- Always explain your reasoning before calling a tool.\n"
            "- Never fabricate tool results — if a tool fails, report the error.\n"
            "- Stay within your workspace directory for file operations.\n"
            "- Respect wallet spending limits at all times.\n"
            f"- Stop after at most {cfg.max_steps} steps.\n\n"
            f"## Available tools\n{tool_names}\n\n"
            f"## Workspace\n{cfg.workspace_dir}"
        )

    def _pyvax_capabilities(self) -> str:
        return (
            "## PyVax Integration\n\n"
            "You have access to the PyVax Python→EVM toolchain:\n"
            "- **pyvax_compile**: Compile a Python smart contract file to EVM bytecode + ABI.\n"
            "- **pyvax_deploy**: Deploy a compiled contract to Avalanche (Fuji testnet or mainnet).\n"
            "- **pyvax_call**: Call functions on deployed contracts (read or write).\n\n"
            "Contracts are written in Python using PyVax syntax. "
            "The compiler produces Hardhat/Foundry-compatible artifacts."
        )

    def _wallet_policy_section(self) -> str:
        pol = self.config.wallet.policy
        chain = self.config.wallet.default_chain
        lines = [
            "## Wallet Policy\n",
            f"- **Backend**: {self.config.wallet.backend}",
            f"- **Default chain**: {chain}",
            f"- **Max per transaction**: {pol.max_native_per_tx} native tokens",
            f"- **Max per day**: {pol.max_native_per_day} native tokens",
        ]
        if pol.allowed_contracts:
            lines.append(f"- **Allowed contracts**: {', '.join(pol.allowed_contracts)}")
        else:
            lines.append("- **Allowed contracts**: no restriction")
        if pol.allowed_methods:
            lines.append(f"- **Allowed methods**: {', '.join(pol.allowed_methods)}")
        else:
            lines.append("- **Allowed methods**: no restriction")
        return "\n".join(lines)

    def _synthesis_section(self) -> str | None:
        """Build Synthesis prompt fragment if enabled and skill text cached."""
        if not self.config.synthesis.enabled:
            return None

        # Try to load cached skill text from memory
        skill_text = self.memory.load_from_long_term("synthesis_skill")

        parts = [
            "## 🧬 Synthesis Hackathon Mode\n",
            "You are an agent participating in the Synthesis hackathon "
            "(https://synthesis.md).\n",
            f"- **Track**: {self.config.synthesis.track}",
            f"- **Agent profile**: {self.config.synthesis.agent_profile or '(not set)'}",
        ]

        if skill_text:
            parts.append(
                "\n### Skill Definition (from skill.md)\n"
                "```\n" + str(skill_text)[:4000] + "\n```"
            )

        return "\n".join(parts)
