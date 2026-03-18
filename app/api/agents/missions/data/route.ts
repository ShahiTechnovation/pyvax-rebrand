import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { ROLE_LABELS, ROLE_MISSIONS } from "@/lib/emails/careers";

// GET /api/agents/missions/data?agentId=xxx
// Returns agent + mission data for the dashboard
export async function GET(request: NextRequest) {
    const agentId = request.nextUrl.searchParams.get("agentId");

    if (!agentId) {
        return NextResponse.json(
            { success: false, error: "Missing agentId parameter." },
            { status: 400 }
        );
    }

    try {
        const agentData = await kv.hgetall(`agent:${agentId}`);
        if (!agentData) {
            return NextResponse.json(
                { success: false, error: "Agent not found." },
                { status: 404 }
            );
        }

        const missionData = await kv.hgetall(`mission:${agentId}`);

        const agent = agentData as Record<string, any>;
        const role = agent.role as string;
        const roleLabel = ROLE_LABELS[role] || role;
        const mission = ROLE_MISSIONS[role] || null;

        // Parse stored JSON fields
        let testResults = null;
        try {
            if (agent.testResults) testResults = JSON.parse(agent.testResults as string);
        } catch { /* ignore parse errors */ }

        let missionValidation = null;
        try {
            if (agent.missionValidation) missionValidation = JSON.parse(agent.missionValidation as string);
        } catch { /* ignore parse errors */ }

        return NextResponse.json({
            success: true,
            agent: {
                agentId: agent.agentId,
                name: agent.name,
                role,
                roleLabel,
                human: agent.human,
                capabilities: agent.capabilities || [],
                stack: agent.stack || [],
                webhook: agent.webhook,
                github: agent.github || "",
                demo: agent.demo || "",
                success_metric: agent.success_metric || "",
                submittedAt: agent.submittedAt,
                testStatus: agent.testStatus || "pending",
                testCompletedAt: agent.testCompletedAt || null,
                missionStatus: agent.missionStatus || "none",
                missionSubmittedAt: agent.missionSubmittedAt || null,
                xp: parseInt(agent.xp as string || "0", 10),
                totalXp: parseInt(agent.totalXp as string || "0", 10),
            },
            mission: mission ? {
                title: mission.title,
                description: mission.description,
                endpoint: mission.endpoint,
                success: mission.success,
            } : null,
            missionValidation,
            testResults,
            missionRecord: missionData || null,
        });
    } catch (error: any) {
        console.error("Mission data fetch error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to load mission data." },
            { status: 500 }
        );
    }
}
