"""Synthesis Hackathon submission flow — 7-step state machine.

This module implements the full interactive submission workflow:
  1. Register agent identity (ERC-8004 on Base Mainnet)
  2. Email verification (OTP)
  3. Complete registration (get API key + on-chain identity)
  4. Select prize tracks
  5. Create project draft
  6. Self-custody transfer (NFT to your wallet)
  7. Publish project

Usage from CLI:
    classified-agent join-synthesis --submit

Usage standalone:
    python -m classified_agent.cli.submit_flow

The flow is resumable — progress is saved to ``classified_synthesis_state.json``
after each step. Re-running will pick up where you left off.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from classified_agent.adapters.synthesis_client import (
    BASE_URL,
    STATE_FILE,
    http_get,
    http_head,
    http_post,
)

# ─────────────────────────────────────────────────────────────
# Terminal colours (ANSI escape sequences)
# ─────────────────────────────────────────────────────────────

def _clr(code: str) -> str:
    return f"\033[{code}m"

RESET   = _clr("0")
BOLD    = _clr("1")
DIM     = _clr("2")
RED     = _clr("91")
GREEN   = _clr("92")
YELLOW  = _clr("93")
CYAN    = _clr("96")
MAGENTA = _clr("95")


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

class StopFlow(Exception):
    """Raised to halt the flow and save progress."""


def banner() -> None:
    print(f"""
{CYAN}{BOLD}╔══════════════════════════════════════════════════════════════╗
║   🤖 CLASSIFIED AGENT — Synthesis Hackathon Submission       ║
║   Register · Verify · Submit · Publish                       ║
║   classified-agent join-synthesis --submit                   ║
╚══════════════════════════════════════════════════════════════╝{RESET}
""")


def ok(msg: str) -> None:
    print(f"  {GREEN}✅ {msg}{RESET}")


def err(msg: str) -> None:
    print(f"  {RED}❌ {msg}{RESET}")


def info(msg: str) -> None:
    print(f"  {CYAN}ℹ️  {msg}{RESET}")


def warn(msg: str) -> None:
    print(f"  {YELLOW}⚠️  {msg}{RESET}")


def abort(msg: str) -> None:
    err(msg)
    print(f"\n  {YELLOW}Re-run to retry from this step.{RESET}\n")
    raise StopFlow(msg)


def step_header(n: int, title: str) -> None:
    print(f"\n{BOLD}{MAGENTA}{'─' * 60}")
    print(f"  STEP {n}: {title}")
    print(f"{'─' * 60}{RESET}\n")


def ask(prompt: str, default: str | None = None) -> str:
    if default:
        val = input(f"  {BOLD}{prompt}{RESET} [{DIM}{default}{RESET}]: ").strip()
        return val if val else default
    val = input(f"  {BOLD}{prompt}{RESET}: ").strip()
    return val


def save(state: dict) -> None:
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)
    print(f"  {DIM}💾 Progress saved → {STATE_FILE}{RESET}")


def load() -> dict:
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {}


# ─────────────────────────────────────────────────────────────
# Security: auto-append state file to .gitignore
# ─────────────────────────────────────────────────────────────

def ensure_gitignore() -> None:
    """Append STATE_FILE to .gitignore if it isn't already listed."""
    gitignore = Path(".gitignore")
    if gitignore.exists():
        content = gitignore.read_text(encoding="utf-8")
        if STATE_FILE in content:
            return
        with open(gitignore, "a", encoding="utf-8") as f:
            f.write(f"\n# Synthesis submission state (contains API key)\n{STATE_FILE}\n")
        info(f"Auto-added {STATE_FILE} to .gitignore")
    else:
        with open(gitignore, "w", encoding="utf-8") as f:
            f.write(f"# Synthesis submission state (contains API key)\n{STATE_FILE}\n")
        info(f"Created .gitignore with {STATE_FILE}")


