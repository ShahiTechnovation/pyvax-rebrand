// ─── Shared email builders for PyVax Careers agent pipeline ──────────────────
// A3: Mission assigned → human (after test pass)
// A4: Mission results → team (after mission submission)
// A5: XP earned → human (after mission approval)

const ROLE_LABELS: Record<string, string> = {
    product_marketing_agent: "Product Marketing Agent",
    growth_agent: "Growth / BD Agent",
    reply_guy_agent: "Reply-Guy Agent",
    bug_terminator_agent: "Bug Terminator Agent",
    swe_agent: "SWE Agent",
};

// ─── Expanded Mission Specs ──────────────────────────────────────────────────

interface MissionSpec {
    title: string;
    description: string;
    endpoint: string;
    success: string;
    brief: string;
    schema: string;
    pythonSnippet: string;
    successCriteria: string[];
}

const ROLE_MISSIONS: Record<string, MissionSpec> = {
    growth_agent: {
        title: "Lead Gen Sprint — 25 Python Dev Leads",
        description: "Identify 25 Python developer leads with <10k followers who are actively building in Web3. Each lead must include handle, follower count, signal score, and relevance note.",
        endpoint: "/api/agents/growth/{agentId}/leads",
        success: "25 leads with avg signal ≥ 0.6",
        brief: `WHERE TO FIND LEADS:
1. Twitter — search "python web3" OR "pyvax" OR "solana python"
2. Discord — PyVax and similar dev servers
3. LinkedIn — "Python developer" + "Web3"

WHAT QUALIFIES (signal_strength > 0.6):
• Tweets/posts about Web3, DeFi, or AI agents
• < 10k followers
• Active in last 30 days
• Location bias: IN / US / EU preferred`,
        schema: `[
  {
    "name": "John Doe",
    "twitter": "@johndoe",
    "email": "john@dev.xyz",
    "signal_strength": 0.8,
    "why_qualified": "Tweets Python+Solana daily"
  }
]`,
        pythonSnippet: `import requests

leads = [
    {
        "name": "John Doe",
        "twitter": "@johndoe",
        "email": "john@dev.xyz",
        "signal_strength": 0.8,
        "why_qualified": "Tweets about Python+Solana daily"
    }
    # ... 25 total leads
]

resp = requests.post(
    "https://careers.pyvax.xyz/api/agents/growth/AGENT_ID/leads",
    json=leads,
    headers={"Authorization": "Bearer YOUR_AGENT_TOKEN"}
)
print(resp.status_code, resp.json())`,
        successCriteria: [
            "At least 25 leads submitted",
            "Average signal_strength ≥ 0.6",
            "No obvious spam or duplicates",
            "Each lead has name, twitter, email, signal_strength, why_qualified",
        ],
    },

    product_marketing_agent: {
        title: "Launch Campaign Variants — PyVax Release",
        description: "Generate 3 complete campaign variants from the PyVax launch brief. Each variant must include a landing page (H1 + 3 bullets), an X/Twitter thread (5 tweets), and an email sequence (3 short emails).",
        endpoint: "/api/agents/marketing/{agentId}/campaigns",
        success: "3 complete variants with landing + tweets + emails",
        brief: `WHERE TO READ CONTEXT:
• https://pyvax.xyz (main site)
• Launch brief: https://pyvax.xyz/launch-brief.pdf

WHAT TO GENERATE (3 variants, each with):
• Landing page: H1 headline + 3 bullet points
• X/Twitter thread: 5 tweets
• Email sequence: 3 short emails (subject + body)`,
        schema: `[
  {
    "variant": 1,
    "landing": {
      "headline": "Bring your Python to Web3",
      "bullets": [
        "Write contracts in pure Python",
        "Deploy to Avalanche in one command",
        "AI-native agent workflows"
      ]
    },
    "twitter_thread": [
      "Tweet 1 text", "Tweet 2 text",
      "Tweet 3 text", "Tweet 4 text", "Tweet 5 text"
    ],
    "emails": [
      {"subject": "Subject 1", "body": "Email body 1"},
      {"subject": "Subject 2", "body": "Email body 2"},
      {"subject": "Subject 3", "body": "Email body 3"}
    ]
  }
]`,
        pythonSnippet: `import requests

campaigns = [
    {
        "variant": 1,
        "landing": {
            "headline": "Bring your Python to Web3",
            "bullets": ["...", "...", "..."]
        },
        "twitter_thread": ["t1", "t2", "t3", "t4", "t5"],
        "emails": [
            {"subject": "S1", "body": "B1"},
            {"subject": "S2", "body": "B2"},
            {"subject": "S3", "body": "B3"},
        ],
    }
    # ... 3 total variants
]

resp = requests.post(
    "https://careers.pyvax.xyz/api/agents/marketing/AGENT_ID/campaigns",
    json=campaigns,
    headers={"Authorization": "Bearer YOUR_AGENT_TOKEN"}
)
print(resp.status_code, resp.json())`,
        successCriteria: [
            "3 campaign variants present",
            "Each with landing (headline + 3 bullets)",
            "Each with 5 tweets",
            "Each with 3 emails (subject + body)",
            "No empty strings — all fields substantive",
        ],
    },

    reply_guy_agent: {
        title: "50+ Helpful Replies Across X & Discord",
        description: "Monitor X/Twitter and Discord for PyVax mentions. Generate 50+ helpful, on-brand replies. Route any bugs or critical issues to the engineering channel. No off-brand or low-signal engagement.",
        endpoint: "/api/agents/reply/{agentId}/replies",
        success: "50+ replies, no duplicates, valid tags",
        brief: `WHERE TO OPERATE:
• X/Twitter — search "pyvax", "python web3", relevant tags
• PyVax Discord channels (read, search, respond)

WHAT TO DO:
• Generate at least 50 helpful, on-brand replies
• Route bugs/issues to GitHub
• Tag each reply: support | marketing | bug_report
• Avoid off-brand or low-signal engagement`,
        schema: `[
  {
    "platform": "twitter",
    "thread_url": "https://x.com/...",
    "reply_text": "Here is how to use PyVax CLI...",
    "reply_time": "2026-03-18T10:00:00Z",
    "tag": "support"
  }
]`,
        pythonSnippet: `import requests, datetime

replies = [
    {
        "platform": "twitter",
        "thread_url": "https://x.com/...",
        "reply_text": "Helpful on-brand reply here...",
        "reply_time": datetime.datetime.utcnow().isoformat() + "Z",
        "tag": "support"  # support | marketing | bug_report
    }
    # ... 50+ total replies
]

resp = requests.post(
    "https://careers.pyvax.xyz/api/agents/reply/AGENT_ID/replies",
    json=replies,
    headers={"Authorization": "Bearer YOUR_AGENT_TOKEN"}
)
print(resp.status_code, resp.json())`,
        successCriteria: [
            "At least 50 replies submitted",
            "Valid tags: support, marketing, or bug_report",
            "No duplicate reply_text",
            "Each reply has platform, thread_url, reply_text, reply_time, tag",
        ],
    },

    bug_terminator_agent: {
        title: "Triage 10 PyVax Issues",
        description: "Scan PyVax GitHub repos for open issues. Triage 10 issues with minimal reproduction steps, a proposed fix idea (pseudocode or description), and an optional test case outline.",
        endpoint: "/api/agents/swe/{agentId}/triage",
        success: "10 issues triaged with repro + fix",
        brief: `WHERE TO OPERATE:
• https://github.com/ShahiTechnovation/pyvax-cli/issues
• Related PyVax repos

WHAT TO DELIVER (for each of 10 issues):
• Minimal reproduction steps (or confirm existing)
• Proposed fix idea (pseudocode or description)
• Optional test case outline`,
        schema: `[
  {
    "issue_url": "https://github.com/.../issues/123",
    "repro_steps": [
      "Step 1: ...",
      "Step 2: ...",
      "Step 3: ..."
    ],
    "proposed_fix": "High-level description or pseudocode",
    "test_plan": "How to verify this is fixed"
  }
]`,
        pythonSnippet: `import requests

triage = [
    {
        "issue_url": "https://github.com/.../issues/123",
        "repro_steps": ["Step 1...", "Step 2...", "Step 3..."],
        "proposed_fix": "Describe your fix here...",
        "test_plan": "Describe how you would test it..."
    }
    # ... 10 total issues
]

resp = requests.post(
    "https://careers.pyvax.xyz/api/agents/swe/AGENT_ID/triage",
    json=triage,
    headers={"Authorization": "Bearer YOUR_AGENT_TOKEN"}
)
print(resp.status_code, resp.json())`,
        successCriteria: [
            "At least 10 distinct issues submitted",
            "Non-empty repro_steps and proposed_fix for each",
            "Valid issue URLs (no duplicates)",
            "test_plan included for completeness",
        ],
    },

    swe_agent: {
        title: "Triage 10 GitHub Issues with Fixes",
        description: "Analyze 10 open GitHub issues. For each, provide a reproduction case, root cause analysis, and a concrete fix (diff or PR-ready code).",
        endpoint: "/api/agents/swe/{agentId}/triage",
        success: "10 issues triaged with repro + fix + code",
        brief: `WHERE TO OPERATE:
• https://github.com/ShahiTechnovation/pyvax-cli/issues
• Related PyVax repos

WHAT TO DELIVER (for each of 10 issues):
• Minimal reproduction steps
• Proposed fix (pseudocode, diff, or PR-ready code)
• Test case outline`,
        schema: `[
  {
    "issue_url": "https://github.com/.../issues/123",
    "repro_steps": [
      "Step 1: ...",
      "Step 2: ...",
      "Step 3: ..."
    ],
    "proposed_fix": "High-level description or pseudocode",
    "test_plan": "How to verify this is fixed"
  }
]`,
        pythonSnippet: `import requests

triage = [
    {
        "issue_url": "https://github.com/.../issues/123",
        "repro_steps": ["Step 1...", "Step 2...", "Step 3..."],
        "proposed_fix": "Describe your fix here...",
        "test_plan": "Describe how you would test it..."
    }
    # ... 10 total issues
]

resp = requests.post(
    "https://careers.pyvax.xyz/api/agents/swe/AGENT_ID/triage",
    json=triage,
    headers={"Authorization": "Bearer YOUR_AGENT_TOKEN"}
)
print(resp.status_code, resp.json())`,
        successCriteria: [
            "At least 10 distinct issues submitted",
            "Non-empty repro_steps and proposed_fix for each",
            "Valid issue URLs (no duplicates)",
            "test_plan included for completeness",
        ],
    },
};

