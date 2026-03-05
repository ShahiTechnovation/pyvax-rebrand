# PyVax CLI v1.0.0

**Python to EVM transpiler for Avalanche smart contracts.**

Write smart contracts in pure Python. Deploy to Avalanche C-Chain. No Solidity required.

```
pip install -e .
pyvax new MyToken --template ERC20
cd MyToken
pyvax compile --optimizer=3
pyvax deploy ERC20 --chain fuji
pyvax call ERC20 totalSupply --view
```

## Features

- **Python-native contracts** -- write smart contracts using Python syntax
- **Direct EVM bytecode generation** -- no Solidity intermediate step
- **Peephole optimizer** (levels 0-3) with constant folding, identity removal
- **Binary search dispatch** for O(log n) function routing (5+ functions)
- **SLOAD caching** -- automatic memory caching for repeated storage reads
- **Overflow/underflow checks** -- Solidity 0.8-style SafeMath by default
- **EIP-1559 gas pricing** with legacy fallback
- **PBKDF2-encrypted keystores** with BIP39 mnemonic support
- **Snowtrace contract verification**
- **Rich CLI** with colorful output, progress bars, and diagnostics

## Quick Start

### Install

```bash
git clone https://github.com/pyvax/pyvax-cli.git
cd pyvax-cli
pip install -e .
```

### Create a Project

```bash
pyvax new MyProject --template ERC20 --chain fuji
cd MyProject
```

Available templates: `SimpleStorage`, `Counter`, `ERC20`, `AgentVault`, `Voting`

### Write a Contract

```python
# contracts/Token.py
from pyvax import Contract, action

class Token(Contract):
    total_supply: int = 0
    balances: dict = {}

    @action
    def mint(self, to: str, amount: int):
        self.require(amount > 0, "Amount must be positive")
        self.balances[to] = self.balances.get(to, 0) + amount
        self.total_supply = self.total_supply + amount
        self.emit("Transfer", 0, to, amount)

    @action
    def balance_of(self, owner: str) -> int:
        return self.balances.get(owner, 0)
```

### Compile

```bash
pyvax compile --optimizer=3
# Output: Token compiled: 2.1kb (-18% optimized)
```

### Deploy

```bash
# Set your private key
export PRIVATE_KEY=0x...

# Deploy to Fuji testnet
pyvax deploy Token --chain fuji

# Deploy to mainnet (with confirmation)
pyvax deploy Token --chain mainnet --verify
```

### Interact

```bash
pyvax call Token balance_of --args "0xYourAddress" --view
pyvax call Token mint --args "0xRecipient,1000"
```

## CLI Reference

| Command | Description |
|---------|-------------|
| `pyvax new <name>` | Scaffold a new project |
| `pyvax compile` | Transpile Python to EVM bytecode |
| `pyvax deploy <contract>` | Deploy to Avalanche |
| `pyvax call <contract> <method>` | Interact with deployed contract |
| `pyvax test` | Run compilation tests |
| `pyvax doctor` | Diagnose environment |
| `pyvax info <contract>` | Show deployment info and ABI |
| `pyvax config` | Display active configuration |
| `pyvax wallet new <id>` | Create encrypted wallet |
| `pyvax wallet show` | Show wallet address |
| `pyvax version` | Show version |

### Compile Flags

```
--optimizer=N     Optimization level: 0=none, 1=peephole, 2=fold, 3=aggressive
--overflow-safe   Enable Solidity 0.8-style overflow checks (default: on)
--gas-report      Show per-function gas estimates
```

### Deploy Flags

```
--chain=NETWORK   Network: fuji | mainnet
--verify          Verify on Snowtrace after deploy
--live            Skip confirmation prompt
--dry-run         Estimate gas without deploying
--gas-limit=N     Override gas limit
```

## Contract API

### Decorators

| Decorator | Description |
|-----------|-------------|
| `@action` | Public function callable by any address |
| `@agent_action` | Callable only by verified AgentWallets |
| `@human_action` | Callable only by human EOA wallets |
| `@view` | Read-only function (no state changes) |
| `@payable` | Can receive AVAX with the call |

### Built-in Methods

| Method | EVM Equivalent |
|--------|---------------|
| `self.msg_sender()` | `msg.sender` |
| `self.msg_value()` | `msg.value` |
| `self.block_number()` | `block.number` |
| `self.block_timestamp()` | `block.timestamp` |
| `self.require(cond, msg)` | `require(cond, msg)` |
| `self.emit("Event", ...)` | `emit Event(...)` |

### Type Aliases

```python
from pyvax import Uint256, Address, Bytes32

class MyContract(Contract):
    balance: Uint256 = 0
    owner: Address = ""
```

## Optimizer Levels

| Level | Passes | Description |
|-------|--------|-------------|
| 0 | None | Raw bytecode, no optimization |
| 1 | Peephole | PUSH/POP removal, ISZERO/ISZERO elimination |
| 2 | + Folding | Constant folding (PUSH a + PUSH b + ADD -> PUSH result) |
| 3 | Aggressive | Multi-pass with all optimizations, ~15-20% size reduction |

## Architecture

```
avax_cli/
  __init__.py        Package exports, version
  __main__.py        python -m avax_cli entry point
  cli.py             Typer CLI (new/compile/deploy/call/test/doctor)
  compiler.py        Orchestrates transpiler, outputs build/*.json
  transpiler.py      Python AST -> EVM bytecode (1700 LOC)
  deployer.py        Web3 Avalanche deploy, EIP-1559, Snowtrace verify
  interactor.py      Post-deploy read/write calls
  wallet.py          PBKDF2 encrypted keystore, BIP39 mnemonic
  py_contracts.py    Contract base class, decorators, templates
  utils.py           Config, network info, diagnostics
  api_wrapper.py     Stdin/stdout JSON API for web integration
  shortcuts.py       Windows .bat / Unix .sh generators
```

## Docker

```bash
docker build -t pyvax-cli -f docker/Dockerfile .
docker run -v $(pwd):/workspace pyvax-cli compile --optimizer=3
```

## Development

```bash
pip install -e ".[dev]"
python -m pytest tests/test_pipeline.py -v
```

## License

MIT
