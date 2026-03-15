"""Filesystem tools — sandboxed to the agent's workspace directory.

All path arguments are resolved relative to the workspace root.
Path-traversal attacks (e.g. ``../../../etc/passwd``) are detected
and rejected before any I/O occurs.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import TYPE_CHECKING, Any

from classified_agent.tools.base import Tool, ToolResult

if TYPE_CHECKING:
    from classified_agent.core.context import AgentContext

# Maximum file size the agent may read (100 KB)
_MAX_READ_BYTES = 100 * 1024
# Maximum file size the agent may write (200 KB)
_MAX_WRITE_BYTES = 200 * 1024


def _resolve_safe_path(workspace: Path, relative_path: str) -> Path:
    """Resolve *relative_path* under *workspace* and verify it stays inside.

    Raises:
        ValueError: If the resolved path escapes the workspace.
    """
    workspace = workspace.resolve()
    target = (workspace / relative_path).resolve()

    if not str(target).startswith(str(workspace)):
        raise ValueError(
            f"Path '{relative_path}' resolves outside the workspace. "
            f"Resolved: {target}, Workspace: {workspace}"
        )
    return target


# ──────────────────────────────────────────────────────────────────────
# fs_read
# ──────────────────────────────────────────────────────────────────────


class FsReadTool(Tool):
    """Read a text file from the workspace."""

    name = "fs_read"
    description = (
        "Read the contents of a file. The path must be relative to the "
        "workspace directory. Maximum file size: 100 KB."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Relative path to the file (e.g. 'contracts/Token.py').",
            },
        },
        "required": ["path"],
    }

    async def run(self, ctx: "AgentContext", **kwargs: Any) -> ToolResult:
        path_str: str = kwargs["path"]
        workspace = Path(ctx.config.agent.workspace_dir).resolve()

        try:
            target = _resolve_safe_path(workspace, path_str)
        except ValueError as exc:
            return ToolResult(success=False, error=str(exc))

        if not target.exists():
            return ToolResult(success=False, error=f"File not found: {path_str}")

        if not target.is_file():
            return ToolResult(success=False, error=f"Not a file: {path_str}")

        size = target.stat().st_size
        if size > _MAX_READ_BYTES:
            return ToolResult(
                success=False,
                error=f"File too large ({size:,} bytes, max {_MAX_READ_BYTES:,}).",
            )

        try:
            content = target.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            return ToolResult(success=False, error="File is not valid UTF-8 text.")

        return ToolResult(success=True, output={"path": path_str, "content": content})


# ──────────────────────────────────────────────────────────────────────
# fs_write
# ──────────────────────────────────────────────────────────────────────


class FsWriteTool(Tool):
    """Create or overwrite a text file in the workspace."""

    name = "fs_write"
    description = (
        "Write content to a file. Creates parent directories if needed. "
        "The path must be relative to the workspace directory."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Relative path for the file.",
            },
            "content": {
                "type": "string",
                "description": "Text content to write.",
            },
        },
        "required": ["path", "content"],
    }

    async def run(self, ctx: "AgentContext", **kwargs: Any) -> ToolResult:
        path_str: str = kwargs["path"]
        content: str = kwargs["content"]
        workspace = Path(ctx.config.agent.workspace_dir).resolve()

        try:
            target = _resolve_safe_path(workspace, path_str)
        except ValueError as exc:
            return ToolResult(success=False, error=str(exc))

        if len(content.encode("utf-8")) > _MAX_WRITE_BYTES:
            return ToolResult(
                success=False,
                error=f"Content too large (max {_MAX_WRITE_BYTES:,} bytes).",
            )

        # Dry-run mode
        if ctx.dry_run:
            ctx.logger.info("DRY RUN: would write %d bytes to %s", len(content), path_str)
            return ToolResult(
                success=True,
                output={"path": path_str, "bytes_written": len(content), "dry_run": True},
            )

        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")

        return ToolResult(
            success=True,
            output={"path": path_str, "bytes_written": len(content)},
        )


# ──────────────────────────────────────────────────────────────────────
# fs_list
# ──────────────────────────────────────────────────────────────────────


class FsListTool(Tool):
    """List files and directories in a workspace subdirectory."""

    name = "fs_list"
    description = (
        "List the contents of a directory. Returns file names, types, "
        "and sizes. Path must be relative to the workspace."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Relative directory path (use '.' for workspace root).",
                "default": ".",
            },
        },
    }

    async def run(self, ctx: "AgentContext", **kwargs: Any) -> ToolResult:
        path_str: str = kwargs.get("path", ".")
        workspace = Path(ctx.config.agent.workspace_dir).resolve()

        try:
            target = _resolve_safe_path(workspace, path_str)
        except ValueError as exc:
            return ToolResult(success=False, error=str(exc))

        if not target.exists():
            return ToolResult(success=False, error=f"Directory not found: {path_str}")

        if not target.is_dir():
            return ToolResult(success=False, error=f"Not a directory: {path_str}")

        entries = []
        try:
            for entry in sorted(target.iterdir()):
                info: dict[str, Any] = {
                    "name": entry.name,
                    "type": "directory" if entry.is_dir() else "file",
                }
                if entry.is_file():
                    info["size_bytes"] = entry.stat().st_size
                entries.append(info)
        except PermissionError:
            return ToolResult(success=False, error=f"Permission denied: {path_str}")

        return ToolResult(
            success=True,
            output={"path": path_str, "entries": entries, "count": len(entries)},
        )
