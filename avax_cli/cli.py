"""Main CLI interface for pyvax tool — v1.0.0 Production."""

import json
import os
import sys
import time
from pathlib import Path
from typing import Optional, List

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn

from .compiler import compile_contracts
from .deployer import deploy_contract, estimate_gas, verify_contract
from .wallet import WalletManager
from .interactor import interact_with_contract, show_contract_info
from .utils import get_network_info, validate_contract_name, load_config

app = typer.Typer(
    name="pyvax",
    help=(
        "🔥 [bold cyan]PyVax v1.0.0[/bold cyan] — write Avalanche smart contracts "
        "in pure Python and deploy to any EVM chain.\n\n"
        "Workflow: new → compile → deploy → call"
    ),
    rich_markup_mode="rich",
    add_completion=True,
    no_args_is_help=True,
)

console = Console()

# ─── Contract templates ─────────────────────────────────────────────────────

TEMPLATES = {
    "SimpleStorage": '''"""SimpleStorage — minimal PyVax contract."""
from pyvax import Contract, action


class SimpleStorage(Contract):
    """Simple storage contract — stores a single integer."""

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
''',
    "Counter": '''"""Counter — increment/decrement contract."""
from pyvax import Contract, action


class Counter(Contract):
    """Simple counter contract."""

    count: int = 0

    @action
    def increment(self):
        """Increment counter."""
        self.count = self.count + 1
        self.emit("Incremented", self.count)

    @action
    def decrement(self):
        """Decrement counter (floor of 0)."""
        if self.count > 0:
            self.count = self.count - 1
            self.emit("Decremented", self.count)

    @action
    def get_count(self) -> int:
        """Return current count."""
        return self.count

    @action
    def reset(self):
        """Reset counter to zero."""
        self.count = 0
        self.emit("Reset")
''',
    "ERC20": '''"""ERC20 — standard fungible token contract."""
from pyvax import Contract, action


class ERC20(Contract):
    """ERC-20 compatible token contract."""

    total_supply: int = 0
    balances: dict = {}
    allowances: dict = {}
    name_: int = 0
    decimals_: int = 18

    @action
    def mint(self, to: str, amount: int):
        """Mint new tokens to an address."""
        self.require(amount > 0, "Amount must be positive")
        self.balances[to] = self.balances.get(to, 0) + amount
        self.total_supply = self.total_supply + amount
        self.emit("Transfer", 0, to, amount)

    @action
    def transfer(self, to: str, amount: int):
        """Transfer tokens to an address."""
        sender = self.msg_sender()
        self.require(self.balances.get(sender, 0) >= amount, "Insufficient balance")
        self.balances[sender] = self.balances[sender] - amount
        self.balances[to] = self.balances.get(to, 0) + amount
        self.emit("Transfer", sender, to, amount)

    @action
    def balance_of(self, owner: str) -> int:
        """Get token balance for an address."""
        return self.balances.get(owner, 0)

    @action
    def total_supply_of(self) -> int:
        """Get total token supply."""
        return self.total_supply
''',
    "AgentVault": '''"""AgentVault — production vault for PyVax AgentWallets."""
from pyvax import Contract, action, agent_action, human_action


class AgentVault(Contract):
    """Production-ready vault contract used by PyVax AgentWallets."""

    balances: dict = {}
    total_deposits: int = 0

    @action
    def deposit(self, amount: int):
        """Deposit AVAX into this vault."""
        self.require(amount > 0, "Amount must be positive")
        sender = self.msg_sender()
        self.balances[sender] = self.balances.get(sender, 0) + amount
        self.total_deposits = self.total_deposits + amount
        self.emit("Deposit", sender, amount)

    @agent_action
    def autonomous_rebalance(self):
        """Rebalance logic exec'd exclusively by an AgentWallet."""
        pass

    @human_action
    def withdraw(self, amount: int):
        """Withdraw AVAX — only callable by human EOA, not agents."""
        sender = self.msg_sender()
        self.require(self.balances.get(sender, 0) >= amount, "Insufficient balance")
        self.balances[sender] = self.balances[sender] - amount
        self.total_deposits = self.total_deposits - amount
        self.emit("Withdraw", sender, amount)

    @action
    def balance_of(self, user: str) -> int:
        """Get balance for a specific address."""
        return self.balances.get(user, 0)

    @action
    def get_total_deposits(self) -> int:
        """Get total deposits across all users."""
        return self.total_deposits
''',
    "Voting": '''"""Voting — decentralized voting contract."""
from pyvax import Contract, action


class Voting(Contract):
    """Simple on-chain voting contract."""

    votes: dict = {}
    voter_status: dict = {}
    total_votes: int = 0

    @action
    def vote(self, candidate_id: int):
        """Cast a vote for a candidate."""
        sender = self.msg_sender()
        self.require(self.voter_status.get(sender, 0) == 0, "Already voted")
        self.voter_status[sender] = 1
        self.votes[candidate_id] = self.votes.get(candidate_id, 0) + 1
        self.total_votes = self.total_votes + 1
        self.emit("VoteCast", sender, candidate_id)

    @action
    def get_votes(self, candidate_id: int) -> int:
        """Get vote count for a candidate."""
        return self.votes.get(candidate_id, 0)

    @action
    def get_total_votes(self) -> int:
        """Get total votes cast."""
        return self.total_votes
''',
}


