import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { kv } from "@vercel/kv";

// ─── Resend client ──────────────────────────────────────────────────────────
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface WaitlistEntry {
    email: string;
    position: number;
    joinedAt: string;
    ip?: string;
}

async function readWaitlist(): Promise<WaitlistEntry[]> {
    try {
        // Retrieve the waitlist array from Vercel KV
        const data = await kv.get<WaitlistEntry[]>("pyvax_waitlist");
        return data || [];
    } catch (err) {
        console.warn("⚠️ KV read error:", err);
        return [];
    }
}

async function writeWaitlist(entries: WaitlistEntry[]) {
    try {
        // Save the waitlist array to Vercel KV
        await kv.set("pyvax_waitlist", entries);
    } catch (err) {
        console.error("⚠️ KV write error:", err);
    }
}

// ─── Email template ─────────────────────────────────────────────────────────
function buildWelcomeEmail(email: string, position: number, spotsRemaining: number): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Welcome to PyVax</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#050505;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">

<!-- Preheader text (hidden) -->
<div style="display:none;font-size:1px;color:#050505;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    You're #${position} on the PyVax Agent waitlist — the first autonomous on-chain agent powered entirely by Python is coming.
</div>

<!-- Outer wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#050505;">
<tr><td align="center" style="padding:32px 16px;">

<!-- Main card -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#0A0A0A;border:1px solid #1A1A1A;border-radius:16px;overflow:hidden;">

<!-- HERO IMAGE SECTION -->
<tr>
<td style="padding:0;position:relative;">
    <div style="background:linear-gradient(135deg, #0A0A0A 0%, #1a0505 30%, #0A0A0A 60%, #150808 100%);padding:48px 40px 40px;text-align:center;position:relative;">
        <!-- Red glow effect -->
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:300px;height:300px;background:radial-gradient(circle,rgba(232,65,66,0.15) 0%,transparent 70%);pointer-events:none;"></div>
        
        <!-- Logo -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;">
        <tr>
            <td style="background:linear-gradient(135deg,#E84142,#FF6B6B);width:48px;height:48px;border-radius:12px;text-align:center;vertical-align:middle;font-size:24px;color:#fff;font-weight:800;letter-spacing:-1px;">
                Py
            </td>
        </tr>
        </table>
        
        <!-- Brand name -->
        <div style="font-family:'Courier New',monospace;font-size:28px;font-weight:800;color:#FFFFFF;letter-spacing:6px;margin-bottom:8px;">
            PYVAX
        </div>
        <div style="font-family:'Courier New',monospace;font-size:10px;color:#E84142;letter-spacing:4px;text-transform:uppercase;">
            AGENT PROGRAM · CLASSIFIED
        </div>
    </div>
</td>
</tr>

<!-- DIVIDER LINE -->
<tr>
<td style="padding:0 40px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#E84142,transparent);"></div>
</td>
</tr>

<!-- WELCOME MESSAGE -->
<tr>
<td style="padding:40px 40px 16px;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#E84142;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px;">
        ⚡ ACCESS CONFIRMED
    </div>
    <h1 style="margin:0 0 16px;font-family:'Segoe UI',Roboto,sans-serif;font-size:32px;font-weight:800;color:#FFFFFF;line-height:1.2;">
        You're In.
    </h1>
    <p style="margin:0;font-family:'Segoe UI',Roboto,sans-serif;font-size:16px;color:#888888;line-height:1.7;">
        Welcome to the PyVax Agent early access program. You've secured your spot among the first developers to control the blockchain with <span style="color:#E84142;font-weight:600;">pure Python</span>.
    </p>
</td>
</tr>

