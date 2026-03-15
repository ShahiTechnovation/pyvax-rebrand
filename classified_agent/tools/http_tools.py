"""HTTP GET tool with domain allowlist and SSRF protection.

Only allows requests to explicitly whitelisted hostnames and blocks
requests to private/loopback IP addresses to prevent the agent from
exfiltrating data or attacking internal services.
"""

from __future__ import annotations

import ipaddress
import socket
from typing import TYPE_CHECKING, Any
from urllib.parse import urlparse

from classified_agent.tools.base import Tool, ToolResult

if TYPE_CHECKING:
    from classified_agent.core.context import AgentContext

# Default allowlist — configurable in future via config
DEFAULT_ALLOWED_DOMAINS: frozenset[str] = frozenset({
    "synthesis.md",
    "www.synthesis.md",
    "pyvax.xyz",
    "www.pyvax.xyz",
    "raw.githubusercontent.com",
    "api.github.com",
    "github.com",
    "gist.githubusercontent.com",
    # Avalanche / blockchain explorers
    "api.avax-test.network",
    "api.avax.network",
    "snowtrace.io",
    "api.snowtrace.io",
    "api-testnet.snowtrace.io",
})


def _is_private_ip(hostname: str) -> bool:
    """Check if a hostname resolves to a private/loopback/link-local IP.

    This prevents SSRF attacks where a whitelisted domain could be
    configured to resolve to an internal IP address.
    """
    try:
        # Resolve all IPs for the hostname
        infos = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for info in infos:
            ip_str = info[4][0]
            ip = ipaddress.ip_address(ip_str)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                return True
    except (socket.gaierror, ValueError):
        # If we can't resolve, err on the side of blocking
        return True
    return False


class HttpGetTool(Tool):
    """Perform a safe HTTP GET request."""

    name = "http_get"
    description = (
        "Fetch the contents of a URL via HTTP GET. Only whitelisted "
        "domains are allowed (e.g. synthesis.md, pyvax.xyz, GitHub). "
        "Returns the response body as text (truncated to 50 KB)."
    )
    input_schema = {
        "type": "object",
        "properties": {
            "url": {
                "type": "string",
                "description": "Full URL to fetch (must use http or https).",
            },
        },
        "required": ["url"],
    }

    def __init__(self, allowed_domains: frozenset[str] | None = None) -> None:
        self._allowed = allowed_domains or DEFAULT_ALLOWED_DOMAINS

    async def run(self, ctx: "AgentContext", **kwargs: Any) -> ToolResult:
        url: str = kwargs["url"]

        # Validate URL scheme and domain
        try:
            parsed = urlparse(url)
        except Exception:
            return ToolResult(success=False, error=f"Invalid URL: {url}")

        if parsed.scheme not in ("http", "https"):
            return ToolResult(
                success=False,
                error=f"Only http/https URLs are allowed (got '{parsed.scheme}').",
            )

        hostname = (parsed.hostname or "").lower()
        if hostname not in self._allowed:
            return ToolResult(
                success=False,
                error=(
                    f"Domain '{hostname}' is not in the allowlist. "
                    f"Allowed: {', '.join(sorted(self._allowed))}"
                ),
            )

        # SSRF defense: block private/loopback IPs
        if _is_private_ip(hostname):
            return ToolResult(
                success=False,
                error=(
                    f"Domain '{hostname}' resolves to a private/loopback IP address. "
                    f"Requests to internal networks are blocked."
                ),
            )

        # Perform the request
        try:
            import httpx

            async with httpx.AsyncClient(
                timeout=30.0,
                follow_redirects=True,
                headers={"User-Agent": "ClassifiedAgent/0.1"},
            ) as client:
                resp = await client.get(url)
                resp.raise_for_status()

            body = resp.text[:50_000]  # truncate large responses
            return ToolResult(
                success=True,
                output={
                    "url": url,
                    "status_code": resp.status_code,
                    "content_type": resp.headers.get("content-type", ""),
                    "body": body,
                    "truncated": len(resp.text) > 50_000,
                },
            )

        except ImportError:
            return ToolResult(
                success=False,
                error="httpx is not installed. Run: pip install httpx",
            )
        except Exception as exc:
            return ToolResult(success=False, error=f"HTTP request failed: {exc}")
