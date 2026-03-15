"""Structured logging for Project Classified agent runs.

Each run gets:
- A human-friendly Rich console handler (coloured, compact).
- A machine-readable JSONL file at ``{log_dir}/{run_id}.jsonl``.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

from rich.console import Console
from rich.logging import RichHandler

from classified_agent.config.models import LoggingConfig


# Map our config strings to stdlib levels
_LEVEL_MAP: dict[str, int] = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARN": logging.WARNING,
}


class _JSONLFormatter(logging.Formatter):
    """Emit each log record as a single JSON line."""

    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info and record.exc_info[1]:
            entry["exception"] = str(record.exc_info[1])
        return json.dumps(entry, default=str)


def setup_logger(
    config: LoggingConfig,
    run_id: str | None = None,
    logger_name: str = "classified",
) -> logging.Logger:
    """Create and configure the agent logger.

    Args:
        config: Logging configuration from ``classified.toml``.
        run_id: Unique identifier for this run.  Auto-generated if *None*.
        logger_name: Name for the :class:`logging.Logger` instance.

    Returns:
        A configured :class:`logging.Logger` ready for use.
    """
    if run_id is None:
        run_id = datetime.now(tz=timezone.utc).strftime("%Y%m%d_%H%M%S") + "_" + uuid.uuid4().hex[:8]

    logger = logging.getLogger(logger_name)
    logger.setLevel(_LEVEL_MAP.get(config.level, logging.INFO))

    # Avoid duplicate handlers on repeated calls (e.g. in tests)
    logger.handlers.clear()

    # 1. Rich console handler ──────────────────────────────────────
    console_handler = RichHandler(
        console=Console(stderr=True),
        show_time=True,
        show_path=False,
        markup=True,
        rich_tracebacks=True,
        tracebacks_show_locals=False,
    )
    console_handler.setLevel(_LEVEL_MAP.get(config.level, logging.INFO))
    logger.addHandler(console_handler)

    # 2. JSONL file handler ────────────────────────────────────────
    log_dir = Path(config.log_dir).resolve()
    log_dir.mkdir(parents=True, exist_ok=True)

    log_file = log_dir / f"{run_id}.jsonl"
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)  # always capture everything to file
    file_handler.setFormatter(_JSONLFormatter())
    logger.addHandler(file_handler)

    logger.info("Logger initialised — run_id=%s  log_file=%s", run_id, log_file)
    return logger
