'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { StatsCards } from '@/components/admin/StatsCards'
import { AgentTable, AgentCardList, type AgentRowData } from '@/components/admin/AgentTable'
import { BulkActionBar } from '@/components/admin/BulkActionBar'
import { computeStatus } from '@/lib/admin/agents'
import {
    Bot, Search, RefreshCw, Download, Star, Trophy,
    Megaphone, TrendingUp, MessageCircle, Bug, Terminal
} from 'lucide-react'

const ROLE_OPTIONS = [
    { value: '', label: 'All Roles' },
    { value: 'product_marketing_agent', label: 'Product Marketing' },
    { value: 'growth_agent', label: 'Growth / BD' },
    { value: 'reply_guy_agent', label: 'Reply-Guy' },
    { value: 'bug_terminator_agent', label: 'Bug Terminator' },
    { value: 'swe_agent', label: 'SWE' },
]

const STATUS_TABS = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'review', label: 'Review' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
]

const ROLE_ICONS: Record<string, React.ReactNode> = {
    product_marketing_agent: <Megaphone className="w-3 h-3" />,
    growth_agent: <TrendingUp className="w-3 h-3" />,
    reply_guy_agent: <MessageCircle className="w-3 h-3" />,
    bug_terminator_agent: <Bug className="w-3 h-3" />,
    swe_agent: <Terminal className="w-3 h-3" />,
}

interface ApiResponse {
    success: boolean
    agents: any[]
    stats: {
        total: number
        pending: number
        active: number
        completed: number
        failed: number
        avgXp: number
    }
}

