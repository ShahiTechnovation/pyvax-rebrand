"""Snowtrace / Etherscan source‑code verification client.

Submits flattened Solidity source to the Snowtrace (Avalanche) or
Etherscan‑compatible verification API so that explorer UIs display
function signatures, read/write panels, and verified‑bytecode badges.

Usage:
    from avax_cli.snowtrace import SnowtraceVerifier

    verifier = SnowtraceVerifier(api_key="...", chain="fuji")
    guid = verifier.submit(
        address="0x...",
        source="// SPDX-License-Identifier: MIT ...",
        contract_name="ERC20Token",
    )
    status = verifier.check(guid)
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional

import requests
from rich.console import Console

console = Console()

# ── Chain → API endpoint mapping ──────────────────────────────────────

CHAIN_APIS = {
    "fuji": "https://api-testnet.snowtrace.io/api",
    "mainnet": "https://api.snowtrace.io/api",
    "avalanche": "https://api.snowtrace.io/api",
    # Etherscan-compatible chains
    "ethereum": "https://api.etherscan.io/api",
    "goerli": "https://api-goerli.etherscan.io/api",
    "sepolia": "https://api-sepolia.etherscan.io/api",
}


@dataclass
class VerificationResult:
    """Result of a Snowtrace/Etherscan verification attempt."""
    success: bool
    guid: Optional[str] = None
    message: str = ""
    explorer_url: str = ""


class SnowtraceVerifier:
    """Submits contracts for Snowtrace/Etherscan source verification."""

    def __init__(
        self,
        api_key: str = "",
        chain: str = "fuji",
        compiler_version: str = "v0.8.24+commit.e11b9ed9",
        optimization_runs: int = 200,
        evm_version: str = "paris",
    ):
        self.api_key = api_key
        self.chain = chain
        self.api_url = CHAIN_APIS.get(chain, CHAIN_APIS["fuji"])
        self.compiler_version = compiler_version
        self.optimization_runs = optimization_runs
        self.evm_version = evm_version

        # Explorer URL for user-facing links
        explorer_map = {
            "fuji": "https://testnet.snowtrace.io",
            "mainnet": "https://snowtrace.io",
            "avalanche": "https://snowtrace.io",
            "ethereum": "https://etherscan.io",
            "goerli": "https://goerli.etherscan.io",
            "sepolia": "https://sepolia.etherscan.io",
        }
        self.explorer_base = explorer_map.get(chain, "https://testnet.snowtrace.io")

    def submit(
        self,
        address: str,
        source: str,
        contract_name: str = "PyVaxContract",
        constructor_args: str = "",
    ) -> VerificationResult:
        """Submit source code for verification.

        Args:
            address: Deployed contract address (0x...)
            source: Complete flattened Solidity source
            contract_name: Contract name as it appears in source
            constructor_args: ABI-encoded constructor arguments (hex, no 0x)

        Returns:
            VerificationResult with GUID for status polling
        """
        console.print(f"[cyan]Submitting verification for {address} on {self.chain}[/cyan]")

        payload = {
            "apikey": self.api_key,
            "module": "contract",
            "action": "verifysourcecode",
            "contractaddress": address,
            "sourceCode": source,
            "codeformat": "solidity-single-file",
            "contractname": contract_name,
            "compilerversion": self.compiler_version,
            "optimizationUsed": "1",
            "runs": str(self.optimization_runs),
            "evmversion": self.evm_version,
        }
        if constructor_args:
            payload["constructorArguements"] = constructor_args  # sic — Etherscan typo

        try:
            resp = requests.post(self.api_url, data=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()

            if data.get("status") == "1":
                guid = data.get("result", "")
                console.print(f"[green]Verification submitted — GUID: {guid}[/green]")
                return VerificationResult(
                    success=True,
                    guid=guid,
                    message="Verification submitted",
                    explorer_url=f"{self.explorer_base}/address/{address}#code",
                )
            else:
                msg = data.get("result", data.get("message", "Unknown error"))
                console.print(f"[yellow]Verification response: {msg}[/yellow]")
                return VerificationResult(
                    success=False,
                    message=msg,
                    explorer_url=f"{self.explorer_base}/address/{address}",
                )

        except requests.RequestException as e:
            console.print(f"[red]Verification request failed: {e}[/red]")
            return VerificationResult(success=False, message=str(e))

    def check(self, guid: str) -> VerificationResult:
        """Check verification status for a previously submitted GUID.

        Args:
            guid: GUID returned from submit()

        Returns:
            VerificationResult with current status
        """
        params = {
            "apikey": self.api_key,
            "module": "contract",
            "action": "checkverifystatus",
            "guid": guid,
        }

        try:
            resp = requests.get(self.api_url, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()

            if data.get("status") == "1":
                return VerificationResult(
                    success=True,
                    guid=guid,
                    message="Pass - Verified",
                )
            else:
                return VerificationResult(
                    success=False,
                    guid=guid,
                    message=data.get("result", "Pending"),
                )

        except requests.RequestException as e:
            return VerificationResult(success=False, guid=guid, message=str(e))

    def submit_and_wait(
        self,
        address: str,
        source: str,
        contract_name: str = "PyVaxContract",
        constructor_args: str = "",
        max_retries: int = 10,
        poll_interval: float = 5.0,
    ) -> VerificationResult:
        """Submit and poll until verified or timeout.

        Args:
            address: Contract address
            source: Solidity source
            contract_name: Contract name
            constructor_args: ABI-encoded constructor args
            max_retries: Number of polling attempts
            poll_interval: Seconds between polls

        Returns:
            Final VerificationResult
        """
        result = self.submit(address, source, contract_name, constructor_args)
        if not result.success or not result.guid:
            return result

        console.print(f"[cyan]Polling verification status...[/cyan]")

        for i in range(max_retries):
            time.sleep(poll_interval)
            status = self.check(result.guid)
            console.print(f"  [{i + 1}/{max_retries}] {status.message}")

            if "Pass" in status.message or "verified" in status.message.lower():
                status.explorer_url = f"{self.explorer_base}/address/{address}#code"
                console.print(f"[bold green]✓ Contract verified![/bold green]")
                console.print(f"  {status.explorer_url}")
                return status

            if "fail" in status.message.lower() or "error" in status.message.lower():
                return status

        return VerificationResult(
            success=False,
            guid=result.guid,
            message="Verification timed out",
        )


# ── Standalone payload generator (for /api/transform pipeline) ────────


def generate_snowtrace_payload(
    source: str,
    contract_name: str = "PyVaxContract",
    compiler_version: str = "v0.8.24+commit.e11b9ed9",
    optimization_runs: int = 200,
    evm_version: str = "paris",
) -> dict:
    """Generate Snowtrace-compatible standard-JSON-input verification payload.

    This builds the exact JSON structure that Snowtrace / Etherscan expects
    when using ``codeformat: "solidity-standard-json-input"``.

    The ``contractaddress`` field is left as ``None`` — the caller must fill
    it in after deploying the contract.

    Args:
        source: Complete flattened Solidity source code
        contract_name: Contract name as it appears in source
        compiler_version: Full solc version string (e.g. v0.8.24+commit.e11b9ed9)
        optimization_runs: Number of optimizer runs
        evm_version: EVM target version — MUST be "paris" for Avalanche C-Chain

    Returns:
        Dict ready to POST to Snowtrace verification API
    """
    import json

    source_filename = f"{contract_name}.sol"

    return {
        "module": "contract",
        "action": "verifysourcecode",
        "codeformat": "solidity-standard-json-input",
        "contractaddress": None,   # Client fills post-deploy
        "compilerversion": compiler_version,
        "contractname": f"{source_filename}:{contract_name}",
        "licenseType": 1,          # MIT
        "sourceCode": json.dumps({
            "language": "Solidity",
            "settings": {
                "evmVersion": evm_version,
                "optimizer": {
                    "enabled": True,
                    "runs": optimization_runs,
                },
                "outputSelection": {
                    "*": {
                        "*": ["abi", "evm.bytecode.object", "metadata"],
                    }
                },
            },
            "sources": {
                source_filename: {
                    "content": source,
                }
            },
        }),
    }


def generate_snowtrace_single_file(
    source: str,
    contract_name: str = "PyVaxContract",
    compiler_version: str = "v0.8.24+commit.e11b9ed9",
    optimization_runs: int = 200,
    evm_version: str = "paris",
    license_type: int = 1,
) -> dict:
    """Generate Snowtrace-compatible single-file verification payload.

    Uses ``codeformat: "solidity-single-file"`` which is the simplest
    format accepted by Snowtrace / Etherscan.  The source code is sent
    as a raw string (not JSON-wrapped) and the contract name is just the
    plain name without a ``Filename:ContractName`` prefix.

    Args:
        source: Complete flattened Solidity source code
        contract_name: Contract name as it appears in source
        compiler_version: Full solc version string
        optimization_runs: Number of optimizer runs
        evm_version: EVM target version — MUST be "paris" for Avalanche C-Chain
        license_type: SPDX license identifier (1 = MIT)

    Returns:
        Dict ready to POST to Snowtrace verification API
    """
    return {
        "module": "contract",
        "action": "verifysourcecode",
        "codeformat": "solidity-single-file",
        "contractaddress": None,        # Client fills post-deploy
        "compilerversion": compiler_version,
        "contractname": contract_name,  # Plain name (no filename prefix)
        "licenseType": license_type,
        "sourceCode": source,           # Raw .sol text
        "optimizationUsed": "1",
        "runs": str(optimization_runs),
        "evmversion": evm_version,      # AVALANCHE C-CHAIN: "paris"
    }


def snowtrace_verify(
    address: str,
    payload: dict,
    api_key: str = "",
    chain: str = "fuji",
) -> dict:
    """Submit a verification payload to Snowtrace / Etherscan API.

    Args:
        address: Deployed contract address (0x...)
        payload: Dict from ``generate_snowtrace_payload()``
        api_key: Snowtrace / Etherscan API key
        chain: Chain name ("fuji", "mainnet", "avalanche")

    Returns:
        Raw JSON response from the API
    """
    import os

    api_key = api_key or os.environ.get("SNOWTRACE_API_KEY", "")
    api_url = CHAIN_APIS.get(chain, CHAIN_APIS["fuji"])

    submit = dict(payload)
    submit["contractaddress"] = address
    submit["apikey"] = api_key

    try:
        resp = requests.post(api_url, data=submit, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        console.print(f"[cyan]Snowtrace response:[/cyan] {data}")
        return data
    except requests.RequestException as e:
        console.print(f"[red]Snowtrace verify failed: {e}[/red]")
        return {"status": "0", "message": str(e)}