<!-- POSITION CARD -->
<tr>
<td style="padding:16px 40px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#111111;border:1px solid #1F1F1F;border-radius:12px;">
    <tr>
        <td style="padding:24px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <!-- Position -->
                <td style="width:50%;vertical-align:top;">
                    <div style="font-family:'Courier New',monospace;font-size:9px;color:#555;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">YOUR POSITION</div>
                    <div style="font-family:'Courier New',monospace;font-size:36px;font-weight:800;color:#E84142;line-height:1;">#${position}</div>
                </td>
                <!-- Spots left -->
                <td style="width:50%;vertical-align:top;text-align:right;">
                    <div style="font-family:'Courier New',monospace;font-size:9px;color:#555;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">SPOTS LEFT</div>
                    <div style="font-family:'Courier New',monospace;font-size:36px;font-weight:800;color:#F2F2F2;line-height:1;">${spotsRemaining}</div>
                </td>
            </tr>
            </table>
            
            <!-- Progress bar -->
            <div style="margin-top:20px;">
                <div style="width:100%;height:4px;background-color:#1A1A1A;border-radius:4px;overflow:hidden;">
                    <div style="width:${Math.min(100, (position / 1000) * 100)}%;height:100%;background:linear-gradient(90deg,#E84142,#FF6B6B);border-radius:4px;"></div>
                </div>
                <div style="font-family:'Courier New',monospace;font-size:9px;color:#444;margin-top:6px;text-align:right;">
                    ${position}/1,000 early access slots filled
                </div>
            </div>
        </td>
    </tr>
    </table>
</td>
</tr>

<!-- WHAT'S COMING SECTION -->
<tr>
<td style="padding:0 40px 32px;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#E84142;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px;">
        ◆ WHAT YOU'RE GETTING
    </div>
    
    <!-- Feature 1 -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
    <tr>
        <td style="width:44px;vertical-align:top;padding-top:2px;">
            <div style="width:36px;height:36px;background:rgba(232,65,66,0.1);border:1px solid rgba(232,65,66,0.25);border-radius:8px;text-align:center;line-height:36px;font-size:16px;">🐍</div>
        </td>
        <td style="vertical-align:top;padding-left:12px;">
            <div style="font-family:'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:700;color:#F0F0F0;margin-bottom:3px;">100% Python Smart Contracts</div>
            <div style="font-family:'Segoe UI',Roboto,sans-serif;font-size:13px;color:#777;line-height:1.5;">Write, deploy, and verify contracts with zero Solidity. Your Python runs directly on Avalanche C-Chain.</div>
        </td>
    </tr>
    </table>
    
    <!-- Feature 2 -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
    <tr>
        <td style="width:44px;vertical-align:top;padding-top:2px;">
            <div style="width:36px;height:36px;background:rgba(232,65,66,0.1);border:1px solid rgba(232,65,66,0.25);border-radius:8px;text-align:center;line-height:36px;font-size:16px;">🤖</div>
        </td>
        <td style="vertical-align:top;padding-left:12px;">
            <div style="font-family:'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:700;color:#F0F0F0;margin-bottom:3px;">Autonomous Agent Runtime</div>
            <div style="font-family:'Segoe UI',Roboto,sans-serif;font-size:13px;color:#777;line-height:1.5;">Your agent deploys, trades, manages wallets, and remembers — fully autonomous, fully onchain.</div>
        </td>
    </tr>
    </table>
    
    <!-- Feature 3 -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
    <tr>
        <td style="width:44px;vertical-align:top;padding-top:2px;">
            <div style="width:36px;height:36px;background:rgba(232,65,66,0.1);border:1px solid rgba(232,65,66,0.25);border-radius:8px;text-align:center;line-height:36px;font-size:16px;">⛓️</div>
        </td>
        <td style="vertical-align:top;padding-left:12px;">
            <div style="font-family:'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:700;color:#F0F0F0;margin-bottom:3px;">On-Chain Memory</div>
            <div style="font-family:'Segoe UI',Roboto,sans-serif;font-size:13px;color:#777;line-height:1.5;">Persistent, verifiable state written directly to the blockchain. Your agent never forgets.</div>
        </td>
    </tr>
    </table>
    
    <!-- Feature 4 -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
        <td style="width:44px;vertical-align:top;padding-top:2px;">
            <div style="width:36px;height:36px;background:rgba(232,65,66,0.1);border:1px solid rgba(232,65,66,0.25);border-radius:8px;text-align:center;line-height:36px;font-size:16px;">⚡</div>
        </td>
        <td style="vertical-align:top;padding-left:12px;">
            <div style="font-family:'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:700;color:#F0F0F0;margin-bottom:3px;">Priority Access & Early Drops</div>
            <div style="font-family:'Segoe UI',Roboto,sans-serif;font-size:13px;color:#777;line-height:1.5;">Be the first to get SDK access, agent templates, and exclusive dev previews before public launch.</div>
        </td>
    </tr>
    </table>
