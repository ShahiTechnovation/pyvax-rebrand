"""Create shortcut commands for easier PyVax usage on Windows & Unix."""

import os
import sys
import stat
from pathlib import Path
from rich.console import Console

console = Console()


def create_shortcuts():
    """Create platform-appropriate shortcut commands for PyVax."""

    is_windows = sys.platform == "win32"

    if is_windows:
        shortcuts = {
            "pyvax.bat": "@echo off\npython -m avax_cli.cli %*\n",
            "compile.bat": "@echo off\npython -m avax_cli.cli compile %*\n",
            "deploy.bat": "@echo off\npython -m avax_cli.cli deploy %*\n",
            "pyvax-test.bat": "@echo off\npython -m avax_cli.cli test %*\n",
        }
    else:
        shortcuts = {
            "pyvax.sh": "#!/bin/bash\npython -m avax_cli.cli \"$@\"\n",
            "compile.sh": "#!/bin/bash\npython -m avax_cli.cli compile \"$@\"\n",
            "deploy.sh": "#!/bin/bash\npython -m avax_cli.cli deploy \"$@\"\n",
            "pyvax-test.sh": "#!/bin/bash\npython -m avax_cli.cli test \"$@\"\n",
        }

    created_files = []

    for filename, command in shortcuts.items():
        try:
            with open(filename, "w") as f:
                f.write(command)

            # Make Unix scripts executable
            if not is_windows:
                os.chmod(filename, os.stat(filename).st_mode | stat.S_IEXEC)

            created_files.append(filename)
        except Exception as e:
            console.print(f"[red]Failed to create {filename}: {e}[/red]")

    if created_files:
        console.print("[green]✅ Shortcut commands created:[/green]")
        for filename in created_files:
            console.print(f"  📄 {filename}")

        console.print("\n[cyan]Usage examples:[/cyan]")
        if is_windows:
            console.print("  .\\pyvax.bat compile --optimizer=3")
            console.print("  .\\deploy.bat MyContract --chain fuji")
        else:
            console.print("  ./pyvax.sh compile --optimizer=3")
            console.print("  ./deploy.sh MyContract --chain fuji")

    return created_files


def setup_environment():
    """Set up development environment with shortcuts and checks."""

    console.print("[blue]Setting up PyVax development environment...[/blue]")

    # Create shortcuts
    shortcuts = create_shortcuts()

    # Check environment
    checks = []

    # Check if in project directory
    if Path("pyvax_config.json").exists():
        checks.append("✅ Project configuration found")
    else:
        checks.append("⚠️  Not in PyVax project directory")

    # Check contracts directory
    if Path("contracts").exists():
        contract_files = list(Path("contracts").glob("*.py"))
        checks.append(f"✅ Contracts directory ({len(contract_files)} Python files)")
    else:
        checks.append("⚠️  No contracts directory found")

    # Check private key
    if os.getenv("PRIVATE_KEY") or os.getenv("PYVAX_PRIVATE_KEY"):
        checks.append("✅ Private key environment variable set")
    elif Path(".env").exists():
        checks.append("✅ .env file found")
    else:
        checks.append("⚠️  PRIVATE_KEY environment variable not set")

    console.print("\n[cyan]Environment Status:[/cyan]")
    for check in checks:
        console.print(f"  {check}")

    return len(shortcuts) > 0


if __name__ == "__main__":
    setup_environment()
