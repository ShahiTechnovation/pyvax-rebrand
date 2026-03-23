"""Shared HTTP client for Synthesis / Devfolio API.

This module provides the low-level HTTP helpers used by both:
  - ``classified-agent join-synthesis --submit`` (CLI submission flow)
  - ``SynthesisRegisterTool`` (adapter tool for agent runtime)

Uses only Python stdlib (``urllib``) — no extra dependencies.
"""

from __future__ import annotations

import json
import urllib.request
import urllib.error
from typing import Any

BASE_URL = "https://synthesis.devfolio.co"
STATE_FILE = "classified_synthesis_state.json"


def http_post(
    path: str,
    data: dict[str, Any] | None = None,
    api_key: str | None = None,
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    """POST JSON to the Synthesis/Devfolio API.

    Args:
        path:    URL path relative to BASE_URL (e.g. ``/register/init``).
        data:    JSON body to send.
        api_key: Optional Bearer token for authenticated endpoints.

    Returns:
        ``(response_dict, None)`` on success, or
        ``(None, error_dict)`` on failure where error_dict has
        ``status`` (int) and ``detail`` (str or dict).
    """
    url = BASE_URL + path
    body = json.dumps(data).encode() if data else b""
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return json.loads(res.read()), None
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            detail = json.loads(raw)
        except Exception:
            detail = raw
        return None, {"status": e.code, "detail": detail}
    except Exception as ex:
        return None, {"status": 0, "detail": str(ex)}


def http_get(
    path: str,
    api_key: str | None = None,
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    """GET JSON from the Synthesis/Devfolio API.

    Args:
        path:    URL path relative to BASE_URL.
        api_key: Optional Bearer token for authenticated endpoints.

    Returns:
        Same tuple format as :func:`http_post`.
    """
    url = BASE_URL + path
    headers = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return json.loads(res.read()), None
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            detail = json.loads(raw)
        except Exception:
            detail = raw
        return None, {"status": e.code, "detail": detail}
    except Exception as ex:
        return None, {"status": 0, "detail": str(ex)}


def http_head(url: str, timeout: int = 10) -> int:
    """Send a HEAD request and return the HTTP status code.

    Returns 0 on connection error.
    """
    req = urllib.request.Request(url, method="HEAD")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return 0
