import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const ROLE_LABELS: Record<string, string> = {
    product_marketing_agent: "Product Marketing Agent",
    growth_agent: "Growth / BD Agent",
    reply_guy_agent: "Reply-Guy Agent",
    bug_terminator_agent: "Bug Terminator Agent",
    swe_agent: "SWE Agent",
};

// ─── Internal notification email ─────────────────────────────────────────────
function buildInternalEmail(data: {
    agentRole: string;
    humanEmail: string;
    agentDescription: string;
    githubUrl: string;
    demoUrl: string;
    successDefinition: string;
}): string {
    const roleLabel = ROLE_LABELS[data.agentRole] || data.agentRole;
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Roboto,sans-serif;color:#F2F2F2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111;border:1px solid #1F1F1F;border-radius:12px;overflow:hidden;">

<tr><td style="padding:32px 40px 16px;text-align:center;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#E84142;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;">🔴 NEW AGENT APPLICATION</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#FFF;">Manual Form Submission</h1>
    <p style="margin:0;font-size:13px;color:#888;">Track: <strong style="color:#E84142;">${roleLabel}</strong></p>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#E84142,transparent);"></div>
</td></tr>

<tr><td style="padding:16px 40px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:12px;color:#666;padding:6px 0;font-family:'Courier New',monospace;vertical-align:top;width:130px;">Human Email</td><td style="font-size:13px;color:#ccc;padding:6px 0;">${data.humanEmail}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:6px 0;font-family:'Courier New',monospace;vertical-align:top;">Track</td><td style="font-size:13px;color:#ccc;padding:6px 0;">${roleLabel}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:6px 0;font-family:'Courier New',monospace;vertical-align:top;">Agent Description</td><td style="font-size:13px;color:#ccc;padding:6px 0;white-space:pre-wrap;">${data.agentDescription}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:6px 0;font-family:'Courier New',monospace;vertical-align:top;">GitHub</td><td style="font-size:13px;color:#ccc;padding:6px 0;">${data.githubUrl || "—"}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:6px 0;font-family:'Courier New',monospace;vertical-align:top;">Demo</td><td style="font-size:13px;color:#ccc;padding:6px 0;">${data.demoUrl || "—"}</td></tr>
        <tr><td style="font-size:12px;color:#666;padding:6px 0;font-family:'Courier New',monospace;vertical-align:top;">Success Metric</td><td style="font-size:13px;color:#ccc;padding:6px 0;white-space:pre-wrap;">${data.successDefinition}</td></tr>
    </table>
</td></tr>

<tr><td style="padding:16px 40px 32px;text-align:center;">
    <div style="font-size:11px;color:#444;">
        PyVax Careers · Manual Application · ${new Date().toISOString()}
    </div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── Confirmation email to applicant ─────────────────────────────────────────
function buildConfirmationEmail(humanEmail: string, roleLabel: string): string {
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Roboto,sans-serif;color:#F2F2F2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111;border:1px solid #1F1F1F;border-radius:12px;overflow:hidden;">

<tr><td style="padding:40px 40px 16px;text-align:center;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#E84142;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;">🔴 CLASSIFIED CONFIRMATION</div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#FFF;">Agent Deployed.</h1>
    <p style="margin:0;font-size:14px;color:#888;line-height:1.6;">Your agent application for <strong style="color:#E84142;">${roleLabel}</strong> has been received.</p>
</td></tr>

<tr><td style="padding:16px 40px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#E84142,transparent);"></div>
</td></tr>

<tr><td style="padding:16px 40px;text-align:center;">
    <p style="font-size:14px;color:#ccc;line-height:1.7;margin:0 0 16px;">Our team will review your agent's mission briefing and get back to you at <strong style="color:#E84142;">${humanEmail}</strong>.</p>
    <p style="font-size:13px;color:#777;line-height:1.6;margin:0;">In the meantime, keep building. The best agents don't wait — they ship.</p>
</td></tr>

<tr><td style="padding:24px 40px;text-align:center;">
    <a href="https://pyvax.xyz/careers" style="display:inline-block;background:#E84142;color:#FFF;text-decoration:none;font-family:'Courier New',monospace;font-size:12px;font-weight:bold;padding:12px 28px;border-radius:8px;letter-spacing:1px;">BACK TO CAREERS →</a>
</td></tr>

<tr><td style="padding:16px 40px 32px;text-align:center;">
    <div style="font-size:11px;color:#444;">
        PyVax Careers — We'll be in touch. Keep shipping.
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
        const { agentRole, humanEmail, agentDescription, githubUrl, demoUrl, successDefinition } = body;

        // Validation
        if (!agentRole) {
            return NextResponse.json({ success: false, error: "Please select an agent role." }, { status: 400 });
        }
        if (!humanEmail?.trim()) {
            return NextResponse.json({ success: false, error: "Please enter your email." }, { status: 400 });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(humanEmail.trim())) {
            return NextResponse.json({ success: false, error: "Please enter a valid email." }, { status: 400 });
        }
        if (!agentDescription?.trim()) {
            return NextResponse.json({ success: false, error: "Please describe your agent." }, { status: 400 });
        }
        if (!successDefinition?.trim()) {
            return NextResponse.json({ success: false, error: "Please define what success looks like." }, { status: 400 });
        }

        const cleanEmail = humanEmail.trim().toLowerCase();
        const roleLabel = ROLE_LABELS[agentRole] || agentRole;

        // Email 1: Internal notification to team
        if (resend) {
            try {
                await resend.emails.send({
                    from: "PyVax Careers <dev@pyvax.xyz>",
                    to: ["dev@pyvax.xyz"],
                    subject: `🔴 Agent Application: ${roleLabel} — ${cleanEmail}`,
                    html: buildInternalEmail({
                        agentRole,
                        humanEmail: cleanEmail,
                        agentDescription: agentDescription.trim(),
                        githubUrl: githubUrl?.trim() || "",
                        demoUrl: demoUrl?.trim() || "",
                        successDefinition: successDefinition.trim(),
                    }),
                });
            } catch (err: any) {
                console.error("Failed to send internal email:", err?.message || err);
            }

            // Email 2: Confirmation to applicant
            try {
                await resend.emails.send({
                    from: "PyVax Careers <dev@pyvax.xyz>",
                    to: [cleanEmail],
                    subject: `Agent Deployed — ${roleLabel} | PyVax Careers`,
                    html: buildConfirmationEmail(cleanEmail, roleLabel),
                });
            } catch (err: any) {
                console.error("Failed to send confirmation email:", err?.message || err);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Manual apply error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Something went wrong." },
            { status: 500 }
        );
    }
}
