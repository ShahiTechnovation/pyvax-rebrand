import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { kv } from "@vercel/kv";
import yaml from "js-yaml";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const VALID_ROLES = [
    "product_marketing_agent",
    "growth_agent",
    "reply_guy_agent",
    "bug_terminator_agent",
    "swe_agent",
];

const ROLE_LABELS: Record<string, string> = {
    product_marketing_agent: "Product Marketing Agent",
    growth_agent: "Growth / BD Agent",
    reply_guy_agent: "Reply-Guy Agent",
    bug_terminator_agent: "Bug Terminator Agent",
    swe_agent: "SWE Agent",
};

interface AgentYaml {
    name: string;
    role: string;
    human: string;
    capabilities: string[];
    stack: string[];
    webhook: string;
    github?: string;
    demo?: string;
    success_metric: string;
}

// ─── Rate limiting ───────────────────────────────────────────────────────────
async function checkRateLimit(ip: string): Promise<boolean> {
    const key = `ratelimit:agents:${ip}`;
    try {
        const count = await kv.incr(key);
        if (count === 1) {
            await kv.expire(key, 3600); // 1 hour TTL
        }
        return count <= 10;
    } catch {
        return true; // Allow if KV is unavailable
    }
}

// ─── Test mission email ──────────────────────────────────────────────────────
function buildTestMissionEmail(agent: AgentYaml & { agentId: string }, testUrl: string): string {
    const roleLabel = ROLE_LABELS[agent.role] || agent.role;
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Roboto,sans-serif;color:#F2F2F2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111;border:1px solid #1F1F1F;border-radius:12px;overflow:hidden;">

<tr><td style="padding:40px 40px 16px;text-align:center;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#E84142;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;">🔴 CLASSIFIED MISSION BRIEFING</div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#FFF;">Agent Registered.</h1>
    <p style="margin:0;font-size:14px;color:#888;">Your agent <strong style="color:#E84142;">${agent.name}</strong> has been deployed to the <strong style="color:#FFF;">${roleLabel}</strong> track.</p>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#E84142,transparent);"></div>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#E84142;letter-spacing:2px;margin-bottom:12px;">YAML SUMMARY</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:12px;color:#666;padding:4px 0;font-family:'Courier New',monospace;">Agent Name</td><td style="font-size:13px;color:#ccc;padding:4px 0;">${agent.name}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:4px 0;font-family:'Courier New',monospace;">Track</td><td style="font-size:13px;color:#ccc;padding:4px 0;">${roleLabel}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:4px 0;font-family:'Courier New',monospace;">Capabilities</td><td style="font-size:13px;color:#ccc;padding:4px 0;">${(agent.capabilities || []).join(", ")}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:4px 0;font-family:'Courier New',monospace;">Stack</td><td style="font-size:13px;color:#ccc;padding:4px 0;">${(agent.stack || []).join(", ")}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:4px 0;font-family:'Courier New',monospace;">Webhook</td><td style="font-size:13px;color:#E84142;padding:4px 0;">${agent.webhook}</td></tr>
    </table>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(232,65,66,0.3),transparent);"></div>
</td></tr>

<tr><td style="padding:16px 40px;text-align:center;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#FFD700;letter-spacing:2px;margin-bottom:12px;">⚠ TEST MISSION</div>
    <p style="font-size:14px;color:#ccc;line-height:1.6;margin:0 0 16px;">Your agent must now prove capability by completing a test form. The form will be pre-populated from your YAML. Your agent has <strong style="color:#E84142;">5 minutes</strong> to fill it via its webhook.</p>
    <a href="${testUrl}" style="display:inline-block;background:#E84142;color:#FFF;text-decoration:none;font-family:'Courier New',monospace;font-size:12px;font-weight:bold;padding:14px 32px;border-radius:8px;letter-spacing:1px;">START TEST MISSION →</a>
    <p style="font-size:11px;color:#555;margin-top:12px;">Or share this URL with your agent:<br/><span style="color:#E84142;word-break:break-all;">${testUrl}</span></p>
</td></tr>

<tr><td style="padding:16px 40px 32px;text-align:center;">
    <div style="font-size:11px;color:#444;">
        PyVax Careers — Classified. Agent ID: <span style="color:#666;">${agent.agentId}</span>
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
        // Rate limit
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const allowed = await checkRateLimit(ip);
        if (!allowed) {
            return NextResponse.json(
                { success: false, error: "Rate limit exceeded. Max 10 applications per hour." },
                { status: 429 }
            );
        }

        // Parse multipart form
        const formData = await request.formData();
        const agentRole = formData.get("agentRole") as string | null;
        const agentFile = formData.get("agentFile") as File | null;

        if (!agentFile) {
            return NextResponse.json(
                { success: false, error: "Missing agentFile. Upload your agent.yaml file." },
                { status: 400 }
            );
        }

        // Read and parse YAML
        const yamlText = await agentFile.text();
        let agentData: AgentYaml;
        try {
            agentData = yaml.load(yamlText) as AgentYaml;
        } catch (parseErr: any) {
            return NextResponse.json(
                { success: false, error: `Invalid YAML: ${parseErr.message}` },
                { status: 400 }
            );
        }

        if (!agentData || typeof agentData !== "object") {
            return NextResponse.json(
                { success: false, error: "YAML must contain a valid object." },
                { status: 400 }
            );
        }

        // Override role from form field if provided, otherwise use YAML
        const role = agentRole || agentData.role;
        if (!role || !VALID_ROLES.includes(role)) {
            return NextResponse.json(
                { success: false, error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` },
                { status: 400 }
            );
        }
        agentData.role = role;

        // Validate required fields
        const human = (agentData.human || "").trim().toLowerCase();
        if (!human || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(human)) {
            return NextResponse.json(
                { success: false, error: "Valid 'human' email is required in agent.yaml." },
                { status: 400 }
            );
        }
        agentData.human = human;

        if (!agentData.webhook?.trim()) {
            return NextResponse.json(
                { success: false, error: "'webhook' URL is required in agent.yaml." },
                { status: 400 }
            );
        }

        if (!agentData.name?.trim()) {
            agentData.name = `Agent-${Date.now().toString(36)}`;
        }

        // Generate agent ID and store
        const agentId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
        const storedData = {
            ...agentData,
            agentId,
            capabilities: agentData.capabilities || [],
            stack: agentData.stack || [],
            github: agentData.github || "",
            demo: agentData.demo || "",
            success_metric: agentData.success_metric || "",
            submittedAt: new Date().toISOString(),
            ip,
            testStatus: "pending",
            testResults: null,
        };

        await kv.hset(`agent:${agentId}`, storedData);

        // Also track in a list for easy enumeration
        await kv.lpush("agents:applications", agentId);

        // Build test URL
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://careers.pyvax.xyz";
        const testUrl = `${baseUrl}/careers/test/${agentId}`;

        // Send test mission email
        if (resend) {
            try {
                await resend.emails.send({
                    from: "PyVax Careers <dev@pyvax.xyz>",
                    to: [human],
                    subject: `🔴 Test Mission Assigned — ${agentData.name}`,
                    html: buildTestMissionEmail({ ...agentData, agentId }, testUrl),
                });
            } catch (emailErr: any) {
                console.error("Failed to send test mission email:", emailErr?.message || emailErr);
            }
        }

        return NextResponse.json({
            success: true,
            agentId,
            testUrl,
            message: `Agent ${agentData.name} registered. Test mission sent to ${human}.`,
        });
    } catch (error: any) {
        console.error("Agent apply error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Something went wrong." },
            { status: 500 }
        );
    }
}
