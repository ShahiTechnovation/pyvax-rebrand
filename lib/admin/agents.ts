import { kv } from "@vercel/kv";
import { ROLE_LABELS, ROLE_MISSIONS } from "@/lib/emails/careers";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface AgentRow {
    agentId: string;
    name: string;
    role: string;
    roleLabel: string;
    human: string;
    webhook: string;
    github: string;
    demo: string;
    capabilities: string[];
    stack: string[];
    success_metric: string;
    description: string;
    submittedAt: string;
    testStatus: string;
    testCompletedAt: string | null;
    missionStatus: string;
    missionSubmittedAt: string | null;
    xp: number;
    totalXp: number;
    applicationType: string;
    ip: string;
}

export interface AgentDetail extends AgentRow {
    testResults: any;
    missionValidation: any;
    missionData: any;
    approvalNote: string;
    approvedAt: string | null;
    mission: {
        title: string;
        description: string;
        endpoint: string;
        success: string;
    } | null;
}

export interface AgentStats {
    total: number;
    pending: number;
    active: number;
    completed: number;
    failed: number;
    avgXp: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseAgent(raw: Record<string, any>): AgentRow {
    return {
        agentId: (raw.agentId as string) || "",
        name: (raw.name as string) || "Unnamed Agent",
        role: (raw.role as string) || "",
        roleLabel: ROLE_LABELS[(raw.role as string)] || (raw.role as string) || "",
        human: (raw.human as string) || "",
        webhook: (raw.webhook as string) || "",
        github: (raw.github as string) || "",
        demo: (raw.demo as string) || "",
        capabilities: (raw.capabilities as string[]) || [],
        stack: (raw.stack as string[]) || [],
        success_metric: (raw.success_metric as string) || "",
        description: (raw.description as string) || "",
        submittedAt: (raw.submittedAt as string) || "",
        testStatus: (raw.testStatus as string) || "pending",
        testCompletedAt: (raw.testCompletedAt as string) || null,
        missionStatus: (raw.missionStatus as string) || "none",
        missionSubmittedAt: (raw.missionSubmittedAt as string) || null,
        xp: parseInt((raw.xp as string) || "0", 10),
        totalXp: parseInt((raw.totalXp as string) || "0", 10),
        applicationType: (raw.applicationType as string) || "yaml",
        ip: (raw.ip as string) || "",
    };
}

/** Compute a combined status string for display */
export function computeStatus(agent: AgentRow): string {
    if (agent.missionStatus === "approved") return "completed";
    if (agent.missionStatus === "submitted") return "review";
    if (agent.missionStatus === "needs_revision") return "failed";
    if (agent.missionStatus === "assigned") return "active";
    if (agent.testStatus === "completed") return "active";
    return "pending";
}

// ─── KV Operations ──────────────────────────────────────────────────────────

/** Get all agent IDs from the applications list */
export async function getAllAgentIds(): Promise<string[]> {
    try {
        const ids = await kv.lrange("agents:applications", 0, -1);
        return (ids || []) as string[];
    } catch {
        return [];
    }
}

/** Get all agents with parsed data */
export async function getAllAgents(): Promise<AgentRow[]> {
    const ids = await getAllAgentIds();
    if (ids.length === 0) return [];

    const agents: AgentRow[] = [];
    // Fetch in parallel batches of 20
    for (let i = 0; i < ids.length; i += 20) {
        const batch = ids.slice(i, i + 20);
        const results = await Promise.all(
            batch.map((id) => kv.hgetall(`agent:${id}`))
        );
        for (const raw of results) {
            if (raw && typeof raw === "object") {
                agents.push(parseAgent(raw as Record<string, any>));
            }
        }
    }
    return agents;
}

/** Get stats from agents array */
export function computeStats(agents: AgentRow[]): AgentStats {
    const stats: AgentStats = {
        total: agents.length,
        pending: 0,
        active: 0,
        completed: 0,
        failed: 0,
        avgXp: 0,
    };

    let totalXp = 0;
    for (const agent of agents) {
        const status = computeStatus(agent);
        if (status === "pending") stats.pending++;
        else if (status === "active" || status === "review") stats.active++;
        else if (status === "completed") stats.completed++;
        else if (status === "failed") stats.failed++;
        totalXp += agent.totalXp;
    }
    stats.avgXp = agents.length > 0 ? Math.round(totalXp / agents.length) : 0;
    return stats;
}

/** Get single agent detail */
export async function getAgentDetail(agentId: string): Promise<AgentDetail | null> {
    const raw = await kv.hgetall(`agent:${agentId}`);
    if (!raw) return null;

    const agent = parseAgent(raw as Record<string, any>);
    const role = agent.role;
    const mission = ROLE_MISSIONS[role] || null;

    let testResults = null;
    try {
        if ((raw as any).testResults) testResults = JSON.parse((raw as any).testResults);
    } catch { /* ignore */ }

    let missionValidation = null;
    try {
        if ((raw as any).missionValidation) missionValidation = JSON.parse((raw as any).missionValidation);
    } catch { /* ignore */ }

    let missionData = null;
    try {
        if ((raw as any).missionData) missionData = JSON.parse((raw as any).missionData);
    } catch { /* ignore */ }

    return {
        ...agent,
        testResults,
        missionValidation,
        missionData,
        approvalNote: ((raw as any).approvalNote as string) || "",
        approvedAt: ((raw as any).approvedAt as string) || null,
        mission: mission
            ? { title: mission.title, description: mission.description, endpoint: mission.endpoint, success: mission.success }
            : null,
    };
}

/** Update agent fields in KV */
export async function updateAgent(agentId: string, updates: Record<string, any>): Promise<boolean> {
    try {
        await kv.hset(`agent:${agentId}`, updates);
        return true;
    } catch {
        return false;
    }
}

/** Convert agents array to CSV string */
export function agentsToCsv(agents: AgentRow[]): string {
    const headers = [
        "Agent ID", "Name", "Role", "Email", "Status", "Test Status",
        "Mission Status", "XP", "Total XP", "Capabilities", "Stack",
        "Webhook", "GitHub", "Submitted At", "Application Type",
    ];

    const escape = (val: string) => `"${(val || "").replace(/"/g, '""')}"`;

    const rows = agents.map((a) => [
        escape(a.agentId),
        escape(a.name),
        escape(a.roleLabel),
        escape(a.human),
        escape(computeStatus(a)),
        escape(a.testStatus),
        escape(a.missionStatus),
        a.xp.toString(),
        a.totalXp.toString(),
        escape((a.capabilities || []).join(", ")),
        escape((a.stack || []).join(", ")),
        escape(a.webhook),
        escape(a.github),
        escape(a.submittedAt),
        escape(a.applicationType),
    ].join(","));

    return [headers.join(","), ...rows].join("\n");
}
