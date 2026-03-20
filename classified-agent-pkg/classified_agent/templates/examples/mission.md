# Mission Template

Use this template to define a mission for your Classified agent.
Copy this file, fill in the sections, and reference it from `agent.yaml`.

---

## Mission: [Your Mission Title]

### Objective

Describe the high-level goal in 1-2 sentences.

> Example: "Deploy a PyVax ERC-20 token contract to Avalanche Fuji testnet
> and verify its functionality by minting tokens and checking balances."

### Background

Provide any context the agent needs:
- What problem does this solve?
- What resources are available?
- What has already been done?

### Steps

1. [ ] Step one — what to do first
2. [ ] Step two — what comes next
3. [ ] Step three — ...
4. [ ] Verify the results
5. [ ] Document findings in `workspace/notes.md`

### Constraints

- Maximum budget: X AVAX per transaction
- Must stay within workspace directory
- Must not interact with mainnet contracts
- Time limit: 50 agent steps

### Success Criteria

The mission is complete when:
1. [ ] Primary objective is achieved
2. [ ] Results are documented
3. [ ] No unhandled errors

### Resources

- [PyVax Documentation](https://pyvax.xyz)
- [Avalanche Fuji Faucet](https://faucet.avax.network/)
- [Project Classified GitHub](https://github.com/ShahiTechnovation/pyvax-rebrand)

---

## Example Missions

### 1. Smart Contract Deployment
Deploy a simple storage contract using PyVax → verify it works.

### 2. Token Analysis
Fetch on-chain data for a token → generate a summary report.

### 3. Workspace Organisation
Read all files in workspace → create an index → commit to git.

### 4. Synthesis Hackathon
Join the Synthesis hackathon → follow skill.md → complete the tasks.
