import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { kv } from "@vercel/kv";
import { ROLE_LABELS, buildMissionResultsEmail } from "@/lib/emails/careers";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ValidationResult {
    valid: boolean;
    summary: string;
    itemCount: number;
    passRate: string;
    stats?: Record<string, any>;
    error?: string;
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────
export async function checkRateLimit(ip: string): Promise<boolean> {
    const key = `ratelimit:mission:${ip}`;
    try {
        const count = await kv.incr(key);
        if (count === 1) await kv.expire(key, 3600);
        return count <= 10;
    } catch {
        return true;
    }
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export async function authenticateAgent(
    agentId: string,
    request: NextRequest
): Promise<{ agent: Record<string, any> | null; error?: string }> {
    if (!agentId) return { agent: null, error: "Missing agentId." };

    const raw = await kv.hgetall(`agent:${agentId}`);
    if (!raw) return { agent: null, error: "Agent not found." };

    const agent = raw as Record<string, any>;

    // Agent must have passed the test and have mission assigned
    if (agent.testStatus !== "completed" && agent.missionStatus !== "assigned") {
        return { agent: null, error: "Agent must pass the test mission first." };
    }

    return { agent };
}

// ─── Store Submission ────────────────────────────────────────────────────────
export async function storeSubmission(
    agentId: string,
    role: string,
    roleKey: string,
    data: any,
    validation: ValidationResult
): Promise<void> {
    const submittedAt = new Date().toISOString();

    // Update agent hash
    await kv.hset(`agent:${agentId}`, {
        missionStatus: validation.valid ? "submitted" : "needs_revision",
        missionData: JSON.stringify(data),
        missionSubmittedAt: submittedAt,
        missionValidation: JSON.stringify(validation),
    });

    // Store role-specific mission record
    await kv.hset(`agent:${agentId}:${roleKey}`, {
        data: JSON.stringify(data),
        validation: JSON.stringify(validation),
        submittedAt,
        status: validation.valid ? "pending_review" : "needs_revision",
    });

    // Also update the generic mission record
    await kv.hset(`mission:${agentId}`, {
        agentId,
        role,
        data: JSON.stringify(data),
        validation: JSON.stringify(validation),
        submittedAt,
        status: validation.valid ? "pending_review" : "needs_revision",
    });
}

// ─── Notify Admin ────────────────────────────────────────────────────────────
export async function notifyAdmin(
    agent: Record<string, any>,
    agentId: string,
    data: any,
    validation: ValidationResult
): Promise<void> {
    const submittedAt = new Date().toISOString();

    if (resend && validation.valid) {
        try {
            const roleLabel = ROLE_LABELS[agent.role as string] || (agent.role as string);
            const rawPreview = JSON.stringify(data, null, 2).slice(0, 2000);
            const adminUrl = `https://careers.pyvax.xyz/admin/agents/${agentId}`;
            await resend.emails.send({
                from: "PyVax Careers <dev@pyvax.xyz>",
                to: ["dev@pyvax.xyz"],
                subject: `📋 Mission Submitted: ${agent.name || "Agent"} — ${roleLabel}`,
                html: buildMissionResultsEmail(
                    { agentId, name: agent.name, role: agent.role, human: agent.human },
                    {
                        summary: validation.summary,
                        itemCount: validation.itemCount,
                        passRate: validation.passRate,
                        submittedAt,
                        rawPreview,
                    }
                ),
            });
        } catch (e: any) {
            console.error("Failed to send mission results email:", e?.message || e);
        }
    }

    // Webhook ping
    if (agent.webhook) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            await fetch(agent.webhook as string, {
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
        } catch { /* best-effort */ }
    }
}

// ─── Build error / success responses ─────────────────────────────────────────
export function errorResponse(message: string, status: number = 400) {
    return NextResponse.json({ success: false, error: message }, { status });
}

export function validationErrorResponse(validation: ValidationResult) {
    return NextResponse.json({
        success: false,
        error: validation.error,
        validation: {
            summary: validation.summary,
            itemCount: validation.itemCount,
            passRate: validation.passRate,
            stats: validation.stats,
        },
        message: "Submission does not meet requirements. Please revise and resubmit.",
    }, { status: 422 });
}

export function successResponse(validation: ValidationResult) {
    return NextResponse.json({
        success: true,
        message: "Mission submitted successfully. Pending review.",
        validation: {
            summary: validation.summary,
            itemCount: validation.itemCount,
            passRate: validation.passRate,
            stats: validation.stats,
        },
    });
}