# ─── pyvax new ───────────────────────────────────────────────────────────────

@app.command()
def new(
    project_name: str = typer.Argument(
        ..., help="Name of the project (or template: SimpleStorage, ERC20, Counter, AgentVault, Voting)"
    ),
    template: Optional[str] = typer.Option(
        None, "--template", "-t",
        help="Contract template to scaffold (SimpleStorage, ERC20, Counter, AgentVault, Voting)"
    ),
    chain: str = typer.Option(
        "fuji", "--chain", "-c", help="Default chain: fuji | mainnet"
    ),
    force: bool = typer.Option(
        False, "--force", "-f", help="Overwrite existing project"
    ),
) -> None:
    """🆕 Scaffold a new PyVax project with sample contracts and configuration."""
    project_path = Path(project_name)

    if project_path.exists() and not force:
        console.print(
            f"[red]Error:[/red] Project '{project_name}' already exists. "
            "Use --force to overwrite."
        )
        raise typer.Exit(1)

    # Create project structure
    project_path.mkdir(exist_ok=True)
    (project_path / "contracts").mkdir(exist_ok=True)
    (project_path / "build").mkdir(exist_ok=True)
    (project_path / "scripts").mkdir(exist_ok=True)
    (project_path / "tests").mkdir(exist_ok=True)

    # Get network info
    net = get_network_info(chain if chain != "mainnet" else "cchain")

    # Create default config
    config = {
        "network": chain if chain != "mainnet" else "cchain",
        "rpc_url": net["rpc_url"],
        "chain_id": net["chain_id"],
        "explorer_api_key": "",
        "optimizer_level": 1,
        "overflow_safe": True,
    }

    with open(project_path / "pyvax_config.json", "w") as f:
        json.dump(config, f, indent=2)

    # Determine which template(s) to include
    template_name = template or project_name
    if template_name in TEMPLATES:
        contracts_to_write = {template_name: TEMPLATES[template_name]}
    else:
        # Default: include SimpleStorage
        contracts_to_write = {"SimpleStorage": TEMPLATES["SimpleStorage"]}

    for name, source in contracts_to_write.items():
        with open(project_path / "contracts" / f"{name}.py", "w") as f:
            f.write(source)

    # Create sample deploy script
    first_contract = list(contracts_to_write.keys())[0]
    deploy_script = f'''#!/usr/bin/env python3
"""Deploy script for {project_name} contracts."""

import json
from pathlib import Path
from pyvax.deployer import deploy_contract
from pyvax.wallet import WalletManager


def main():
    """Deploy {first_contract} contract to Avalanche."""
    with open("pyvax_config.json") as f:
        config = json.load(f)

    wallet = WalletManager()

    result = deploy_contract(
        contract_name="{first_contract}",
        constructor_args=[],
        config=config,
        wallet=wallet,
    )

    if result:
        print(f"✓ Contract deployed successfully!")
        print(f"  Address:     {{result['address']}}")
        print(f"  Transaction: {{result['tx_hash']}}")
        print(f"  Gas used:    {{result['gas_used']:,}}")


if __name__ == "__main__":
    main()
'''

    with open(project_path / "scripts" / "deploy.py", "w") as f:
        f.write(deploy_script)

    # Create .env template
    env_template = """# PyVax Environment Configuration
# Fill in your private key to deploy contracts
PRIVATE_KEY=
PYVAX_PRIVATE_KEY=
SNOWTRACE_API_KEY=
"""
    with open(project_path / ".env.example", "w") as f:
        f.write(env_template)

    # Create .gitignore
    gitignore = """# PyVax
build/
*.json
!pyvax_config.json
pyvax_key*.json
.env
__pycache__/
deployments.json
"""
    with open(project_path / ".gitignore", "w") as f:
        f.write(gitignore)

    console.print(Panel(
        f"[green]✓[/green] Project '[bold]{project_name}[/bold]' initialized!\n\n"
        f"[cyan]Template:[/cyan] {first_contract}\n"
        f"[cyan]Network:[/cyan]  {config['network']} (Chain ID: {config['chain_id']})\n\n"
        f"[yellow]Next steps:[/yellow]\n"
        f"  1. cd {project_name}\n"
        f"  2. pyvax compile                       [dim]# Transpile → EVM bytecode[/dim]\n"
        f"  3. pyvax deploy {first_contract} --chain fuji  [dim]# Deploy to Fuji Testnet[/dim]\n"
        f"  4. pyvax call {first_contract} get             [dim]# Interact with contract[/dim]\n\n"
        f"[dim]Available templates: {', '.join(TEMPLATES.keys())}[/dim]",
        title="🚀 PyVax Project Created",
        border_style="green",
    ))


