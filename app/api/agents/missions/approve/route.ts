import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { kv } from "@vercel/kv";
import { buildXpEarnedEmail } from "@/lib/emails/careers";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const APPROVE_SECRET = process.env.AGENT_APPROVE_SECRET || "pyvax-approve-2026";

// POST /api/agents/missions/approve
// Body: { agentId, xp, note? }
// Header: x-approve-secret: <secret>
export async function POST(request: NextRequest) {
    try {
        // Simple auth check
        const secret = request.headers.get("x-approve-secret");
        if (secret !== APPROVE_SECRET) {
            return NextResponse.json(
                { success: false, error: "Unauthorized." },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { agentId, xp = 100, note } = body;

        if (!agentId) {
            return NextResponse.json(
                { success: false, error: "Missing agentId." },
                { status: 400 }
            );
        }

        // Fetch agent
        const agentData = await kv.hgetall(`agent:${agentId}`);
        if (!agentData) {
            return NextResponse.json(
                { success: false, error: "Agent not found." },
                { status: 404 }
            );
        }

        const agent = agentData as Record<string, any>;

        // Calculate total XP
        const currentXp = parseInt(agent.totalXp as string || "0", 10);
        const newTotalXp = currentXp + xp;

        // Update KV
        await kv.hset(`agent:${agentId}`, {
            missionStatus: "approved",
            xp: xp.toString(),
            totalXp: newTotalXp.toString(),
            approvedAt: new Date().toISOString(),
            approvalNote: note || "",
        });

        // Update mission record
        await kv.hset(`mission:${agentId}`, {
            status: "approved",
            xpAwarded: xp.toString(),
            approvedAt: new Date().toISOString(),
        });

        // Send A5 email to human
        if (resend && agent.human) {
            try {
                await resend.emails.send({
                    from: "PyVax Careers <dev@pyvax.xyz>",
                    to: [agent.human as string],
                    subject: `⭐ +${xp} XP Earned — ${agent.name || "Agent"} | PyVax Careers`,
                    html: buildXpEarnedEmail(
                        { agentId, name: agent.name, role: agent.role, human: agent.human },
                        xp,
                        newTotalXp,
                        note
                    ),
                });
            } catch (emailErr: any) {
                console.error("Failed to send XP email:", emailErr?.message || emailErr);
            }
        }

        // Notify agent webhook
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
                        event: "mission_approved",
                        xp,
                        totalXp: newTotalXp,
                        note: note || "",
                        timestamp: new Date().toISOString(),
                    }),
                    signal: controller.signal,
                });
                clearTimeout(timeout);
            } catch {
                // Best-effort webhook
            }
        }

        return NextResponse.json({
            success: true,
            message: `Mission approved. +${xp} XP awarded to ${agent.name || "agent"}.`,
            totalXp: newTotalXp,
        });
    } catch (error: any) {
        console.error("Mission approve error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Something went wrong." },
            { status: 500 }
        );
    }
}
