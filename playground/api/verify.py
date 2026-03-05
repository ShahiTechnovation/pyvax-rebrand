"""
PyVax Snowtrace Auto-Verification Engine.

Handles:
  1. Snowtrace API verification (POST source + ABI)
  2. Function signature registration (4byte.directory, openchain.xyz)
  3. Solidity interface generation (fallback for manual verify)

Usage:
  POST /api/verify  { address, source, abi, bytecode, contractName, chainId }
  GET  /api/verify?guid=<guid>&chainId=43113
"""

import json
import os
import hashlib
import urllib.request
import urllib.parse
import urllib.error
import traceback

# ─── Config ──────────────────────────────────────────────────────────────────
SNOWTRACE_API_KEY = os.environ.get("SNOWTRACE_API_KEY", "")

SNOWTRACE_APIS = {
    43113: "https://api-testnet.snowtrace.io/api",
    43114: "https://api.snowtrace.io/api",
}

SNOWTRACE_EXPLORERS = {
    43113: "https://testnet.snowtrace.io",
    43114: "https://snowtrace.io",
}


# ─── Main verify handler ────────────────────────────────────────────────────
def handle_verify(request: dict) -> dict:
    """Process a verification request."""
    address = request.get("address", "")
    source_code = request.get("source", request.get("sourceCode", ""))
    contract_name = request.get("contractName", request.get("contract_name", "Contract"))
    abi = request.get("abi", [])
    bytecode = request.get("bytecode", "")
    chain_id = int(request.get("chainId", request.get("chain_id", 43113)))

    if not address or not abi:
        return {"success": False, "error": "address and abi are required"}

    explorer_url = SNOWTRACE_EXPLORERS.get(chain_id, "https://testnet.snowtrace.io")

    # ─── Step 1: Register function signatures with public databases ──
    sig_results = register_signatures(abi)

    # ─── Step 2: Generate Solidity interface (matching selectors) ────
    solidity_interface = generate_solidity_interface(contract_name, abi)

    # ─── Step 3: Build standard-json-input for Snowtrace ────────────
    standard_json = build_standard_json_input(contract_name, source_code, abi)

    # ─── Step 4: Attempt Snowtrace API verification ─────────────────
    snowtrace_result = None
    if SNOWTRACE_API_KEY:
        snowtrace_result = submit_snowtrace_verification(
            address=address,
            source_json=standard_json,
            contract_name=contract_name,
            chain_id=chain_id,
        )

    verified = snowtrace_result.get("verified", False) if snowtrace_result else False

    return {
        "success": True,
        "verified": verified,
        "guid": snowtrace_result.get("guid") if snowtrace_result else None,
        "signatureRegistration": sig_results,
        "solidityInterface": solidity_interface,
        "standardJsonInput": standard_json,
        "message": _build_message(sig_results, snowtrace_result),
        "explorerUrl": f"{explorer_url}/address/{address}",
        "verifyPageUrl": f"{explorer_url}/verifyContract?a={address}",
        "contractName": contract_name,
    }


def handle_verify_status(guid: str, chain_id: int = 43113) -> dict:
    """Check verification status by GUID."""
    api_url = SNOWTRACE_APIS.get(chain_id)
    if not api_url or not SNOWTRACE_API_KEY:
        return {"success": True, "status": "unknown", "message": "No API key"}

    try:
        url = (
            f"{api_url}?apikey={SNOWTRACE_API_KEY}"
            f"&module=contract&action=checkverifystatus&guid={guid}"
        )
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())

        status = "verified" if data.get("status") == "1" else "pending" if "Pending" in str(data.get("result", "")) else "failed"
        return {"success": True, "status": status, "message": data.get("result", ""), "guid": guid}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ═════════════════════════════════════════════════════════════════════════════
#  SNOWTRACE API VERIFICATION
# ═════════════════════════════════════════════════════════════════════════════

def build_standard_json_input(contract_name: str, source_code: str, abi: list) -> str:
    """
    Build a standard-json-input payload for Snowtrace.

    This wraps the Python source + ABI in the format Snowtrace expects.
    We use "solidity-standard-json-input" format with our custom compiler.
    """
    return json.dumps({
        "language": "PyVax",
        "sources": {
            f"{contract_name}.py": {
                "content": source_code,
            }
        },
        "settings": {
            "optimizer": {"enabled": True, "runs": 200},
            "evmVersion": "paris",
            "outputSelection": {
                "*": {"*": ["abi", "evm.bytecode"]}
            },
        },
        "output": {
            "abi": abi,
        },
    }, indent=2)


