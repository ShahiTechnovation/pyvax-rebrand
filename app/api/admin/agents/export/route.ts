import { NextRequest, NextResponse } from "next/server";
import { getAllAgents, agentsToCsv } from "@/lib/admin/agents";

const APPROVE_SECRET = process.env.AGENT_APPROVE_SECRET || "pyvax-approve-2026";

// GET /api/admin/agents/export — CSV download
export async function GET(request: NextRequest) {
    const secret = request.headers.get("x-approve-secret") ||
        request.nextUrl.searchParams.get("secret");
    if (secret !== APPROVE_SECRET) {
        return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    try {
        const agents = await getAllAgents();
        const csv = agentsToCsv(agents);

        return new NextResponse(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="pyvax-agents-${new Date().toISOString().slice(0, 10)}.csv"`,
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || "Export failed." },
            { status: 500 }
        );
    }
}
