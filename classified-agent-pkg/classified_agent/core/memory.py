"""File-backed memory store for Project Classified.

Provides:
- **Short-term memory** — in-memory conversation buffer (last N turns)
  with crash-recovery flush to disk.
- **Long-term memory** — simple key→value JSON files under
  ``workspace/.memory/`` for facts the agent wants to persist across
  sessions.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger("classified")


class MemoryStore:
    """Agent memory backed by the local filesystem.

    All paths are relative to the workspace directory that is
    passed at construction.
    """

    def __init__(self, workspace_dir: Path) -> None:
        self._workspace = Path(workspace_dir).resolve()
        self._memory_dir = self._workspace / ".memory"
        self._memory_dir.mkdir(parents=True, exist_ok=True)

        self._short_term: list[dict[str, Any]] = []

    # ── Short-term (conversation buffer) ──────────────────────────

    def add_to_short_term(self, entry: dict[str, Any]) -> None:
        """Append a turn to the in-memory conversation buffer."""
        self._short_term.append(entry)

    def get_short_term(self, limit: int = 20) -> list[dict[str, Any]]:
        """Return the last *limit* conversation turns."""
        return self._short_term[-limit:]

    def clear_short_term(self) -> None:
        """Reset the conversation buffer (e.g. on new run)."""
        self._short_term.clear()

    # ── Long-term (key→value file store) ──────────────────────────

    def save_to_long_term(self, key: str, value: Any) -> None:
        """Persist a JSON-serialisable *value* under *key*.

        Args:
            key:   Identifier (used as filename, sanitised).
            value: Any JSON-serialisable object.
        """
        safe_key = self._sanitise_key(key)
        path = self._memory_dir / f"{safe_key}.json"
        path.write_text(json.dumps(value, indent=2, default=str), encoding="utf-8")
        logger.debug("Memory saved: %s → %s", key, path)

    def load_from_long_term(self, key: str) -> Any | None:
        """Load a previously saved value, or *None* if it doesn't exist."""
        safe_key = self._sanitise_key(key)
        path = self._memory_dir / f"{safe_key}.json"
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("Failed to load memory key '%s': %s", key, exc)
            return None

    def list_long_term_keys(self) -> list[str]:
        """Return all long-term memory keys."""
        return [p.stem for p in self._memory_dir.glob("*.json")]

    # ── Flush / recovery ──────────────────────────────────────────

    def flush(self) -> None:
        """Write the current short-term buffer to disk for crash recovery."""
        path = self._memory_dir / "_short_term_buffer.json"
        path.write_text(
            json.dumps(self._short_term, indent=2, default=str),
            encoding="utf-8",
        )
        logger.debug("Short-term buffer flushed (%d entries)", len(self._short_term))

    def restore_short_term(self) -> None:
        """Restore the short-term buffer from a previous flush (if any)."""
        path = self._memory_dir / "_short_term_buffer.json"
        if path.exists():
            try:
                self._short_term = json.loads(path.read_text(encoding="utf-8"))
                logger.info("Restored %d short-term entries from disk", len(self._short_term))
            except (json.JSONDecodeError, OSError):
                logger.warning("Could not restore short-term buffer — starting fresh")

    # ── Internal ──────────────────────────────────────────────────

    @staticmethod
    def _sanitise_key(key: str) -> str:
        """Remove characters that are unsafe in filenames."""
        return "".join(c if c.isalnum() or c in ("_", "-") else "_" for c in key)