def submit_snowtrace_verification(
    address: str,
    source_json: str,
    contract_name: str,
    chain_id: int,
) -> dict:
    """Submit contract verification to Snowtrace API."""
    api_url = SNOWTRACE_APIS.get(chain_id)
    if not api_url:
        return {"verified": False, "error": f"Unsupported chain: {chain_id}"}

    params = {
        "apikey": SNOWTRACE_API_KEY,
        "module": "contract",
        "action": "verifysourcecode",
        "contractaddress": address,
        "sourceCode": source_json,
        "codeformat": "solidity-standard-json-input",
        "contractname": contract_name,
        "compilerversion": "pyvax-v0.3.0",
        "constructorArguements": "",
        "optimizationUsed": "1",
        "runs": "200",
        "evmversion": "paris",
    }

    try:
        data = urllib.parse.urlencode(params).encode("utf-8")
        req = urllib.request.Request(
            api_url,
            data=data,
            method="POST",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read())

        if result.get("status") == "1":
            return {"verified": True, "guid": result.get("result")}
        return {"verified": False, "error": result.get("result") or result.get("message", "")}
    except Exception as e:
        return {"verified": False, "error": str(e)}


# ═════════════════════════════════════════════════════════════════════════════
#  FUNCTION SIGNATURE REGISTRATION
# ═════════════════════════════════════════════════════════════════════════════

def register_signatures(abi: list) -> dict:
    """Register all function + event signatures with public databases."""
    fn_sigs = []
    ev_sigs = []

    for item in abi:
        if item.get("type") == "function" and item.get("name"):
            types = ",".join(inp.get("type", "") for inp in item.get("inputs", []))
            fn_sigs.append(f"{item['name']}({types})")
        if item.get("type") == "event" and item.get("name"):
            types = ",".join(inp.get("type", "") for inp in item.get("inputs", []))
            ev_sigs.append(f"{item['name']}({types})")

    databases = []

    # Register with all databases
    databases.append(_register_4byte(fn_sigs, ev_sigs))
    databases.append(_register_openchain(fn_sigs, ev_sigs))
    databases.append(_register_sourcify(fn_sigs, ev_sigs))

    all_sigs = fn_sigs + ev_sigs
    signatures = [
        {"sig": s, "type": "function" if i < len(fn_sigs) else "event"}
        for i, s in enumerate(all_sigs)
    ]

    total_registered = sum(d.get("count", 0) for d in databases)

    return {
        "total": len(all_sigs),
        "registered": min(total_registered, len(all_sigs)),
        "signatures": signatures,
        "databases": databases,
    }


def _post_json(url: str, payload: dict, timeout: int = 5) -> dict:
    """POST JSON to a URL and return the response."""
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


def _register_4byte(fn_sigs: list, ev_sigs: list) -> dict:
    """Register with 4byte.directory."""
    count = 0
    try:
        for sig in fn_sigs:
            try:
                _post_json("https://www.4byte.directory/api/v1/signatures/", {"text_signature": sig})
                count += 1
            except urllib.error.HTTPError as e:
                if e.code in (400, 409):  # already exists
                    count += 1
            except Exception:
                pass

        for sig in ev_sigs:
            try:
                _post_json("https://www.4byte.directory/api/v1/event-signatures/", {"text_signature": sig})
                count += 1
            except urllib.error.HTTPError as e:
                if e.code in (400, 409):
                    count += 1
            except Exception:
                pass

        return {"name": "4byte.directory", "status": "ok" if count > 0 else "no-response", "count": count}
    except Exception as e:
        return {"name": "4byte.directory", "status": str(e), "count": 0}


def _register_openchain(fn_sigs: list, ev_sigs: list) -> dict:
    """Register with openchain.xyz (batch import)."""
    try:
        payload = {}
        if fn_sigs:
            payload["function"] = fn_sigs
        if ev_sigs:
            payload["event"] = ev_sigs

        result = _post_json("https://api.openchain.xyz/signature-database/v1/import", payload, timeout=8)

        fn_count = sum(1 for v in (result.get("result", {}).get("function", {}) or {}).values() if v in ("IMPORTED", "DUPLICATE"))
        ev_count = sum(1 for v in (result.get("result", {}).get("event", {}) or {}).values() if v in ("IMPORTED", "DUPLICATE"))

        return {"name": "openchain.xyz", "status": "ok", "count": fn_count + ev_count}
    except Exception as e:
        return {"name": "openchain.xyz", "status": str(e), "count": 0}


