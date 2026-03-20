# Tool-Use Instructions

This document describes how the Classified agent should use tools.
It serves as a reference for the 14 built-in tools + 3 Synthesis tools.

---

## General Rules

1. **Explain first, act second.** Always state your reasoning before calling a tool.
2. **One tool at a time.** Execute tools sequentially — critical for nonce ordering on-chain.
3. **Check results.** Verify tool output before proceeding to the next action.
4. **Handle failures.** If a tool returns an error, report it honestly. Never fabricate results.
5. **Stay within bounds.** File operations are sandboxed to workspace_dir. Wallet operations enforce spending limits.

---

## Tool Reference

### Filesystem

| Tool | Args | Description |
|------|------|-------------|
| `fs_read` | `path` (str) | Read file contents from workspace |
| `fs_write` | `path` (str), `content` (str) | Write/create a file in workspace |
| `fs_list` | `path` (str, optional) | List directory contents |

> All paths are relative to the workspace directory.

### HTTP

| Tool | Args | Description |
|------|------|-------------|
| `http_get` | `url` (str) | Fetch URL content (domain allowlist enforced) |

Allowed domains include: synthesis.md, pyvax.xyz, github.com, api.avax-test.network, and other whitelisted endpoints.

### Git

| Tool | Args | Description |
|------|------|-------------|
| `git_init` | `path` (str, optional) | Initialise a git repository |
| `git_status` | `path` (str, optional) | Check repository status |
| `git_commit` | `message` (str), `path` (str, optional) | Create a commit |

### PyVax / Web3

| Tool | Args | Description |
|------|------|-------------|
| `pyvax_compile` | `source_path` (str) | Compile Python contract → EVM bytecode + ABI |
| `pyvax_deploy` | `artifact_path` (str), `constructor_args` (list, optional) | Deploy contract to chain |
| `pyvax_call` | `address` (str), `method` (str), `args` (list, optional) | Call contract function |
| `wallet_get_balance` | `address` (str, optional) | Check native token balance |
| `wallet_send_native` | `to` (str), `amount` (str) | Send AVAX/ETH |
| `wallet_erc20_transfer` | `token` (str), `to` (str), `amount` (str) | Transfer ERC-20 tokens |
| `wallet_erc20_approve` | `token` (str), `spender` (str), `amount` (str) | Approve ERC-20 spending |

### Synthesis (only available in hackathon mode)

| Tool | Args | Description |
|------|------|-------------|
| `synthesis_load_skill` | — | Load/reload the cached skill.md |
| `synthesis_register` | — | Register the agent with Synthesis |
| `synthesis_report_status` | `status` (str) | Report progress to Synthesis |

---

## Tool Result Format

Every tool returns a `ToolResult` with:

```json
{
  "success": true,
  "output": { ... },
  "error": null
}
```

Or on failure:

```json
{
  "success": false,
  "output": null,
  "error": "Description of what went wrong"
}
```

---

## Dry-Run Mode

When `--dry-run` is active, state-changing tools (on-chain txs, file writes,
git commits) simulate their effects and return mock results. No real changes
are made. Read-only tools (fs_read, fs_list, http_get, wallet_get_balance)
operate normally.