# ─── pyvax compile ──────────────────────────────────────────────────────────

@app.command()
def compile(
    contract: Optional[str] = typer.Argument(
        None, help="Specific contract name to compile (compiles all if omitted)"
    ),
    contracts_dir: str = typer.Option(
        "contracts", "--contracts", "-c", help="Contracts directory"
    ),
    output_dir: str = typer.Option(
        "build", "--output", "-o", help="Output directory for compiled artifacts"
    ),
    optimizer: int = typer.Option(
        1, "--optimizer", "--opt", help="Optimizer level: 0=none, 1=peephole, 2=fold, 3=aggressive"
    ),
    overflow_safe: bool = typer.Option(
        True, "--overflow-safe/--no-overflow-safe",
        help="Enable Solidity 0.8-style overflow/underflow checks"
    ),
    gas_report: bool = typer.Option(
        False, "--gas-report", help="Show per-function gas cost estimates"
    ),
) -> None:
    """⚡ Transpile Python smart contracts to EVM bytecode.

    Examples:
        pyvax compile                      # All contracts, optimizer=1
        pyvax compile Token --optimizer=3  # Single contract, aggressive optimize
        pyvax compile --gas-report         # Show gas breakdown
    """
    contracts_path = Path(contracts_dir)
    output_path = Path(output_dir)

    if not contracts_path.exists():
        console.print(f"[red]Error:[/red] Contracts directory '{contracts_dir}' not found.")
        raise typer.Exit(1)

    try:
        with console.status("[bold green]Transpiling Python contracts..."):
            results = compile_contracts(
                contracts_path, output_path,
                optimizer_level=optimizer,
                overflow_safe=overflow_safe,
                contract_filter=contract,
            )

        if results:
            table = Table(title="⚡ Compilation Results")
            table.add_column("Contract", style="cyan", no_wrap=True)
            table.add_column("Status", style="green")
            table.add_column("Size", style="yellow", justify="right")
            table.add_column("Optimizer", style="magenta", justify="center")
            table.add_column("Output", style="dim")

            for contract_name, result in results.items():
                if result["success"]:
                    bytecode_hex = result.get("bytecode", "0x")
                    size_bytes = (len(bytecode_hex) - 2) // 2 if bytecode_hex.startswith("0x") else len(bytecode_hex) // 2
                    size_str = f"{size_bytes / 1024:.1f}kb"

                    # Show optimization savings
                    meta = result.get("metadata", {})
                    before = meta.get("bytecode_size_before_opt", size_bytes)
                    if before > size_bytes:
                        pct = (before - size_bytes) / before * 100
                        size_str += f" [green](-{pct:.0f}%)[/green]"

                    table.add_row(
                        contract_name,
                        "[green]✓ Success[/green]",
                        size_str,
                        f"L{optimizer}",
                        str(result.get("output_file", "N/A")),
                    )
                else:
                    table.add_row(
                        contract_name,
                        "[red]✗ Failed[/red]",
                        "-",
                        "-",
                        result.get("error", "Unknown error")[:60],
                    )

            console.print(table)

            # Gas report
            if gas_report:
                _show_gas_report(results)

            success_count = sum(1 for r in results.values() if r["success"])
            console.print(
                f"\n[green]✓ {success_count}/{len(results)} contracts compiled![/green] "
                f"Artifacts → [cyan]{output_dir}/[/cyan]"
            )
        else:
            console.print("[yellow]No contracts found to compile.[/yellow]")

    except Exception as e:
        console.print(f"[red]Compilation failed:[/red] {str(e)}")
        raise typer.Exit(1)


