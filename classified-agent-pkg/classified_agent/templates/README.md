# 🤖 My Classified Agent

> Scaffolded by [Project Classified](https://pyvax.xyz) — a web3-native AI agent runtime powered by PyVax.

---

## Quick Start

```bash
# 1. Set your API key
export ANTHROPIC_API_KEY='sk-ant-...'

# 2. Verify your setup
classified-agent doctor

# 3. Run the agent
classified-agent run

# 4. Run in dry-run mode (no on-chain transactions)
classified-agent run --dry-run

# 5. Join Synthesis hackathon
classified-agent join-synthesis --enable
```

## Project Structure

```
.
├── classified.toml        # Agent configuration (edit this first!)
├── agent.yaml             # Agent identity, mission, and skill references
├── SKILL.md               # Agent operating skill — how to work efficiently
├── .env.example           # Environment variable template
├── workspace/             # Agent's working directory
│   ├── notes.md           # Agent scratchpad
│   └── state.json         # Runtime state tracking
├── logs/                  # Per-run log files
├── skills/                # Bundled skill files
│   └── PROJECT_CLASSIFIED_SKILL.md
└── examples/              # Reference examples
    ├── quickstart.py       # Minimal agent invocation
    ├── mission.md          # Mission template
    └── memory.md           # Memory usage guide
```

## Configuration

Edit `classified.toml` to configure:

| Section | Purpose |
|---------|---------|
| `[agent]` | Name, workspace, step limits |
| `[llm]` | Provider, model, API key env var |
| `[wallet]` | Backend, chain, RPC, spending policy |
| `[synthesis]` | Hackathon mode toggle and settings |
| `[logging]` | Log level and output directory |

See `.env.example` for required environment variables.

## Skills

The `SKILL.md` file teaches your agent how to operate efficiently.
Read it to understand the agent's capabilities, and edit it to
customise behaviour for your specific use case.

## Links

- **Website**: [pyvax.xyz](https://pyvax.xyz)
- **GitHub**: [ShahiTechnovation/pyvax-rebrand](https://github.com/ShahiTechnovation/pyvax-rebrand)
- **Hackathon**: [synthesis.md](https://synthesis.md)
- **PyPI**: [classified-agent](https://pypi.org/project/classified-agent/)
