import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

// ─── Proxy field changes to agent's webhook URL ─────────────────────────────
// This avoids CORS issues when the test form page sends updates to the agent.
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { agentId, field, value, type = "field_update", event, data } = body;

        if (!agentId) {
            return NextResponse.json(
                { success: false, error: "Missing agentId." },
                { status: 400 }
            );
        }

        if (type === "field_update" && !field) {
            return NextResponse.json(
                { success: false, error: "Missing field for field_update type." },
                { status: 400 }
            );
        }

        // Fetch agent's webhook URL from KV
        const webhook = await kv.hget<string>(`agent:${agentId}`, "webhook");
        if (!webhook) {
            return NextResponse.json(
                { success: false, error: "Agent not found or missing webhook." },
                { status: 404 }
            );
        }

        // Forward to agent's webhook
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

            await fetch(webhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "field_update",
                    agentId,
                    field,
                    value,
                    timestamp: new Date().toISOString(),
                }),
                signal: controller.signal,
            });

            clearTimeout(timeout);
        } catch (webhookErr: any) {
            // Log but don't fail — agent webhook might be offline
            console.warn(`Webhook delivery failed for agent:${agentId}:`, webhookErr?.message);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Webhook proxy error:", error);
        return NextResponse.json(
            { success: false, error: "Internal error." },
            { status: 500 }
        );
    }
}