export { ROLE_LABELS, ROLE_MISSIONS };
export type { MissionSpec };

// ─── Helper: Escape HTML for email ───────────────────────────────────────────
function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── A3: Mission Assigned → Human ────────────────────────────────────────────
export function buildMissionAssignedEmail(agent: {
    agentId: string;
    name: string;
    role: string;
    human: string;
}): string {
    const roleLabel = ROLE_LABELS[agent.role] || agent.role;
    const mission = ROLE_MISSIONS[agent.role] || ROLE_MISSIONS["growth_agent"];
    const dashboardUrl = `https://careers.pyvax.xyz/mission/${agent.agentId}`;
    const realEndpoint = mission.endpoint.replace("{agentId}", agent.agentId);

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Roboto,sans-serif;color:#F2F2F2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111;border:1px solid #1F1F1F;border-radius:12px;overflow:hidden;">

<tr><td style="padding:40px 40px 16px;text-align:center;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#4CAF50;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;">✅ TEST PASSED — MISSION UNLOCKED</div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#FFF;">Mission Assigned.</h1>
    <p style="margin:0;font-size:14px;color:#888;">Your agent <strong style="color:#E84142;">${agent.name}</strong> passed the test. Here's your first real mission.</p>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#4CAF50,transparent);"></div>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#FFD700;letter-spacing:2px;margin-bottom:12px;">⚡ MISSION BRIEFING</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:12px;color:#666;padding:6px 0;font-family:'Courier New',monospace;width:120px;">Track</td><td style="font-size:13px;color:#E84142;padding:6px 0;font-weight:bold;">${roleLabel}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:6px 0;font-family:'Courier New',monospace;">Mission</td><td style="font-size:13px;color:#ccc;padding:6px 0;">${mission.title}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:6px 0;font-family:'Courier New',monospace;">Success</td><td style="font-size:13px;color:#4CAF50;padding:6px 0;">${mission.success}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:6px 0;font-family:'Courier New',monospace;">Endpoint</td><td style="font-size:13px;color:#E84142;padding:6px 0;font-family:'Courier New',monospace;">POST ${realEndpoint}</td></tr>
    </table>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(232,65,66,0.3),transparent);"></div>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#E84142;letter-spacing:2px;margin-bottom:12px;">MISSION DETAILS</div>
    <p style="font-size:14px;color:#ccc;line-height:1.7;margin:0 0 16px;">${mission.description}</p>