def _show_gas_report(results: dict) -> None:
    """Display per-function gas estimates from compilation metadata."""
    gas_table = Table(title="⛽ Gas Report")
    gas_table.add_column("Contract", style="cyan")
    gas_table.add_column("Function", style="yellow")
    gas_table.add_column("Est. Gas", style="green", justify="right")

    for contract_name, result in results.items():
        if not result["success"]:
            continue
        meta = result.get("metadata", {})
        gas_est = meta.get("gas_estimate", 0)
        funcs = meta.get("functions", [])
        for func_name in funcs:
            gas_table.add_row(contract_name, func_name, f"~{gas_est:,}")

    console.print(gas_table)


# ─── pyvax deploy ───────────────────────────────────────────────────────────

@app.command()
def deploy(
    contract_name: str = typer.Argument(..., help="Name of the contract to deploy"),
    constructor_args: Optional[str] = typer.Option(
        None, "--args", help="Constructor arguments as JSON array"
    ),
    config_file: str = typer.Option(
        "pyvax_config.json", "--config", help="Configuration file path"
    ),
    chain: Optional[str] = typer.Option(
        None, "--chain", "-n",
        help="Network: fuji | mainnet (overrides config)"
    ),
    rpc: Optional[str] = typer.Option(
        None, "--rpc", help="Custom RPC URL override"
    ),
    gas_limit: Optional[int] = typer.Option(
        None, "--gas-limit", "-g", help="Override gas limit"
    ),
    dry_run: bool = typer.Option(
        False, "--dry-run", help="Estimate gas without deploying"
    ),
    live: bool = typer.Option(
        False, "--live", help="Skip confirmation prompt"
    ),
    verify: bool = typer.Option(
        False, "--verify", help="Verify contract on Snowtrace after deploy"
    ),
    verbose: bool = typer.Option(
        False, "--verbose", "-v", help="Show full trace output"
    ),
) -> None:
    """🚀 Deploy a compiled PyVax contract to Avalanche.

    Examples:
        pyvax deploy Token --chain fuji
        pyvax deploy Token --chain mainnet --verify --live
        pyvax deploy Token --dry-run  # Estimate gas only
    """
    config_path = Path(config_file)

    if not config_path.exists():
        console.print(f"[red]Error:[/red] Config file '{config_file}' not found.")
        console.print("Run 'pyvax new <project_name>' to create a project first.")
        raise typer.Exit(1)

    with open(config_path) as f:
        config = json.load(f)

    # Override network
    if chain:
        network_key = "cchain" if chain in ("cchain", "mainnet") else chain
        net = get_network_info(network_key)
        config.update({
            "network": network_key,
            "rpc_url": net["rpc_url"],
            "chain_id": net["chain_id"],
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

    # Confirmation for mainnet
    if config.get("network") == "cchain" and not live and not dry_run:
        confirm = typer.confirm(
            "⚠️  You are deploying to MAINNET. This uses real AVAX. Continue?"
        )
        if not confirm:
            console.print("[yellow]Deployment cancelled.[/yellow]")
            raise typer.Exit(0)

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
                title="🔎 Dry Run Results",
                border_style="yellow",
            ))
        else:
            with console.status(
                f"[bold green]Deploying {contract_name} to {config['network']}..."
            ):
                result = deploy_contract(
                    contract_name, args, config, wallet,
                    gas_limit_override=gas_limit,
                )

            if result:
                console.print(Panel(
                    f"[green]✓ Contract deployed successfully![/green]\n\n"
                    f"[cyan]Contract:[/cyan]     {contract_name}\n"
                    f"[cyan]Address:[/cyan]      {result['address']}\n"
                    f"[cyan]Transaction:[/cyan]  {result['tx_hash']}\n"
                    f"[cyan]Gas used:[/cyan]     {result['gas_used']:,}\n"
                    f"[cyan]Network:[/cyan]      {config['network']} (Chain ID: {config['chain_id']})",
                    title="🚀 Deployment Successful",
                    border_style="green",
                ))

                # Auto-verify if requested
                if verify:
                    console.print("[blue]Submitting contract verification...[/blue]")
                    verify_contract(result["address"], contract_name, config)
            else:
                console.print("[red]Deployment failed. Check logs for details.[/red]")
                raise typer.Exit(1)

    except Exception as e:
        console.print(f"[red]Deployment error:[/red] {str(e)}")
        raise typer.Exit(1)


