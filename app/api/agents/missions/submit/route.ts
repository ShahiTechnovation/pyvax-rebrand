import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { kv } from "@vercel/kv";
import { ROLE_LABELS, buildMissionResultsEmail } from "@/lib/emails/careers";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// ─── Rate limiting ───────────────────────────────────────────────────────────
async function checkRateLimit(ip: string): Promise<boolean> {
    const key = `ratelimit:mission:${ip}`;
    try {
        const count = await kv.incr(key);
        if (count === 1) await kv.expire(key, 3600);
        return count <= 10;
    } catch {
        return true;
    }
}

// ─── Role-specific validation ────────────────────────────────────────────────
interface ValidationResult {
    valid: boolean;
    summary: string;
    itemCount: number;
    passRate: string;
    error?: string;
}

function validateSubmission(role: string, data: any): ValidationResult {
    switch (role) {
        case "product_marketing_agent": {
            const campaigns = data?.campaigns;
            if (!Array.isArray(campaigns) || campaigns.length < 3) {
                return { valid: false, summary: "", itemCount: 0, passRate: "0%", error: "Must submit at least 3 campaign variants as a JSON array." };
            }
            // Check each campaign has required fields
            const valid = campaigns.filter((c: any) =>
                c && typeof c === "object" && c.headline && c.body && c.cta && c.audience
            );
            const passRate = `${valid.length}/${campaigns.length}`;
            return {
                valid: valid.length >= 3,
                summary: `${valid.length} complete variants out of ${campaigns.length} submitted`,
                itemCount: campaigns.length,
                passRate,
                error: valid.length < 3 ? `Only ${valid.length} variants have all required fields (headline, body, cta, audience).` : undefined,
            };
        }

        case "growth_agent": {
            const leads = data?.leads;
            if (!Array.isArray(leads) || leads.length < 25) {
                return { valid: false, summary: "", itemCount: leads?.length || 0, passRate: "0%", error: `Need 25 leads, got ${leads?.length || 0}.` };
            }
            // Calculate average signal
            const signals = leads.map((l: any) => parseFloat(l?.signal || 0)).filter((s: number) => !isNaN(s));
            const avgSignal = signals.length > 0 ? signals.reduce((a: number, b: number) => a + b, 0) / signals.length : 0;
            const passRate = `avg signal: ${avgSignal.toFixed(2)}`;
            return {
                valid: avgSignal > 0.6,
                summary: `${leads.length} leads submitted, avg signal ${avgSignal.toFixed(2)}`,
                itemCount: leads.length,
                passRate,
                error: avgSignal <= 0.6 ? `Average signal ${avgSignal.toFixed(2)} is below 0.6 threshold.` : undefined,
            };
        }

        case "reply_guy_agent": {
            const replies = data?.replies;
            const escalations = data?.escalations || 0;
            if (!Array.isArray(replies) || replies.length < 50) {
                return { valid: false, summary: "", itemCount: replies?.length || 0, passRate: "0%", error: `Need 50+ replies, got ${replies?.length || 0}.` };
            }
            const passRate = `${replies.length} replies, ${escalations} escalations`;
            return {
                valid: escalations === 0,
                summary: `${replies.length} replies delivered, ${escalations} escalations`,
                itemCount: replies.length,
                passRate,
                error: escalations > 0 ? `${escalations} unresolved escalations.` : undefined,
            };
        }

        case "bug_terminator_agent":
        case "swe_agent": {
            const fixes = data?.fixes;
            if (!Array.isArray(fixes) || fixes.length < 10) {
                return { valid: false, summary: "", itemCount: fixes?.length || 0, passRate: "0%", error: `Need 10 issues, got ${fixes?.length || 0}.` };
            }
            const actionable = fixes.filter((f: any) =>
                f && typeof f === "object" && f.issue && f.repro && f.fix
            );
            const passRate = `${actionable.length}/${fixes.length} actionable`;
            return {
                valid: actionable.length >= 8,
                summary: `${actionable.length} actionable fixes out of ${fixes.length} submitted`,
                itemCount: fixes.length,
                passRate,
                error: actionable.length < 8 ? `Only ${actionable.length}/10 fixes are actionable (need issue, repro, fix fields).` : undefined,
            };
        }

        default:
            return { valid: false, summary: "", itemCount: 0, passRate: "0%", error: `Unknown role: ${role}` };
    }
}

