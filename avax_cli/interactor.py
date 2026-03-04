"""Smart contract interaction module for PyVax-deployed contracts."""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional

from web3 import Web3
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from .compiler import get_contract_artifacts
from .deployer import get_web3_connection
from .wallet import WalletManager

console = Console()


class ContractInteractor:
    """Interact with deployed PyVax smart contracts."""

    def __init__(self, config: Dict[str, Any], wallet: WalletManager):
        self.config = config
        self.wallet = wallet
        self.w3 = get_web3_connection(config)
        self.account = wallet.get_account()

    def get_deployed_contract(self, contract_name: str) -> Optional[Dict[str, Any]]:
        """Fetch deployment info from deployments.json."""
        deployments_file = Path("deployments.json")
        if not deployments_file.exists():
            console.print(
                "[red]No deployments.json found.[/red] Deploy a contract with 'pyvax deploy' first."
            )
            return None

        with open(deployments_file) as f:
            deployments = json.load(f)

        network = self.config["network"]
        if network not in deployments or contract_name not in deployments[network]:
            console.print(
                f"[red]Contract '{contract_name}' not found on {network}.[/red] "
                f"Run 'pyvax deploy {contract_name}' first."
            )
            return None

        return deployments[network][contract_name]

    def get_contract_instance(self, contract_name: str):
        """Return a Web3 contract instance for the given contract name."""
        deployment_info = self.get_deployed_contract(contract_name)
        if not deployment_info:
            return None

        try:
            artifacts = get_contract_artifacts(contract_name)
        except FileNotFoundError:
            console.print(
                f"[red]Artifacts not found for '{contract_name}'.[/red] Run 'pyvax compile' first."
            )
            return None

        contract = self.w3.eth.contract(
            address=deployment_info["address"],
            abi=artifacts["abi"],
        )
        return contract, deployment_info

    def call_view_function(self, contract_name: str, function_name: str, *args) -> Any:
        """Call a read-only method on a deployed PyVax contract."""
        result = self.get_contract_instance(contract_name)
        if not result:
            return None

        contract, deployment_info = result

        try:
            func = getattr(contract.functions, function_name)
            value = func(*args).call()

            console.print(Panel(
                f"[cyan]Method:[/cyan]   {function_name}({', '.join(map(str, args))})\n"
                f"[green]Result:[/green]   {value}\n"
                f"[blue]Contract:[/blue] {deployment_info['address']}",
                title=f"{contract_name} · View Call",
                border_style="cyan",
            ))

            return value

        except Exception as e:
            console.print(f"[red]Error calling {function_name}:[/red] {e}")
            return None

    def send_transaction(
        self, contract_name: str, function_name: str, *args, **kwargs
    ) -> Optional[str]:
        """Send a state-changing transaction to a deployed PyVax contract."""
        result = self.get_contract_instance(contract_name)
        if not result:
            return None

        contract, deployment_info = result

        try:
            func = getattr(contract.functions, function_name)
            nonce = self.w3.eth.get_transaction_count(self.account.address)

            try:
                gas_estimate = func(*args).estimate_gas({"from": self.account.address})
                gas_limit = int(gas_estimate * 1.2)
            except Exception as e:
                console.print(f"[yellow]Gas estimation failed: {e}. Using default.[/yellow]")
                gas_limit = 200_000

            # EIP-1559 gas pricing with legacy fallback
            try:
                latest_block = self.w3.eth.get_block("latest")
                base_fee = latest_block.get("baseFeePerGas")
                if base_fee is not None:
                    priority_fee = self.w3.eth.max_priority_fee
                    max_fee = int(base_fee * 2) + priority_fee
                    gas_params = {
                        "maxFeePerGas": max_fee,
                        "maxPriorityFeePerGas": priority_fee,
                    }
                else:
                    raise ValueError("No baseFeePerGas")
            except Exception:
                gas_params = {"gasPrice": int(self.w3.eth.gas_price * 1.1)}

            transaction = func(*args).build_transaction(
                {
                    "from": self.account.address,
                    "gas": gas_limit,
                    "nonce": nonce,
                    "chainId": self.config["chain_id"],
                    **gas_params,
                }
            )

            console.print(f"[blue]Sending → {function_name}...[/blue]")
            signed_txn = self.account.sign_transaction(transaction)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.raw_transaction)

            console.print(f"[yellow]Tx: {tx_hash.hex()}[/yellow]")
            console.print("[blue]Waiting for Avalanche confirmation...[/blue]")

            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)

            if receipt.status == 1:
                console.print(Panel(
                    f"[green]✓ Transaction success![/green]\n\n"
                    f"[cyan]Method:[/cyan]  {function_name}({', '.join(map(str, args))})\n"
                    f"[blue]Tx hash:[/blue] {tx_hash.hex()}\n"
                    f"[blue]Gas:[/blue]     {receipt.gasUsed:,}\n"
                    f"[blue]Block:[/blue]   {receipt.blockNumber}\n"
                    f"[blue]Contract:[/blue]{deployment_info['address']}",
                    title=f"{contract_name} · Tx Success",
                    border_style="green",
                ))
                return tx_hash.hex()
            else:
                console.print("[red]Transaction reverted![/red]")
                return None

        except Exception as e:
            console.print(f"[red]Error sending tx to {function_name}:[/red] {e}")
            return None

    def get_contract_info(self, contract_name: str):
        """Display deployment info and ABI functions for a contract."""
        result = self.get_contract_instance(contract_name)
        if not result:
            return

        contract, deployment_info = result

        info_table = Table(title=f"{contract_name} · Deployment Info")
        info_table.add_column("Field", style="cyan")
        info_table.add_column("Value", style="green")

        info_table.add_row("Address",  deployment_info["address"])
        info_table.add_row("Network",  deployment_info["network"])
        info_table.add_row("Deployer", deployment_info["deployer"])
        info_table.add_row("Block",    str(deployment_info["block_number"]))
        info_table.add_row("Gas Used", f"{deployment_info['gas_used']:,}")

        console.print(info_table)

        funcs_table = Table(title="Available Methods")
        funcs_table.add_column("Method", style="yellow")
        funcs_table.add_column("Mutability", style="blue")
        funcs_table.add_column("Inputs", style="magenta")

        for func in contract.abi:
            if func["type"] == "function":
                inputs = ", ".join(
                    f"{inp['type']} {inp['name']}" for inp in func["inputs"]
                )
                funcs_table.add_row(
                    func["name"],
                    func.get("stateMutability", "nonpayable"),
                    inputs,
                )

        console.print(funcs_table)


# ─── Top-level helpers used by cli.py ────────────────────────────────────────

def interact_with_contract(
    contract_name: str,
    function_name: str,
    args: List[Any],
    config: Dict[str, Any],
    wallet: WalletManager,
    is_view: bool = False,
) -> Any:
    """Entry point for 'pyvax call' command."""
    interactor = ContractInteractor(config, wallet)
    if is_view:
        return interactor.call_view_function(contract_name, function_name, *args)
    else:
        return interactor.send_transaction(contract_name, function_name, *args)


def show_contract_info(
    contract_name: str,
    config: Dict[str, Any],
    wallet: WalletManager,
) -> None:
    """Entry point for 'pyvax info' command."""
    ContractInteractor(config, wallet).get_contract_info(contract_name)
