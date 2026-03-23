"""Typer CLI for Project Classified.

Commands:
    classified-agent init            — scaffold config + workspace + templates
    classified-agent doctor          — verify environment readiness
    classified-agent run             — start the agent loop
    classified-agent join-synthesis   — fetch skill.md, register, and run in Synthesis mode
"""

from __future__ import annotations

import asyncio
import json
import shutil
import sys
from importlib.resources import files as pkg_files
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from classified_agent.config.loader import create_default_config, load_config, resolve_api_key
from classified_agent.config.models import ClassifiedConfig
from classified_agent.logging.logger import setup_logger

app = typer.Typer(
    name="classified-agent",
    help=(
        "[bold cyan]Project Classified[/bold cyan] — "
        "web3-native AI agent runtime powered by PyVax.\n\n"
        "Quickstart:  init → doctor → edit classified.toml → run"
    ),
    rich_markup_mode="rich",
    add_completion=True,
    no_args_is_help=True,
)

console = Console(highlight=False)

# ──────────────────────────────────────────────────────────────────────────────
# Template copy helpers
# ──────────────────────────────────────────────────────────────────────────────


def _get_template_dir() -> Path:
    """Return the filesystem path to the bundled templates directory."""
    templates = pkg_files("classified_agent").joinpath("templates")
    # importlib.resources may return a Traversable; for file copying,
    # we need a real Path.  On installed packages this is the actual path.
    if hasattr(templates, "_path"):
        return Path(templates._path)
    return Path(str(templates))


def _copy_template_file(
    template_dir: Path,
    rel_path: str,
    dest_dir: Path,
    *,
    dest_name: str | None = None,
    overwrite: bool = False,
) -> Path | None:
    """Copy one file from the template directory into dest_dir.

    Args:
        template_dir: Root of the templates directory.
        rel_path:     Path relative to template_dir (e.g. "agent.yaml").
        dest_dir:     Destination root directory.
        dest_name:    Optional rename for the destination file.
        overwrite:    If False, skip if dest already exists.

    Returns:
        The destination path if copied, or None if skipped.
    """
    src = template_dir / rel_path
    if not src.exists():
        return None

    dest = dest_dir / (dest_name or rel_path)
    if dest.exists() and not overwrite:
        return None

    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    return dest


def _copy_template_tree(
    template_dir: Path,
    rel_dir: str,
    dest_dir: Path,
    *,
    overwrite: bool = False,
) -> list[Path]:
    """Recursively copy a subdirectory from templates into dest_dir.

    Returns:
        List of destination paths that were copied.
    """
    src_dir = template_dir / rel_dir
    if not src_dir.exists() or not src_dir.is_dir():
        return []

    copied: list[Path] = []
    for src_file in src_dir.rglob("*"):
        if src_file.is_file():
            rel = src_file.relative_to(template_dir)
            result = _copy_template_file(
                template_dir, str(rel), dest_dir, overwrite=overwrite
            )
            if result:
                copied.append(result)
    return copied


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

    # Load skill file if present
    skill_path = Path("SKILL.md")
    if skill_path.exists():
        skill_text = skill_path.read_text(encoding="utf-8")
        memory.save_to_long_term("agent_skill", skill_text)
        log.info("Loaded skill file: %s (%d bytes)", skill_path, len(skill_text))

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
      • agent.yaml — agent identity & mission
      • SKILL.md — agent operating skill
      • workspace/ with starter files
      • logs/ directory
      • examples/ with quickstart and mission templates
      • skills/ with bundled skill files
      • .env.example, README.md
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

    # 2. Get the template directory from the package
    try:
        template_dir = _get_template_dir()
    except Exception as exc:
        console.print(f"[yellow]⚠  Could not locate template directory:[/yellow] {exc}")
        console.print("[dim]Templates will be skipped. The config file was still created.[/dim]")
        template_dir = None

    dest = Path(".").resolve()
    copied_files: list[str] = []

    if template_dir and template_dir.exists():
        # 3. Copy individual template files
        template_files = [
            ("agent.yaml", None),
            (".env.example", None),
            ("README.md", None),
            # Copy the skill file to the project root as SKILL.md
            ("skills/PROJECT_CLASSIFIED_SKILL.md", "SKILL.md"),
        ]

        for rel_path, dest_name in template_files:
            result = _copy_template_file(template_dir, rel_path, dest, dest_name=dest_name)
            if result:
                try:
                    copied_files.append(str(result.resolve().relative_to(dest)))
                except ValueError:
                    copied_files.append(result.name)

        # 4. Copy directory trees
        for subdir in ["workspace", "skills", "examples", "prompts"]:
            results = _copy_template_tree(template_dir, subdir, dest)
            for r in results:
                try:
                    copied_files.append(str(r.resolve().relative_to(dest)))
                except ValueError:
                    copied_files.append(str(r))

    # 5. Ensure workspace exists (even if templates weren't available)
    workspace = Path(config.agent.workspace_dir)
    workspace.mkdir(parents=True, exist_ok=True)

    # 6. Seed notes.md if not already created by templates
    notes_file = workspace / "notes.md"
    if not notes_file.exists():
        notes_file.write_text(
            "# Agent Workspace Notes\n\n"
            "This file is your agent's scratchpad.  It can read and write\n"
            "files in this directory via its filesystem tools.\n\n"
            "---\n"
            f"*Created by `classified-agent init` — {config.agent.name}*\n",
            encoding="utf-8",
        )

    # 7. Create logs directory
    log_dir = Path(config.logging.log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)

    # 8. Build summary of created files
    all_created = [str(cfg_path)]
    all_created.extend(copied_files)
    all_created.extend([
        str(workspace),
        str(log_dir),
    ])

    file_list = "\n".join(f"  • {f}" for f in sorted(set(all_created)))

    # 9. Print next steps
    console.print(
        Panel(
            f"[green]✓ Project Classified initialised![/green]\n\n"
            f"[cyan]Config:[/cyan]     {cfg_path.resolve()}\n"
            f"[cyan]Workspace:[/cyan]  {workspace.resolve()}\n"
            f"[cyan]Logs:[/cyan]       {log_dir.resolve()}\n\n"
            f"[dim]Created files:[/dim]\n{file_list}\n\n"
            "[yellow]Next steps:[/yellow]\n"
            f"  1. Edit [bold]{cfg_path}[/bold] — set your LLM API key env var, wallet, etc.\n"
            "  2. Copy .env.example to .env and fill in your keys\n"
            "  3. Verify setup:            [bold]classified-agent doctor[/bold]\n"
            "  4. Run the agent:           [bold]classified-agent run[/bold]\n"
            "  5. Or join Synthesis:        [bold]classified-agent join-synthesis[/bold]\n",
            title="🚀 Project Classified",
            border_style="green",
        )
    )


