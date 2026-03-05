"""Smart contract deployment to Avalanche C-Chain via PyVax v1.0.0.

Supports:
  - EIP-1559 gas pricing with legacy fallback
  - Snowtrace/Routescan contract verification
  - deployments.json persistent registry
  - Connection pooling (reusable Web3 instances)
"""

import json
import time
import requests
from pathlib import Path
from typing import Dict, List, Any, Optional

from web3 import Web3
from rich.console import Console

from .compiler import get_contract_artifacts
from .wallet import WalletManager

console = Console()

# Connection pool — reuse Web3 instances across deploy/interact
_web3_connections: Dict[str, Web3] = {}


def get_web3_connection(config: Dict[str, Any]) -> Web3:
    """
    Create or reuse a Web3 connection to the configured RPC endpoint.

    Args:
        config: Dict with keys: rpc_url, chain_id, network

    Returns:
        Connected Web3 instance (cached per RPC URL)
    """
    rpc_url = config["rpc_url"]

    # Reuse existing connection if healthy
    if rpc_url in _web3_connections:
        w3 = _web3_connections[rpc_url]
        try:
            if w3.is_connected():
                return w3
        except Exception:
            pass  # Stale connection, recreate

    w3 = Web3(Web3.HTTPProvider(
        rpc_url,
        request_kwargs={"timeout": 30},
    ))

    if not w3.is_connected():
        raise ConnectionError(
            f"[pyvax] Failed to connect to RPC: {rpc_url}\n"
            f"Run 'pyvax doctor' to diagnose connectivity."
        )

    try:
        chain_id = w3.eth.chain_id
        expected = config["chain_id"]
        if chain_id != expected:
            console.print(
                f"[yellow]Warning:[/yellow] Connected chain ID ({chain_id}) "
                f"does not match config ({expected})"
            )
    except Exception as e:
        console.print(f"[yellow]Warning:[/yellow] Could not verify chain ID: {e}")

    _web3_connections[rpc_url] = w3
    return w3


def _build_eip1559_gas_params(w3: Web3) -> Dict[str, Any]:
    """Build EIP-1559 gas parameters with legacy fallback."""
    try:
        latest_block = w3.eth.get_block("latest")
        base_fee = latest_block.get("baseFeePerGas")
        if base_fee is not None:
            priority_fee = w3.eth.max_priority_fee
            max_fee = int(base_fee * 2) + priority_fee
            console.print(
                f"[blue]Gas: EIP-1559 (base={w3.from_wei(base_fee, 'gwei'):.2f} "
                f"priority={w3.from_wei(priority_fee, 'gwei'):.2f} "
                f"max={w3.from_wei(max_fee, 'gwei'):.2f} gwei)[/blue]"
            )
            return {
                "params": {
                    "maxFeePerGas": max_fee,
                    "maxPriorityFeePerGas": priority_fee,
                },
                "effective_price": max_fee,
            }
        raise ValueError("No baseFeePerGas")
    except Exception:
        gas_price = int(w3.eth.gas_price * 1.1)
        console.print(
            f"[blue]Gas price (legacy): {w3.from_wei(gas_price, 'gwei'):.2f} gwei[/blue]"
        )
        return {
            "params": {"gasPrice": gas_price},
            "effective_price": gas_price,
        }


def estimate_gas(
    contract_name: str,
    constructor_args: List[Any],
    config: Dict[str, Any],
    wallet: WalletManager,
    keystore_file: str = None,
    password: str = None,
) -> int:
    """
    Estimate gas for deploying a PyVax contract.

    Returns:
        Estimated gas amount (int)
    """
    artifacts = get_contract_artifacts(contract_name)
    w3 = get_web3_connection(config)
    account = wallet.get_account(keystore_file, password)

    contract = w3.eth.contract(
        abi=artifacts["abi"],
        bytecode=artifacts["bytecode"],
    )

    gas_info = _build_eip1559_gas_params(w3)

    constructor_tx = contract.constructor(*constructor_args).build_transaction(
        {
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
            "gas": 0,
            "chainId": config["chain_id"],
            **gas_info["params"],
        }
    )

    return w3.eth.estimate_gas(constructor_tx)


