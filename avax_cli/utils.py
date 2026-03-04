"""Utility functions for the PyVax CLI v1.0.0.

Provides:
  - Configuration loading and management
  - Network metadata (Fuji, Mainnet, custom)
  - Environment diagnostics (pyvax doctor)
  - Display formatters
"""

import json
import os
import sys
import shutil
from pathlib import Path
from typing import Dict, Any, Optional

from rich.console import Console
from rich.table import Table
from rich.panel import Panel

console = Console()

# ─── Network Registry ───────────────────────────────────────────────────────

NETWORKS: Dict[str, Dict[str, Any]] = {
    "fuji": {
        "name": "Avalanche Fuji Testnet",
        "rpc_url": "https://api.avax-test.network/ext/bc/C/rpc",
        "chain_id": 43113,
        "explorer": "https://testnet.snowtrace.io",
        "explorer_api": "https://api-testnet.snowtrace.io/api",
        "faucet": "https://faucet.avax.network",
        "is_testnet": True,
    },
    "cchain": {
        "name": "Avalanche C-Chain Mainnet",
        "rpc_url": "https://api.avax.network/ext/bc/C/rpc",
        "chain_id": 43114,
        "explorer": "https://snowtrace.io",
        "explorer_api": "https://api.snowtrace.io/api",
        "faucet": None,
        "is_testnet": False,
    },
    "mainnet": {
        "name": "Avalanche C-Chain Mainnet",
        "rpc_url": "https://api.avax.network/ext/bc/C/rpc",
        "chain_id": 43114,
        "explorer": "https://snowtrace.io",
        "explorer_api": "https://api.snowtrace.io/api",
        "faucet": None,
        "is_testnet": False,
    },
}

# ─── Default optimizer settings ──────────────────────────────────────────────

DEFAULT_OPTIMIZER_LEVEL = 1
MAX_OPTIMIZER_LEVEL = 3


# ─── Configuration ──────────────────────────────────────────────────────────

def load_config(config_path: str = "pyvax_config.json") -> Dict[str, Any]:
    """Load PyVax network configuration from file."""
    config_file = Path(config_path)
    if not config_file.exists():
        console.print(
            f"[red]Error:[/red] {config_path} not found. "
            "Run 'pyvax new <project_name>' first."
        )
        return {}

    with open(config_file) as f:
        return json.load(f)


def save_config(config: Dict[str, Any], config_path: str = "pyvax_config.json") -> None:
    """Save PyVax network configuration to file."""
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)


# ─── Environment Diagnostics ────────────────────────────────────────────────