# ──────────────────────────────────────────────────────────────────────────────
# classified-agent doctor
# ──────────────────────────────────────────────────────────────────────────────


def _check(label: str, passed: bool, detail: str = "") -> bool:
    """Print a single check result and return whether it passed."""
    icon = "[green]✅[/green]" if passed else "[red]❌[/red]"
    msg = f"  {icon}  {label}"
    if detail:
        msg += f"  [dim]({detail})[/dim]"
    console.print(msg)
    return passed


@app.command()
def doctor(
    config_path: str = typer.Option(
        "classified.toml",
        "--config",
        "-c",
        help="Path to classified.toml to check.",
    ),
) -> None:
    """Check environment readiness for Project Classified.

    Verifies:
      • Python version
      • CLI version
      • Config file parse
      • Environment variables
      • Wallet backend availability
      • RPC connectivity
      • Template installation
      • Skill file presence
      • Workspace & log directories
    """
    import classified_agent

    console.print(
        Panel(
            "[cyan]Running environment checks...[/cyan]",
            title="🩺 Project Classified Doctor",
            border_style="cyan",
        )
    )

    passed = 0
    failed = 0
    total = 0

    # ── 1. Python version ────────────────────────────────────────
    total += 1
    py_ver = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    py_ok = sys.version_info >= (3, 10)
    if _check("Python version ≥ 3.10", py_ok, py_ver):
        passed += 1
    else:
        failed += 1

    # ── 2. CLI version ───────────────────────────────────────────
    total += 1
    cli_ver = getattr(classified_agent, "__version__", "unknown")
    if _check("CLI version", cli_ver != "unknown", f"v{cli_ver}"):
        passed += 1
    else:
        failed += 1

    # ── 3. Config file parse ─────────────────────────────────────
    total += 1
    config = None
    try:
        config = load_config(Path(config_path))
        if _check("Config file", True, str(Path(config_path).resolve())):
            passed += 1
    except FileNotFoundError:
        _check("Config file", False, f"{config_path} not found — run 'classified-agent init'")
        failed += 1
    except ValueError as exc:
        _check("Config file", False, f"parse error: {exc}")
        failed += 1

    # ── 4. Environment variables ─────────────────────────────────
    total += 1
    if config:
        import os
        env_var = config.llm.api_key_env
        has_key = bool(os.environ.get(env_var, "").strip())
        if _check(f"LLM API key (${env_var})", has_key, "set" if has_key else "not set"):
            passed += 1
        else:
            failed += 1
    else:
        _check("LLM API key", False, "skipped — no config loaded")
        failed += 1

    # ── 5. Wallet backend availability ───────────────────────────
    total += 1
    if config:
        backend = config.wallet.backend
        try:
            if backend == "pyvax_local":
                from classified_agent.wallet.pyvax_wallet import PyVaxWalletBackend  # noqa: F401
            elif backend == "mock":
                from classified_agent.wallet.managed_wallets import MockWalletBackend  # noqa: F401
            elif backend == "managed_vincent":
                from classified_agent.wallet.managed_wallets import VincentWalletBackend  # noqa: F401
            elif backend == "managed_sequence":
                from classified_agent.wallet.managed_wallets import SequenceWalletBackend  # noqa: F401
            if _check(f"Wallet backend ({backend})", True, "importable"):
                passed += 1
        except ImportError as exc:
            _check(f"Wallet backend ({backend})", False, str(exc))
            failed += 1
    else:
        _check("Wallet backend", False, "skipped — no config loaded")
        failed += 1

    # ── 6. RPC connectivity ──────────────────────────────────────
    total += 1
    if config:
        import httpx
        rpc_url = config.wallet.rpc_url
        try:
            # JSON-RPC health check
            resp = httpx.post(
                rpc_url,
                json={"jsonrpc": "2.0", "method": "eth_chainId", "params": [], "id": 1},
                timeout=10,
            )
            rpc_ok = resp.status_code == 200
            detail = f"{rpc_url} → {resp.status_code}"
            if rpc_ok:
                try:
                    chain_id = int(resp.json().get("result", "0x0"), 16)
                    detail += f", chain={chain_id}"
                except (ValueError, TypeError):
                    pass
            if _check("RPC connectivity", rpc_ok, detail):
                passed += 1
            else:
                failed += 1
        except Exception as exc:
            _check("RPC connectivity", False, f"{rpc_url} → {exc}")
            failed += 1
    else:
        _check("RPC connectivity", False, "skipped — no config loaded")
        failed += 1

    # ── 7. Template installation ─────────────────────────────────
    total += 1
    try:
        tpl_dir = _get_template_dir()
        tpl_exists = tpl_dir.exists() and (tpl_dir / "agent.yaml").exists()
        if _check("Package templates", tpl_exists, str(tpl_dir)):
            passed += 1
        else:
            _check("Package templates", False, "templates directory missing from package")
            failed += 1
    except Exception as exc:
        _check("Package templates", False, str(exc))
        failed += 1

    # ── 8. Skill file presence ───────────────────────────────────
    total += 1
    skill_path = Path("SKILL.md")
    skill_exists = skill_path.exists()
    if not skill_exists:
        # Also check skills/ directory
        skill_dir = Path("skills")
        skill_exists = skill_dir.exists() and any(skill_dir.glob("*.md"))
    if _check("Skill file", skill_exists, str(skill_path) if skill_path.exists() else "not found"):
        passed += 1
    else:
        failed += 1

    # ── 9. Workspace directory ───────────────────────────────────
    total += 1
    if config:
        ws = Path(config.agent.workspace_dir)
        ws_ok = ws.exists() and ws.is_dir()
        if _check("Workspace directory", ws_ok, str(ws.resolve())):
            passed += 1
        else:
            failed += 1
    else:
        _check("Workspace directory", False, "skipped — no config loaded")
        failed += 1

    # ── 10. Logs directory ───────────────────────────────────────
    total += 1
    if config:
        log_d = Path(config.logging.log_dir)
        log_ok = log_d.exists() and log_d.is_dir()
        if _check("Logs directory", log_ok, str(log_d.resolve())):
            passed += 1
        else:
            failed += 1
    else:
        _check("Logs directory", False, "skipped — no config loaded")
        failed += 1

    # ── Summary ──────────────────────────────────────────────────
    console.print()
    if failed == 0:
        console.print(
            Panel(
                f"[green]All {passed}/{total} checks passed![/green]\n"
                "Your environment is ready. Run [bold]classified-agent run[/bold] to start.",
                title="✅ All Clear",
                border_style="green",
            )
        )
    else:
        console.print(
            Panel(
                f"[yellow]{passed}/{total} checks passed, {failed} failed.[/yellow]\n"
                "Fix the issues above and run [bold]classified-agent doctor[/bold] again.",
                title="⚠️  Issues Found",
                border_style="yellow",
            )
        )
        raise typer.Exit(1)


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
    submit: bool = typer.Option(
        False,
        "--submit",
        help="Run the full 7-step Synthesis submission flow (register → verify → submit → publish).",
    ),
) -> None:
    """Join the Synthesis.md hackathon.

    Modes:
      • Default:   Start the agent loop in Synthesis hackathon mode.
      • --submit:  Run the interactive 7-step submission flow
                   (register → verify → tracks → project → custody → publish).
    """
    # ── Submit mode: run the full submission state machine ──
    if submit:
        from classified_agent.cli.submit_flow import run_submit_flow

        console.print(
            "[bold cyan]Starting Synthesis submission flow...[/bold cyan]\n"
        )
        run_submit_flow()
        return

    # ── Normal Synthesis agent mode ──
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
