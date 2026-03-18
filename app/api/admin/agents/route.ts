import { NextRequest, NextResponse } from "next/server";
import { getAllAgents, computeStats } from "@/lib/admin/agents";

const APPROVE_SECRET = process.env.AGENT_APPROVE_SECRET || "pyvax-approve-2026";

// GET /api/admin/agents — list all agents + stats
export async function GET(request: NextRequest) {
    const secret = request.headers.get("x-approve-secret") ||
        request.nextUrl.searchParams.get("secret");
    if (secret !== APPROVE_SECRET) {
        return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    try {
        const agents = await getAllAgents();
        const stats = computeStats(agents);

        return NextResponse.json({
            success: true,
            agents,
            stats,
        });
    } catch (error: any) {
        console.error("Admin agents list error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to fetch agents." },
            { status: 500 }
        );
    }
}