# ─────────────────────────────────────────────────────────────
# Preflight URL checks
# ─────────────────────────────────────────────────────────────

def preflight_checks() -> None:
    """HEAD-request critical URLs before starting the flow."""
    urls_to_check = [
        ("https://pyvax.xyz/logo.png", "Logo URL"),
        ("https://synthesis.md/skill.md", "Synthesis skill.md"),
    ]
    for url, label in urls_to_check:
        status = http_head(url)
        if status != 200:
            warn(f"{label} may be broken — {url} returned HTTP {status}")
            confirm = ask("Continue anyway? (y/n)", "y")
            if confirm.lower() != "y":
                print(f"\n  {YELLOW}Aborting. Fix the URL and re-run.{RESET}\n")
                sys.exit(1)
        else:
            ok(f"{label} reachable ({url})")


# ─────────────────────────────────────────────────────────────
# STEP 1 — Register Agent Identity
# ─────────────────────────────────────────────────────────────

def step1_register(state: dict) -> dict:
    step_header(1, "Register Agent Identity")

    if state.get("api_key"):
        ok("Already fully registered.")
        return state

    if state.get("pending_id"):
        warn(f"Found existing pendingId: {state['pending_id']}")
        if ask("Skip re-registration? (y/n)", "y").lower() == "y":
            return state

    print(f"  {DIM}Registering your agent as an ERC-8004 identity on Base Mainnet.{RESET}\n")

    # Gather user info
    agent_name  = ask("Agent name", "Classified Agent")
    agent_desc  = ask("Agent description (1-2 sentences)")
    image_url   = ask("Agent image/logo URL", "https://pyvax.xyz/logo.png")
    name        = ask("Your full name")
    email       = ask("Your email address")
    handle      = ask("Twitter/X handle", "")
    background  = ask("Your background (builder/researcher/student/other)", "builder")
    crypto_exp  = ask("Crypto experience? (yes/no)", "yes")
    agent_exp   = ask("AI agent experience? (yes/no)", "yes")
    coding_lvl  = ask("Coding comfort (1-10)", "7")
    problem     = ask("What problem does your agent solve? (1-2 sentences)")

    payload = {
        "name": agent_name,
        "description": agent_desc,
        "image": image_url,
        "agentHarness": ask("Agent harness (eliza/langchain/autogen/crewai/other)", "other"),
        "agentHarnessOther": ask("Harness details (if 'other')") if True else "",
        "model": ask("LLM model used", "claude-sonnet-4-6"),
        "humanInfo": {
            "name": name,
            "email": email,
            "socialMediaHandle": handle,
            "background": background,
            "cryptoExperience": crypto_exp,
            "aiAgentExperience": agent_exp,
            "codingComfort": int(coding_lvl),
            "problemToSolve": problem,
        },
    }

    print("\n  Sending registration...")
    res, error = http_post("/register/init", payload)

    if error:
        abort(f"Registration failed [{error['status']}]: {error['detail']}")

    state["pending_id"] = res["pendingId"]
    state["email"] = email
    ok("Registration initiated!")
    info(f"pendingId: {res['pendingId']}")
    save(state)
    return state


# ─────────────────────────────────────────────────────────────
# STEP 2 — Email Verification
# ─────────────────────────────────────────────────────────────

def step2_verify(state: dict) -> dict:
    step_header(2, "Email Verification (OTP)")

    if state.get("verified"):
        ok("Already verified.")
        return state

    pid = state.get("pending_id")
    if not pid:
        abort("No pendingId. Complete Step 1 first.")

    print("  Sending OTP to your email...")
    res, error = http_post("/register/verify/email/send", {"pendingId": pid})

    if error:
        abort(f"Could not send OTP [{error['status']}]: {error['detail']}")

    ok("OTP sent! Check your inbox (and spam folder).")
    otp = ask("Enter the 6-digit OTP from your email")

    res, error = http_post("/register/verify/email/confirm", {
        "pendingId": pid, "otp": otp.strip()
    })

    if error:
        abort(
            f"OTP verification failed [{error['status']}]: {error['detail']}\n"
            "  OTPs expire in 10 minutes — re-run to get a new one."
        )

    ok("Email verified!")
    state["verified"] = True
    save(state)
    return state