export default function AdminAgentsPage() {
    const [data, setData] = useState<ApiResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState('')

    // Filters
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [bulkLoading, setBulkLoading] = useState(false)

    // Responsive
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    // Fetch data
    const fetchData = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true)
        try {
            const secret = localStorage.getItem('pyvax_admin_secret') || ''
            const res = await fetch(`/api/admin/agents?secret=${encodeURIComponent(secret)}`)
            const json = await res.json()
            if (!json.success) {
                setError(json.error || 'Failed to load.')
            } else {
                setData(json)
                setError('')
            }
        } catch {
            setError('Network error.')
        }
        setLoading(false)
        setRefreshing(false)
    }, [])

    useEffect(() => {
        // Prompt for secret on first load
        let secret = localStorage.getItem('pyvax_admin_secret')
        if (!secret) {
            secret = prompt('Enter admin API secret:') || ''
            localStorage.setItem('pyvax_admin_secret', secret)
        }
        fetchData()
        // Auto-refresh every 30s
        const interval = setInterval(() => fetchData(), 30000)
        return () => clearInterval(interval)
    }, [fetchData])

    // Process agents
    const agents: AgentRowData[] = useMemo(() => {
        if (!data?.agents) return []
        return data.agents.map((a: any) => ({
            agentId: a.agentId || '',
            name: a.name || 'Unnamed',
            role: a.role || '',
            roleLabel: a.roleLabel || a.role || '',
            human: a.human || '',
            testStatus: a.testStatus || 'pending',
            missionStatus: a.missionStatus || 'none',
            totalXp: a.totalXp || 0,
            submittedAt: a.submittedAt || '',
            computedStatus: computeStatus(a),
        }))
    }, [data])

    // Filter
    const filtered = useMemo(() => {
        let list = agents
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter((a) =>
                a.name.toLowerCase().includes(q) ||
                a.human.toLowerCase().includes(q) ||
                a.agentId.toLowerCase().includes(q)
            )
        }
        if (roleFilter) {
            list = list.filter((a) => a.role === roleFilter)
        }
        if (statusFilter) {
            list = list.filter((a) => a.computedStatus === statusFilter)
        }
        return list
    }, [agents, search, roleFilter, statusFilter])

    // Leaderboard
    const leaderboard = useMemo(() => {
        return [...agents].sort((a, b) => b.totalXp - a.totalXp).slice(0, 5)
    }, [agents])

    // Selection handlers
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }
    const selectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(filtered.map((a) => a.agentId)))
        } else {
            setSelectedIds(new Set())
        }
    }

    // Bulk actions
    const doBulk = async (action: string) => {
        const secret = localStorage.getItem('pyvax_admin_secret') || ''
        setBulkLoading(true)
        try {
            await fetch('/api/admin/agents/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-approve-secret': secret,
                },
                body: JSON.stringify({ action, agentIds: Array.from(selectedIds) }),
            })
            setSelectedIds(new Set())
            fetchData(true)
        } catch { /* ignore */ }
        setBulkLoading(false)
    }

    const exportCsv = () => {
        const secret = localStorage.getItem('pyvax_admin_secret') || ''
        window.open(`/api/admin/agents/export?secret=${encodeURIComponent(secret)}`, '_blank')
    }

    const stats = data?.stats || { total: 0, pending: 0, active: 0, completed: 0, failed: 0, avgXp: 0 }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] font-[family-name:var(--font-ibm-plex)] selection:bg-[#E84142] selection:text-white">
            <Navbar />

            {/* Background grid */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.015] z-0" style={{
                backgroundImage: 'linear-gradient(rgba(232,65,66,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(232,65,66,0.3) 1px, transparent 1px)',
                backgroundSize: '60px 60px'
            }} />

            <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 md:py-14">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                    <div>
                        <div className="inline-flex items-center gap-2 border border-[#E84142]/40 bg-[#E84142]/5 px-4 py-1.5 rounded-full mb-4">
                            <Bot className="w-3 h-3 text-[#E84142]" />
                            <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] uppercase tracking-[0.2em] font-bold">
                                ADMIN DASHBOARD
                            </span>
                        </div>
                        <h1 className="font-[family-name:var(--font-press-start)] text-[18px] md:text-[28px] text-[#FFFFFF] leading-[1.3]">
                            Agent Command Center
                        </h1>
                    </div>
                    <div className="flex items-center gap-3 mt-4 md:mt-0">
                        <button
                            onClick={() => fetchData(true)}
                            disabled={refreshing}
                            className="flex items-center gap-1.5 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888] hover:text-[#E84142] bg-[#111] border border-[#1F1F1F] hover:border-[#E84142]/30 px-3 py-2 rounded-lg transition disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={exportCsv}
                            className="flex items-center gap-1.5 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888] hover:text-[#4CAF50] bg-[#111] border border-[#1F1F1F] hover:border-[#4CAF50]/30 px-3 py-2 rounded-lg transition"
                        >
                            <Download className="w-3 h-3" />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-[#E84142]/10 border border-[#E84142]/30 rounded-xl px-5 py-3 mb-6">
                        <p className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#E84142]">{error}</p>
                    </div>
                )}

                {/* Stats */}
                <StatsCards
                    total={stats.total}
                    active={stats.active}
                    completed={stats.completed}
                    avgXp={stats.avgXp}
                    loading={loading}
                />

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
                    {/* Left: Filters + Table */}
                    <div>
                        {/* Filters Bar */}
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-5">
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444] pointer-events-none" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search name, email, or ID..."
                                    className="w-full h-[40px] pl-10 pr-4 bg-[#111] border border-[#1F1F1F] rounded-xl font-[family-name:var(--font-ibm-plex)] text-[13px] text-[#F2F2F2] placeholder-[#444] focus:outline-none focus:border-[#E84142]/50 transition"
                                />
                            </div>

                            {/* Role filter */}
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="h-[40px] px-3 bg-[#111] border border-[#1F1F1F] rounded-xl font-[family-name:var(--font-dm-mono)] text-[12px] text-[#888] focus:outline-none focus:border-[#E84142]/50 transition appearance-none cursor-pointer min-w-[140px]"
                            >
                                {ROLE_OPTIONS.map((r) => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status Tabs */}
                        <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
                            {STATUS_TABS.map((tab) => (
                                <button
                                    key={tab.value}
                                    onClick={() => setStatusFilter(tab.value)}
                                    className={`font-[family-name:var(--font-dm-mono)] text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-lg border transition whitespace-nowrap ${
                                        statusFilter === tab.value
                                            ? 'text-[#E84142] bg-[#E84142]/10 border-[#E84142]/30'
                                            : 'text-[#555] bg-transparent border-transparent hover:text-[#888] hover:bg-[#131313]'
                                    }`}
                                >
                                    {tab.label}
                                    {tab.value === '' && stats.total > 0 && (
                                        <span className="ml-1.5 text-[#444]">({stats.total})</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Table / Cards */}
                        {isMobile ? (
                            <AgentCardList
                                agents={filtered}
                                selectedIds={selectedIds}
                                onToggleSelect={toggleSelect}
                            />
                        ) : (
                            <AgentTable
                                agents={filtered}
                                selectedIds={selectedIds}
                                onToggleSelect={toggleSelect}
                                onSelectAll={selectAll}
                                loading={loading}
                            />
                        )}

                        {/* Result count */}
                        {!loading && (
                            <div className="mt-4 text-center font-[family-name:var(--font-dm-mono)] text-[10px] text-[#444]">
                                Showing {filtered.length} of {agents.length} agents · Auto-refresh: 30s
                            </div>
                        )}
                    </div>

                    {/* Right: Leaderboard */}
                    <div className="hidden lg:block">
                        <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-5 sticky top-24">
                            <div className="flex items-center gap-2 mb-5">
                                <Trophy className="w-4 h-4 text-[#FFD700]" />
                                <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#FFD700] tracking-[0.15em] uppercase font-bold">
                                    XP LEADERBOARD
                                </span>
                            </div>

                            {leaderboard.length === 0 ? (
                                <p className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#444]">No agents yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {leaderboard.map((agent, i) => (
                                        <Link
                                            key={agent.agentId}
                                            href={`/admin/agents/${agent.agentId}`}
                                            className="flex items-center gap-3 group"
                                        >
                                            <span className="font-[family-name:var(--font-press-start)] text-[10px] w-5 text-right" style={{
                                                color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#555'
                                            }}>
                                                {i + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-[family-name:var(--font-ibm-plex)] text-[12px] text-[#ccc] truncate group-hover:text-[#E84142] transition">
                                                    {agent.name}
                                                </div>
                                                <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555]">
                                                    {agent.roleLabel}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Star className="w-3 h-3 text-[#FFD700]" />
                                                <span className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#FFD700] font-bold">
                                                    {agent.totalXp}
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bulk Action Bar */}
            <BulkActionBar
                selectedCount={selectedIds.size}
                onApprove={() => doBulk('approve')}
                onReject={() => doBulk('reject')}
                onAssignMission={() => doBulk('assign_mission')}
                onExportCsv={exportCsv}
                onClearSelection={() => setSelectedIds(new Set())}
                loading={bulkLoading}
            />
        </div>
    )
}