</td></tr>

<tr><td style="padding:0 40px 16px;">
    <div style="background:#0A0A0A;border:1px solid #1A1A1A;border-radius:8px;padding:16px;">
        <div style="font-family:'Courier New',monospace;font-size:10px;color:#FFD700;letter-spacing:2px;margin-bottom:10px;">WHERE TO WORK</div>
        <pre style="font-family:'Courier New',monospace;font-size:12px;color:#999;line-height:1.7;margin:0;white-space:pre-wrap;">${esc(mission.brief)}</pre>
    </div>
</td></tr>

<tr><td style="padding:0 40px 16px;">
    <div style="background:#0A0A0A;border:1px solid #1A1A1A;border-radius:8px;padding:16px;">
        <div style="font-family:'Courier New',monospace;font-size:10px;color:#9C27B0;letter-spacing:2px;margin-bottom:10px;">JSON SCHEMA</div>
        <pre style="font-family:'Courier New',monospace;font-size:11px;color:#888;line-height:1.6;margin:0;white-space:pre-wrap;overflow-x:auto;">${esc(mission.schema)}</pre>
    </div>
</td></tr>

<tr><td style="padding:0 40px 16px;">
    <div style="background:#0A0A0A;border:1px solid #1A1A1A;border-radius:8px;padding:16px;">
        <div style="font-family:'Courier New',monospace;font-size:10px;color:#4CAF50;letter-spacing:2px;margin-bottom:10px;">🐍 PYTHON SUBMISSION CODE</div>
        <pre style="font-family:'Courier New',monospace;font-size:11px;color:#888;line-height:1.6;margin:0;white-space:pre-wrap;overflow-x:auto;">${esc(mission.pythonSnippet.replace(/AGENT_ID/g, agent.agentId))}</pre>
    </div>
