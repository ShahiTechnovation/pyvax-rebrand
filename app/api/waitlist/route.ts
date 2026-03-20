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
function buildWelcomeEmail(email: string, position: number, spotsRemaining: number, accessCode: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Classified Access: Synthesis Hackathon</title>
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
<body style="margin:0;padding:0;background-color:#0a0510;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">

<!-- Preheader text (hidden) -->
<div style="display:none;font-size:1px;color:#0a0510;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    Your agent classified access code is inside. Participate in the Synthesis Hackathon for $75K in prizes.
</div>

<!-- Outer wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0510;">
<tr><td align="center" style="padding:32px 16px;">

<!-- Main card -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#110a18;border:1px solid rgba(255,20,147,0.2);border-radius:16px;overflow:hidden;box-shadow:0 0 30px rgba(255,20,147,0.1);">

<!-- HERO IMAGE SECTION -->
<tr>
<td style="padding:0;position:relative;">
    <div style="background:linear-gradient(135deg, #110a18 0%, #1a0510 50%, #110a18 100%);padding:48px 40px 40px;text-align:center;position:relative;">
        <!-- Pink glow effect -->
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:300px;height:300px;background:radial-gradient(circle,rgba(255,20,147,0.15) 0%,transparent 70%);pointer-events:none;"></div>
        
        <!-- Logo -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;">
        <tr>
            <td style="text-align:center;vertical-align:middle;">
                <img src="https://pyvax.xyz/logo.png" alt="PyVax Logo" width="64" height="64" style="display:block;border:none;outline:none;text-decoration:none;filter:drop-shadow(0 0 10px rgba(255,20,147,0.4));" />
            </td>
        </tr>
        </table>
        
        <!-- Brand name -->
        <div style="font-family:'Courier New',monospace;font-size:14px;color:#FF1493;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px;">
            PROJECT CLASSIFIED
        </div>
        <div style="font-family:'Courier New',monospace;font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:2px;margin-bottom:8px;">
            SYNTHESIS HACKATHON
        </div>
    </div>
</td>
</tr>

<!-- DIVIDER LINE -->
<tr>
<td style="padding:0 40px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,20,147,0.5),transparent);"></div>
</td>
</tr>

<!-- WELCOME MESSAGE -->
<tr>
<td style="padding:40px 40px 16px;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#4CAF50;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px;">
        ✓ ACCESS GRANTED
    </div>
    <h1 style="margin:0 0 16px;font-family:'Segoe UI',Roboto,sans-serif;font-size:28px;font-weight:800;color:#FFFFFF;line-height:1.2;">
        Your Agent is Ready.
    </h1>
    <p style="margin:0;font-family:'Segoe UI',Roboto,sans-serif;font-size:15px;color:#a09bb0;line-height:1.7;">
        Welcome to PyVax Classified. You've unlocked the portal to build autonomous Python agents for the Synthesis Hackathon. Compete for a massive <strong style="color:#FFD700;">$75,000 prize pool</strong>.
    </p>
</td>
</tr>

<!-- ACCESS CODE BLOCK -->
<tr>
<td style="padding:16px 40px 16px;">
    <div style="background:linear-gradient(135deg,rgba(255,20,147,0.1),rgba(139,0,139,0.1));border:1px solid rgba(255,20,147,0.3);border-radius:12px;padding:32px 24px;text-align:center;">
        <div style="font-family:'Courier New',monospace;font-size:11px;color:#FF1493;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;font-weight:bold;">YOUR UNIQUE ACCESS CODE</div>
        <div style="font-family:'Courier New',monospace;font-size:36px;font-weight:800;color:#FFD700;letter-spacing:8px;margin-bottom:24px;text-shadow:0 0 10px rgba(255,215,0,0.3);">${accessCode}</div>
        <a href="https://pyvax.xyz/classified" style="display:inline-block;background:linear-gradient(90deg,#FF1493,#8B008B);color:#FFF;text-decoration:none;font-family:'Courier New',monospace;font-size:13px;font-weight:bold;padding:16px 32px;border-radius:8px;letter-spacing:2px;box-shadow:0 0 20px rgba(255,20,147,0.4);">ENTER THE VAULT →</a>
    </div>
</td>
</tr>

<!-- WHAT TO DO NEXT -->
<tr>
<td style="padding:24px 40px 32px;">
    <div style="font-family:'Courier New',monospace;font-size:10px;color:#FF1493;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px;">
        ◆ YOUR NEXT STEPS
    </div>
    
    <!-- Step 1 -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
    <tr>
        <td style="width:40px;vertical-align:top;padding-top:2px;">
            <div style="width:28px;height:28px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:6px;text-align:center;line-height:28px;color:#FFD700;font-family:'Courier New',monospace;font-weight:bold;font-size:14px;">1</div>
        </td>
        <td style="vertical-align:top;padding-left:16px;">
            <div style="font-family:'Segoe UI',Roboto,sans-serif;font-size:16px;font-weight:700;color:#F0F0F0;margin-bottom:4px;">Install the CLI</div>
            <div style="font-family:'Courier New',monospace;font-size:12px;color:#FF1493;background:#0a0510;padding:8px 12px;border-radius:4px;border:1px solid rgba(255,20,147,0.2);margin-top:8px;">$ pip install classified-agent==1.2.0</div>
        </td>
    </tr>
    </table>
    
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
    <tr>
        <td style="width:40px;vertical-align:top;padding-top:2px;">
            <div style="width:28px;height:28px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:6px;text-align:center;line-height:28px;color:#FFD700;font-family:'Courier New',monospace;font-weight:bold;font-size:14px;">2</div>
        </td>
        <td style="vertical-align:top;padding-left:16px;">
            <div style="font-family:'Segoe UI',Roboto,sans-serif;font-size:16px;font-weight:700;color:#F0F0F0;margin-bottom:4px;">Register on Unstop</div>
            <div style="font-family:'Segoe UI',Roboto,sans-serif;font-size:14px;color:#a09bb0;line-height:1.5;">Make sure your team is officially registered for the Synthesis Hackathon.</div>
            <a href="https://pyvax.xyz/unstop" style="display:inline-block;color:#FF1493;font-size:13px;font-weight:bold;text-decoration:none;margin-top:8px;">Register Here →</a>
        </td>
    </tr>
    </table>
    
    <!-- Step 3 -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
        <td style="width:40px;vertical-align:top;padding-top:2px;">
            <div style="width:28px;height:28px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:6px;text-align:center;line-height:28px;color:#FFD700;font-family:'Courier New',monospace;font-weight:bold;font-size:14px;">3</div>
        </td>
        <td style="vertical-align:top;padding-left:16px;">
            <div style="font-family:'Segoe UI',Roboto,sans-serif;font-size:16px;font-weight:700;color:#F0F0F0;margin-bottom:4px;">Build & Submit</div>
            <div style="font-family:'Segoe UI',Roboto,sans-serif;font-size:14px;color:#a09bb0;line-height:1.5;">Use <span style="font-family:'Courier New',monospace;color:#FFF;">classified-agent run</span> to test and submit your on-chain agent.</div>
        </td>
    </tr>
    </table>
</td>
</tr>

<!-- DIVIDER -->
<tr>
<td style="padding:0 40px;">
    <div style="height:1px;background-color:rgba(255,255,255,0.05);"></div>
</td>
</tr>

<!-- SHARE ON X -->
<tr>
<td style="padding:32px 40px 32px;text-align:center;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
    <tr>
        <td style="background-color:#111;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px 32px;text-align:center;">
            <a href="https://pyvax.xyz/twitter-share" target="_blank" style="font-family:'Courier New',monospace;font-size:12px;color:#a09bb0;text-decoration:none;letter-spacing:1px;font-weight:bold;">
                𝕏 SHARE ON TWITTER
            </a>
        </td>
    </tr>
    </table>
</td>
</tr>

<!-- FOOTER -->
<tr>
<td style="padding:16px 40px 48px;text-align:center;">
    <div style="font-family:'Courier New',monospace;font-size:11px;color:#FF1493;margin-bottom:8px;letter-spacing:1px;">
        CLASSIFIED.PYVAX.XYZ
    </div>
    <div style="font-family:'Segoe UI',Roboto,sans-serif;font-size:11px;color:#666;margin-bottom:16px;">
        Autonomous Python Agents on Avalanche
    </div>
    <div style="margin-bottom:16px;">
        <a href="https://pyvax.xyz" style="font-family:'Courier New',monospace;font-size:10px;color:#888;text-decoration:none;margin:0 8px;">Website</a>
        <span style="color:#333;">·</span>
        <a href="https://pyvax.xyz/twitter" style="font-family:'Courier New',monospace;font-size:10px;color:#888;text-decoration:none;margin:0 8px;">Twitter</a>
    </div>
    <div style="font-family:'Segoe UI',Roboto,sans-serif;font-size:10px;color:#444;line-height:1.6;">
        You're receiving this because you signed up for PyVax Agent access.<br>
        © 2026 PyVax. All rights reserved.
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
    const totalCount = entries.length;

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

        // Check for duplicate
        if (entries.some((e) => e.email === email)) {
            const existing = entries.find((e) => e.email === email)!;
            return NextResponse.json({
                success: true,
                message: "You're already on the waitlist!",
                position: existing.position,
                count: entries.length,
                spotsRemaining: Math.max(0, 1000 - entries.length),
                alreadyJoined: true,
            });
        }

        // Check if waitlist is full
        const totalCount = entries.length;
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

        // Generate and store classified code
        const accessCode = crypto.randomUUID().split('-')[0].toUpperCase();
        await kv.set(`classified:${accessCode}`, email, { ex: 30 * 24 * 3600 }); // 30 day TTL

        // Send welcome email via Resend
        if (resend) {
            try {
                await resend.emails.send({
                    from: "PyVax <dev@pyvax.xyz>",
                    to: [email],
                    subject: `🔴 You're #${position} — Welcome to PyVax Agent Early Access`,
                    html: buildWelcomeEmail(email, position, spotsRemaining, accessCode),
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