</td>
</tr>

<!-- DIVIDER -->
<tr>
<td style="padding:0 40px;">
    <div style="height:1px;background-color:#1A1A1A;"></div>
</td>
</tr>

<!-- CODE PREVIEW -->
<tr>
<td style="padding:32px 40px;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#E84142;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;">
        ▸ PREVIEW
    </div>
    <div style="background-color:#080808;border:1px solid #1C1C1C;border-radius:8px;padding:20px 24px;overflow:hidden;">
        <div style="font-family:'Courier New',monospace;font-size:12px;line-height:2;color:#888;">
            <div><span style="color:#E84142;">from</span> <span style="color:#D0D0D0;">pyvax.agent</span> <span style="color:#E84142;">import</span> <span style="color:#D0D0D0;">Agent</span></div>
            <div style="height:4px;"></div>
            <div><span style="color:#444;"># Your agent, your rules</span></div>
            <div><span style="color:#D0D0D0;">agent = Agent(</span><span style="color:#7EC8A4;">"alpha-1"</span><span style="color:#D0D0D0;">)</span></div>
            <div><span style="color:#D0D0D0;">agent.deploy()</span> <span style="color:#4CAF50;">✓</span></div>
        </div>
    </div>
</td>
</tr>

<!-- CTA BUTTON -->
<tr>
<td style="padding:0 40px 32px;text-align:center;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
    <tr>
        <td style="background:linear-gradient(135deg,#E84142,#c0302f);border-radius:10px;padding:16px 48px;text-align:center;">
            <a href="https://pyvax.app/agent" target="_blank" style="font-family:'Courier New',monospace;font-size:13px;font-weight:800;color:#FFFFFF;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">
                VIEW YOUR SPOT →
            </a>
        </td>
    </tr>
    </table>
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#444;margin-top:12px;">
        Share with your developer friends — spots are limited
    </div>
</td>
</tr>

<!-- SHARE ON X -->
<tr>
<td style="padding:0 40px 32px;text-align:center;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
    <tr>
        <td style="background-color:#111;border:1px solid #1F1F1F;border-radius:8px;padding:12px 32px;text-align:center;">
            <a href="https://x.com/intent/tweet?text=${encodeURIComponent(`🔴 I just joined the @PyVax Agent waitlist\n\n🐍 The first autonomous on-chain agent powered ENTIRELY by Python is coming on @avax.\n\n⛓️ Deploy. Trade. Remember. Never sleep.\nZero Solidity. Full autonomy.\n\nJoin before it's gone 👇`)}&url=${encodeURIComponent('https://pyvax.app/agent')}&hashtags=${encodeURIComponent('PyVax,Web3,Python')}" target="_blank" style="font-family:'Courier New',monospace;font-size:11px;color:#999;text-decoration:none;letter-spacing:1px;">
                𝕏 SHARE ON TWITTER
            </a>
        </td>
    </tr>
    </table>
</td>
</tr>

<!-- BOTTOM DIVIDER -->
<tr>
<td style="padding:0 40px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#1A1A1A,transparent);"></div>
</td>
</tr>