def _register_sourcify(fn_sigs: list, ev_sigs: list) -> dict:
    """Register with 4byte.sourcify.dev."""
    try:
        payload = {}
        if fn_sigs:
            payload["function"] = fn_sigs
        if ev_sigs:
            payload["event"] = ev_sigs

        result = _post_json("https://4byte.sourcify.dev/v1/import", payload, timeout=8)

        fn_count = sum(1 for v in (result.get("result", {}).get("function", {}) or {}).values() if v in ("IMPORTED", "DUPLICATE"))
        ev_count = sum(1 for v in (result.get("result", {}).get("event", {}) or {}).values() if v in ("IMPORTED", "DUPLICATE"))

        return {"name": "4byte.sourcify.dev", "status": "ok", "count": fn_count + ev_count}
    except Exception as e:
        return {"name": "4byte.sourcify.dev", "status": str(e), "count": 0}


# ═════════════════════════════════════════════════════════════════════════════
#  SOLIDITY INTERFACE GENERATOR
# ═════════════════════════════════════════════════════════════════════════════

def generate_solidity_interface(contract_name: str, abi: list) -> str:
    """
    Generate a Solidity interface with IDENTICAL function selectors.

    Since selectors = keccak256("name(types)")[:4], a Solidity interface
    with matching function signatures will have the exact same selectors
    as the PyVax-compiled contract.

    The user can verify this interface on Snowtrace to enable ABI decoding.
    """
    lines = [
        "// SPDX-License-Identifier: MIT",
        f"// Auto-generated by PyVax — Solidity ABI interface for {contract_name}",
        "// Function selectors match the deployed PyVax contract.",
        "// Verify on Snowtrace: Solidity, Compiler v0.8.20, No optimization",
        "pragma solidity ^0.8.20;",
        "",
        f"interface I{contract_name} {{",
    ]

    for item in abi:
        if item.get("type") == "function":
            inputs = []
            for inp in item.get("inputs", []):
                t = inp.get("type", "uint256")
                loc = " calldata" if _needs_data_location(t) else ""
                name = inp.get("name", "_")
                inputs.append(f"{t}{loc} {name}")

            outputs = []
            for out in item.get("outputs", []):
                t = out.get("type", "uint256")
                loc = " memory" if _needs_data_location(t) else ""
                outputs.append(f"{t}{loc}")

            mut = item.get("stateMutability", "nonpayable")
            mut_str = f" {mut}" if mut in ("view", "pure", "payable") else ""
            ret_str = f" returns ({', '.join(outputs)})" if outputs else ""

            lines.append(f"    function {item['name']}({', '.join(inputs)}) external{mut_str}{ret_str};")

        elif item.get("type") == "event":
            inputs = []
            for inp in item.get("inputs", []):
                t = inp.get("type", "uint256")
                indexed = " indexed" if inp.get("indexed") else ""
                name = inp.get("name", "_")
                inputs.append(f"{t}{indexed} {name}")

            lines.append(f"    event {item['name']}({', '.join(inputs)});")

    lines.append("}")
    lines.append("")
    return "\n".join(lines)


def _needs_data_location(soltype: str) -> bool:
    return soltype in ("string", "bytes") or "[]" in soltype or "[" in soltype


# ─── Message builder ────────────────────────────────────────────────────────
def _build_message(sig_results: dict, snowtrace_result: dict | None) -> str:
    parts = []
    ok_dbs = [d for d in sig_results.get("databases", []) if d.get("status") == "ok" and d.get("count", 0) > 0]
    if ok_dbs:
        names = ", ".join(d["name"] for d in ok_dbs)
        parts.append(f"Signatures registered with {names}.")
    if snowtrace_result and snowtrace_result.get("verified"):
        parts.append("Contract verified on Snowtrace!")
    elif snowtrace_result and snowtrace_result.get("error"):
        parts.append(f"Snowtrace: {snowtrace_result['error']}")
    return " ".join(parts) or "Solidity interface generated for manual Snowtrace verification."


# ─── CLI entrypoint (for testing) ───────────────────────────────────────────
if __name__ == "__main__":
    import sys
    request = json.loads(sys.stdin.read())
    result = handle_verify(request)
    print(json.dumps(result, indent=2))
