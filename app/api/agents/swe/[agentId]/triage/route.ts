import { NextRequest } from "next/server";
import {
    checkRateLimit, authenticateAgent, storeSubmission, notifyAdmin,
    errorResponse, validationErrorResponse, successResponse,
    type ValidationResult,
} from "@/lib/missions/submit";

// POST /api/agents/swe/[agentId]/triage
// Handles both bug_terminator_agent and swe_agent roles
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

        const triage = await request.json();
        if (!Array.isArray(triage)) {
            return errorResponse("Body must be a JSON array of issue triages.", 400);
        }

        const validation = validateTriage(triage);
        await storeSubmission(agentId, agent.role as string, "swe:triage", triage, validation);
        await notifyAdmin(agent, agentId, triage, validation);

        if (!validation.valid) return validationErrorResponse(validation);
        return successResponse(validation);
    } catch (error: any) {
        console.error("SWE triage submit error:", error);
        return errorResponse(error.message || "Something went wrong.", 500);
    }
}

function validateTriage(triage: any[]): ValidationResult {
    if (triage.length < 10) {
        return {
            valid: false,
            summary: `${triage.length}/10 issues submitted`,
            itemCount: triage.length,
            passRate: `${triage.length}/10`,
            error: `Need at least 10 issues, got ${triage.length}.`,
        };
    }

    // Check required fields
    const complete = triage.filter((t: any) =>
        t && typeof t === "object" &&
        t.issue_url && typeof t.issue_url === "string" && t.issue_url.startsWith("http") &&
        Array.isArray(t.repro_steps) && t.repro_steps.length > 0 &&
        t.proposed_fix && typeof t.proposed_fix === "string" && t.proposed_fix.trim().length > 10 &&
        t.test_plan && typeof t.test_plan === "string" && t.test_plan.trim().length > 5
    );

    // Check duplicate URLs
    const urls = new Set<string>();
    let duplicates = 0;
    for (const t of triage) {
        const url = (t.issue_url || "").toLowerCase().trim();
        if (url && urls.has(url)) duplicates++;
        else urls.add(url);
    }

    const actionableThreshold = 8;
    const valid = complete.length >= actionableThreshold && duplicates === 0;

    return {
        valid,
        summary: `${complete.length}/${triage.length} actionable issues${duplicates > 0 ? `, ${duplicates} duplicate URLs` : ""}`,
        itemCount: triage.length,
        passRate: `${complete.length}/${triage.length} actionable`,
        stats: { actionable: complete.length, total: triage.length, duplicates },
        error: !valid
            ? duplicates > 0
                ? `Found ${duplicates} duplicate issue URLs.`
                : `Only ${complete.length}/${triage.length} issues are actionable (need issue_url, repro_steps, proposed_fix, test_plan). Minimum: ${actionableThreshold}.`
            : undefined,
    };
}