<!-- FOOTER -->
<tr>
<td style="padding:32px 40px 40px;text-align:center;">
    <div style="font-family:'Courier New',monospace;font-size:11px;color:#555;margin-bottom:8px;">
        PYVAX — Smart contracts for the agent era
    </div>
    <div style="font-family:'Segoe UI',Roboto,sans-serif;font-size:11px;color:#333;margin-bottom:16px;">
        Built on Avalanche · 100% Python-native · Open Source
    </div>
    <div style="margin-bottom:16px;">
        <a href="https://pyvax.app" style="font-family:'Courier New',monospace;font-size:10px;color:#555;text-decoration:none;margin:0 8px;">Website</a>
        <span style="color:#222;">·</span>
        <a href="https://x.com/PyVax" style="font-family:'Courier New',monospace;font-size:10px;color:#555;text-decoration:none;margin:0 8px;">Twitter</a>
        <span style="color:#222;">·</span>
        <a href="https://github.com/ShahiTechnovation/pyvax-rebrand" style="font-family:'Courier New',monospace;font-size:10px;color:#555;text-decoration:none;margin:0 8px;">GitHub</a>
    </div>
    <div style="font-family:'Segoe UI',Roboto,sans-serif;font-size:10px;color:#2A2A2A;line-height:1.6;">
        You're receiving this because you signed up for PyVax Agent early access.<br>
        © 2025 PyVax. All rights reserved.
    </div>
</td>
</tr>

</table>
<!-- End main card -->

</td></tr>
</table>
<!-- End outer wrapper -->

</body>
</html>`;
}

// ─── GET: Return waitlist stats ─────────────────────────────────────────────
export async function GET() {
    const entries = await readWaitlist();
    const BASE_SIGNUPS = 153;
    const totalCount = BASE_SIGNUPS + entries.length;

    return NextResponse.json({
        success: true,
        count: totalCount,
        spotsRemaining: Math.max(0, 1000 - totalCount),
    });
}

// ─── POST: Join waitlist + send welcome email ───────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const email = (body.email || "").trim().toLowerCase();

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            return NextResponse.json(
                { success: false, error: "Email is required" },
                { status: 400 }
            );
        }
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { success: false, error: "Invalid email address" },
                { status: 400 }
            );
        }

        // Read current waitlist
        const entries = await readWaitlist();
        const BASE_SIGNUPS = 153;

        // Check for duplicate
        if (entries.some((e) => e.email === email)) {
            const existing = entries.find((e) => e.email === email)!;
            return NextResponse.json({
                success: true,
                message: "You're already on the waitlist!",
                position: existing.position,
                count: BASE_SIGNUPS + entries.length,
                spotsRemaining: Math.max(0, 1000 - (BASE_SIGNUPS + entries.length)),
                alreadyJoined: true,
            });
        }

        // Check if waitlist is full
        const totalCount = BASE_SIGNUPS + entries.length;
        if (totalCount >= 1000) {
            return NextResponse.json(
                { success: false, error: "Waitlist is full! All 1,000 spots have been claimed." },
                { status: 400 }
            );
        }

        // Add to waitlist
        const position = totalCount + 1;
        const spotsRemaining = Math.max(0, 1000 - position);

        const newEntry: WaitlistEntry = {
            email,
            position,
            joinedAt: new Date().toISOString(),
        };

        entries.push(newEntry);
        await writeWaitlist(entries);

        // Send welcome email via Resend
        if (resend) {
            try {
                await resend.emails.send({
                    from: "PyVax <dev@pyvax.xyz>",
                    to: [email],
                    subject: `🔴 You're #${position} — Welcome to PyVax Agent Early Access`,
                    html: buildWelcomeEmail(email, position, spotsRemaining),
                });
            } catch (emailError: any) {
                // Log but don't fail the signup if email sending fails
                console.error("Failed to send welcome email:", emailError?.message || emailError);
            }
        } else {
            console.warn("RESEND_API_KEY is missing, skipping welcome email.");
        }

        return NextResponse.json({
            success: true,
            message: "Welcome to PyVax! Check your inbox.",
            position,
            count: position,
            spotsRemaining,
            alreadyJoined: false,
        });
    } catch (error: any) {
        console.error("Waitlist error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Something went wrong" },
            { status: 500 }
        );
    }
}
