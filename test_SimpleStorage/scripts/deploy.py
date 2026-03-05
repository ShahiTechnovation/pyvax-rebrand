#!/usr/bin/env python3
"""Deploy script for test_SimpleStorage contracts."""

import json
from pathlib import Path
from pyvax.deployer import deploy_contract
from pyvax.wallet import WalletManager


def main():
    """Deploy SimpleStorage contract to Avalanche."""
    with open("pyvax_config.json") as f:
        config = json.load(f)

    wallet = WalletManager()

    result = deploy_contract(
        contract_name="SimpleStorage",
        constructor_args=[],
        config=config,
        wallet=wallet,
    )

    if result:
        print(f"Contract deployed!")
        print(f"  Address: {result['address']}")
        print(f"  Tx:      {result['tx_hash']}")
        print(f"  Gas:     {result['gas_used']:,}")


if __name__ == "__main__":
    main()