# ─────────────────────────────────────────────────────────────
# STEP 3 — Complete Registration (Get API Key)
# ─────────────────────────────────────────────────────────────

def step3_complete(state: dict) -> dict:
    step_header(3, "Complete Registration (Get API Key + On-Chain Identity)")

    if state.get("api_key"):
        ok(f"Already have API key: {state['api_key'][:25]}...")
        return state

    pid = state.get("pending_id")
    if not pid:
        abort("No pendingId. Complete Step 1 first.")

    print("  Minting your ERC-8004 on-chain agent identity on Base Mainnet...")
    res, error = http_post("/register/complete", {"pendingId": pid})

    if error:
        abort(f"Completion failed [{error['status']}]: {error['detail']}")

    state["api_key"]        = res["apiKey"]
    state["participant_id"] = res["participantId"]
    state["team_id"]        = res["teamId"]
    state["reg_txn"]        = res.get("registrationTxn", "")

    print(f"""
{GREEN}{BOLD}  🎉 REGISTERED ON-CHAIN!{RESET}
  {BOLD}API Key:{RESET}      {state['api_key']}
  {BOLD}Participant:{RESET}  {state['participant_id']}
  {BOLD}Team ID:{RESET}      {state['team_id']}
  {BOLD}BaseScan Tx:{RESET}  {state['reg_txn']}

  {RED}{BOLD}⚠️  SAVE YOUR API KEY — it is shown only once!{RESET}
  {RED}{BOLD}⚠️  This file contains your API key — do not commit it to git.{RESET}
""")
    save(state)
    return state


# ─────────────────────────────────────────────────────────────
# STEP 4 — Select Prize Tracks
# ─────────────────────────────────────────────────────────────

def step4_tracks(state: dict) -> dict:
    step_header(4, "Select Prize Tracks")

    if state.get("track_uuids"):
        info(f"Already selected {len(state['track_uuids'])} track(s).")
        if ask("Re-select? (y/n)", "n").lower() != "y":
            return state

    print("  Fetching available tracks from Devfolio...")
    res, error = http_get("/catalog?page=1&limit=30")

    if error:
        warn(f"Could not auto-fetch tracks [{error['status']}]: {error['detail']}")
        print("\n  Enter track UUIDs manually (comma-separated):")
        raw = ask("Track UUIDs")
        state["track_uuids"] = [t.strip() for t in raw.split(",") if t.strip()]
        save(state)
        return state

    items = res.get("items", [])
    if not items:
        warn("No tracks returned. The hackathon may have ended.")
        raw = ask("Enter track UUIDs manually (comma-separated)")
        state["track_uuids"] = [t.strip() for t in raw.split(",") if t.strip()]
        save(state)
        return state

    print(f"\n  {BOLD}Available Tracks:{RESET}\n")
    for i, t in enumerate(items):
        prizes = t.get("prizes", [])
        prize_str = " | ".join([
            f"{p.get('amount', '?')} {p.get('currency', '')}" for p in prizes
        ]) or "TBD"
        print(f"  {CYAN}[{i}]{RESET} {BOLD}{t['name']}{RESET}")
        print(f"      Company: {t.get('company', 'Open Track')}  |  Prize: {prize_str}")
        print(f"      UUID: {DIM}{t['uuid']}{RESET}\n")

    raw = ask("Enter track numbers to enter (e.g. 0,2,4)")
    selected = []
    for c in raw.split(","):
        c = c.strip()
        if c.isdigit() and int(c) < len(items):
            selected.append(items[int(c)]["uuid"])

    if not selected:
        err("No valid selection. Try entering UUIDs directly.")
        raw = ask("Paste UUIDs comma-separated")
        selected = [t.strip() for t in raw.split(",") if t.strip()]

    state["track_uuids"] = selected
    ok(f"Selected {len(selected)} track(s).")
    save(state)
    return state


