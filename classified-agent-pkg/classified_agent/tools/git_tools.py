"""Minimal Git tools — init, status, commit within the workspace."""

from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path
from typing import TYPE_CHECKING, Any

from classified_agent.tools.base import Tool, ToolResult

if TYPE_CHECKING:
    from classified_agent.core.context import AgentContext


async def _run_git(args: list[str], cwd: Path) -> tuple[int, str, str]:
    """Run a git command asynchronously and return (returncode, stdout, stderr)."""
    proc = await asyncio.create_subprocess_exec(
        "git",
        *args,
        cwd=str(cwd),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    stdout_b, stderr_b = await proc.communicate()
    return (
        proc.returncode or 0,
        stdout_b.decode("utf-8", errors="replace").strip(),
        stderr_b.decode("utf-8", errors="replace").strip(),
    )


# ──────────────────────────────────────────────────────────────────────
# git_init
# ──────────────────────────────────────────────────────────────────────


class GitInitTool(Tool):
    """Initialise a Git repository in the workspace."""

    name = "git_init"
    description = (
        "Run 'git init' in the workspace directory. Safe to call if "
        "a repo already exists (will be a no-op)."
    )
    input_schema = {
        "type": "object",
        "properties": {},
    }

    async def run(self, ctx: "AgentContext", **kwargs: Any) -> ToolResult:
        workspace = Path(ctx.config.agent.workspace_dir).resolve()
        workspace.mkdir(parents=True, exist_ok=True)

        if ctx.dry_run:
            ctx.logger.info("DRY RUN: would run 'git init' in %s", workspace)
            return ToolResult(success=True, output={"message": "DRY RUN: git init", "dry_run": True})

        code, out, err = await _run_git(["init"], workspace)
        if code != 0:
            return ToolResult(success=False, error=f"git init failed: {err}")
        return ToolResult(success=True, output={"message": out or "Repository initialised."})


# ──────────────────────────────────────────────────────────────────────
# git_status
# ──────────────────────────────────────────────────────────────────────


class GitStatusTool(Tool):
    """Show the current Git status summary."""

    name = "git_status"
    description = "Return a short summary of 'git status' in the workspace."
    input_schema = {
        "type": "object",
        "properties": {},
    }

    async def run(self, ctx: "AgentContext", **kwargs: Any) -> ToolResult:
        workspace = Path(ctx.config.agent.workspace_dir).resolve()

        code, out, err = await _run_git(["status", "--short"], workspace)
        if code != 0:
            return ToolResult(success=False, error=f"git status failed: {err}")

        # Also get branch name
        _, branch, _ = await _run_git(["branch", "--show-current"], workspace)

        return ToolResult(
            success=True,
            output={
                "branch": branch or "(detached / no commits)",
                "status": out or "(clean — nothing to commit)",
            },
        )


# ──────────────────────────────────────────────────────────────────────
# git_commit
# ──────────────────────────────────────────────────────────────────────


class GitCommitTool(Tool):
    """Stage all changes and commit with a message."""

    name = "git_commit"
    description = (
        "Stage all tracked and untracked files ('git add -A') and commit "
        "with the given message."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "message": {
                "type": "string",
                "description": "Commit message.",
            },
        },
        "required": ["message"],
    }

    async def run(self, ctx: "AgentContext", **kwargs: Any) -> ToolResult:
        message: str = kwargs["message"]
        workspace = Path(ctx.config.agent.workspace_dir).resolve()

        # Sanitize commit message to prevent git flag injection
        if message.startswith("-"):
            message = f"-- {message}"

        if ctx.dry_run:
            ctx.logger.info("DRY RUN: would commit '%s'", message)
            return ToolResult(
                success=True,
                output={"message": f"DRY RUN: git commit -m '{message}'", "dry_run": True},
            )

        # Stage everything
        code, _, err = await _run_git(["add", "-A"], workspace)
        if code != 0:
            return ToolResult(success=False, error=f"git add failed: {err}")

        # Commit — use -- to prevent message from being parsed as flags
        code, out, err = await _run_git(["commit", "-m", message, "--"], workspace)
        if code != 0:
            # "nothing to commit" is not really an error
            if "nothing to commit" in (out + err).lower():
                return ToolResult(success=True, output={"message": "Nothing to commit."})
            return ToolResult(success=False, error=f"git commit failed: {err}")

        return ToolResult(success=True, output={"message": out})
