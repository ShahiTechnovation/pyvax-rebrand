import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

// GET /api/agents/test/data?agentId=xxx
// Returns agent data for the test form to pre-populate
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
                { success: false, error: "Agent not found. This test link may have expired." },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            agent: agentData,
        });
    } catch (error: any) {
        console.error("Agent data fetch error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to load agent data." },
            { status: 500 }
        );
    }
}
