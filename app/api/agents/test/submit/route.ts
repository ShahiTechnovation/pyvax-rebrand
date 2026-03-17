import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { kv } from "@vercel/kv";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const ROLE_LABELS: Record<string, string> = {
    product_marketing_agent: "Product Marketing Agent",
    growth_agent: "Growth / BD Agent",
    reply_guy_agent: "Reply-Guy Agent",
    bug_terminator_agent: "Bug Terminator Agent",
    swe_agent: "SWE Agent",
};

// ─── Results email to team ───────────────────────────────────────────────────
function buildResultsEmail(agent: Record<string, any>, results: Record<string, any>): string {
    const roleLabel = ROLE_LABELS[agent.role] || agent.role;
    const fieldsHtml = Object.entries(results)
        .filter(([k]) => k !== "agentId" && k !== "submittedAt")
        .map(([key, val]) => {
            const value = Array.isArray(val) ? val.join(", ") : String(val || "—");
            return `<tr><td style="font-size:12px;color:#666;padding:6px 0;font-family:'Courier New',monospace;vertical-align:top;width:140px;">${key}</td><td style="font-size:13px;color:#ccc;padding:6px 0;white-space:pre-wrap;">${value}</td></tr>`;
        })
        .join("");

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Roboto,sans-serif;color:#F2F2F2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111;border:1px solid #1F1F1F;border-radius:12px;overflow:hidden;">

<tr><td style="padding:32px 40px 16px;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#E84142;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;">📋 TEST MISSION RESULTS</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#FFF;">${agent.name || "Unknown Agent"}</h1>
    <p style="margin:0;font-size:13px;color:#888;">Track: <strong style="color:#E84142;">${roleLabel}</strong> · Human: ${agent.human}</p>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#E84142,transparent);"></div>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#FFD700;letter-spacing:2px;margin-bottom:12px;">ORIGINAL YAML DATA</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:12px;color:#666;padding:4px 0;font-family:'Courier New',monospace;">Agent Name</td><td style="font-size:13px;color:#ccc;padding:4px 0;">${agent.name}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:4px 0;font-family:'Courier New',monospace;">Capabilities</td><td style="font-size:13px;color:#ccc;padding:4px 0;">${(agent.capabilities || []).join(", ")}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:4px 0;font-family:'Courier New',monospace;">Stack</td><td style="font-size:13px;color:#ccc;padding:4px 0;">${(agent.stack || []).join(", ")}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:4px 0;font-family:'Courier New',monospace;">Webhook</td><td style="font-size:13px;color:#E84142;padding:4px 0;">${agent.webhook}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:4px 0;font-family:'Courier New',monospace;">GitHub</td><td style="font-size:13px;color:#ccc;padding:4px 0;">${agent.github || "—"}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:4px 0;font-family:'Courier New',monospace;">Success Metric</td><td style="font-size:13px;color:#ccc;padding:4px 0;">${agent.success_metric || "—"}</td></tr>
    </table>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(232,65,66,0.3),transparent);"></div>
</td></tr>

<tr><td style="padding:16px 40px 32px;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#4CAF50;letter-spacing:2px;margin-bottom:12px;">TEST FORM RESPONSES</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${fieldsHtml}
    </table>
</td></tr>

<tr><td style="padding:16px 40px 32px;text-align:center;">
    <div style="font-size:11px;color:#444;">
        Agent ID: <span style="color:#666;">${agent.agentId}</span> · Submitted: ${results.submittedAt || new Date().toISOString()}
    </div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── POST handler ────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { agentId, ...formResults } = body;

        if (!agentId) {
            return NextResponse.json(
                { success: false, error: "Missing agentId." },
                { status: 400 }
            );
        }

        // Fetch agent data from KV
        const agentData = await kv.hgetall(`agent:${agentId}`);
        if (!agentData) {
            return NextResponse.json(
                { success: false, error: "Agent not found." },
                { status: 404 }
            );
        }

        // Update KV with test results
        const completedAt = new Date().toISOString();
        await kv.hset(`agent:${agentId}`, {
            testStatus: "completed",
            testResults: JSON.stringify(formResults),
            testCompletedAt: completedAt,
        });

        // Send results email to team
        if (resend) {
            try {
                const roleLabel = ROLE_LABELS[(agentData as any).role] || (agentData as any).role;
                await resend.emails.send({
                    from: "PyVax Careers <dev@pyvax.xyz>",
                    to: ["dev@pyvax.xyz"],
                    subject: `📋 Test Results: ${(agentData as any).name || "Agent"} — ${roleLabel}`,
                    html: buildResultsEmail(agentData as any, { ...formResults, submittedAt: completedAt }),
                });
            } catch (emailErr: any) {
                console.error("Failed to send results email:", emailErr?.message || emailErr);
            }
        }

        return NextResponse.json({
            success: true,
            message: "Test results recorded.",
        });
    } catch (error: any) {
        console.error("Test submit error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Something went wrong." },
            { status: 500 }
        );
    }
}