# ─── pyvax call ──────────────────────────────────────────────────────────────

@app.command()
def call(
    contract_address: str = typer.Argument(..., help="Address of the deployed contract"),
    method: str = typer.Argument(..., help="Method name to call"),
    args: Optional[str] = typer.Option(
        None, "--args", "-a", help="Function arguments (comma-separated)"
    ),
    view: bool = typer.Option(
        False, "--view", "-v", help="Read-only call — no transaction"
    ),
    config_file: str = typer.Option(
        "pyvax_config.json", "--config", help="Configuration file path"
    ),
) -> None:
    """📞 Interact with a deployed PyVax contract.

    Examples:
        pyvax call Token totalSupply --view
        pyvax call Token transfer --args "0xABC...,100"
    """
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
            is_view=view,
        )

        if result is None and not view:
            console.print("[red]Transaction failed![/red]")
            raise typer.Exit(1)

    except Exception as e:
        console.print(f"[red]Error:[/red] {str(e)}")
        raise typer.Exit(1)


# ─── pyvax test ──────────────────────────────────────────────────────────────

@app.command()
def test(
    contract: Optional[str] = typer.Argument(None, help="Contract name to test"),
    contracts_dir: str = typer.Option("contracts", "--contracts", "-c", help="Contracts directory"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Verbose test output"),
) -> None:
    """🧪 Run compilation tests on Python contracts.

    Compiles each contract and reports success/failure without deploying.
    """
    contracts_path = Path(contracts_dir)
    if not contracts_path.exists():
        console.print(f"[red]Error:[/red] Contracts directory '{contracts_dir}' not found.")
        raise typer.Exit(1)

    from .transpiler import transpile_python_contract

    py_files = list(contracts_path.glob("*.py"))
    if contract:
        py_files = [f for f in py_files if f.stem == contract]

    if not py_files:
        console.print("[yellow]No contracts found to test.[/yellow]")
        raise typer.Exit(0)

    results_table = Table(title="🧪 Test Results")
    results_table.add_column("Contract", style="cyan")
    results_table.add_column("Status", style="green")
    results_table.add_column("Size", style="yellow", justify="right")
    results_table.add_column("Functions", style="magenta", justify="right")
    results_table.add_column("Time", style="blue", justify="right")

    passed = 0
    failed = 0

    for py_file in py_files:
        start = time.time()
        try:
            with open(py_file, "r", encoding="utf-8") as f:
                source = f.read()

            result = transpile_python_contract(source, optimizer_level=1)
            elapsed = time.time() - start

            bytecode = result["bytecode"]
            size = (len(bytecode) - 2) // 2 if bytecode.startswith("0x") else len(bytecode) // 2
            num_funcs = len(result["metadata"].get("functions", []))

            results_table.add_row(
                py_file.stem,
                "[green]✓ PASS[/green]",
                f"{size / 1024:.1f}kb",
                str(num_funcs),
                f"{elapsed:.2f}s",
            )
            passed += 1

        except Exception as e:
            elapsed = time.time() - start
            results_table.add_row(
                py_file.stem,
                "[red]✗ FAIL[/red]",
                "-",
                "-",
                f"{elapsed:.2f}s",
            )
            if verbose:
                console.print(f"  [red]{e}[/red]")
            failed += 1

    console.print(results_table)

    if failed:
        console.print(f"\n[red]✗ {failed} test(s) failed, {passed} passed[/red]")
        raise typer.Exit(1)
    else:
        console.print(f"\n[green]✓ All {passed} test(s) passed![/green]")


# ─── pyvax wallet ────────────────────────────────────────────────────────────

wallet_app = typer.Typer(help="🔑 Agent Wallet management commands")
app.add_typer(wallet_app, name="wallet")


@wallet_app.command("new")
def wallet_new(
    wallet_id: str = typer.Argument(
        ..., help="Identifier for this agent wallet (e.g. 'agent-001')"
    ),
    password: Optional[str] = typer.Option(
        None, "--password", help="Wallet encryption password (will prompt if omitted)"
    ),
    keystore_file: Optional[str] = typer.Option(
        None, "--keystore", help="Custom keystore file path"
    ),
    mnemonic: bool = typer.Option(
        False, "--mnemonic", help="Generate BIP39 mnemonic phrase"
    ),
) -> None:
    """🔑 Generate a new AgentWallet and save encrypted keystore."""
    if keystore_file is None:
        keystore_file = f"pyvax_{wallet_id}.json"

    if password is None:
        password = typer.prompt(
            f"Enter password for wallet '{wallet_id}'", hide_input=True
        )
        confirm_password = typer.prompt("Confirm password", hide_input=True)
        if password != confirm_password:
            console.print("[red]Error:[/red] Passwords do not match.")
            raise typer.Exit(1)

    try:
        wallet_manager = WalletManager()

        if mnemonic:
            address, mnemonic_phrase = wallet_manager.create_wallet_with_mnemonic(
                password or "", keystore_file
            )
            console.print(Panel(
                f"[green]✓ AgentWallet '{wallet_id}' created![/green]\n\n"
                f"Address:  {address}\n"
                f"Keystore: {keystore_file}\n\n"
                f"[yellow]🔐 Mnemonic (SAVE THIS!):[/yellow]\n"
                f"[bold]{mnemonic_phrase}[/bold]\n\n"
                f"[red]⚠️  NEVER share your mnemonic or private key![/red]",
                title="🔑 AgentWallet Created (BIP39)",
                border_style="green",
            ))
        else:
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
                title="🔑 AgentWallet Created",
                border_style="green",
            ))

    except Exception as e:
        console.print(f"[red]Error creating wallet:[/red] {str(e)}")
        raise typer.Exit(1)


