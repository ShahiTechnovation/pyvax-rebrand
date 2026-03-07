import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

// ─── Configuration ──────────────────────────────────────────────────────────
// If RAILWAY_BACKEND_URL is set, proxy to remote backend (production).
// Otherwise, spawn local Python transpiler (local dev).
//
// RAILWAY_BACKEND_URL should be the FULL URL including path, e.g.:
//   https://pyvax-backend.up.railway.app/api/cli
const BACKEND_URL = process.env.RAILWAY_BACKEND_URL || "";

// ─── Parse "pyvax compile --optimizer=2" style commands ─────────────────────
function parseCommand(raw: string): {
    action: string;
    flags: Record<string, string>;
    positional: string[];
} {
    const parts = raw.trim().split(/\s+/);
    // Strip leading "pyvax" if present
    if (parts[0]?.toLowerCase() === "pyvax") parts.shift();

    const action = (parts.shift() || "help").toLowerCase();
    const flags: Record<string, string> = {};
    const positional: string[] = [];

    for (let i = 0; i < parts.length; i++) {
        if (parts[i].startsWith("--")) {
            const stripped = parts[i].replace(/^--/, "").replace(/-/g, "_");
            if (stripped.includes("=")) {
                const [k, v] = stripped.split("=", 2);
                flags[k] = v;
            } else if (i + 1 < parts.length && !parts[i + 1].startsWith("-")) {
                flags[stripped] = parts[i + 1];
                i++;
            } else {
                flags[stripped] = "true";
            }
        } else if (parts[i].startsWith("-") && parts[i].length === 2) {
            const key = parts[i][1];
            if (i + 1 < parts.length && !parts[i + 1].startsWith("-")) {
                flags[key] = parts[i + 1];
                i++;
            } else {
                flags[key] = "true";
            }
        } else {
            positional.push(parts[i]);
        }
    }

    return { action, flags, positional };
}

// ─── Remote proxy (production) ──────────────────────────────────────────────
async function executeRemote(
    body: Record<string, any>,
    method: string = "POST"
): Promise<any> {
    // Build the request to the Railway backend
    // The backend accepts the same JSON body the frontend sends
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
        const res = await fetch(BACKEND_URL, {
            method,
            headers: { "Content-Type": "application/json" },
            body: method === "POST" ? JSON.stringify(body) : undefined,
            signal: controller.signal,
            cache: "no-store",
        });

        clearTimeout(timeout);

        const responseText = await res.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch {
            if (!res.ok) {
                return {
                    success: false,
                    error: `Backend returned HTTP ${res.status}: ${responseText.slice(0, 200)}`,
                    stdout: `Error: Backend returned HTTP ${res.status}\n`,
                };
            }
            return {
                success: false,
                error: "Invalid JSON response from compilation backend",
                stdout: "Error: Invalid response from backend\n",
            };
        }

        return data;
    } catch (err: any) {
        clearTimeout(timeout);
        if (err.name === "AbortError") {
            return {
                success: false,
                error: "Compilation timed out after 30 seconds",
                stdout: "Error: Compilation timed out\n",
            };
        }
        return {
            success: false,
            error: `Failed to reach compilation backend: ${err.message}`,
            stdout: `Error: Backend unreachable — ${err.message}\n`,
        };
    }
}

// ─── Local Python execution (dev only) ──────────────────────────────────────
async function executeLocal(body: Record<string, any>): Promise<any> {
    const command = (body.command || "").trim();
    const source = body.source || "";
    const contractName = body.contract_name || "Contract";

    if (!command) {
        return { success: false, error: "No command provided" };
    }

    // Parse the CLI-style command into a structured request for api_wrapper
    const { action, flags, positional } = parseCommand(command);

    // Build the JSON payload that api_wrapper.py expects
    const payload: Record<string, any> = {
        command: action,
        source: source,
        contract_name: positional[0] || contractName,
        optimizer_level: parseInt(flags.optimizer || flags.opt || "1", 10),
        overflow_safe: flags.no_overflow_safe === undefined,
        template: flags.template || flags.t || null,
        chain: flags.chain || flags.n || "fuji",
    };

    // Spawn python -m avax_cli.api_wrapper from the project root
    const projectRoot = path.resolve(process.cwd());

    return new Promise((resolve) => {
        const proc = spawn("python", ["-m", "avax_cli.api_wrapper"], {
            cwd: projectRoot,
            env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
            stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (chunk: Buffer) => {
            stdout += chunk.toString();
        });

        proc.stderr.on("data", (chunk: Buffer) => {
            stderr += chunk.toString();
        });

        // Write the JSON request to stdin and close it
        proc.stdin.write(JSON.stringify(payload));
        proc.stdin.end();

        // Set a 30-second timeout for compilation
        const timeout = setTimeout(() => {
            proc.kill("SIGTERM");
            resolve({
                success: false,
                error: "Compilation timed out after 30 seconds",
                stdout: "Error: Process timed out\n",
            });
        }, 30000);

        proc.on("close", (code: number | null) => {
            clearTimeout(timeout);

            if (code !== 0 && !stdout.trim()) {
                resolve({
                    success: false,
                    error: stderr || `Python process exited with code ${code}`,
                    stdout: `Error: ${stderr || "Unknown error"}\n`,
                });
                return;
            }

            try {
                const result = JSON.parse(stdout);
                resolve(result);
            } catch {
                resolve({
                    success: false,
                    error: `Invalid JSON from transpiler: ${stdout.slice(0, 200)}`,
                    stderr: stderr,
                    stdout: stdout || `Process exit code: ${code}\n`,
                });
            }
        });

        proc.on("error", (err: Error) => {
            clearTimeout(timeout);
            resolve({
                success: false,
                error: `Failed to spawn Python: ${err.message}. Make sure Python is installed and avax_cli is available.`,
                stdout: `Error: ${err.message}\n`,
            });
        });
    });
}

// ─── GET handler (health check) ─────────────────────────────────────────────
export async function GET() {
    if (BACKEND_URL) {
        try {
            const data = await executeRemote({}, "GET");
            return NextResponse.json(data);
        } catch (error: any) {
            return NextResponse.json(
                { status: "error", error: error.message },
                { status: 500 }
            );
        }
    }

    // Local mode health check
    return NextResponse.json({
        status: "ok",
        service: "pyvax-playground-local",
        version: "1.0.0",
        mode: "local",
        commands: [
            "new",
            "compile",
            "test",
            "deploy",
            "help",
            "version",
            "templates",
        ],
    });
}

// ─── POST handler (execute commands) ────────────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // If a remote backend URL is configured, proxy to it
        if (BACKEND_URL) {
            const data = await executeRemote(body);
            const statusCode = data.success === false && data.error ? 200 : 200;
            return NextResponse.json(data, { status: statusCode });
        }

        // Local mode — spawn Python child process
        const result = await executeLocal(body);
        const statusCode = result.success === false && result.error ? 200 : 200;
        return NextResponse.json(result, { status: statusCode });
    } catch (error: any) {
        return NextResponse.json(
            {
                success: false,
                error: error.message || String(error),
                stdout: `Error: ${error.message || "Unknown error"}\n`,
            },
            { status: 500 }
        );
    }
}
