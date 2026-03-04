"""Utility functions for the PyVax CLI."""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional

from rich.console import Console
from rich.table import Table
from rich.panel import Panel

console = Console()


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


def check_environment() -> bool:
    """Diagnose the PyVax environment — called by 'pyvax doctor'."""
    issues = []
    ok = []

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

    # Check config file
    if Path("pyvax_config.json").exists():
        ok.append("pyvax_config.json found")
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
        ok.append("build/ directory found")
    else:
        issues.append("build/ not found — run 'pyvax compile' to generate artifacts")

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


def display_deployment_summary(
    deployments: Dict[str, Any], network: str = "fuji"
):
    """Display a Rich table of all contracts deployed on a network."""
    if network not in deployments or not deployments[network]:
        console.print(f"[yellow]No contracts deployed on {network}.[/yellow]")
        return

    table = Table(title=f"PyVax Deployments — {network.upper()}")
    table.add_column("Contract", style="cyan")
    table.add_column("Address", style="green")
    table.add_column("Gas Used", style="yellow")
    table.add_column("Block", style="blue")

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
    networks = {
        "fuji": {
            "name": "Avalanche Fuji Testnet",
            "rpc_url": "https://api.avax-test.network/ext/bc/C/rpc",
            "chain_id": 43113,
            "explorer": "https://testnet.snowtrace.io",
            "faucet": "https://faucet.avax.network",
        },
        "cchain": {
            "name": "Avalanche C-Chain Mainnet",
            "rpc_url": "https://api.avax.network/ext/bc/C/rpc",
            "chain_id": 43114,
            "explorer": "https://snowtrace.io",
            "faucet": None,
        },
    }
    return networks.get(network, networks["fuji"])
