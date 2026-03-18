import { NextRequest } from "next/server";
import {
    checkRateLimit, authenticateAgent, storeSubmission, notifyAdmin,
    errorResponse, validationErrorResponse, successResponse,
    type ValidationResult,
} from "@/lib/missions/submit";

// POST /api/agents/reply/[agentId]/replies
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

        const replies = await request.json();
        if (!Array.isArray(replies)) {
            return errorResponse("Body must be a JSON array of replies.", 400);
        }

        const validation = validateReplies(replies);
        await storeSubmission(agentId, "reply_guy_agent", "reply:replies", replies, validation);
        await notifyAdmin(agent, agentId, replies, validation);

        if (!validation.valid) return validationErrorResponse(validation);
        return successResponse(validation);
    } catch (error: any) {
        console.error("Reply-guy submit error:", error);
        return errorResponse(error.message || "Something went wrong.", 500);
    }
}

const VALID_TAGS = new Set(["support", "marketing", "bug_report"]);

function validateReplies(replies: any[]): ValidationResult {
    if (replies.length < 50) {
        return {
            valid: false,
            summary: `${replies.length}/50 replies submitted`,
            itemCount: replies.length,
            passRate: `${replies.length}/50`,
            error: `Need at least 50 replies, got ${replies.length}.`,
        };
    }

    // Check required fields
    const complete = replies.filter((r: any) =>
        r && typeof r === "object" &&
        r.platform && r.thread_url && r.reply_text &&
        r.reply_time && r.tag && VALID_TAGS.has(r.tag)
    );

    // Check duplicates
    const replyTexts = new Set<string>();
    let duplicates = 0;
    for (const r of replies) {
        const text = (r.reply_text || "").toLowerCase().trim();
        if (text && replyTexts.has(text)) duplicates++;
        else replyTexts.add(text);
    }

    // Tag distribution
    const tagCounts: Record<string, number> = { support: 0, marketing: 0, bug_report: 0 };
    for (const r of replies) {
        if (r.tag && tagCounts[r.tag] !== undefined) tagCounts[r.tag]++;
    }

    const invalidTags = replies.filter((r: any) => r.tag && !VALID_TAGS.has(r.tag)).length;

    const valid = complete.length >= 50 && duplicates === 0;
    return {
        valid,
        summary: `${replies.length} replies (${tagCounts.support} support, ${tagCounts.marketing} marketing, ${tagCounts.bug_report} bug)${duplicates > 0 ? `, ${duplicates} duplicates` : ""}`,
        itemCount: replies.length,
        passRate: `${complete.length}/${replies.length} valid`,
        stats: { ...tagCounts, duplicates, invalidTags, completeReplies: complete.length },
        error: !valid
            ? duplicates > 0
                ? `Found ${duplicates} duplicate reply_text entries.`
                : `Only ${complete.length} replies have all required fields (platform, thread_url, reply_text, reply_time, valid tag).`
            : undefined,
    };
}
