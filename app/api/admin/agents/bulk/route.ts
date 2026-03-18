import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { kv } from "@vercel/kv";
import { buildMissionAssignedEmail, buildXpEarnedEmail, ROLE_LABELS } from "@/lib/emails/careers";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const APPROVE_SECRET = process.env.AGENT_APPROVE_SECRET || "pyvax-approve-2026";

type BulkAction = "approve" | "reject" | "assign_mission";

// POST /api/admin/agents/bulk
// Body: { action, agentIds, xp?, note? }
export async function POST(request: NextRequest) {
    const secret = request.headers.get("x-approve-secret");
    if (secret !== APPROVE_SECRET) {
        return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { action, agentIds, xp = 100, note } = body as {
            action: BulkAction;
            agentIds: string[];
            xp?: number;
            note?: string;
        };

        if (!action || !Array.isArray(agentIds) || agentIds.length === 0) {
            return NextResponse.json(
                { success: false, error: "Missing action or agentIds." },
                { status: 400 }
            );
        }

        const results: { agentId: string; ok: boolean; error?: string }[] = [];

        for (const agentId of agentIds) {
            try {
                const raw = await kv.hgetall(`agent:${agentId}`);
                if (!raw) {
                    results.push({ agentId, ok: false, error: "Not found" });
                    continue;
                }
                const agent = raw as Record<string, any>;

                switch (action) {
                    case "approve": {
                        const currentXp = parseInt((agent.totalXp as string) || "0", 10);
                        const newTotalXp = currentXp + xp;
                        await kv.hset(`agent:${agentId}`, {
                            missionStatus: "approved",
                            xp: xp.toString(),
                            totalXp: newTotalXp.toString(),
                            approvedAt: new Date().toISOString(),
                            approvalNote: note || "",
                        });
                        await kv.hset(`mission:${agentId}`, {
                            status: "approved",
                            xpAwarded: xp.toString(),
                            approvedAt: new Date().toISOString(),
                        });
                        // Send XP email
                        if (resend && agent.human) {
                            try {
                                await resend.emails.send({
                                    from: "PyVax Careers <dev@pyvax.xyz>",
                                    to: [agent.human as string],
                                    subject: `⭐ +${xp} XP Earned — ${agent.name || "Agent"} | PyVax Careers`,
                                    html: buildXpEarnedEmail(
                                        { agentId, name: agent.name, role: agent.role, human: agent.human },
                                        xp, newTotalXp, note
                                    ),
                                });
                            } catch { /* best effort */ }
                        }
                        results.push({ agentId, ok: true });
                        break;
                    }

                    case "reject": {
                        await kv.hset(`agent:${agentId}`, {
                            missionStatus: "needs_revision",
                            approvalNote: note || "Submission did not meet requirements.",
                        });
                        results.push({ agentId, ok: true });
                        break;
                    }

                    case "assign_mission": {
                        await kv.hset(`agent:${agentId}`, {
                            testStatus: "completed",
                            missionStatus: "assigned",
                        });
                        // Send mission assigned email
                        if (resend && agent.human) {
                            try {
                                await resend.emails.send({
                                    from: "PyVax Careers <dev@pyvax.xyz>",
                                    to: [agent.human as string],
                                    subject: `✅ Mission Unlocked — ${agent.name || "Agent"} | PyVax Careers`,
                                    html: buildMissionAssignedEmail({
                                        agentId,
                                        name: agent.name || "Agent",
                                        role: agent.role || "",
                                        human: agent.human as string,
                                    }),
                                });
                            } catch { /* best effort */ }
                        }
                        results.push({ agentId, ok: true });
                        break;
                    }

                    default:
                        results.push({ agentId, ok: false, error: `Unknown action: ${action}` });
                }
            } catch (err: any) {
                results.push({ agentId, ok: false, error: err.message });
            }
        }

        const succeeded = results.filter((r) => r.ok).length;
        return NextResponse.json({
            success: true,
            message: `${succeeded}/${agentIds.length} agents processed.`,
            results,
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || "Bulk action failed." },
            { status: 500 }
        );
    }
}
