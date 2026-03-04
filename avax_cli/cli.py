"""Main CLI interface for pyvax tool."""

import json
import os
import sys
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from .compiler import compile_contracts
from .deployer import deploy_contract, estimate_gas
from .wallet import WalletManager
from .interactor import interact_with_contract, show_contract_info

app = typer.Typer(
    name="pyvax",
    help="PyVax — write Avalanche smart contracts in pure Python and deploy to any EVM chain",
    rich_markup_mode="rich",
)

console = Console()


@app.command()
def new(
    project_name: str = typer.Argument(..., help="Name of the project to scaffold"),
    force: bool = typer.Option(False, "--force", "-f", help="Overwrite existing project"),
) -> None:
    """Scaffold a new PyVax project with sample contracts and configuration."""
    project_path = Path(project_name)

    if project_path.exists() and not force:
        console.print(f"[red]Error:[/red] Project '{project_name}' already exists. Use --force to overwrite.")
        raise typer.Exit(1)

    # Create project structure
    project_path.mkdir(exist_ok=True)
    (project_path / "contracts").mkdir(exist_ok=True)
    (project_path / "build").mkdir(exist_ok=True)
    (project_path / "scripts").mkdir(exist_ok=True)

    # Create default config
    config = {
        "network": "fuji",
        "rpc_url": "https://api.avax-test.network/ext/bc/C/rpc",
        "chain_id": 43113,
        "explorer_api_key": ""
    }

    with open(project_path / "pyvax_config.json", "w") as f:
        json.dump(config, f, indent=2)

    # Create sample Python smart contract
    python_contract = '''from pyvax import Contract

class SimpleStorage(Contract):
    """Simple storage contract written in Python."""

    stored_data: int = 0

    @action
    def set(self, value: int):
        """Set stored data."""
        self.stored_data = value
        self.emit("DataStored", value)

    @action
    def get(self) -> int:
        """Get stored data."""
        return self.stored_data
'''

    with open(project_path / "contracts" / "SimpleStorage.py", "w") as f:
        f.write(python_contract)

    # Create sample deploy script
    deploy_script = f'''#!/usr/bin/env python3
"""Deploy script for {project_name} contracts."""

import json
import os
from pathlib import Path

from pyvax.deployer import deploy_contract
from pyvax.wallet import WalletManager


def main():
    """Deploy SimpleStorage contract to Avalanche."""
    # Load configuration
    with open("pyvax_config.json") as f:
        config = json.load(f)

    # Initialize wallet
    wallet = WalletManager()

    result = deploy_contract(
        contract_name="SimpleStorage",
        constructor_args=[],
        config=config,
        wallet=wallet
    )

    if result:
        print(f"Contract deployed successfully!")
        print(f"Address: {{result['address']}}")
        print(f"Transaction: {{result['tx_hash']}}")
        print(f"Gas used: {{result['gas_used']}}")


if __name__ == "__main__":
    main()
'''

    with open(project_path / "scripts" / "deploy.py", "w") as f:
        f.write(deploy_script)

    os.chmod(project_path / "scripts" / "deploy.py", 0o755)

    console.print(Panel(
        f"[green]✓[/green] Project '{project_name}' initialized successfully!\n\n"
        f"[yellow]Next steps:[/yellow]\n"
        f"1. cd {project_name}\n"
        f"2. pyvax wallet new          # Create a new wallet\n"
        f"3. pyvax compile             # Transpile Python → EVM bytecode\n"
        f"4. pyvax deploy SimpleStorage --network fuji  # Deploy to Fuji Testnet\n"
        f"5. pyvax call <address> get  # Interact with deployed contract",
        title="Project Initialized",
        border_style="green"
    ))


@app.command()
def compile(
    contracts_dir: str = typer.Option("contracts", "--contracts", "-c", help="Contracts directory"),
    output_dir: str = typer.Option("build", "--output", "-o", help="Output directory for compiled artifacts"),
    solc_version: Optional[str] = typer.Option(None, "--solc-version", help="Solidity compiler version"),
) -> None:
    """Transpile Python smart contracts to EVM bytecode."""
    contracts_path = Path(contracts_dir)
    output_path = Path(output_dir)

    if not contracts_path.exists():
        console.print(f"[red]Error:[/red] Contracts directory '{contracts_dir}' not found.")
        raise typer.Exit(1)

    try:
        with console.status("[bold green]Transpiling Python contracts..."):
            results = compile_contracts(contracts_path, output_path, solc_version)

        if results:
            table = Table(title="Transpilation Results")
            table.add_column("Contract", style="cyan")
            table.add_column("Status", style="green")
            table.add_column("Output", style="yellow")

            for contract_name, result in results.items():
                status = "✓ Success" if result["success"] else "✗ Failed"
                output_file = result.get("output_file", "N/A")
                table.add_row(contract_name, status, str(output_file))

            console.print(table)
            console.print(f"[green]Compilation complete![/green] Artifacts saved to '{output_dir}'")
        else:
            console.print("[yellow]No contracts found to compile.[/yellow]")

    except Exception as e:
        console.print(f"[red]Compilation failed:[/red] {str(e)}")
        raise typer.Exit(1)