def check_environment() -> bool:
    """Diagnose the PyVax environment — called by 'pyvax doctor'."""
    issues = []
    ok = []

    # Python version
    py_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    if sys.version_info >= (3, 9):
        ok.append(f"Python {py_version}")
    else:
        issues.append(f"Python {py_version} (3.9+ required)")

    # Check critical packages
    packages = {
        "typer": "CLI framework",
        "rich": "Rich terminal output",
        "web3": "Ethereum/Avalanche connectivity",
        "cryptography": "Wallet encryption",
        "eth_account": "Account management",
    }
    for pkg_name, desc in packages.items():
        try:
            __import__(pkg_name)
            ok.append(f"{pkg_name} installed ({desc})")
        except ImportError:
            issues.append(f"{pkg_name} missing — pip install {pkg_name}")

    # Check private key
    if os.getenv("PRIVATE_KEY") or os.getenv("PYVAX_PRIVATE_KEY"):
        ok.append("PRIVATE_KEY / PYVAX_PRIVATE_KEY environment variable is set")
    elif Path(".env").exists():
        ok.append(".env file found (will be scanned for PRIVATE_KEY)")
    elif Path("pyvax_key.json").exists():
        ok.append("pyvax_key.json keystore found")
    else:
        issues.append(
            "No private key source found — set PRIVATE_KEY in .env "
            "or run 'pyvax wallet new <id>'"
        )

    # Check Snowtrace API key
    snowtrace_key = os.getenv("SNOWTRACE_API_KEY")
    if snowtrace_key:
        ok.append("SNOWTRACE_API_KEY environment variable is set")
    else:
        # Check config file
        config = load_config()
        if config.get("explorer_api_key"):
            ok.append("explorer_api_key found in config")
        else:
            issues.append(
                "No Snowtrace API key — set SNOWTRACE_API_KEY or explorer_api_key in config "
                "(needed for --verify)"
            )

    # Check config file
    if Path("pyvax_config.json").exists():
        config = load_config()
        network = config.get("network", "unknown")
        ok.append(f"pyvax_config.json found (network: {network})")
    else:
        issues.append("pyvax_config.json not found — run 'pyvax new <project_name>'")

    # Check contracts directory
    if Path("contracts").exists():
        py_files = list(Path("contracts").glob("*.py"))
        if py_files:
            ok.append(f"contracts/ found ({len(py_files)} Python contract(s))")
        else:
            ok.append("contracts/ directory found (no .py files yet)")
    else:
        issues.append("contracts/ directory not found")

    # Check build artifacts
    if Path("build").exists():
        build_dirs = [d for d in Path("build").iterdir() if d.is_dir()]
        ok.append(f"build/ directory found ({len(build_dirs)} artifact(s))")
    else:
        issues.append("build/ not found — run 'pyvax compile' to generate artifacts")

    # Check deployments
    if Path("deployments.json").exists():
        try:
            with open("deployments.json") as f:
                deps = json.load(f)
            total = sum(len(v) for v in deps.values())
            ok.append(f"deployments.json found ({total} deployment(s))")
        except Exception:
            issues.append("deployments.json exists but is malformed")

    # RPC connectivity
    try:
        config = load_config()
        if config.get("rpc_url"):
            import urllib.request
            req = urllib.request.Request(
                config["rpc_url"],
                data=json.dumps({"jsonrpc": "2.0", "method": "eth_chainId", "params": [], "id": 1}).encode(),
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                result = json.loads(resp.read().decode())
                chain_id = int(result["result"], 16)
                ok.append(f"RPC connected: {config['rpc_url']} (chain {chain_id})")
    except Exception as e:
        issues.append(f"RPC connectivity failed: {str(e)[:60]}")

    # Print results
    for item in ok:
        console.print(f"  [green]✓[/green] {item}")

    for item in issues:
        console.print(f"  [red]✗[/red] {item}")

    if issues:
        console.print(
            f"\n[yellow]Found {len(issues)} issue(s).[/yellow] "
            "Fix them before running 'pyvax deploy'."
        )
        return False

    console.print("\n[green]✅ PyVax environment is ready![/green]")
    return True


# ─── Display helpers ─────────────────────────────────────────────────────────

def display_deployment_summary(
    deployments: Dict[str, Any], network: str = "fuji"
):
    """Display a Rich table of all contracts deployed on a network."""
    if network not in deployments or not deployments[network]:
        console.print(f"[yellow]No contracts deployed on {network}.[/yellow]")
        return

    table = Table(title=f"🚀 PyVax Deployments — {network.upper()}")
    table.add_column("Contract", style="cyan")
    table.add_column("Address", style="green")
    table.add_column("Gas Used", style="yellow", justify="right")
    table.add_column("Block", style="blue", justify="right")

    for contract_name, info in deployments[network].items():
        table.add_row(
            contract_name,
            info["address"],
            f"{info['gas_used']:,}",
            str(info["block_number"]),
        )

    console.print(table)


def format_address(address: str) -> str:
    """Shorten an Ethereum address for display: 0xAbCd...ef12."""
    if len(address) > 10:
        return f"{address[:6]}...{address[-4:]}"
    return address


def format_amount(amount: int, decimals: int = 18, symbol: str = "AVAX") -> str:
    """Format a raw wei amount as a human-readable token amount."""
    formatted = amount / (10 ** decimals)
    return f"{formatted:,.4f} {symbol}"


def validate_contract_name(name: str) -> bool:
    """Check that a contract name follows PyVax naming conventions."""
    if not name.isalnum():
        console.print("[red]Contract name must be alphanumeric[/red]")
        return False
    if not name[0].isupper():
        console.print("[red]Contract name should start with an uppercase letter[/red]")
        return False
    return True


def get_network_info(network: str) -> Dict[str, Any]:
    """Return RPC and explorer metadata for a named network."""
    return NETWORKS.get(network, NETWORKS["fuji"])
