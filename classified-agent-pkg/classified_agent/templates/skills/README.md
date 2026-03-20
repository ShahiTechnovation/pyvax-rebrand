# Skills Directory

This directory contains skill files that teach the agent how to work efficiently.

## What is a skill file?

A skill file (`.md`) is a structured document that provides operational guidance
to an AI agent. It typically covers:

- **Identity**: What the agent is and its purpose
- **Configuration**: How to read and use config files
- **Tools**: Available tools and how to use them safely
- **Workflows**: Step-by-step procedures for common tasks
- **Safety**: Rules and constraints the agent must follow

## Bundled skills

| File | Description |
|------|-------------|
| `PROJECT_CLASSIFIED_SKILL.md` | Core agent operating guide for Project Classified |

## Adding custom skills

1. Create a new `.md` file in this directory
2. Follow the YAML frontmatter + markdown format:

```markdown
---
name: My Custom Skill
description: Short description of what this skill teaches the agent
---

# Skill content here...
```

3. Reference the skill in `agent.yaml` under `skills.files`:

```yaml
skills:
  files:
    - "./skills/my_custom_skill.md"
```

## Optional supporting directories

Skills can include supporting files:

```
skills/
├── my_skill.md
├── references/      # Reference documents, specs, links
├── scripts/         # Helper scripts for the agent to use
└── assets/          # Images, data files, templates
```
