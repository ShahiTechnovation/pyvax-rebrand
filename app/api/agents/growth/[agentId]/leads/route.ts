import { NextRequest } from "next/server";
import {
    checkRateLimit, authenticateAgent, storeSubmission, notifyAdmin,
    errorResponse, validationErrorResponse, successResponse,
    type ValidationResult,
} from "@/lib/missions/submit";

// POST /api/agents/growth/[agentId]/leads
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ agentId: string }> }
) {
    try {
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        if (!(await checkRateLimit(ip))) {
            return errorResponse("Rate limit exceeded. Max 10 submissions per hour.", 429);
        }

        const { agentId } = await params;
        const { agent, error: authError } = await authenticateAgent(agentId, request);
        if (!agent) return errorResponse(authError || "Unauthorized.", 401);

        // Expect a JSON array of leads
        const leads = await request.json();
        if (!Array.isArray(leads)) {
            return errorResponse("Body must be a JSON array of leads.", 400);
        }

        // ─── Validate ────────────────────────────────────────────────────
        const validation = validateLeads(leads);

        // ─── Store ───────────────────────────────────────────────────────
        await storeSubmission(agentId, "growth_agent", "growth:leads", leads, validation);

        // ─── Notify Admin ────────────────────────────────────────────────
        await notifyAdmin(agent, agentId, leads, validation);

        if (!validation.valid) return validationErrorResponse(validation);
        return successResponse(validation);
    } catch (error: any) {
        console.error("Growth leads submit error:", error);
        return errorResponse(error.message || "Something went wrong.", 500);
    }
}

function validateLeads(leads: any[]): ValidationResult {
    if (leads.length < 25) {
        return {
            valid: false,
            summary: `${leads.length}/25 leads submitted`,
            itemCount: leads.length,
            passRate: `${leads.length}/25`,
            error: `Need at least 25 leads, got ${leads.length}.`,
        };
    }

    // Check required fields
    const complete = leads.filter((l: any) =>
        l && typeof l === "object" &&
        l.name && l.twitter && l.email &&
        typeof l.signal_strength === "number" &&
        l.why_qualified
    );

    if (complete.length < 25) {
        return {
            valid: false,
            summary: `${complete.length}/${leads.length} leads have all required fields`,
            itemCount: leads.length,
            passRate: `${complete.length}/${leads.length}`,
            error: `Only ${complete.length} leads have all required fields (name, twitter, email, signal_strength, why_qualified).`,
        };
    }

    // Check average signal
    const signals = leads.map((l: any) => parseFloat(l.signal_strength || 0)).filter((s: number) => !isNaN(s));
    const avgSignal = signals.length > 0 ? signals.reduce((a: number, b: number) => a + b, 0) / signals.length : 0;

    // Check duplicates by twitter handle
    const handles = new Set<string>();
    let duplicates = 0;
    for (const l of leads) {
        const h = (l.twitter || "").toLowerCase().trim();
        if (handles.has(h)) duplicates++;
        else handles.add(h);
    }

    const valid = avgSignal >= 0.6 && duplicates === 0;

    return {
        valid,
        summary: `${leads.length} leads, avg signal ${avgSignal.toFixed(2)}${duplicates > 0 ? `, ${duplicates} duplicates` : ""}`,
        itemCount: leads.length,
        passRate: `avg signal: ${avgSignal.toFixed(2)}`,
        stats: { avgSignal: avgSignal.toFixed(2), duplicates, completeLeads: complete.length },
        error: !valid
            ? avgSignal < 0.6
                ? `Average signal ${avgSignal.toFixed(2)} is below 0.6 threshold.`
                : `Found ${duplicates} duplicate twitter handles.`
            : undefined,
    };
}