# ─────────────────────────────────────────────────────────────
# STEP 5 — Create Project Draft
# ─────────────────────────────────────────────────────────────

def step5_create_project(state: dict) -> dict:
    step_header(5, "Create Project Draft")

    if state.get("project_uuid"):
        ok(f"Project already created: {state['project_uuid']}")
        if ask("Use existing? (y/n)", "y").lower() == "y":
            return state

    api_key = state.get("api_key")
    team_id = state.get("team_id")
    tracks  = state.get("track_uuids", [])

    if not api_key or not team_id:
        abort("Missing api_key or team_id. Complete Steps 1–3 first.")
    if not tracks:
        abort("No tracks selected. Complete Step 4 first.")

    print(f"\n  {BOLD}Enter your project details:{RESET}\n")

    proj_name   = ask("Project name")
    proj_desc   = ask("Project description (brief or paste multi-line, end with empty line)")
    if not proj_desc:
        abort("Project description is required.")

    problem     = ask("Problem statement (what problem does your project solve?)")
    repo        = ask("GitHub repo URL")
    deploy      = ask("Deployed URL (if any)", "")
    video       = ask("Demo video URL (strongly recommended for judges — YouTube or Loom)", "")

    # Conversation log
    print(f"\n  {DIM}Describe the human-agent collaboration that built this project.{RESET}")
    convo_log   = ask("Conversation log / collaboration summary")

    # Submission metadata
    print(f"\n  {BOLD}Submission metadata:{RESET}")
    framework       = ask("Agent framework (eliza/langchain/autogen/crewai/other)", "other")
    framework_other = ""
    if framework == "other":
        framework_other = ask("Framework details")

    harness       = ask("Agent harness (eliza/langchain/autogen/crewai/other)", "other")
    harness_other = ""
    if harness == "other":
        harness_other = ask("Harness details")

    model       = ask("LLM model used", "claude-sonnet-4-6")
    intention   = ask("Post-hackathon intention (continuing/pausing/undecided)", "continuing")
    int_notes   = ask("Intention notes (optional)", "")

    submission_metadata = {
        "agentFramework": framework,
        "agentFrameworkOther": framework_other,
        "agentHarness": harness,
        "agentHarnessOther": harness_other,
        "model": model,
        "skills": [],
        "tools": [],
        "helpfulResources": [],
        "helpfulSkills": [],
        "intention": intention,
        "intentionNotes": int_notes,
    }

    # Let user add skills and tools
    skills_raw = ask("Skills used (comma-separated, e.g. web-search,code-gen)", "")
    if skills_raw.strip():
        submission_metadata["skills"] = [s.strip() for s in skills_raw.split(",") if s.strip()]

    tools_raw = ask("Tools used (comma-separated)", "")
    if tools_raw.strip():
        submission_metadata["tools"] = [t.strip() for t in tools_raw.split(",") if t.strip()]

    resources_raw = ask("Helpful resource URLs (comma-separated)", "")
    if resources_raw.strip():
        submission_metadata["helpfulResources"] = [r.strip() for r in resources_raw.split(",") if r.strip()]

    payload = {
        "teamUUID": team_id,
        "name": proj_name,
        "description": proj_desc.strip(),
        "problemStatement": problem.strip(),
        "repoURL": repo,
        "trackUUIDs": tracks,
        "conversationLog": convo_log.strip(),
        "submissionMetadata": submission_metadata,
    }
    if deploy:
        payload["deployedURL"] = deploy
    if video:
        payload["videoURL"] = video

    print("\n  Creating project on Devfolio...")
    res, error = http_post("/projects", payload, api_key)

    if error:
        if error["status"] == 409:
            warn("409 = deadline passed or project limit reached.")
            warn("The hackathon building period may have ended. Submission API may be closed.")
        abort(f"Project creation failed [{error['status']}]: {error['detail']}")

    state["project_uuid"] = res["uuid"]
    ok("Project created as DRAFT!")
    info(f"UUID: {res['uuid']}")
    info(f"Status: {res.get('status', 'draft')}")
    save(state)
    return state


