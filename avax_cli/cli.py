"""Main CLI interface for pyvax tool -- v1.0.0 Production."""

import json
import os
import sys
import time
from pathlib import Path
from typing import Optional, List

# Fix Windows console encoding for Rich output
if sys.platform == "win32":
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from .compiler import compile_contracts
from .deployer import deploy_contract, estimate_gas, verify_contract
from .wallet import WalletManager
from .interactor import interact_with_contract, show_contract_info
from .utils import get_network_info, validate_contract_name, load_config
from .templates import TEMPLATES

app = typer.Typer(
    name="pyvax",
    help=(
        "[bold cyan]PyVax v1.0.0[/bold cyan] -- write Avalanche smart contracts "
        "in pure Python and deploy to any EVM chain.\n\n"
        "Workflow: new -> compile -> deploy -> call"
    ),
    rich_markup_mode="rich",
    add_completion=True,
    no_args_is_help=True,
)

console = Console(highlight=False)


# --- pyvax new ---

@app.command()
def new(
    project_name: str = typer.Argument(
        ..., help="Name of the project or template"
    ),
    template: Optional[str] = typer.Option(
        None, "--template", "-t",
        help="Contract template (SimpleStorage, ERC20, Counter, AgentVault, Voting)"
    ),
    chain: str = typer.Option(
        "fuji", "--chain", "-c", help="Default chain: fuji | mainnet"
    ),
    force: bool = typer.Option(
        False, "--force", "-f", help="Overwrite existing project"
    ),
) -> None:
    """Scaffold a new PyVax project with sample contracts and configuration."""
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

    # Determine which template to include
    template_name = template or project_name
    if template_name in TEMPLATES:
        contracts_to_write = {template_name: TEMPLATES[template_name]}
    else:
        contracts_to_write = {"SimpleStorage": TEMPLATES["SimpleStorage"]}

    for name, source in contracts_to_write.items():
        with open(project_path / "contracts" / f"{name}.py", "w") as f:
            f.write(source)

    # Create deploy script
    first_contract = list(contracts_to_write.keys())[0]
    deploy_script = (
        "#!/usr/bin/env python3\n"
        f'"""Deploy script for {project_name} contracts."""\n\n'
        "import json\n"
        "from pathlib import Path\n"
        "from pyvax.deployer import deploy_contract\n"
        "from pyvax.wallet import WalletManager\n\n\n"
        "def main():\n"
        f'    """Deploy {first_contract} contract to Avalanche."""\n'
        '    with open("pyvax_config.json") as f:\n'
        "        config = json.load(f)\n\n"
        "    wallet = WalletManager()\n\n"
        "    result = deploy_contract(\n"
        f'        contract_name="{first_contract}",\n'
        "        constructor_args=[],\n"
        "        config=config,\n"
        "        wallet=wallet,\n"
        "    )\n\n"
        "    if result:\n"
        '        print(f"Contract deployed!")\n'
        "        print(f\"  Address: {result['address']}\")\n"
        "        print(f\"  Tx:      {result['tx_hash']}\")\n"
        "        print(f\"  Gas:     {result['gas_used']:,}\")\n\n\n"
        'if __name__ == "__main__":\n'
        "    main()\n"
    )

    with open(project_path / "scripts" / "deploy.py", "w") as f:
        f.write(deploy_script)

    # Create .env template
    env_template = (
        "# PyVax Environment Configuration\n"
        "# Fill in your private key to deploy contracts\n"
        "PRIVATE_KEY=\n"
        "PYVAX_PRIVATE_KEY=\n"
        "SNOWTRACE_API_KEY=\n"
    )
    with open(project_path / ".env.example", "w") as f:
        f.write(env_template)

    # Create .gitignore
    gitignore = (
        "# PyVax\n"
        "build/\n"
        "*.json\n"
        "!pyvax_config.json\n"
        "pyvax_key*.json\n"
        ".env\n"
        "__pycache__/\n"
        "deployments.json\n"
    )
    with open(project_path / ".gitignore", "w") as f:
        f.write(gitignore)

    console.print(Panel(
        f"[green]OK[/green] Project '[bold]{project_name}[/bold]' initialized!\n\n"
        f"[cyan]Template:[/cyan] {first_contract}\n"
        f"[cyan]Network:[/cyan]  {config['network']} (Chain ID: {config['chain_id']})\n\n"
        f"[yellow]Next steps:[/yellow]\n"
        f"  1. cd {project_name}\n"
        f"  2. pyvax compile                          [dim]# Transpile -> EVM bytecode[/dim]\n"
        f"  3. pyvax deploy {first_contract} --chain fuji   [dim]# Deploy to Fuji Testnet[/dim]\n"
        f"  4. pyvax call {first_contract} get              [dim]# Interact with contract[/dim]\n\n"
        f"[dim]Available templates: {', '.join(TEMPLATES.keys())}[/dim]",
        title="PyVax Project Created",
        border_style="green",
    ))


