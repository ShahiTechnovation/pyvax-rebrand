'use client'

import React from 'react'
import Link from 'next/link'
import { StatusBadge, RoleBadge } from './StatusBadge'
import { ExternalLink, Star } from 'lucide-react'

export interface AgentRowData {
    agentId: string
    name: string
    role: string
    roleLabel: string
    human: string
    testStatus: string
    missionStatus: string
    totalXp: number
    submittedAt: string
    computedStatus: string
}

interface AgentTableProps {
    agents: AgentRowData[]
    selectedIds: Set<string>
    onToggleSelect: (id: string) => void
    onSelectAll: (checked: boolean) => void
    loading?: boolean
}

function SkeletonRow() {
    return (
        <tr className="border-b border-[#1A1A1A] animate-pulse">
            <td className="px-4 py-4"><div className="w-4 h-4 bg-[#1A1A1A] rounded" /></td>
            <td className="px-4 py-4"><div className="h-3 w-20 bg-[#1A1A1A] rounded" /></td>
            <td className="px-4 py-4"><div className="h-3 w-24 bg-[#1A1A1A] rounded" /></td>
            <td className="px-4 py-4"><div className="h-3 w-16 bg-[#1A1A1A] rounded" /></td>
            <td className="px-4 py-4"><div className="h-3 w-32 bg-[#1A1A1A] rounded" /></td>
            <td className="px-4 py-4"><div className="h-3 w-16 bg-[#1A1A1A] rounded" /></td>
            <td className="px-4 py-4"><div className="h-3 w-8 bg-[#1A1A1A] rounded" /></td>
            <td className="px-4 py-4"><div className="h-3 w-20 bg-[#1A1A1A] rounded" /></td>
            <td className="px-4 py-4"><div className="h-3 w-10 bg-[#1A1A1A] rounded" /></td>
        </tr>
    )
}

export function AgentTable({ agents, selectedIds, onToggleSelect, onSelectAll, loading }: AgentTableProps) {
    const allSelected = agents.length > 0 && selectedIds.size === agents.length

    if (loading) {
        return (
            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[#1F1F1F]">
                                {['', 'ID', 'Name', 'Role', 'Email', 'Status', 'XP', 'Registered', ''].map((h, i) => (
                                    <th key={i} className="text-left px-4 py-3 font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    if (agents.length === 0) {
        return (
            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-16 text-center">
                <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] tracking-[0.15em] uppercase mb-4">
                    NO AGENTS FOUND
                </div>
                <p className="font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#555] mb-6">
                    No agents match your filters. Share the curl command to get started.
                </p>
                <code className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888] bg-[#111] px-4 py-2 rounded-lg border border-[#1F1F1F]">
                    curl -X POST careers.pyvax.xyz/api/agents/apply -F &quot;agentFile=@agent.yaml&quot;
                </code>
            </div>
        )
    }

    return (
        <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[#1F1F1F]">
                            <th className="px-4 py-3 w-10">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={(e) => onSelectAll(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded border-[#333] bg-[#111] text-[#E84142] focus:ring-[#E84142] focus:ring-offset-0 cursor-pointer accent-[#E84142]"
                                />
                            </th>
                            {['ID', 'Name', 'Role', 'Email', 'Status', 'XP', 'Registered', ''].map((h) => (
                                <th
                                    key={h}
                                    className="text-left px-4 py-3 font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase whitespace-nowrap"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {agents.map((agent) => {
                            const isSelected = selectedIds.has(agent.agentId)
                            return (
                                <tr
                                    key={agent.agentId}
                                    className={`border-b border-[#141414] hover:bg-[#131313] transition-colors ${isSelected ? 'bg-[#E84142]/5' : ''}`}
                                >
                                    <td className="px-4 py-3.5">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => onToggleSelect(agent.agentId)}
                                            className="w-3.5 h-3.5 rounded border-[#333] bg-[#111] text-[#E84142] focus:ring-[#E84142] focus:ring-offset-0 cursor-pointer accent-[#E84142]"
                                        />
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#666]">
                                            {agent.agentId.slice(0, 8)}…
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span className="font-[family-name:var(--font-ibm-plex)] text-[13px] text-[#F0F0F0] font-medium">
                                            {agent.name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <RoleBadge role={agent.role} roleLabel={agent.roleLabel} />
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888]">
                                            {agent.human}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <StatusBadge status={agent.computedStatus} />
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-1">
                                            <Star className="w-3 h-3 text-[#FFD700]" />
                                            <span className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#FFD700] font-bold">
                                                {agent.totalXp}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#555]">
                                            {agent.submittedAt ? new Date(agent.submittedAt).toLocaleDateString() : '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <Link
                                            href={`/admin/agents/${agent.agentId}`}
                                            className="flex items-center gap-1 font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] hover:text-[#FF5555] transition"
                                        >
                                            View <ExternalLink className="w-3 h-3" />
                                        </Link>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ─── Mobile Card View ────────────────────────────────────────────────────────
export function AgentCardList({ agents, selectedIds, onToggleSelect }: {
    agents: AgentRowData[]
    selectedIds: Set<string>
    onToggleSelect: (id: string) => void
}) {
    if (agents.length === 0) {
        return (
            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-10 text-center">
                <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] tracking-[0.15em] uppercase mb-3">
                    NO AGENTS FOUND
                </div>
                <p className="font-[family-name:var(--font-ibm-plex)] text-[13px] text-[#555]">
                    No agents match your filters.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {agents.map((agent) => {
                const isSelected = selectedIds.has(agent.agentId)
                return (
                    <div
                        key={agent.agentId}
                        className={`bg-[#0D0D0D] border rounded-xl p-4 transition-colors ${isSelected ? 'border-[#E84142]/40 bg-[#E84142]/5' : 'border-[#1A1A1A]'}`}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => onToggleSelect(agent.agentId)}
                                    className="w-3.5 h-3.5 rounded border-[#333] bg-[#111] accent-[#E84142] mt-0.5"
                                />
                                <div>
                                    <div className="font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#F0F0F0] font-medium">{agent.name}</div>
                                    <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#555]">{agent.agentId.slice(0, 8)}…</div>
                                </div>
                            </div>
                            <Link
                                href={`/admin/agents/${agent.agentId}`}
                                className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] hover:text-[#FF5555] transition"
                            >
                                View →
                            </Link>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <RoleBadge role={agent.role} roleLabel={agent.roleLabel} />
                            <StatusBadge status={agent.computedStatus} />
                            <span className="flex items-center gap-1 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#FFD700]">
                                <Star className="w-3 h-3" /> {agent.totalXp}
                            </span>
                        </div>
                        <div className="mt-2 font-[family-name:var(--font-dm-mono)] text-[10px] text-[#555]">
                            {agent.human}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