# ─────────────────────────────────────────────────────────────
# STEP 6 — Self-Custody Transfer
# ─────────────────────────────────────────────────────────────

def step6_self_custody(state: dict) -> dict:
    step_header(6, "Self-Custody Transfer (Required to Publish)")

    if state.get("self_custody_done"):
        ok("Self-custody already complete.")
        return state

    api_key = state.get("api_key")
    if not api_key:
        abort("No API key. Complete Step 3 first.")

    print(f"""
  {DIM}Your agent NFT (ERC-8004) starts custodied by Devfolio.
  You must transfer it to your wallet before publishing.
  Use your existing Avalanche/Ethereum wallet address (0x...).{RESET}
""")

    wallet = ask("Your wallet address (0x...)")
    if not wallet.startswith("0x") or len(wallet) < 40:
        err("Invalid wallet address format.")
        return state

    print("\n  Initiating on-chain transfer...")
    res, error = http_post(
        "/participants/me/transfer/init",
        {"targetOwnerAddress": wallet},
        api_key,
    )

    if error:
        err(f"Transfer init failed [{error['status']}]: {error['detail']}")
        return state

    token      = res["transferToken"]
    shown_addr = res["targetOwnerAddress"]
    agent_id   = res.get("agentId", "?")

    print(f"""
  {YELLOW}{BOLD}⚠️  VERIFY BEFORE CONFIRMING:{RESET}
  Agent ID:      {agent_id}
  Target Wallet: {BOLD}{shown_addr}{RESET}
  
  This transfer is IRREVERSIBLE. Verify the address is yours.
""")
    confirm = ask("Does this wallet match yours? Type YES to confirm")
    if confirm.strip().upper() != "YES":
        err("Transfer aborted.")
        return state

    print("  Confirming transfer...")
    res2, error = http_post(
        "/participants/me/transfer/confirm",
        {"transferToken": token, "targetOwnerAddress": wallet},
        api_key,
    )

    if error:
        err(f"Transfer confirm failed [{error['status']}]: {error['detail']}")
        return state

    ok("Self-custody complete!")
    info(f"Tx Hash: {res2.get('txHash', 'N/A')}")
    info(f"Owner:   {res2.get('ownerAddress', wallet)}")

    state["self_custody_done"] = True
    save(state)
    return state


# ─────────────────────────────────────────────────────────────
# STEP 7 — Publish
# ─────────────────────────────────────────────────────────────