@wallet_app.command("show")
def wallet_show(
    keystore_file: str = typer.Option(
        "pyvax_key.json", "--keystore", help="Keystore file path"
    ),
) -> None:
    """📋 Show wallet address and status information."""
    try:
        wallet_manager = WalletManager()

        if os.getenv("PRIVATE_KEY") or os.getenv("PYVAX_PRIVATE_KEY"):
            address = wallet_manager.get_address_from_env()
            source = "Environment variable"
        else:
            if not Path(keystore_file).exists():
                console.print(
                    f"[red]Error:[/red] Keystore file '{keystore_file}' not found."
                )
                console.print("Run 'pyvax wallet new <id>' to create a wallet.")
                raise typer.Exit(1)

            password = typer.prompt(
                f"Enter password for {keystore_file}", hide_input=True
            )
            address = wallet_manager.load_wallet(keystore_file, password)
            source = f"Keystore file ({keystore_file})"

        console.print(Panel(
            f"[cyan]Agent Wallet Information[/cyan]\n\n"
            f"Address: {address}\n"
            f"Source:  {source}\n\n"
            f"[yellow]Note:[/yellow] Run 'pyvax deploy --dry-run' to test RPC connectivity.",
            title="🔑 Wallet Details",
            border_style="cyan",
        ))

    except Exception as e:
        console.print(f"[red]Error:[/red] {str(e)}")
        raise typer.Exit(1)