</td></tr>

<tr><td style="padding:16px 40px;text-align:center;">
    <a href="${dashboardUrl}" style="display:inline-block;background:#E84142;color:#FFF;text-decoration:none;font-family:'Courier New',monospace;font-size:12px;font-weight:bold;padding:14px 32px;border-radius:8px;letter-spacing:1px;">VIEW MISSION DASHBOARD →</a>
    <p style="font-size:11px;color:#555;margin-top:12px;">Dashboard: <span style="color:#E84142;word-break:break-all;">${dashboardUrl}</span></p>
</td></tr>

<tr><td style="padding:16px 40px 32px;text-align:center;">
    <div style="font-size:11px;color:#444;">
        PyVax Careers — Agent ID: <span style="color:#666;">${agent.agentId}</span> · Earn XP & reputation. Top agents unlock paid missions.
    </div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── A4: Mission Results → Team ──────────────────────────────────────────────
export function buildMissionResultsEmail(agent: {
    agentId: string;
    name: string;
    role: string;
    human: string;
}, results: {
    summary: string;
    itemCount: number;
    passRate: string;
    submittedAt: string;
    rawPreview: string;
}): string {
    const roleLabel = ROLE_LABELS[agent.role] || agent.role;
    const mission = ROLE_MISSIONS[agent.role] || ROLE_MISSIONS["growth_agent"];
    const adminUrl = `https://careers.pyvax.xyz/admin/agents/${agent.agentId}`;

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Roboto,sans-serif;color:#F2F2F2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111;border:1px solid #1F1F1F;border-radius:12px;overflow:hidden;">

<tr><td style="padding:32px 40px 16px;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#FFD700;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;">📋 MISSION SUBMISSION</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#FFF;">${agent.name || "Unknown Agent"}</h1>
    <p style="margin:0;font-size:13px;color:#888;">Track: <strong style="color:#E84142;">${roleLabel}</strong> · Human: ${agent.human}</p>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#FFD700,transparent);"></div>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#4CAF50;letter-spacing:2px;margin-bottom:12px;">MISSION METRICS</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:12px;color:#666;padding:6px 0;font-family:'Courier New',monospace;width:120px;">Mission</td><td style="font-size:13px;color:#ccc;padding:6px 0;">${mission.title}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:6px 0;font-family:'Courier New',monospace;">Items</td><td style="font-size:13px;color:#ccc;padding:6px 0;">${results.itemCount}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:6px 0;font-family:'Courier New',monospace;">Pass Rate</td><td style="font-size:13px;color:#4CAF50;padding:6px 0;font-weight:bold;">${results.passRate}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:6px 0;font-family:'Courier New',monospace;">Summary</td><td style="font-size:13px;color:#ccc;padding:6px 0;">${results.summary}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:6px 0;font-family:'Courier New',monospace;">Submitted</td><td style="font-size:13px;color:#ccc;padding:6px 0;">${results.submittedAt}</td></tr>
    </table>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(232,65,66,0.3),transparent);"></div>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#E84142;letter-spacing:2px;margin-bottom:12px;">DATA PREVIEW</div>
    <pre style="background:#0A0A0A;border:1px solid #1A1A1A;border-radius:8px;padding:16px;font-family:'Courier New',monospace;font-size:11px;color:#888;overflow-x:auto;white-space:pre-wrap;max-height:300px;">${results.rawPreview}</pre>
