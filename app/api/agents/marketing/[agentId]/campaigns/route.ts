import { NextRequest } from "next/server";
import {
    checkRateLimit, authenticateAgent, storeSubmission, notifyAdmin,
    errorResponse, validationErrorResponse, successResponse,
    type ValidationResult,
} from "@/lib/missions/submit";

// POST /api/agents/marketing/[agentId]/campaigns
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

        const campaigns = await request.json();
        if (!Array.isArray(campaigns)) {
            return errorResponse("Body must be a JSON array of campaign variants.", 400);
        }

        const validation = validateCampaigns(campaigns);
        await storeSubmission(agentId, "product_marketing_agent", "marketing:campaigns", campaigns, validation);
        await notifyAdmin(agent, agentId, campaigns, validation);

        if (!validation.valid) return validationErrorResponse(validation);
        return successResponse(validation);
    } catch (error: any) {
        console.error("Marketing campaigns submit error:", error);
        return errorResponse(error.message || "Something went wrong.", 500);
    }
}

function validateCampaigns(campaigns: any[]): ValidationResult {
    if (campaigns.length < 3) {
        return {
            valid: false,
            summary: `${campaigns.length}/3 variants submitted`,
            itemCount: campaigns.length,
            passRate: `${campaigns.length}/3`,
            error: `Need 3 campaign variants, got ${campaigns.length}.`,
        };
    }

    const issues: string[] = [];
    let completeCount = 0;

    for (let i = 0; i < campaigns.length; i++) {
        const c = campaigns[i];
        if (!c || typeof c !== "object") {
            issues.push(`Variant ${i + 1}: not a valid object.`);
            continue;
        }

        let isComplete = true;

        // Landing
        if (!c.landing || !c.landing.headline || typeof c.landing.headline !== "string" || c.landing.headline.trim().length < 5) {
            issues.push(`Variant ${i + 1}: missing or short landing headline.`);
            isComplete = false;
        }
        if (!Array.isArray(c.landing?.bullets) || c.landing.bullets.length < 3 ||
            c.landing.bullets.some((b: any) => !b || typeof b !== "string" || b.trim().length < 3)) {
            issues.push(`Variant ${i + 1}: landing needs 3 non-empty bullets.`);
            isComplete = false;
        }

        // Twitter thread
        if (!Array.isArray(c.twitter_thread) || c.twitter_thread.length < 5 ||
            c.twitter_thread.some((t: any) => !t || typeof t !== "string" || t.trim().length < 5)) {
            issues.push(`Variant ${i + 1}: needs 5 non-empty tweets.`);
            isComplete = false;
        }

        // Emails
        if (!Array.isArray(c.emails) || c.emails.length < 3 ||
            c.emails.some((e: any) => !e?.subject || !e?.body || e.subject.trim().length < 3 || e.body.trim().length < 10)) {
            issues.push(`Variant ${i + 1}: needs 3 emails with subject (3+ chars) and body (10+ chars).`);
            isComplete = false;
        }

        if (isComplete) completeCount++;
    }

    const valid = completeCount >= 3;
    return {
        valid,
        summary: `${completeCount}/3 complete variants`,
        itemCount: campaigns.length,
        passRate: `${completeCount}/${campaigns.length} valid`,
        stats: { completeVariants: completeCount, totalVariants: campaigns.length },
        error: !valid ? issues.slice(0, 3).join(" ") : undefined,
    };
}
