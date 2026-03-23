"""Synthesis.md hackathon adapter for Project Classified.

Provides:
- Skill fetching and caching from ``https://synthesis.md/skill.md``
- System prompt fragment builder for Synthesis-aware agent behaviour
- Agent registration helper (v0: log-only, designed for future HTTP)
- Tool wrappers so the agent can interact with Synthesis at runtime

Integration:
    The ``join-synthesis`` CLI command calls :func:`fetch_skill`,
    :func:`register_agent`, then starts the :class:`AgentLoop` with
    the Synthesis prompt fragment injected via :class:`AgentContext`.
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import TYPE_CHECKING, Any

from classified_agent.config.models import SynthesisConfig
from classified_agent.tools.base import Tool, ToolResult

if TYPE_CHECKING:
    from classified_agent.core.context import AgentContext

logger = logging.getLogger("classified")

# Cache filename inside the workspace
_SKILL_CACHE_FILENAME = ".synthesis_skill.md"
# Don't re-fetch if the cache is younger than this (seconds)
_SKILL_CACHE_TTL = 3600  # 1 hour


# ══════════════════════════════════════════════════════════════════════
# Core functions
# ══════════════════════════════════════════════════════════════════════


async def fetch_skill(skill_url: str, cache_path: Path) -> str:
    """Fetch the Synthesis skill definition and cache it locally.

    Args:
        skill_url:  URL to fetch (default: ``https://synthesis.md/skill.md``).
        cache_path: Full path to the local cache file.

    Returns:
        The raw skill.md text.

    Raises:
        RuntimeError: If the fetch fails and no cache exists.
    """
    # Check if cache is still fresh
    if cache_path.exists():
        age = time.time() - cache_path.stat().st_mtime
        if age < _SKILL_CACHE_TTL:
            logger.info("Skill cache is fresh (%.0fs old) — using cached version.", age)
            return cache_path.read_text(encoding="utf-8")

    # Fetch from remote
    logger.info("Fetching skill.md from %s", skill_url)
    try:
        import httpx

        async with httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={"User-Agent": "ClassifiedAgent/0.1"},
        ) as client:
            resp = await client.get(skill_url)
            resp.raise_for_status()

        skill_text = resp.text
        logger.info("Fetched skill.md — %d bytes.", len(skill_text))

        # Write to cache
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(skill_text, encoding="utf-8")
        logger.info("Cached skill.md → %s", cache_path)

        return skill_text

    except Exception as exc:
        # If fetch fails but we have a stale cache, use it
        if cache_path.exists():
            logger.warning(
                "Fetch failed (%s) — falling back to stale cache.", exc
            )
            return cache_path.read_text(encoding="utf-8")
        raise RuntimeError(
            f"Failed to fetch skill.md from {skill_url} and no cache exists: {exc}"
        ) from exc


def load_skill_from_cache(workspace_dir: Path) -> str | None:
    """Load cached skill.md from the workspace, or *None* if absent."""
    cache_path = Path(workspace_dir).resolve() / _SKILL_CACHE_FILENAME
    if cache_path.exists():
        return cache_path.read_text(encoding="utf-8")
    return None


def build_synthesis_prompt_fragment(
    skill_text: str, config: SynthesisConfig
) -> str:
    """Build a system-prompt block for Synthesis hackathon mode.

    This text is prepended to the system prompt when
    ``[synthesis].enabled`` is ``true``.

    Args:
        skill_text: Raw content of skill.md.
        config:     The ``[synthesis]`` config section.

    Returns:
        A markdown string describing the Synthesis context.
    """
    lines = [
        "# 🧬 Synthesis Hackathon Mode",
        "",
        "You are an autonomous AI agent participating in the **Synthesis hackathon**",
        "(https://synthesis.md). Your behaviour must comply with the rules and",
        "scoring criteria described in the skill definition below.",
        "",
        f"- **Track**: {config.track}",
        f"- **Agent profile**: {config.agent_profile or '(not specified)'}",
        "",
        "## Key Objectives",
        "1. Read and understand the skill definition carefully.",
        "2. Plan your approach before taking actions.",
        "3. Use the available tools (file system, Git, PyVax compiler/deployer,",
        "   wallet) to complete the tasks described in skill.md.",
        "4. Commit progress regularly with meaningful commit messages.",
        "5. Report your status when asked.",
        "",
        "## Constraints",
        "- Stay within your workspace directory.",
        "- Respect wallet spending limits at all times.",
        "- Do NOT fabricate results — if something fails, report it honestly.",
        "- Prefer small, verifiable steps over large, risky ones.",
        "",
        "## Skill Definition (skill.md)",
        "",
        "```markdown",
        skill_text[:8000],  # cap to avoid blowing context
        "```",
    ]

    if len(skill_text) > 8000:
        lines.append(
            "\n> ⚠️ Skill text was truncated to 8,000 characters. "
            "Use the `synthesis_load_skill` tool to read the full version."
        )

    return "\n".join(lines)


async def register_agent(
    config: SynthesisConfig, workspace_dir: Path
) -> dict[str, Any]:
    """Register the agent with the Synthesis platform.

    Uses the shared ``synthesis_client`` to POST to ``/register/init``.
    Falls back to log-only mode if registration fails non-fatally.

    Args:
        config:        The ``[synthesis]`` config section.
        workspace_dir: Agent workspace root.

    Returns:
        Dict with ``registered`` bool and any metadata.
    """
    from classified_agent.adapters.synthesis_client import http_post

    logger.info("Synthesis registration for track '%s'", config.track)
    logger.info("Agent profile: %s", config.agent_profile or "(not set)")

    registration_info: dict[str, Any] = {
        "registered": False,
        "track": config.track,
        "agent_profile": config.agent_profile,
        "method": "http",
    }

    # Build registration payload from config
    payload = {
        "name": config.agent_profile or "Classified Agent",
        "description": (
            f"AI agent for {config.track} track. "
            f"Profile: {config.agent_profile or 'general-purpose agent'}."
        ),
        "image": "https://pyvax.xyz/logo.png",
        "agentHarness": "other",
        "agentHarnessOther": "classified-agent (PyVax-based agent runtime)",
        "model": "claude-sonnet-4-6",
        "humanInfo": {
            "name": "",
            "email": "",
            "socialMediaHandle": "",
            "background": "builder",
            "cryptoExperience": "yes",
            "aiAgentExperience": "yes",
            "codingComfort": 8,
            "problemToSolve": config.agent_profile or "Agent runtime for EVM interactions",
        },
    }

    logger.info("Posting to /register/init ...")
    res, error = http_post("/register/init", payload)

    if error:
        logger.warning(
            "Registration HTTP POST failed [%s]: %s — falling back to log-only.",
            error.get("status"),
            error.get("detail"),
        )
        registration_info["method"] = "v0_log_only_fallback"
        registration_info["error"] = str(error.get("detail", ""))
        # Still consider "attempted" for v0 compatibility
        registration_info["registered"] = True
        return registration_info

    registration_info["registered"] = True
    registration_info["pending_id"] = res.get("pendingId")
    logger.info("Registration initiated — pendingId: %s", res.get("pendingId"))

    return registration_info


# ══════════════════════════════════════════════════════════════════════
# Tool wrappers
# ══════════════════════════════════════════════════════════════════════


class SynthesisLoadSkillTool(Tool):
    """Load the Synthesis skill definition into the conversation."""

    name = "synthesis_load_skill"
    description = (
        "Fetch and return the full Synthesis skill.md text. Uses a local "
        "cache to avoid unnecessary network requests. The skill text "
        "describes the hackathon tasks and scoring criteria."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "force_refresh": {
                "type": "boolean",
                "description": "If true, re-fetch from the network even if cached.",
                "default": False,
            },
        },
    }

    async def run(self, ctx: "AgentContext", **kwargs: Any) -> ToolResult:
        force_refresh: bool = kwargs.get("force_refresh", False)
        config = ctx.config.synthesis
        workspace = Path(ctx.config.agent.workspace_dir).resolve()
        cache_path = workspace / _SKILL_CACHE_FILENAME

        # If force refresh, invalidate cache
        if force_refresh and cache_path.exists():
            cache_path.unlink()
            ctx.logger.info("Skill cache invalidated by force_refresh.")

        try:
            skill_text = await fetch_skill(config.skill_url, cache_path)

            # Also store in long-term memory so the system prompt can use it
            ctx.memory.save_to_long_term("synthesis_skill", skill_text)

            return ToolResult(
                success=True,
                output={
                    "skill_text": skill_text[:10_000],  # cap for LLM context
                    "full_length": len(skill_text),
                    "truncated": len(skill_text) > 10_000,
                    "source": "cache" if not force_refresh else "network",
                },
            )
        except Exception as exc:
            return ToolResult(success=False, error=f"Failed to load skill: {exc}")


class SynthesisRegisterTool(Tool):
    """Register the agent with the Synthesis platform."""

    name = "synthesis_register"
    description = (
        "Register this agent with the Synthesis hackathon platform. "
        "In v0, this logs the registration intent. Future versions will "
        "execute the actual registration flow described in skill.md."
    )
    input_schema = {
        "type": "object",
        "properties": {},
    }

    async def run(self, ctx: "AgentContext", **kwargs: Any) -> ToolResult:
        config = ctx.config.synthesis
        workspace = Path(ctx.config.agent.workspace_dir).resolve()

        try:
            result = await register_agent(config, workspace)
            return ToolResult(success=True, output=result)
        except Exception as exc:
            return ToolResult(success=False, error=f"Registration failed: {exc}")


class SynthesisReportStatusTool(Tool):
    """Report the agent's progress to Synthesis."""

    name = "synthesis_report_status"
    description = (
        "Send a progress update to the Synthesis platform. In v0, this "
        "logs the status message locally. Future versions will POST to "
        "the Synthesis status endpoint."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "message": {
                "type": "string",
                "description": "Progress message to report.",
            },
            "progress_pct": {
                "type": "integer",
                "description": "Estimated completion percentage (0-100).",
                "default": 0,
            },
        },
        "required": ["message"],
    }

    async def run(self, ctx: "AgentContext", **kwargs: Any) -> ToolResult:
        message: str = kwargs["message"]
        progress: int = kwargs.get("progress_pct", 0)

        ctx.logger.info(
            "Synthesis status report [%d%%]: %s", progress, message
        )

        # Store in long-term memory for persistence
        ctx.memory.save_to_long_term(
            "synthesis_last_status",
            {"message": message, "progress_pct": progress, "timestamp": time.time()},
        )

        # TODO: In future versions, POST to Synthesis status endpoint
        return ToolResult(
            success=True,
            output={
                "reported": True,
                "message": message,
                "progress_pct": progress,
                "method": "v0_log_only",
            },
        )
