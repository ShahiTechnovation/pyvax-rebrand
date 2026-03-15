# 🧪 Classified Agent — Synthesis Hackathon CLI

[![PyPI version](https://badge.fury.io/py/classified-agent.svg)](https://pypi.org/project/classified-agent/)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Build + submit AI agents for [Synthesis Hackathon](https://synthesis.md) ($75K prizes) in 60 seconds.**
>
> 100% offline core. PyVax-powered Web3 scaffolding. Resilient state machine with automatic resume.

---

## ⚡ Quickstart (60 seconds to submission)

```bash
pip install classified-agent

classified-agent init
# → Edit classified.toml (set API keys)

export ANTHROPIC_API_KEY='sk-ant-...'

classified-agent run
# 🚀 Agent running — Synthesis Hackathon LIVE!
```

## 🏗️ Architecture

```
classified_agent/
├── cli/             # Typer CLI: init, run, join-synthesis
├── config/          # Pydantic v2 models + TOML loader
├── core/            # Agent runtime (LLM, loop, context, memory)
├── tools/           # 14 built-in tools (fs, http, git, web3)
├── wallet/          # On-chain backends (PyVax local, mock, managed)
├── adapters/        # Synthesis.md hackathon integration
├── logging/         # Rich console + JSONL structured logs
└── examples/        # Example classified.toml configurations
```

## 🎯 CLI Commands

| Command | Description |
|---------|-------------|
| `classified-agent init` | Scaffold `classified.toml` + workspace |
| `classified-agent run` | Start the agent loop |
| `classified-agent run --dry-run` | Simulate (no on-chain txs) |
| `classified-agent run --verbose` | Debug-level logging |
| `classified-agent join-synthesis --enable` | Join Synthesis hackathon mode |

## 🔧 Configuration (`classified.toml`)

```toml
[agent]
name = "my-agent"
max_steps = 50
workspace_dir = "./workspace"

[llm]
provider = "anthropic"        # "anthropic" | "openai"
model = "claude-sonnet-4-20250514"
api_key_env = "ANTHROPIC_API_KEY"

[wallet]
backend = "pyvax_local"       # "pyvax_local" | "mock"
default_chain = "avalanche_fuji"

[wallet.policy]
max_native_per_tx = "0.1"     # AVAX per transaction
max_native_per_day = "1.0"    # daily spend cap

[synthesis]
enabled = false
track = "open"                # open | uniswap | base | lido
```

## 🛠️ Built-in Tools (14 + 3 Synthesis)

| Category | Tools |
|----------|-------|
| **Filesystem** | `fs_read`, `fs_write`, `fs_list` |
| **HTTP** | `http_get` (domain allowlist) |
| **Git** | `git_init`, `git_status`, `git_commit` |
| **PyVax** | `pyvax_compile`, `pyvax_deploy`, `pyvax_call` |
| **Wallet** | `wallet_get_balance`, `wallet_send_native`, `wallet_erc20_transfer`, `wallet_erc20_approve` |
| **Synthesis** | `synthesis_load_skill`, `synthesis_register`, `synthesis_report_status` |

## 🔒 Safety & Resilience

- **Wallet Policy**: Per-tx and daily spend caps, contract/method allowlists
- **Sandboxed FS**: All file ops confined to workspace directory
- **HTTP Allowlist**: Only whitelisted domains (synthesis.md, pyvax.xyz, GitHub, Avalanche)
- **Dry-Run Mode**: `--dry-run` flag simulates all state-changing operations
- **API Resilience**: Exponential backoff + retry for rate limits
- **State Checkpoints**: Resume from exact failure point

## 🏆 Synthesis Hackathon Workflow

```
1. pip install classified-agent
2. classified-agent init
3. Set API keys in classified.toml
4. classified-agent join-synthesis --enable
5. Agent fetches skill.md → registers → builds → submits
6. 🎉 $75K prizes unlocked!
```

## 📦 Development

```bash
git clone https://github.com/ShahiTechnovation/classified-agent
cd classified-agent
pip install -e ".[dev]"
pytest classified_agent/tests/ -v
```

## 🔗 Links

- **Website**: [pyvax.xyz](https://pyvax.xyz)
- **Hackathon**: [synthesis.md](https://synthesis.md)
- **GitHub**: [ShahiTechnovation/classified-agent](https://github.com/ShahiTechnovation/classified-agent)

## License

MIT — see [LICENSE](./LICENSE)