# --- pyvax compile ---

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
    """Transpile Python smart contracts to EVM bytecode.

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
            table = Table(title="Compilation Results")
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

                    meta = result.get("metadata", {})
                    before = meta.get("bytecode_size_before_opt", size_bytes)
                    if before > size_bytes:
                        pct = (before - size_bytes) / before * 100
                        size_str += f" [green](-{pct:.0f}%)[/green]"

                    table.add_row(
                        contract_name,
                        "[green]OK[/green]",
                        size_str,
                        f"L{optimizer}",
                        str(result.get("output_file", "N/A")),
                    )
                else:
                    table.add_row(
                        contract_name,
                        "[red]FAIL[/red]",
                        "-",
                        "-",
                        result.get("error", "Unknown error")[:60],
                    )

            console.print(table)

            if gas_report:
                _show_gas_report(results)

            success_count = sum(1 for r in results.values() if r["success"])
            console.print(
                f"\n[green]{success_count}/{len(results)} contracts compiled![/green] "
                f"Artifacts -> [cyan]{output_dir}/[/cyan]"
            )
        else:
            console.print("[yellow]No contracts found to compile.[/yellow]")

    except Exception as e:
        console.print(f"[red]Compilation failed:[/red] {str(e)}")
        raise typer.Exit(1)


# --- pyvax transform ---

@app.command()
def transform(
    source_file: str = typer.Argument(
        ..., help="Python contract file to transform"
    ),
    output: Optional[str] = typer.Option(
        None, "--output", "-o", help="Output .sol file path"
    ),
    name: Optional[str] = typer.Option(
        None, "--name", "-n", help="Override Solidity contract name"
    ),
    verify: bool = typer.Option(
        False, "--verify", help="Submit for Snowtrace verification after deploy"
    ),
    chain: str = typer.Option(
        "fuji", "--chain", "-c", help="Chain for verification: fuji | mainnet"
    ),
    address: Optional[str] = typer.Option(
        None, "--address", help="Deployed contract address (for --verify)"
    ),
) -> None:
    """Transform a Python contract to verified Solidity source.

    Generates a flattened .sol file ready for Snowtrace/Etherscan verification.

    Examples:
        pyvax transform contracts/Token.py                     # Generate .sol
        pyvax transform contracts/Token.py -o Token.sol        # Custom output path
        pyvax transform contracts/Token.py --verify --address 0x...  # Verify on Snowtrace
    """
    source_path = Path(source_file)
    if not source_path.exists():
        console.print(f"[red]Error:[/red] File '{source_file}' not found.")
        raise typer.Exit(1)

    try:
        from .transformer import python_to_verified_solidity

        python_source = source_path.read_text(encoding="utf-8")

        with console.status("[bold green]Transforming Python → Solidity..."):
            result = python_to_verified_solidity(
                python_source,
                contract_name=name,
            )

        sol_source = result["solidity"]
        contract_name_out = result["contract_name"]

        # Write .sol output
        if output:
            out_path = Path(output)
        else:
            out_path = source_path.with_suffix(".sol")

        out_path.write_text(sol_source, encoding="utf-8")

        # Show results
        console.print(Panel(
            f"[green]Solidity generated successfully![/green]\n\n"
            f"[cyan]Contract:[/cyan]  {contract_name_out}\n"
            f"[cyan]Compiler:[/cyan]  solc {result['compiler_version']}\n"
            f"[cyan]Source:[/cyan]    {len(sol_source)} chars\n"
            f"[cyan]ABI:[/cyan]      {len(result['abi'])} entries\n"
            f"[cyan]Output:[/cyan]   {out_path}\n\n"
            f"[dim]Optimization: {result['optimization_runs']} runs, "
            f"EVM: {result['evm_version']}[/dim]",
            title="Python → Solidity ✓",
            border_style="green",
        ))

        # Verification
        if verify:
            if not address:
                console.print("[yellow]Skipping verification: --address is required.[/yellow]")
                console.print("[dim]Deploy first, then re-run with --verify --address 0x...[/dim]")
            else:
                from .snowtrace import SnowtraceVerifier

                api_key = os.environ.get("SNOWTRACE_API_KEY", "")
                if not api_key:
                    console.print(
                        "[yellow]Warning:[/yellow] SNOWTRACE_API_KEY not set. "
                        "Verification may fail."
                    )

                verifier = SnowtraceVerifier(
                    api_key=api_key,
                    chain=chain,
                    compiler_version=result["compiler_version"],
                )
                vresult = verifier.submit_and_wait(
                    address=address,
                    source=sol_source,
                    contract_name=contract_name_out,
                )
                if vresult.success:
                    console.print(f"\n[bold green]✓ Verified on Snowtrace![/bold green]")
                    console.print(f"  [cyan]{vresult.explorer_url}[/cyan]")
                else:
                    console.print(f"\n[yellow]Verification: {vresult.message}[/yellow]")

    except Exception as e:
        console.print(f"[red]Transform failed:[/red] {str(e)}")
        raise typer.Exit(1)


def _show_gas_report(results: dict) -> None:
    """Display per-function gas estimates from compilation metadata."""
    gas_table = Table(title="Gas Report")
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


# --- pyvax deploy ---

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
    """Deploy a compiled PyVax contract to Avalanche.

    Examples:
        pyvax deploy Token --chain fuji
        pyvax deploy Token --chain mainnet --verify --live
        pyvax deploy Token --dry-run
    """
    config_path = Path(config_file)

    if not config_path.exists():
        console.print(f"[red]Error:[/red] Config file '{config_file}' not found.")
        console.print("Run 'pyvax new <project_name>' to create a project first.")
        raise typer.Exit(1)

    with open(config_path) as f:
        config = json.load(f)

    if chain:
        network_key = "cchain" if chain in ("cchain", "mainnet") else chain
        net = get_network_info(network_key)
        config.update({
            "network": network_key,
            "rpc_url": net["rpc_url"],
            "chain_id": net["chain_id"],
        })

    if rpc:
        config["rpc_url"] = rpc

    if verbose:
        console.print(f"[dim]RPC -> {config['rpc_url']}[/dim]")
        console.print(f"[dim]Chain ID -> {config['chain_id']}[/dim]")

    args = []
    if constructor_args:
        try:
            args = json.loads(constructor_args)
            if not isinstance(args, list):
                raise ValueError("Constructor arguments must be a JSON array")
        except json.JSONDecodeError as e:
            console.print(f"[red]Error:[/red] Invalid JSON in constructor arguments: {e}")
            raise typer.Exit(1)

    if config.get("network") == "cchain" and not live and not dry_run:
        confirm = typer.confirm(
            "WARNING: You are deploying to MAINNET. This uses real AVAX. Continue?"
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
                title="Dry Run Results",
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
                    f"[green]Contract deployed successfully![/green]\n\n"
                    f"[cyan]Contract:[/cyan]     {contract_name}\n"
                    f"[cyan]Address:[/cyan]      {result['address']}\n"
                    f"[cyan]Transaction:[/cyan]  {result['tx_hash']}\n"
                    f"[cyan]Gas used:[/cyan]     {result['gas_used']:,}\n"
                    f"[cyan]Network:[/cyan]      {config['network']} (Chain ID: {config['chain_id']})",
                    title="Deployment Successful",
                    border_style="green",
                ))

                if verify:
                    console.print("[blue]Submitting contract verification...[/blue]")
                    verify_contract(result["address"], contract_name, config)
            else:
                console.print("[red]Deployment failed. Check logs for details.[/red]")
                raise typer.Exit(1)

    except Exception as e:
        console.print(f"[red]Deployment error:[/red] {str(e)}")
        raise typer.Exit(1)


# --- pyvax call ---

@app.command()
def call(
    contract_address: str = typer.Argument(..., help="Address of the deployed contract"),
    method: str = typer.Argument(..., help="Method name to call"),
    args: Optional[str] = typer.Option(
        None, "--args", "-a", help="Function arguments (comma-separated)"
    ),
    view: bool = typer.Option(
        False, "--view", "-v", help="Read-only call -- no transaction"
    ),
    config_file: str = typer.Option(
        "pyvax_config.json", "--config", help="Configuration file path"
    ),
) -> None:
    """Interact with a deployed PyVax contract.

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


