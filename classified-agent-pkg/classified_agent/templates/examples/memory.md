# Agent Memory Guide

The Classified agent uses a two-tier memory system managed by
`classified_agent/core/memory.py` (the `MemoryStore` class).

---

## Short-Term Memory

- Stores recent conversation turns (role + truncated content)
- Automatically populated during the agent loop
- Flushed to disk every 5 steps and at loop completion
- Location: `workspace/.memory/_short_term_buffer.json`

### What goes here
- Recent observations from tool calls
- Intermediate reasoning snippets
- Current task context

---

## Long-Term Memory

- Key-value store for persistent information
- Survives across agent restarts
- Location: `workspace/.memory/` directory (one file per key)

### What goes here
- Synthesis skill text (cached as `synthesis_skill`)
- Important findings the agent wants to remember
- Configuration snapshots
- Completed task summaries

### How to use (programmatically)

```python
# Save something
memory.save_to_long_term("my_key", "important data")

# Load it back
data = memory.load_from_long_term("my_key")
```

---

## Workspace Notes

The `workspace/notes.md` file serves as a human-readable scratchpad.
The agent can write to it via `fs_write` to track progress and leave
notes for itself (or for the human reviewing its work).

## Tips

1. The agent automatically manages short-term memory — you don't need to configure it
2. Long-term memory is useful for caching expensive operations (API calls, compilations)
3. The memory directory is inside workspace, so it's backed up with the workspace
4. Use `--verbose` mode to see memory flush events in the logs
