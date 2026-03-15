import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

// ─── POST: Validate a classified access code ─────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const code = (body.code || "").trim().toUpperCase();

        if (!code || code.length < 4 || code.length > 16) {
            return NextResponse.json(
                { valid: false, error: "Invalid code format" },
                { status: 400 }
            );
        }

        // Rate limiting: basic IP check
        const ip = request.headers.get("x-forwarded-for") || "unknown";
        const rateLimitKey = `classified:ratelimit:${ip}`;

        try {
            const attempts = await kv.get<number>(rateLimitKey);
            if (attempts && attempts >= 10) {
                return NextResponse.json(
                    { valid: false, error: "Too many attempts. Try again in 1 minute." },
                    { status: 429 }
                );
            }
            await kv.incr(rateLimitKey);
            await kv.expire(rateLimitKey, 60); // 1 minute window
        } catch (rlError) {
            console.warn("Rate limit check failed:", rlError);
            // Continue anyway — don't block users due to rate-limit errors
        }

        // Look up the code in KV
        const codeKey = `classified:${code}`;
        const storedValue = await kv.get(codeKey);

        if (storedValue) {
            // Valid code — refresh TTL to 30 days
            await kv.expire(codeKey, 30 * 24 * 3600);

            return NextResponse.json({
                valid: true,
                message: "Access granted",
            });
        }

        return NextResponse.json({
            valid: false,
            error: "Invalid or expired code. Join the waitlist → pyvax.xyz/agent",
        });
    } catch (error: any) {
        console.error("Classified validation error:", error);
        return NextResponse.json(
            { valid: false, error: "Server error" },
            { status: 500 }
        );
    }
}