@app.command()
def deploy(
    contract_name: str = typer.Argument(..., help="Name of the contract to deploy"),
    constructor_args: Optional[str] = typer.Option(None, "--args", help="Constructor arguments as JSON array"),
    config_file: str = typer.Option("pyvax_config.json", "--config", help="Configuration file path"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Estimate gas without deploying"),
    network: Optional[str] = typer.Option(None, "--network", "-n", help="Override network from config (fuji | cchain)"),
    rpc: Optional[str] = typer.Option(None, "--rpc", help="Custom RPC URL override"),
    gas_limit: Optional[int] = typer.Option(None, "--gas-limit", "-g", help="Override gas limit"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show full trace output"),
) -> None:
    """Deploy a compiled PyVax contract to Avalanche."""
    config_path = Path(config_file)

    if not config_path.exists():
        console.print(f"[red]Error:[/red] Config file '{config_file}' not found.")
        console.print("Run 'pyvax new <project_name>' to create a project first.")
        raise typer.Exit(1)

    with open(config_path) as f:
        config = json.load(f)

    # Override network
    if network:
        if network in ("cchain", "mainnet"):
            config.update({
                "network": "cchain",
                "rpc_url": "https://api.avax.network/ext/bc/C/rpc",
                "chain_id": 43114
            })
        elif network == "fuji":
            config.update({
                "network": "fuji",
                "rpc_url": "https://api.avax-test.network/ext/bc/C/rpc",
                "chain_id": 43113
            })

    # Override RPC
    if rpc:
        config["rpc_url"] = rpc

    if verbose:
        console.print(f"[dim]RPC → {config['rpc_url']}[/dim]")
        console.print(f"[dim]Chain ID → {config['chain_id']}[/dim]")

    # Parse constructor arguments
    args = []
    if constructor_args:
        try:
            args = json.loads(constructor_args)
            if not isinstance(args, list):
                raise ValueError("Constructor arguments must be a JSON array")
        except json.JSONDecodeError as e:
            console.print(f"[red]Error:[/red] Invalid JSON in constructor arguments: {e}")
            raise typer.Exit(1)

    wallet = WalletManager()

    try:
        if dry_run:
            with console.status("[bold yellow]Simulating gas requirements..."):
                gas_estimate = estimate_gas(contract_name, args, config, wallet)

            console.print(Panel(
                f"[yellow]Gas Simulation for {contract_name}[/yellow]\n\n"
                f"Estimated gas: {gas_estimate:,}\n"
                f"Network: {config['network']} (Chain ID: {config['chain_id']})\n"
                f"RPC endpoint: {config['rpc_url']}",
                title="Dry Run Results",
                border_style="yellow"
            ))
        else:
            with console.status(f"[bold green]Deploying {contract_name} to {config['network']}..."):
                result = deploy_contract(contract_name, args, config, wallet, gas_limit_override=gas_limit)

            if result:
                console.print(Panel(
                    f"[green]✓ Contract deployed successfully![/green]\n\n"
                    f"Contract:     {contract_name}\n"
                    f"Address:      {result['address']}\n"
                    f"Transaction:  {result['tx_hash']}\n"
                    f"Gas used:     {result['gas_used']:,}\n"
                    f"Network:      {config['network']} (Chain ID: {config['chain_id']})",
                    title="Deployment Successful",
                    border_style="green"
                ))
            else:
                console.print("[red]Deployment failed. Check logs for details.[/red]")
                raise typer.Exit(1)

    except Exception as e:
        console.print(f"[red]Deployment error:[/red] {str(e)}")
        raise typer.Exit(1)


wallet_app = typer.Typer(help="Agent Wallet management commands")
app.add_typer(wallet_app, name="wallet")


@wallet_app.command()
def new(
    wallet_id: str = typer.Argument(..., help="Identifier for this agent wallet (e.g. 'agent-001')"),
    password: Optional[str] = typer.Option(None, "--password", help="Wallet encryption password (will prompt if omitted)"),
    keystore_file: Optional[str] = typer.Option(None, "--keystore", help="Custom keystore file path"),
) -> None:
    """Generate a new AgentWallet and save encrypted keystore."""
    if keystore_file is None:
        keystore_file = f"pyvax_{wallet_id}.json"

    if password is None:
        password = typer.prompt(f"Enter password for wallet '{wallet_id}'", hide_input=True)
        confirm_password = typer.prompt("Confirm password", hide_input=True)
        if password != confirm_password:
            console.print("[red]Error:[/red] Passwords do not match.")
            raise typer.Exit(1)

    try:
        wallet_manager = WalletManager()
        address = wallet_manager.create_wallet(password or "", keystore_file)

        console.print(Panel(
            f"[green]✓ AgentWallet '{wallet_id}' created![/green]\n\n"
            f"Address:  {address}\n"
            f"Keystore: {keystore_file}\n\n"
            f"[yellow]⚠️  Security Notice:[/yellow]\n"
            f"• Never share your private key or password\n"
            f"• Back up your keystore file securely\n"
            f"• Fund this address with AVAX before deploying contracts\n"
            f"• Set PYVAX_AGENT_KEY_{wallet_id.upper().replace('-', '_')} in your .env",
            title="AgentWallet Created",
            border_style="green"
        ))

    except Exception as e:
        console.print(f"[red]Error creating wallet:[/red] {str(e)}")
        raise typer.Exit(1)


@wallet_app.command()
def show(
    keystore_file: str = typer.Option("pyvax_key.json", "--keystore", help="Keystore file path"),
) -> None:
    """Show wallet address and status information."""
    try:
        wallet_manager = WalletManager()

        if os.getenv("PRIVATE_KEY"):
            address = wallet_manager.get_address_from_env()
            source = "Environment variable (PRIVATE_KEY)"
        else:
            if not Path(keystore_file).exists():
                console.print(f"[red]Error:[/red] Keystore file '{keystore_file}' not found.")
                console.print("Run 'pyvax wallet new <id>' to create a wallet.")
                raise typer.Exit(1)

            password = typer.prompt(f"Enter password for {keystore_file}", hide_input=True)
            address = wallet_manager.load_wallet(keystore_file, password)
            source = f"Keystore file ({keystore_file})"

        console.print(Panel(
            f"[cyan]Agent Wallet Information[/cyan]\n\n"
            f"Address: {address}\n"
            f"Source:  {source}\n\n"
            f"[yellow]Note:[/yellow] Run 'pyvax deploy --dry-run' to test RPC connectivity.",
            title="Wallet Details",
            border_style="cyan"
        ))

    except Exception as e:
        console.print(f"[red]Error:[/red] {str(e)}")
        raise typer.Exit(1)


@app.command()
def call(
    contract_address: str = typer.Argument(..., help="Address of the deployed contract"),
    method: str = typer.Argument(..., help="Method name to call"),
    args: Optional[str] = typer.Option(None, "--args", "-a", help="Function arguments (comma-separated)"),
    view: bool = typer.Option(False, "--view", "-v", help="Read-only call — no transaction"),
    config_file: str = typer.Option("pyvax_config.json", "--config", help="Configuration file path"),
) -> None:
    """Interact with a deployed PyVax contract."""
    try:
        config_path = Path(config_file)
        if not config_path.exists():
            console.print("[red]Error:[/red] pyvax_config.json not found. Run 'pyvax new' first.")
            raise typer.Exit(1)

        with open(config_path) as f:
            config = json.load(f)

        wallet_manager = WalletManager()

        parsed_args = []
        if args:
            parsed_args = [arg.strip() for arg in args.split(",")]
            for i, arg in enumerate(parsed_args):
                if arg.isdigit():
                    parsed_args[i] = int(arg)
                elif "." in arg and arg.replace(".", "").isdigit():
                    parsed_args[i] = float(arg)

        result = interact_with_contract(
            contract_name=contract_address,
            function_name=method,
            args=parsed_args,
            config=config,
            wallet=wallet_manager,
            is_view=view
        )

        if result is None and not view:
            console.print("[red]Transaction failed![/red]")
            raise typer.Exit(1)

    except Exception as e:
        console.print(f"[red]Error:[/red] {str(e)}")
        raise typer.Exit(1)


@app.command()
def info(
    contract_name: str = typer.Argument(..., help="Name of the deployed contract"),
) -> None:
    """Show ABI and deployment information for a contract."""
    try:
        config_path = Path("pyvax_config.json")
        if not config_path.exists():
            console.print("[red]Error:[/red] pyvax_config.json not found. Run 'pyvax new' first.")
            raise typer.Exit(1)

        with open(config_path) as f:
            config = json.load(f)

        wallet_manager = WalletManager()
        show_contract_info(contract_name, config, wallet_manager)

    except Exception as e:
        console.print(f"[red]Error:[/red] {str(e)}")
        raise typer.Exit(1)


@app.command()
def doctor() -> None:
    """Diagnose your PyVax environment — checks runtimes, keys, and RPC health."""
    from .utils import check_environment
    console.print("\n[bold cyan]🔍 Diagnosing PyVax environment...[/bold cyan]\n")
    check_environment()


@app.command()
def config() -> None:
    """Display active network and RPC configuration."""
    config_path = Path("pyvax_config.json")
    if not config_path.exists():
        console.print("[red]pyvax_config.json not found.[/red] Run 'pyvax new <name>' first.")
        raise typer.Exit(1)

    with open(config_path) as f:
        cfg = json.load(f)

    table = Table(title="Active PyVax Configuration")
    table.add_column("Key", style="cyan")
    table.add_column("Value", style="green")

    for key, value in cfg.items():
        table.add_row(str(key), str(value))

    console.print(table)


def main():
    """Main entry point for the pyvax CLI."""
    app()


if __name__ == "__main__":
    main()