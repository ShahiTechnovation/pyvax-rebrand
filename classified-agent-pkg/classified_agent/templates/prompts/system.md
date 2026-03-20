# System Prompt Reference

This document describes the system prompt that the Classified agent
constructs at runtime. You do not need to edit this file — the prompt
is built automatically by `AgentContext.build_system_prompt()`.

---

## Prompt Structure

The system prompt is assembled from these sections (joined by `---` separators):

### 1. Synthesis Fragment (if enabled)
- Synthesis hackathon mode notice
- Track and agent profile
- Cached skill.md content (first 4000 chars)

### 2. Core Instructions
- Agent name and description
- Behavioural rules (explain reasoning, no fabrication, stay in workspace, etc.)
- Available tool names
- Workspace path

### 3. PyVax Capabilities
- pyvax_compile, pyvax_deploy, pyvax_call descriptions
- Python→EVM toolchain overview

### 4. Wallet Policy
- Backend name and chain
- Per-transaction and daily spending limits
- Contract and method allowlists

### 5. Dry-Run Notice (if `--dry-run`)
- All state-changing operations will simulate

---

## Customisation

To customise the system prompt:

1. **Edit `agent.yaml`** — the persona and mission fields shape the context
2. **Edit `classified.toml`** — wallet policy, tool config, and LLM settings
3. **Add skill files** — referenced in agent.yaml, loaded into long-term memory
4. **Subclass `AgentContext`** — override `build_system_prompt()` for full control

## Example

With default config, the system prompt starts with:

```
# Agent: classified-001

A web3-native AI agent powered by PyVax

You are an autonomous AI agent with access to tools.
Think step-by-step, use tools when needed, and report your progress clearly.

## Rules
- Always explain your reasoning before calling a tool.
- Never fabricate tool results — if a tool fails, report the error.
- Stay within your workspace directory for file operations.
- Respect wallet spending limits at all times.
- Stop after at most 50 steps.

## Available tools
fs_read, fs_write, fs_list, http_get, git_init, git_status, git_commit,
pyvax_compile, pyvax_deploy, pyvax_call, wallet_get_balance,
wallet_send_native, wallet_erc20_transfer, wallet_erc20_approve

## Workspace
./workspace
```