# --- pyvax test ---

@app.command()
def test(
    contract: Optional[str] = typer.Argument(None, help="Contract name to test"),
    contracts_dir: str = typer.Option("contracts", "--contracts", "-c", help="Contracts directory"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Verbose test output"),
) -> None:
    """Run compilation tests on Python contracts.

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

    results_table = Table(title="Test Results")
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
                "[green]PASS[/green]",
                f"{size / 1024:.1f}kb",
                str(num_funcs),
                f"{elapsed:.2f}s",
            )
            passed += 1

        except Exception as e:
            elapsed = time.time() - start
            results_table.add_row(
                py_file.stem,
                "[red]FAIL[/red]",
                "-",
                "-",
                f"{elapsed:.2f}s",
            )
            if verbose:
                console.print(f"  [red]{e}[/red]")
            failed += 1

    console.print(results_table)

    if failed:
        console.print(f"\n[red]{failed} test(s) failed, {passed} passed[/red]")
        raise typer.Exit(1)
    else:
        console.print(f"\n[green]All {passed} test(s) passed![/green]")


# --- pyvax wallet ---

wallet_app = typer.Typer(help="Agent Wallet management commands")
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
    """Generate a new AgentWallet and save encrypted keystore."""
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
                f"[green]AgentWallet '{wallet_id}' created![/green]\n\n"
                f"Address:  {address}\n"
                f"Keystore: {keystore_file}\n\n"
                f"[yellow]Mnemonic (SAVE THIS!):[/yellow]\n"
                f"[bold]{mnemonic_phrase}[/bold]\n\n"
                f"[red]NEVER share your mnemonic or private key![/red]",
                title="AgentWallet Created (BIP39)",
                border_style="green",
            ))
        else:
            address = wallet_manager.create_wallet(password or "", keystore_file)
            console.print(Panel(
                f"[green]AgentWallet '{wallet_id}' created![/green]\n\n"
                f"Address:  {address}\n"
                f"Keystore: {keystore_file}\n\n"
                f"[yellow]Security Notice:[/yellow]\n"
                "* Never share your private key or password\n"
                "* Back up your keystore file securely\n"
                "* Fund this address with AVAX before deploying contracts\n"
                f"* Set PYVAX_AGENT_KEY_{wallet_id.upper().replace('-', '_')} in your .env",
                title="AgentWallet Created",
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
    """Show wallet address and status information."""
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
            title="Wallet Details",
            border_style="cyan",
        ))

    except Exception as e:
        console.print(f"[red]Error:[/red] {str(e)}")
        raise typer.Exit(1)


# --- pyvax info ---

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


# --- pyvax doctor ---

@app.command()
def doctor() -> None:
    """Diagnose your PyVax environment -- checks runtimes, keys, and RPC health."""
    from .utils import check_environment

    console.print("\n[bold cyan]PyVax Environment Diagnostic[/bold cyan]\n")
    console.print("  [dim]PyVax CLI v1.0.0[/dim]\n")
    check_environment()


# --- pyvax config ---

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


# --- pyvax version ---

@app.command()
def version() -> None:
    """Show PyVax version information."""
    from . import __version__

    console.print(Panel(
        f"[bold cyan]PyVax CLI[/bold cyan] v{__version__}\n\n"
        "Python to EVM transpiler for Avalanche smart contracts\n"
        "[dim]https://pyvax.io[/dim]",
        border_style="cyan",
    ))


# --- Entry point ---

def main():
    """Main entry point for the pyvax CLI."""
    app()


if __name__ == "__main__":
    main()