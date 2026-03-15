# Project Classified

**Web3-native AI agent runtime powered by PyVax.**

An autonomous agent system that can compile, deploy, and interact with EVM smart contracts using the PyVax Python→EVM toolchain — plus first-class support for [Synthesis.md](https://synthesis.md) hackathons.

---

## Quickstart

```bash
# 1. Install (from monorepo root)
pip install -e .

# 2. Scaffold workspace
classified-agent init

# 3. Set your API key
export ANTHROPIC_API_KEY='sk-ant-...'

# 4. Run the agent
classified-agent run

# Or join a Synthesis hackathon
classified-agent join-synthesis --enable
```

## Architecture

```
classified_agent/
├── config/          # Pydantic v2 models + TOML loader
│   ├── models.py    # ClassifiedConfig schema
│   └── loader.py    # load_config(), create_default_config()
├── core/            # Agent runtime
│   ├── llm.py       # BaseLLMClient + AnthropicClient
│   ├── context.py   # AgentContext (central state object)
│   ├── memory.py    # File-backed MemoryStore
│   └── loop.py      # AgentLoop (plan → tool → observe cycle)
├── tools/           # Agent capabilities
│   ├── base.py      # Tool ABC, ToolRegistry
│   ├── fs_tools.py  # Sandboxed fs_read, fs_write, fs_list
│   ├── http_tools.py # HTTP GET with domain allowlist
│   ├── git_tools.py  # git init, status, commit
│   └── web3_tools.py # pyvax_compile/deploy/call + wallet ops
├── wallet/          # On-chain backends
│   ├── base.py      # WalletBackend ABC + WalletPolicy
│   ├── pyvax_wallet.py  # PyVax local keystore
│   └── managed_wallets.py  # Mock + Vincent/Sequence stubs
├── adapters/        # External integrations
│   └── synthesis.py # Synthesis.md hackathon adapter
├── cli/             # Typer CLI
│   └── main.py      # init, run, join-synthesis commands
├── logging/         # Structured logging
│   └── logger.py    # Rich console + JSONL file output
├── tests/           # Test suite
└── examples/        # Example classified.toml files
```

## Configuration

All settings live in `classified.toml`:

```toml
[agent]
name = "my-agent"
max_steps = 50
workspace_dir = "./workspace"

[llm]
provider = "anthropic"      # "anthropic" | "openai"
model = "claude-sonnet-4-20250514"
api_key_env = "ANTHROPIC_API_KEY"

[wallet]
backend = "pyvax_local"     # "pyvax_local" | "mock"
default_chain = "avalanche_fuji"

[wallet.policy]
max_native_per_tx = "0.1"   # AVAX per transaction
max_native_per_day = "1.0"  # daily spend cap

[synthesis]
enabled = false
track = "open"
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `classified-agent init` | Scaffold config + workspace |
| `classified-agent run` | Start the agent loop |
| `classified-agent run --dry-run` | Simulate (no on-chain txs) |
| `classified-agent run --verbose` | Debug-level logging |
| `classified-agent join-synthesis --enable` | Join Synthesis hackathon |

## Tools (14 built-in + 3 Synthesis)

| Category | Tools |
|----------|-------|
| **Filesystem** | `fs_read`, `fs_write`, `fs_list` |
| **HTTP** | `http_get` (domain allowlist) |
| **Git** | `git_init`, `git_status`, `git_commit` |
| **PyVax** | `pyvax_compile`, `pyvax_deploy`, `pyvax_call` |
| **Wallet** | `wallet_get_balance`, `wallet_send_native`, `wallet_erc20_transfer`, `wallet_erc20_approve` |
| **Synthesis** | `synthesis_load_skill`, `synthesis_register`, `synthesis_report_status` |

## Safety

- **Wallet Policy**: Per-transaction and daily spend caps, contract/method allowlists
- **Sandboxed FS**: All file operations confined to the workspace directory
- **HTTP Allowlist**: Only whitelisted domains (synthesis.md, pyvax.xyz, GitHub, Avalanche)
- **Dry-Run Mode**: `--dry-run` flag simulates all state-changing operations
- **Sequential Execution**: Tools run one-at-a-time for correct EVM nonce ordering

## Testing

```bash
pip install -e ".[dev]"
pytest classified_agent/tests/ -v
```

## License

Part of the [PyVax](https://pyvax.xyz) monorepo.