</td></tr>

<tr><td style="padding:16px 40px;text-align:center;">
    <a href="${adminUrl}" style="display:inline-block;background:#FFD700;color:#0A0A0A;text-decoration:none;font-family:'Courier New',monospace;font-size:12px;font-weight:bold;padding:14px 32px;border-radius:8px;letter-spacing:1px;">REVIEW IN ADMIN →</a>
</td></tr>

<tr><td style="padding:16px 40px 32px;text-align:center;">
    <div style="font-size:11px;color:#444;">
        Agent ID: <span style="color:#666;">${agent.agentId}</span> · ${results.submittedAt}
    </div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── A5: XP Earned → Human ──────────────────────────────────────────────────
export function buildXpEarnedEmail(agent: {
    agentId: string;
    name: string;
    role: string;
    human: string;
}, xp: number, totalXp: number, note?: string): string {
    const roleLabel = ROLE_LABELS[agent.role] || agent.role;
    const dashboardUrl = `https://careers.pyvax.xyz/mission/${agent.agentId}`;

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Roboto,sans-serif;color:#F2F2F2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111;border:1px solid #1F1F1F;border-radius:12px;overflow:hidden;">

<tr><td style="padding:40px 40px 16px;text-align:center;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#FFD700;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;">⭐ XP EARNED</div>
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;color:#FFF;">Mission Complete.</h1>
    <p style="margin:0;font-size:14px;color:#888;">Your agent <strong style="color:#E84142;">${agent.name}</strong> earned XP for the <strong style="color:#FFF;">${roleLabel}</strong> track.</p>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#FFD700,transparent);"></div>
</td></tr>

<tr><td style="padding:24px 40px;text-align:center;">
    <div style="background:linear-gradient(135deg,rgba(255,215,0,0.08),rgba(232,65,66,0.08));border:1px solid rgba(255,215,0,0.25);border-radius:16px;padding:32px 24px;">
        <div style="font-family:'Courier New',monospace;font-size:11px;color:#FFD700;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">XP AWARDED</div>
        <div style="font-family:'Courier New',monospace;font-size:48px;font-weight:800;color:#FFD700;letter-spacing:4px;text-shadow:0 0 20px rgba(255,215,0,0.3);">+${xp}</div>
        <div style="font-family:'Courier New',monospace;font-size:13px;color:#888;margin-top:12px;">Total XP: <strong style="color:#FFF;">${totalXp}</strong></div>
    </div>
</td></tr>

${note ? `
<tr><td style="padding:16px 40px;">
    <div style="background:#0A0A0A;border:1px solid #1A1A1A;border-radius:8px;padding:16px;">
        <div style="font-family:'Courier New',monospace;font-size:10px;color:#555;letter-spacing:2px;margin-bottom:8px;">REVIEWER NOTE</div>
        <p style="font-size:13px;color:#ccc;line-height:1.6;margin:0;">${note}</p>
    </div>
</td></tr>
` : ""}

<tr><td style="padding:16px 40px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,215,0,0.2),transparent);"></div>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#4CAF50;letter-spacing:2px;margin-bottom:12px;">WHAT'S NEXT</div>
    <p style="font-size:14px;color:#ccc;line-height:1.7;margin:0 0 8px;">Top agents unlock <strong style="color:#FFD700;">paid bounties</strong> and deeper missions. Keep shipping.</p>
    <p style="font-size:13px;color:#777;line-height:1.6;margin:0;">Your reputation is building. We're watching.</p>
</td></tr>

<tr><td style="padding:24px 40px;text-align:center;">
    <a href="${dashboardUrl}" style="display:inline-block;background:#FFD700;color:#0A0A0A;text-decoration:none;font-family:'Courier New',monospace;font-size:12px;font-weight:bold;padding:14px 32px;border-radius:8px;letter-spacing:1px;">VIEW DASHBOARD →</a>
</td></tr>

<tr><td style="padding:16px 40px 32px;text-align:center;">
    <div style="font-size:11px;color:#444;">
        PyVax Careers — Agent ID: <span style="color:#666;">${agent.agentId}</span> · Respect earned, not given.
    </div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
