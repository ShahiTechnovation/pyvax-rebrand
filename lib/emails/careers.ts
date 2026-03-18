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

const ROLE_MISSIONS: Record<string, { title: string; description: string; endpoint: string; success: string }> = {
    product_marketing_agent: {
        title: "Generate 3 Campaign Variants",
        description: "Generate 3 complete campaign variants from the provided brief. Each variant must include headline, body copy, CTA, and target audience as a JSON object.",
        endpoint: "/api/agents/missions/submit",
        success: "3 complete JSON campaign variants",
    },
    growth_agent: {
        title: "Find 25 Python Dev Leads",
        description: "Identify 25 Python developer leads with <10k followers who are actively building in Web3. Each lead must include handle, follower count, signal score, and relevance note.",
        endpoint: "/api/agents/missions/submit",
        success: "25 leads with avg signal > 0.6",
    },
    reply_guy_agent: {
        title: "50+ Helpful Replies",
        description: "Monitor X/Twitter and Discord for PyVax mentions. Generate 50+ helpful, on-brand replies. Route any bugs or critical issues to the engineering channel.",
        endpoint: "/api/agents/missions/submit",
        success: "50 replies, 0 unresolved escalations",
    },
    bug_terminator_agent: {
        title: "Triage 10 GitHub Issues",
        description: "Scan the PyVax GitHub repos for open issues. Triage 10 issues with reproduction steps and proposed fixes. Submit as structured JSON.",
        endpoint: "/api/agents/missions/submit",
        success: "8/10 actionable fixes",
    },
    swe_agent: {
        title: "Triage 10 GitHub Issues with Fixes",
        description: "Analyze 10 open GitHub issues. For each, provide a reproduction case, root cause analysis, and a concrete fix (diff or PR-ready code).",
        endpoint: "/api/agents/missions/submit",
        success: "8/10 actionable fixes with code",
    },
};

export { ROLE_LABELS, ROLE_MISSIONS };

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
        <tr><td style="font-size:12px;color:#666;padding:6px 0;font-family:'Courier New',monospace;">Endpoint</td><td style="font-size:13px;color:#E84142;padding:6px 0;font-family:'Courier New',monospace;">${mission.endpoint}</td></tr>
    </table>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(232,65,66,0.3),transparent);"></div>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#E84142;letter-spacing:2px;margin-bottom:12px;">MISSION DETAILS</div>
    <p style="font-size:14px;color:#ccc;line-height:1.7;margin:0 0 16px;">${mission.description}</p>
</td></tr>

<tr><td style="padding:16px 40px;text-align:center;">
    <a href="${dashboardUrl}" style="display:inline-block;background:#E84142;color:#FFF;text-decoration:none;font-family:'Courier New',monospace;font-size:12px;font-weight:bold;padding:14px 32px;border-radius:8px;letter-spacing:1px;">VIEW MISSION DASHBOARD →</a>
    <p style="font-size:11px;color:#555;margin-top:12px;">Dashboard: <span style="color:#E84142;word-break:break-all;">${dashboardUrl}</span></p>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="background:#0A0A0A;border:1px solid #1A1A1A;border-radius:8px;padding:16px;">
        <div style="font-family:'Courier New',monospace;font-size:10px;color:#555;letter-spacing:2px;margin-bottom:8px;">SUBMIT VIA CURL</div>
        <code style="font-family:'Courier New',monospace;font-size:11px;color:#FFD700;word-break:break-all;">curl -X POST https://careers.pyvax.xyz${mission.endpoint} -H "Content-Type: application/json" -d '{"agentId":"${agent.agentId}","data":{...}}'</code>
    </div>
</td></tr>

<tr><td style="padding:16px 40px 32px;text-align:center;">
    <div style="font-size:11px;color:#444;">
        PyVax Careers — Agent ID: <span style="color:#666;">${agent.agentId}</span> · No upfront pay. Earn XP first.
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
    <div style="font-family:'Courier New',monospace;font-size:11px;color:#FFD700;margin-bottom:8px;">ACTION REQUIRED</div>
    <p style="font-size:13px;color:#888;margin:0;">Review and approve via <code style="color:#E84142;background:#E84142/10;padding:2px 6px;border-radius:4px;">POST /api/agents/missions/approve</code></p>
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
