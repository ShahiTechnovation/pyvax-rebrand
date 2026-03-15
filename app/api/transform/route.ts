import { NextRequest, NextResponse } from "next/server";

// ─── Configuration ──────────────────────────────────────────────────────────
// Proxy transform requests to Railway backend.
// Supports both /api/transform (dedicated) and falls back to /api/cli.
const BACKEND_URL = process.env.RAILWAY_BACKEND_URL || "";

function getTransformUrl(): string {
  if (!BACKEND_URL) return "";
  // RAILWAY_BACKEND_URL is the full /api/cli path — derive /api/transform
  return BACKEND_URL.replace(/\/api\/cli\/?$/, "/api/transform");
}

function getVerifyUrl(): string {
  if (!BACKEND_URL) return "";
  return BACKEND_URL.replace(/\/api\/cli\/?$/, "/api/verify");
}

// ─── POST handler ───────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { source, contract_name, address } = data;

    // If address is provided, this is a verify request
    if (address && data.payload) {
      return await proxyVerify(data);
    }

    // Otherwise, this is a transform request
    if (!source) {
      return NextResponse.json(
        { success: false, error: "No source code provided" },
        { status: 400 }
      );
    }

    const transformUrl = getTransformUrl();
    if (!transformUrl) {
      return NextResponse.json(
        { success: false, error: "Backend not configured. Set RAILWAY_BACKEND_URL." },
        { status: 503 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(transformUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          contract_name: contract_name || "Contract",
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeout);

      const responseText = await res.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: `Backend returned HTTP ${res.status}: ${responseText.slice(0, 200)}`,
          },
          { status: 502 }
        );
      }

      return NextResponse.json(result);
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        return NextResponse.json(
          { success: false, error: "Transform timed out after 30 seconds" },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { success: false, error: `Backend unreachable: ${err.message}` },
        { status: 502 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}

// ─── Verify proxy ───────────────────────────────────────────────────────────
async function proxyVerify(data: any): Promise<NextResponse> {
  const verifyUrl = getVerifyUrl();
  if (!verifyUrl) {
    return NextResponse.json(
      { success: false, error: "Backend not configured. Set RAILWAY_BACKEND_URL." },
      { status: 503 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: data.address,
        payload: data.payload,
        chain: data.chain || "fuji",
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeout);

    const result = await res.json();
    return NextResponse.json(result);
  } catch (err: any) {
    clearTimeout(timeout);
    return NextResponse.json(
      { success: false, error: `Verify proxy failed: ${err.message}` },
      { status: 502 }
    );
  }
}