# ─── pyvax info ──────────────────────────────────────────────────────────────

@app.command()
def info(
    contract_name: str = typer.Argument(..., help="Name of the deployed contract"),
) -> None:
    """📄 Show ABI and deployment information for a contract."""
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


# ─── pyvax doctor ────────────────────────────────────────────────────────────

@app.command()
def doctor() -> None:
    """🔍 Diagnose your PyVax environment — checks runtimes, keys, and RPC health."""
    from .utils import check_environment

    console.print("\n[bold cyan]🔍 PyVax Environment Diagnostic[/bold cyan]\n")
    console.print(f"  [dim]PyVax CLI v1.0.0[/dim]\n")
    check_environment()


# ─── pyvax config ────────────────────────────────────────────────────────────

@app.command()
def config() -> None:
    """⚙️  Display active network and RPC configuration."""
    config_path = Path("pyvax_config.json")
    if not config_path.exists():
        console.print("[red]pyvax_config.json not found.[/red] Run 'pyvax new <name>' first.")
        raise typer.Exit(1)

    with open(config_path) as f:
        cfg = json.load(f)

    table = Table(title="⚙️  Active PyVax Configuration")
    table.add_column("Key", style="cyan")
    table.add_column("Value", style="green")

    for key, value in cfg.items():
        table.add_row(str(key), str(value))

    console.print(table)


# ─── pyvax version ───────────────────────────────────────────────────────────

@app.command()
def version() -> None:
    """📦 Show PyVax version information."""
    from . import __version__

    console.print(Panel(
        f"[bold cyan]PyVax CLI[/bold cyan] v{__version__}\n\n"
        f"Python to EVM transpiler for Avalanche smart contracts\n"
        f"[dim]https://pyvax.io[/dim]",
        border_style="cyan",
    ))


# ─── Entry point ─────────────────────────────────────────────────────────────

def main():
    """Main entry point for the pyvax CLI."""
    app()


if __name__ == "__main__":
    main()