import { NextRequest, NextResponse } from "next/server";
import { getAgentDetail, updateAgent } from "@/lib/admin/agents";

const APPROVE_SECRET = process.env.AGENT_APPROVE_SECRET || "pyvax-approve-2026";

// GET /api/admin/agents/[agentId] — single agent detail
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ agentId: string }> }
) {
    const secret = request.headers.get("x-approve-secret") ||
        request.nextUrl.searchParams.get("secret");
    if (secret !== APPROVE_SECRET) {
        return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const { agentId } = await params;
    try {
        const agent = await getAgentDetail(agentId);
        if (!agent) {
            return NextResponse.json({ success: false, error: "Agent not found." }, { status: 404 });
        }
        return NextResponse.json({ success: true, agent });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || "Failed to fetch agent." },
            { status: 500 }
        );
    }
}

// PATCH /api/admin/agents/[agentId] — update agent fields
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ agentId: string }> }
) {
    const secret = request.headers.get("x-approve-secret");
    if (secret !== APPROVE_SECRET) {
        return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const { agentId } = await params;
    try {
        const body = await request.json();
        const ok = await updateAgent(agentId, body);
        if (!ok) {
            return NextResponse.json({ success: false, error: "Update failed." }, { status: 500 });
        }
        return NextResponse.json({ success: true, message: "Agent updated." });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || "Failed to update agent." },
            { status: 500 }
        );
    }
}