// ─── POST handler ────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const allowed = await checkRateLimit(ip);
        if (!allowed) {
            return NextResponse.json(
                { success: false, error: "Rate limit exceeded. Max 10 submissions per hour." },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { agentId, data } = body;

        if (!agentId) {
            return NextResponse.json(
                { success: false, error: "Missing agentId." },
                { status: 400 }
            );
        }

        if (!data || typeof data !== "object") {
            return NextResponse.json(
                { success: false, error: "Missing or invalid data payload." },
                { status: 400 }
            );
        }

        // Fetch agent from KV
        const agentData = await kv.hgetall(`agent:${agentId}`);
        if (!agentData) {
            return NextResponse.json(
                { success: false, error: "Agent not found." },
                { status: 404 }
            );
        }

        const agent = agentData as Record<string, any>;
        const role = agent.role as string;

        // Check agent has passed test
        if (agent.testStatus !== "completed" && agent.missionStatus !== "assigned") {
            return NextResponse.json(
                { success: false, error: "Agent must pass the test mission before submitting work." },
                { status: 403 }
            );
        }

        // Validate submission
        const validation = validateSubmission(role, data);

        const submittedAt = new Date().toISOString();

        // Store mission results in KV
        await kv.hset(`agent:${agentId}`, {
            missionStatus: validation.valid ? "submitted" : "needs_revision",
            missionData: JSON.stringify(data),
            missionSubmittedAt: submittedAt,
            missionValidation: JSON.stringify(validation),
        });

        // Also store full mission record
        await kv.hset(`mission:${agentId}`, {
            agentId,
            role,
            data: JSON.stringify(data),
            validation: JSON.stringify(validation),
            submittedAt,
            status: validation.valid ? "pending_review" : "needs_revision",
        });

        // Send A4 email to team
        if (resend && validation.valid) {
            try {
                const roleLabel = ROLE_LABELS[role] || role;
                const rawPreview = JSON.stringify(data, null, 2).slice(0, 1500);
                await resend.emails.send({
                    from: "PyVax Careers <dev@pyvax.xyz>",
                    to: ["dev@pyvax.xyz"],
                    subject: `📋 Mission Submitted: ${agent.name || "Agent"} — ${roleLabel}`,
                    html: buildMissionResultsEmail(
                        { agentId, name: agent.name, role, human: agent.human },
                        {
                            summary: validation.summary,
                            itemCount: validation.itemCount,
                            passRate: validation.passRate,
                            submittedAt,
                            rawPreview,
                        }
                    ),
                });
            } catch (emailErr: any) {
                console.error("Failed to send mission results email:", emailErr?.message || emailErr);
            }
        }

        // Notify agent webhook
        if (agent.webhook) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                await fetch(agent.webhook, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: "mission_update",
                        agentId,
                        event: "submission_received",
                        valid: validation.valid,
                        summary: validation.summary,
                        timestamp: submittedAt,
                    }),
                    signal: controller.signal,
                });
                clearTimeout(timeout);
            } catch {
                // Webhook delivery is best-effort
            }
        }

        if (!validation.valid) {
            return NextResponse.json({
                success: false,
                error: validation.error,
                validation: {
                    summary: validation.summary,
                    itemCount: validation.itemCount,
                    passRate: validation.passRate,
                },
                message: "Submission does not meet requirements. Please revise and resubmit.",
            }, { status: 422 });
        }

        return NextResponse.json({
            success: true,
            message: "Mission submitted successfully. Pending review.",
            validation: {
                summary: validation.summary,
                itemCount: validation.itemCount,
                passRate: validation.passRate,
            },
        });
    } catch (error: any) {
        console.error("Mission submit error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Something went wrong." },
            { status: 500 }
        );
    }
}