def deploy_contract(
    contract_name: str,
    constructor_args: List[Any],
    config: Dict[str, Any],
    wallet: WalletManager,
    keystore_file: str = None,
    password: str = None,
    gas_limit_override: Optional[int] = None,
) -> Optional[Dict[str, Any]]:
    """
    Deploy a compiled PyVax contract to Avalanche.

    Args:
        contract_name:      Name of the contract (must match build/ artifact)
        constructor_args:   List of constructor arguments
        config:             Network configuration dict
        wallet:             WalletManager instance
        keystore_file:      Optional path to keystore file
        password:           Optional keystore password
        gas_limit_override: Manual gas limit (skips estimation)

    Returns:
        Deployment result dict, or None if deployment failed
    """
    try:
        artifacts = get_contract_artifacts(contract_name)
        console.print(f"[blue]Artifacts loaded for {contract_name}[/blue]")

        w3 = get_web3_connection(config)
        console.print(f"[blue]Connected to {config['network']} ({config['rpc_url']})[/blue]")

        account = wallet.get_account(keystore_file, password)
        console.print(f"[blue]Deployer wallet: {account.address}[/blue]")

        balance = w3.eth.get_balance(account.address)
        balance_avax = w3.from_wei(balance, "ether")
        console.print(f"[blue]Wallet balance: {balance_avax:.6f} AVAX[/blue]")

        if balance == 0:
            console.print(
                "[yellow]Warning:[/yellow] Wallet has zero AVAX. "
                "Fund it at https://faucet.avax.network and retry."
            )

        contract = w3.eth.contract(
            abi=artifacts["abi"],
            bytecode=artifacts["bytecode"],
        )

        # Gas pricing: EIP-1559 with legacy fallback
        gas_info = _build_eip1559_gas_params(w3)

        nonce = w3.eth.get_transaction_count(account.address)
        constructor_tx = contract.constructor(*constructor_args).build_transaction(
            {
                "from": account.address,
                "nonce": nonce,
                "gas": 0,
                "chainId": config["chain_id"],
                **gas_info["params"],
            }
        )

        if gas_limit_override:
            gas_limit = gas_limit_override
        else:
            gas_estimate = w3.eth.estimate_gas(constructor_tx)
            gas_limit = int(gas_estimate * 1.2)  # 20% safety buffer

        constructor_tx["gas"] = gas_limit
        effective_price = gas_info["effective_price"]

        console.print(f"[blue]Gas limit:  {gas_limit:,}[/blue]")

        deployment_cost = gas_limit * effective_price
        deployment_cost_avax = w3.from_wei(deployment_cost, "ether")
        console.print(f"[blue]Est. cost:  {deployment_cost_avax:.6f} AVAX[/blue]")

        if balance < deployment_cost:
            raise ValueError(
                f"Insufficient AVAX. Need {deployment_cost_avax:.6f}, "
                f"have {balance_avax:.6f}."
            )

        console.print("[blue]Signing and broadcasting transaction...[/blue]")
        signed_tx = account.sign_transaction(constructor_tx)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

        console.print(f"[blue]Tx hash: {tx_hash.hex()}[/blue]")
        console.print("[blue]Waiting for Avalanche confirmation...[/blue]")

        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)

        if receipt.status == 1:
            console.print("[green]Transaction confirmed![/green]")

            contract_address = receipt.contractAddress
            gas_used = receipt.gasUsed
            actual_cost_avax = w3.from_wei(gas_used * effective_price, "ether")

            deployment_info = {
                "contract_name": contract_name,
                "address": contract_address,
                "tx_hash": tx_hash.hex(),
                "gas_used": gas_used,
                "gas_price": effective_price,
                "deployment_cost": float(actual_cost_avax),
                "network": config["network"],
                "chain_id": config["chain_id"],
                "deployer": account.address,
                "constructor_args": constructor_args,
                "block_number": receipt.blockNumber,
                "timestamp": int(time.time()),
            }

            # Persist to deployments.json
            _save_deployment(deployment_info, config)

            return deployment_info

        else:
            console.print("[red]Transaction reverted on chain![/red]")
            return None

    except Exception as e:
        console.print(f"[red]Deployment failed:[/red] {str(e)}")
        return None


def _save_deployment(deployment_info: Dict[str, Any], config: Dict[str, Any]) -> None:
    """Persist deployment info to deployments.json."""
    deployments_file = Path("deployments.json")
    deployments: Dict = {}
    if deployments_file.exists():
        with open(deployments_file) as f:
            deployments = json.load(f)

    network = config["network"]
    if network not in deployments:
        deployments[network] = {}

    deployments[network][deployment_info["contract_name"]] = deployment_info

    with open(deployments_file, "w") as f:
        json.dump(deployments, f, indent=2)

    console.print(f"[green]Deployment info saved → {deployments_file}[/green]")


def verify_contract(
    contract_address: str,
    contract_name: str,
    config: Dict[str, Any],
) -> bool:
    """
    Verify a deployed contract on Snowtrace / Routescan.

    Args:
        contract_address: On-chain address of the deployed contract
        contract_name:    Contract name (for label)
        config:           Network config (needs explorer_api_key)

    Returns:
        True if verification was submitted successfully
    """
    api_key = config.get("explorer_api_key")
    if not api_key:
        console.print(
            "[yellow]No explorer_api_key in pyvax_config.json. "
            "Skipping verification.[/yellow]"
        )
        console.print(
            "[dim]Set explorer_api_key in pyvax_config.json to enable "
            "automatic Snowtrace verification.[/dim]"
        )
        return False

    network = config.get("network", "fuji")

    if network == "cchain":
        api_url = "https://api.snowtrace.io/api"
        explorer = "https://snowtrace.io"
    else:
        api_url = "https://api-testnet.snowtrace.io/api"
        explorer = "https://testnet.snowtrace.io"

    console.print(f"[blue]Submitting verification for {contract_name}...[/blue]")

    try:
        # Load bytecode from build artifacts
        artifacts = get_contract_artifacts(contract_name)

        # Submit verification request
        payload = {
            "apikey": api_key,
            "module": "contract",
            "action": "verifysourcecode",
            "contractaddress": contract_address,
            "sourceCode": json.dumps(artifacts.get("metadata", {})),
            "contractname": contract_name,
            "compilerversion": "pyvax-v1.0.0",
            "optimizationUsed": "1",
        }

        response = requests.post(api_url, data=payload, timeout=30)

        if response.status_code == 200:
            result = response.json()
            if result.get("status") == "1":
                console.print(
                    f"[green]✓ Verification submitted![/green] "
                    f"GUID: {result.get('result', 'N/A')}"
                )
                console.print(
                    f"[blue]View: {explorer}/address/{contract_address}#code[/blue]"
                )
                return True
            else:
                console.print(
                    f"[yellow]Verification response: {result.get('result', 'Unknown')}[/yellow]"
                )
        else:
            console.print(
                f"[yellow]Verification API returned {response.status_code}[/yellow]"
            )

    except Exception as e:
        console.print(f"[yellow]Verification failed: {e}[/yellow]")

    console.print(f"[blue]Explorer: {explorer}/address/{contract_address}[/blue]")
    return False