def step7_publish(state: dict) -> dict:
    step_header(7, "Publish Project 🚀")

    api_key  = state.get("api_key")
    proj_uid = state.get("project_uuid")

    if not api_key or not proj_uid:
        err("Missing api_key or project_uuid.")
        return state

    print(f"  Publishing project {proj_uid}...")
    print(f"  {DIM}Note: Check synthesis.md for the current deadline window.")
    print(f"  The API may reject if the deadline has passed.{RESET}\n")

    res, error = http_post(f"/projects/{proj_uid}/publish", api_key=api_key)

    if error:
        err(f"Publish failed [{error['status']}]: {error['detail']}")
        if error["status"] == 409:
            warn("The hackathon deadline has passed — the API is no longer accepting submissions.")
            warn("Try DMing @synthesis_md on X with your project UUID to request a late review.")
            info(f"Your project UUID: {proj_uid}")
        return state

    print(f"""
{GREEN}{BOLD}
  ██████╗ ██╗   ██╗██████╗ ██╗     ██╗███████╗██╗  ██╗███████╗██████╗ 
  ██╔══██╗██║   ██║██╔══██╗██║     ██║██╔════╝██║  ██║██╔════╝██╔══██╗
  ██████╔╝██║   ██║██████╔╝██║     ██║███████╗███████║█████╗  ██║  ██║
  ██╔═══╝ ██║   ██║██╔══██╗██║     ██║╚════██║██╔══██║██╔══╝  ██║  ██║
  ██║     ╚██████╔╝██████╔╝███████╗██║███████║██║  ██║███████╗██████╔╝
  ╚═╝      ╚═════╝ ╚═════╝ ╚══════╝╚═╝╚══════╝╚═╝  ╚═╝╚══════╝╚═════╝ 
{RESET}
""")
    ok("PROJECT IS LIVE ON SYNTHESIS!")
    info(f"Slug:   {res.get('slug', 'N/A')}")
    info(f"Status: {res.get('status', 'publish')}")
    info(f"View:   https://synthesis.md/projects")

    save(state)
    return state


# ─────────────────────────────────────────────────────────────
# State summary (for resume)
# ─────────────────────────────────────────────────────────────

def print_state_summary(state: dict) -> None:
    print(f"\n  {BOLD}Saved progress:{RESET}")
    for k, v in state.items():
        if k == "api_key":
            print(f"    {k}: {str(v)[:20]}...")
        elif k in ("project_uuid", "team_id", "participant_id", "pending_id"):
            print(f"    {CYAN}{k}{RESET}: {v}")
        elif k in ("verified", "self_custody_done"):
            print(f"    {GREEN}{k}{RESET}: {v}")
        else:
            print(f"    {k}: {v}")


# ─────────────────────────────────────────────────────────────
# MAIN ENTRY POINT
# ─────────────────────────────────────────────────────────────

def run_submit_flow() -> None:
    """Run the full 7-step Synthesis submission flow.

    This is the entry point called by ``classified-agent join-synthesis --submit``.
    """
    banner()

    # Security: ensure state file is gitignored
    ensure_gitignore()

    # Preflight URL checks
    preflight_checks()

    # Load saved state
    state = load()

    if state:
        print_state_summary(state)
        resume = input(f"\n  {BOLD}Resume from saved state? (y/n){RESET} [y]: ").strip() or "y"
        if resume.lower() != "y":
            state = {}
            if os.path.exists(STATE_FILE):
                os.remove(STATE_FILE)

    print(f"""
  {BOLD}What this flow does:{RESET}
  1. Registers your agent with ERC-8004 identity on Base
  2. Verifies your email with OTP
  3. Gets your API key (save it!)
  4. Shows available prize tracks to pick from
  5. Creates a full project draft with your details
  6. Transfers agent NFT to your wallet (self-custody)
  7. Publishes the project for judges

  {DIM}You will need: email, OTP, wallet address, track selection,
  and your project details (name, description, repo URL, etc.).{RESET}
""")

    input(f"  Press {BOLD}Enter{RESET} to start...\n")

    try:
        state = step1_register(state)
        state = step2_verify(state)
        state = step3_complete(state)
        state = step4_tracks(state)
        state = step5_create_project(state)
        state = step6_self_custody(state)
        state = step7_publish(state)
    except StopFlow:
        save(state)
        print(f"\n  {YELLOW}Stopped. Progress saved. Re-run to continue from where you left off.{RESET}\n")
        sys.exit(1)
    except KeyboardInterrupt:
        print(f"\n\n  {YELLOW}Interrupted. Progress saved to {STATE_FILE}{RESET}")
        save(state)
        sys.exit(0)

    print(f"""
{CYAN}{BOLD}
  ════════════════════════════════════════════════
  ALL DONE. Your project is submitted to Synthesis.
  ════════════════════════════════════════════════
{RESET}
""")


if __name__ == "__main__":
    run_submit_flow()
