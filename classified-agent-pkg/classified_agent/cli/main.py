"""Typer CLI for Project Classified.

Commands:
    classified-agent init            — scaffold config + workspace
    classified-agent run             — start the agent loop
    classified-agent join-synthesis   — fetch skill.md, register, and run in Synthesis mode
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel

from classified_agent.config.loader import create_default_config, load_config, resolve_api_key
from classified_agent.config.models import ClassifiedConfig
from classified_agent.logging.logger import setup_logger

app = typer.Typer(
    name="classified-agent",
    help=(
        "[bold cyan]Project Classified[/bold cyan] — "
        "web3-native AI agent runtime powered by PyVax.\n\n"
        "Quickstart:  init → edit classified.toml → run"
    ),
    rich_markup_mode="rich",
    add_completion=True,
    no_args_is_help=True,
)

console = Console(highlight=False)

# ──────────────────────────────────────────────────────────────────────────────
# Runtime bootstrap
# ──────────────────────────────────────────────────────────────────────────────


def _create_wallet_backend(config: ClassifiedConfig, workspace: Path):
    """Instantiate the wallet backend specified in config."""
    from decimal import Decimal
    from classified_agent.wallet.base import WalletPolicy

    policy = WalletPolicy(
        max_native_per_tx=config.wallet.policy.max_native_per_tx,
        max_native_per_day=config.wallet.policy.max_native_per_day,
        allowed_contracts=list(config.wallet.policy.allowed_contracts),
        allowed_methods=list(config.wallet.policy.allowed_methods),
    )

    backend_name = config.wallet.backend

    if backend_name == "pyvax_local":
        from classified_agent.wallet.pyvax_wallet import PyVaxWalletBackend
        return PyVaxWalletBackend(
            policy=policy,
            workspace_dir=workspace,
            rpc_url=config.wallet.rpc_url,
            default_chain=config.wallet.default_chain,
        )
    elif backend_name == "mock":
        from classified_agent.wallet.managed_wallets import MockWalletBackend
        return MockWalletBackend(policy=policy, workspace_dir=workspace)
    elif backend_name == "managed_vincent":
        from classified_agent.wallet.managed_wallets import VincentWalletBackend
        return VincentWalletBackend(policy=policy, workspace_dir=workspace)
    elif backend_name == "managed_sequence":
        from classified_agent.wallet.managed_wallets import SequenceWalletBackend
        return SequenceWalletBackend(policy=policy, workspace_dir=workspace)
    else:
        raise ValueError(f"Unknown wallet backend: '{backend_name}'")


def _register_default_tools():
    """Create a ToolRegistry with all built-in tools."""
    from classified_agent.tools.base import ToolRegistry
    from classified_agent.tools.fs_tools import FsReadTool, FsWriteTool, FsListTool
    from classified_agent.tools.http_tools import HttpGetTool
    from classified_agent.tools.git_tools import GitInitTool, GitStatusTool, GitCommitTool
    from classified_agent.tools.web3_tools import (
        PyvaxCompileTool, PyvaxDeployTool, PyvaxCallTool,
        WalletGetBalanceTool, WalletSendNativeTool,
        WalletErc20TransferTool, WalletErc20ApproveTool,
    )

    registry = ToolRegistry()
    registry.register_many([
        FsReadTool(), FsWriteTool(), FsListTool(),
        HttpGetTool(),
        GitInitTool(), GitStatusTool(), GitCommitTool(),
        PyvaxCompileTool(), PyvaxDeployTool(), PyvaxCallTool(),
        WalletGetBalanceTool(), WalletSendNativeTool(),
        WalletErc20TransferTool(), WalletErc20ApproveTool(),
    ])
    return registry


async def _start_agent_loop(config: ClassifiedConfig, *, dry_run: bool = False) -> None:
    """Bootstrap the full agent runtime and start the AgentLoop."""
    from classified_agent.core.context import AgentContext
    from classified_agent.core.llm import create_llm_client
    from classified_agent.core.loop import AgentLoop
    from classified_agent.core.memory import MemoryStore

    log = setup_logger(config.logging)
    log.info("Agent '%s' starting (dry_run=%s)", config.agent.name, dry_run)

    # Ensure workspace exists
    workspace = Path(config.agent.workspace_dir).resolve()
    workspace.mkdir(parents=True, exist_ok=True)

    # Resolve API key
    try:
        api_key = resolve_api_key(config.llm)
        log.info("API key resolved from $%s", config.llm.api_key_env)
    except EnvironmentError as exc:
        console.print(f"[yellow]⚠ {exc}[/yellow]")
        console.print("[dim]Set the API key and retry.[/dim]")
        return

    # Create subsystems
    llm = create_llm_client(config.llm, api_key)
    wallet = _create_wallet_backend(config, workspace)
    tools = _register_default_tools()
    memory = MemoryStore(workspace)

    ctx = AgentContext(
        config=config, llm=llm, wallet=wallet,
        tools=tools, memory=memory, logger=log,
        dry_run=dry_run,
    )

    console.print(
        Panel(
            f"[green]Agent runtime initialised.[/green]\n\n"
            f"[cyan]LLM:[/cyan]      {config.llm.provider} / {config.llm.model}\n"
            f"[cyan]Wallet:[/cyan]   {config.wallet.backend} on {config.wallet.default_chain}\n"
            f"[cyan]Tools:[/cyan]    {len(tools)} registered\n"
            f"[cyan]Dry-run:[/cyan]  {dry_run}\n",
            title=f"🤖 {config.agent.name}",
            border_style="cyan",
        )
    )

    loop = AgentLoop(ctx)
    await loop.run()


async def _start_synthesis_mode(config: ClassifiedConfig) -> None:
    """Bootstrap Synthesis mode: fetch skill → register → run loop."""
    from classified_agent.adapters.synthesis import (
        fetch_skill,
        build_synthesis_prompt_fragment,
        register_agent,
        SynthesisLoadSkillTool,
        SynthesisRegisterTool,
        SynthesisReportStatusTool,
    )
    from classified_agent.core.context import AgentContext
    from classified_agent.core.llm import create_llm_client
    from classified_agent.core.loop import AgentLoop
    from classified_agent.core.memory import MemoryStore

    log = setup_logger(config.logging)
    log.info("Synthesis mode starting for '%s'", config.agent.name)

    # Ensure workspace exists
    workspace = Path(config.agent.workspace_dir).resolve()
    workspace.mkdir(parents=True, exist_ok=True)

    # 1. Fetch skill.md
    cache_path = workspace / ".synthesis_skill.md"
    try:
        skill_text = await fetch_skill(config.synthesis.skill_url, cache_path)
        console.print(f"[green]✓ skill.md fetched[/green] ({len(skill_text):,} bytes)")
    except RuntimeError as exc:
        console.print(f"[red]Failed to fetch skill.md:[/red] {exc}")
        return

    # 2. Register agent
    reg_result = await register_agent(config.synthesis, workspace)
    if reg_result.get("registered"):
        console.print("[green]✓ Agent registered[/green] (v0: logged)")
    else:
        console.print("[yellow]⚠ Registration incomplete[/yellow]")

    # 3. Resolve API key
    try:
        api_key = resolve_api_key(config.llm)
        log.info("API key resolved from $%s", config.llm.api_key_env)
    except EnvironmentError as exc:
        console.print(f"[yellow]⚠ {exc}[/yellow]")
        console.print("[dim]Set the API key and retry.[/dim]")
        return

    # 4. Create subsystems
    llm = create_llm_client(config.llm, api_key)
    wallet = _create_wallet_backend(config, workspace)
    tools = _register_default_tools()
    memory = MemoryStore(workspace)

    # 5. Register Synthesis-specific tools
    tools.register_many([
        SynthesisLoadSkillTool(),
        SynthesisRegisterTool(),
        SynthesisReportStatusTool(),
    ])

    # 6. Cache skill in memory so AgentContext can use it in system prompt
    memory.save_to_long_term("synthesis_skill", skill_text)

    ctx = AgentContext(
        config=config, llm=llm, wallet=wallet,
        tools=tools, memory=memory, logger=log,
        dry_run=False,
    )

    # 7. Build Synthesis prompt fragment for kickoff
    synthesis_fragment = build_synthesis_prompt_fragment(
        skill_text, config.synthesis
    )

    console.print(
        Panel(
            f"[green]Synthesis mode initialised.[/green]\n\n"
            f"[cyan]Skill URL:[/cyan]   {config.synthesis.skill_url}\n"
            f"[cyan]Track:[/cyan]       {config.synthesis.track}\n"
            f"[cyan]Profile:[/cyan]     {config.synthesis.agent_profile or '(not set)'}\n"
            f"[cyan]LLM:[/cyan]         {config.llm.provider} / {config.llm.model}\n"
            f"[cyan]Wallet:[/cyan]      {config.wallet.backend} on {config.wallet.default_chain}\n"
            f"[cyan]Tools:[/cyan]       {len(tools)} registered (incl. 3 Synthesis tools)\n",
            title="🧬 Synthesis Mode",
            border_style="magenta",
        )
    )

    # 8. Start the loop with an initial user message that includes the skill
    loop = AgentLoop(ctx)
    initial_msg = (
        "You are now in Synthesis hackathon mode. "
        "Read the skill definition from your system prompt, understand "
        "the tasks, plan your approach, and begin working. "
        "Use tools to complete the objectives described in skill.md."
    )
    await loop.run(initial_message=initial_msg)


# ──────────────────────────────────────────────────────────────────────────────
# classified-agent init
# ──────────────────────────────────────────────────────────────────────────────


@app.command()
def init(
    config_path: str = typer.Option(
        "classified.toml",
        "--config",
        "-c",
        help="Path for the generated config file.",
    ),
) -> None:
    """Scaffold a new Project Classified workspace.

    Creates:
      • classified.toml with sane defaults
      • workspace/ directory
      • workspace/NOTES.md starter file
    """
    cfg_path = Path(config_path)

    # 1. Create config file
    try:
        config = create_default_config(cfg_path)
    except FileExistsError:
        console.print(
            f"[yellow]⚠  Config already exists:[/yellow] {cfg_path.resolve()}\n"
            "[dim]Delete it first or use --config to specify a different path.[/dim]"
        )
        raise typer.Exit(1)

    # 2. Create workspace directory
    workspace = Path(config.agent.workspace_dir)
    workspace.mkdir(parents=True, exist_ok=True)

    # 3. Seed NOTES.md
    notes_file = workspace / "NOTES.md"
    if not notes_file.exists():
        notes_file.write_text(
            "# Agent Workspace Notes\n\n"
            "This file is your agent's scratchpad.  It can read and write\n"
            "files in this directory via its filesystem tools.\n\n"
            "---\n"
            f"*Created by `classified-agent init` — {config.agent.name}*\n",
            encoding="utf-8",
        )

    # 4. Create logs directory
    log_dir = Path(config.logging.log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)

    # 5. Print next steps
    console.print(
        Panel(
            f"[green]✓ Project Classified initialised![/green]\n\n"
            f"[cyan]Config:[/cyan]     {cfg_path.resolve()}\n"
            f"[cyan]Workspace:[/cyan]  {workspace.resolve()}\n"
            f"[cyan]Logs:[/cyan]       {log_dir.resolve()}\n\n"
            "[yellow]Next steps:[/yellow]\n"
            f"  1. Edit [bold]{cfg_path}[/bold] — set your LLM API key env var, wallet, etc.\n"
            "  2. Export your API key:  [dim]export ANTHROPIC_API_KEY='sk-ant-...'[/dim]\n"
            "  3. Run the agent:        [bold]classified-agent run[/bold]\n"
            "  4. Or join Synthesis:     [bold]classified-agent join-synthesis[/bold]\n",
            title="🚀 Project Classified",
            border_style="green",
        )
    )


# ──────────────────────────────────────────────────────────────────────────────
# classified-agent run
# ──────────────────────────────────────────────────────────────────────────────


@app.command()
def run(
    config_path: str = typer.Option(
        "classified.toml",
        "--config",
        "-c",
        help="Path to classified.toml.",
    ),
    dry_run: bool = typer.Option(
        False,
        "--dry-run",
        help="Simulate tool execution — no on-chain transactions.",
    ),
    verbose: bool = typer.Option(
        False,
        "--verbose",
        "-v",
        help="Enable DEBUG-level logging.",
    ),
) -> None:
    """Start the agent loop.

    Loads config, initialises the LLM client, wallet backend, and tools,
    then enters the plan → act → observe cycle until done or max_steps.
    """
    # 1. Load and validate config
    try:
        config = load_config(Path(config_path))
    except (FileNotFoundError, ValueError) as exc:
        console.print(f"[red]Config error:[/red] {exc}")
        raise typer.Exit(1)

    # 2. Override log level if --verbose
    if verbose:
        config.logging.level = "DEBUG"

    console.print(
        f"[dim]Loaded config from {Path(config_path).resolve()}[/dim]"
    )

    if dry_run:
        console.print("[yellow]🔒 DRY RUN — no on-chain transactions will be broadcast.[/yellow]")

    # 3. Start the agent loop
    try:
        asyncio.run(_start_agent_loop(config, dry_run=dry_run))
    except KeyboardInterrupt:
        console.print("\n[yellow]Agent stopped by user.[/yellow]")
    except Exception as exc:
        console.print(f"[red]Agent runtime error:[/red] {exc}")
        raise typer.Exit(1)


# ──────────────────────────────────────────────────────────────────────────────
# classified-agent join-synthesis
# ──────────────────────────────────────────────────────────────────────────────


@app.command("join-synthesis")
def join_synthesis(
    config_path: str = typer.Option(
        "classified.toml",
        "--config",
        "-c",
        help="Path to classified.toml.",
    ),
    enable: bool = typer.Option(
        False,
        "--enable",
        help="Automatically set [synthesis].enabled = true if it isn't already.",
    ),
) -> None:
    """Join the Synthesis.md hackathon and start the agent in Synthesis mode.

    Steps performed:
      1. Validate that [synthesis].enabled is true.
      2. Fetch and cache skill.md.
      3. Register the agent (if supported).
      4. Start the agent loop with the Synthesis system prompt.
    """
    # 1. Load config
    try:
        config = load_config(Path(config_path))
    except (FileNotFoundError, ValueError) as exc:
        console.print(f"[red]Config error:[/red] {exc}")
        raise typer.Exit(1)

    # 2. Check / enable Synthesis
    if not config.synthesis.enabled:
        if enable:
            config.synthesis.enabled = True
            console.print("[green]Synthesis mode enabled via --enable flag.[/green]")
        else:
            console.print(
                "[red]Synthesis mode is disabled.[/red]\n\n"
                "Either:\n"
                "  • Set [bold]enabled = true[/bold] in the [synthesis] section of classified.toml, or\n"
                "  • Re-run with [bold]--enable[/bold]:  classified-agent join-synthesis --enable"
            )
            raise typer.Exit(1)

    console.print(
        f"[dim]Loaded config from {Path(config_path).resolve()}[/dim]"
    )

    # 3. Start Synthesis mode
    try:
        asyncio.run(_start_synthesis_mode(config))
    except KeyboardInterrupt:
        console.print("\n[yellow]Agent stopped by user.[/yellow]")
    except Exception as exc:
        console.print(f"[red]Synthesis runtime error:[/red] {exc}")
        raise typer.Exit(1)


# ──────────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────────


def main() -> None:
    """Entry point called by the ``classified-agent`` console script."""
    app()


if __name__ == "__main__":
    main()
