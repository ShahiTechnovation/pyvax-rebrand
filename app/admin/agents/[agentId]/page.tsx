'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { StatusBadge, RoleBadge } from '@/components/admin/StatusBadge'
import {
    Bot, ArrowLeft, Loader2, AlertTriangle, Star, CheckCircle,
    XCircle, Zap, ExternalLink, Copy, Check, Clock,
    Megaphone, TrendingUp, MessageCircle, Bug, Terminal
} from 'lucide-react'

const ROLE_ICONS: Record<string, React.ReactNode> = {
    product_marketing_agent: <Megaphone className="w-5 h-5" />,
    growth_agent: <TrendingUp className="w-5 h-5" />,
    reply_guy_agent: <MessageCircle className="w-5 h-5" />,
    bug_terminator_agent: <Bug className="w-5 h-5" />,
    swe_agent: <Terminal className="w-5 h-5" />,
}

const ROLE_COLORS: Record<string, string> = {
    product_marketing_agent: '#FF6B6B',
    growth_agent: '#4CAF50',
    reply_guy_agent: '#6B8CAE',
    bug_terminator_agent: '#E84142',
    swe_agent: '#9C27B0',
}

function CopyBtn({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className="inline-flex items-center gap-1 font-[family-name:var(--font-dm-mono)] text-[10px] text-[#555] hover:text-[#E84142] transition px-1.5 py-0.5 rounded"
        >
            {copied ? <Check className="w-3 h-3 text-[#4CAF50]" /> : <Copy className="w-3 h-3" />}
        </button>
    )
}

function InfoRow({ label, value, accent, mono }: { label: string; value: string; accent?: boolean; mono?: boolean }) {
    return (
        <div className="flex items-start gap-3 py-2">
            <span className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#555] tracking-wider min-w-[120px] flex-shrink-0 uppercase">{label}</span>
            <span className={`text-[13px] break-all ${accent ? 'text-[#E84142]' : 'text-[#ccc]'} ${mono ? 'font-[family-name:var(--font-dm-mono)]' : 'font-[family-name:var(--font-ibm-plex)]'}`}>
                {value || '—'}
            </span>
        </div>
    )
}

export default function AdminAgentDetailPage() {
    const params = useParams()
    const agentId = params.agentId as string

    const [agent, setAgent] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [actionLoading, setActionLoading] = useState('')

    const fetchAgent = async () => {
        try {
            const secret = localStorage.getItem('pyvax_admin_secret') || ''
            const res = await fetch(`/api/admin/agents/${agentId}?secret=${encodeURIComponent(secret)}`)
            const json = await res.json()
            if (!json.success) {
                setError(json.error || 'Failed to load.')
            } else {
                setAgent(json.agent)
                setError('')
            }
        } catch {
            setError('Network error.')
        }
        setLoading(false)
    }

    useEffect(() => {
        if (agentId) fetchAgent()
    }, [agentId])

    const doAction = async (action: string, extraBody: Record<string, any> = {}) => {
        const secret = localStorage.getItem('pyvax_admin_secret') || ''
        setActionLoading(action)
        try {
            await fetch('/api/admin/agents/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-approve-secret': secret },
                body: JSON.stringify({ action, agentIds: [agentId], ...extraBody }),
            })
            await fetchAgent()
        } catch { /* ignore */ }
        setActionLoading('')
    }

    const computedStatus = agent
        ? agent.missionStatus === 'approved' ? 'completed'
            : agent.missionStatus === 'submitted' ? 'review'
                : agent.missionStatus === 'needs_revision' ? 'failed'
                    : agent.missionStatus === 'assigned' ? 'active'
                        : agent.testStatus === 'completed' ? 'active'
                            : 'pending'
        : 'pending'

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2]">
                <Navbar />
                <div className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="w-8 h-8 text-[#E84142] animate-spin mb-4" />
                    <span className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#555]">LOADING AGENT DATA...</span>
                </div>
            </div>
        )
    }

    if (error || !agent) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2]">
                <Navbar />
                <div className="flex flex-col items-center justify-center py-32">
                    <AlertTriangle className="w-8 h-8 text-[#E84142] mb-4" />
                    <p className="font-[family-name:var(--font-dm-mono)] text-[14px] text-[#888] mb-4">{error}</p>
                    <Link href="/admin/agents" className="text-[#E84142] font-[family-name:var(--font-dm-mono)] text-[12px] hover:underline">← Back to Dashboard</Link>
                </div>
            </div>
        )
    }

    const roleColor = ROLE_COLORS[agent.role] || '#E84142'
    const roleIcon = ROLE_ICONS[agent.role] || <Bot className="w-5 h-5" />

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] font-[family-name:var(--font-ibm-plex)] selection:bg-[#E84142] selection:text-white">
            <Navbar />

            <div className="fixed inset-0 pointer-events-none opacity-[0.015] z-0" style={{
                backgroundImage: 'linear-gradient(rgba(232,65,66,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(232,65,66,0.3) 1px, transparent 1px)',
                backgroundSize: '60px 60px'
            }} />

            <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-14">
                {/* Back + Header */}
                <Link
                    href="/admin/agents"
                    className="inline-flex items-center gap-2 font-[family-name:var(--font-dm-mono)] text-[12px] text-[#555] hover:text-[#E84142] transition mb-6"
                >
                    <ArrowLeft className="w-3 h-3" /> Back to Dashboard
                </Link>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${roleColor}15`, border: `1px solid ${roleColor}30` }}>
                            <div style={{ color: roleColor }}>{roleIcon}</div>
                        </div>
                        <div>
                            <h1 className="font-[family-name:var(--font-press-start)] text-[16px] md:text-[22px] text-[#FFFFFF]">
                                {agent.name}
                            </h1>
                            <div className="flex items-center gap-3 mt-1">
                                <RoleBadge role={agent.role} roleLabel={agent.roleLabel || agent.role} />
                                <StatusBadge status={computedStatus} />
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2 mt-4 md:mt-0">
                        {computedStatus !== 'completed' && (
                            <>
                                <button
                                    onClick={() => doAction('approve', { xp: 100 })}
                                    disabled={!!actionLoading}
                                    className="flex items-center gap-1.5 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#4CAF50] bg-[#4CAF50]/10 border border-[#4CAF50]/25 px-3 py-2 rounded-lg hover:bg-[#4CAF50]/20 transition disabled:opacity-50"
                                >
                                    {actionLoading === 'approve' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                    Approve +100 XP
                                </button>
                                <button
                                    onClick={() => doAction('reject')}
                                    disabled={!!actionLoading}
                                    className="flex items-center gap-1.5 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#E84142] bg-[#E84142]/10 border border-[#E84142]/25 px-3 py-2 rounded-lg hover:bg-[#E84142]/20 transition disabled:opacity-50"
                                >
                                    <XCircle className="w-3 h-3" />
                                    Reject
                                </button>
                                <button
                                    onClick={() => doAction('assign_mission')}
                                    disabled={!!actionLoading}
                                    className="flex items-center gap-1.5 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/25 px-3 py-2 rounded-lg hover:bg-[#FFD700]/20 transition disabled:opacity-50"
                                >
                                    <Zap className="w-3 h-3" />
                                    Assign Mission
                                </button>
                            </>
                        )}
                        <Link
                            href={`/mission/${agentId}`}
                            target="_blank"
                            className="flex items-center gap-1.5 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888] bg-[#111] border border-[#1F1F1F] px-3 py-2 rounded-lg hover:border-[#E84142]/30 transition"
                        >
                            <ExternalLink className="w-3 h-3" />
                            Public Dashboard
                        </Link>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    <div className="bg-[#111] border border-[#1F1F1F] rounded-xl p-4 text-center">
                        <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-2">Test</div>
                        <div className="flex items-center justify-center gap-1">
                            {agent.testStatus === 'completed'
                                ? <CheckCircle className="w-4 h-4 text-[#4CAF50]" />
                                : <Clock className="w-4 h-4 text-[#FFD700]" />
                            }
                            <span className="font-[family-name:var(--font-dm-mono)] text-[13px] font-bold" style={{ color: agent.testStatus === 'completed' ? '#4CAF50' : '#FFD700' }}>
                                {agent.testStatus === 'completed' ? 'PASSED' : 'PENDING'}
                            </span>
                        </div>
                    </div>
                    <div className="bg-[#111] border border-[#1F1F1F] rounded-xl p-4 text-center">
                        <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-2">Mission</div>
                        <span className="font-[family-name:var(--font-dm-mono)] text-[12px] font-bold text-[#E84142] uppercase">
                            {agent.missionStatus || 'none'}
                        </span>
                    </div>
                    <div className="bg-[#111] border border-[#1F1F1F] rounded-xl p-4 text-center">
                        <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-2">Total XP</div>
                        <div className="flex items-center justify-center gap-1">
                            <Star className="w-4 h-4 text-[#FFD700]" />
                            <span className="font-[family-name:var(--font-press-start)] text-[18px] text-[#FFD700]">{agent.totalXp || 0}</span>
                        </div>
                    </div>
                    <div className="bg-[#111] border border-[#1F1F1F] rounded-xl p-4 text-center">
                        <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-2">Type</div>
                        <span className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#888] uppercase">
                            {agent.applicationType || 'yaml'}
                        </span>
                    </div>
                </div>

                {/* Agent Profile */}
                <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-7 mb-6">
                    <div className="flex items-center justify-between mb-5">
                        <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] tracking-[0.15em] uppercase">
                            AGENT PROFILE
                        </div>
                        <CopyBtn text={agent.agentId} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                        <InfoRow label="Agent ID" value={agent.agentId} mono />
                        <InfoRow label="Human" value={agent.human} />
                        <InfoRow label="Webhook" value={agent.webhook} accent mono />
                        <InfoRow label="GitHub" value={agent.github} />
                        <InfoRow label="Demo" value={agent.demo} />
                        <InfoRow label="Success Metric" value={agent.success_metric} />
                        <InfoRow label="Registered" value={agent.submittedAt ? new Date(agent.submittedAt).toLocaleString() : '—'} />
                        <InfoRow label="IP" value={agent.ip} mono />
                    </div>

                    {/* Description (manual apps) */}
                    {agent.description && (
                        <div className="mt-5 pt-5 border-t border-[#1A1A1A]">
                            <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-2">DESCRIPTION</div>
                            <p className="font-[family-name:var(--font-ibm-plex)] text-[13px] text-[#999] leading-relaxed whitespace-pre-wrap">{agent.description}</p>
                        </div>
                    )}

                    {/* Capabilities + Stack */}
                    <div className="flex flex-wrap gap-6 mt-5 pt-5 border-t border-[#1A1A1A]">
                        {(agent.capabilities || []).length > 0 && (
                            <div>
                                <span className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase">Capabilities</span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {agent.capabilities.map((cap: string, i: number) => (
                                        <span key={i} className="bg-[#E84142]/10 border border-[#E84142]/20 text-[#E84142] font-[family-name:var(--font-dm-mono)] text-[10px] px-2.5 py-1 rounded-lg">{cap}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {(agent.stack || []).length > 0 && (
                            <div>
                                <span className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase">Stack</span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {agent.stack.map((s: string, i: number) => (
                                        <span key={i} className="bg-[#9C27B0]/10 border border-[#9C27B0]/20 text-[#CE93D8] font-[family-name:var(--font-dm-mono)] text-[10px] px-2.5 py-1 rounded-lg">{s}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mission Briefing */}
                {agent.mission && (
                    <div className="relative mb-6">
                        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-[#E84142]/20 via-transparent to-[#E84142]/20 opacity-50" />
                        <div className="relative bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-7">
                            <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#FFD700] tracking-[0.15em] uppercase mb-4 flex items-center gap-2">
                                <Zap className="w-3 h-3" /> MISSION BRIEFING
                            </div>
                            <h3 className="font-[family-name:var(--font-syne)] font-bold text-[20px] text-[#F0F0F0] mb-3">{agent.mission.title}</h3>
                            <p className="font-[family-name:var(--font-ibm-plex)] text-[13px] text-[#909090] leading-relaxed mb-4">{agent.mission.description}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-3">
                                    <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-1">SUCCESS</div>
                                    <p className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#4CAF50]">{agent.mission.success}</p>
                                </div>
                                <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-3">
                                    <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-1">ENDPOINT</div>
                                    <code className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#E84142]">{agent.mission.endpoint}</code>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Test Results */}
                {agent.testResults && (
                    <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-7 mb-6">
                        <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#4CAF50] tracking-[0.15em] uppercase mb-4">TEST RESULTS</div>
                        <pre className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-4 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888] leading-[1.7] overflow-x-auto max-h-[300px]">
                            {JSON.stringify(agent.testResults, null, 2)}
                        </pre>
                    </div>
                )}

                {/* Mission Validation */}
                {agent.missionValidation && (
                    <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-7 mb-6">
                        <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#FFD700] tracking-[0.15em] uppercase mb-4">SUBMISSION VALIDATION</div>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-3 text-center">
                                <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-1">Items</div>
                                <div className="font-[family-name:var(--font-press-start)] text-[18px] text-[#F2F2F2]">{agent.missionValidation.itemCount}</div>
                            </div>
                            <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-3 text-center">
                                <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-1">Pass Rate</div>
                                <div className="font-[family-name:var(--font-dm-mono)] text-[14px] font-bold" style={{ color: agent.missionValidation.valid ? '#4CAF50' : '#E84142' }}>
                                    {agent.missionValidation.passRate}
                                </div>
                            </div>
                            <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-3 text-center">
                                <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-1">Valid</div>
                                <div className="font-[family-name:var(--font-dm-mono)] text-[14px] font-bold" style={{ color: agent.missionValidation.valid ? '#4CAF50' : '#E84142' }}>
                                    {agent.missionValidation.valid ? '✓ YES' : '✗ NO'}
                                </div>
                            </div>
                        </div>
                        {agent.missionValidation.summary && (
                            <p className="font-[family-name:var(--font-ibm-plex)] text-[13px] text-[#777]">{agent.missionValidation.summary}</p>
                        )}
                    </div>
                )}

                {/* Mission Data Preview */}
                {agent.missionData && (
                    <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-7 mb-6">
                        <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] tracking-[0.15em] uppercase mb-4">RAW MISSION DATA</div>
                        <pre className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-4 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888] leading-[1.7] overflow-x-auto max-h-[400px]">
                            {JSON.stringify(agent.missionData, null, 2)}
                        </pre>
                    </div>
                )}

                {/* Approval Note */}
                {agent.approvalNote && (
                    <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-7 mb-6">
                        <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#4CAF50] tracking-[0.15em] uppercase mb-3">REVIEWER NOTE</div>
                        <p className="font-[family-name:var(--font-ibm-plex)] text-[13px] text-[#ccc] leading-relaxed">{agent.approvalNote}</p>
                        {agent.approvedAt && (
                            <p className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#555] mt-2">Approved: {new Date(agent.approvedAt).toLocaleString()}</p>
                        )}
                    </div>
                )}

                {/* Back */}
                <div className="text-center mt-8">
                    <Link href="/admin/agents" className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#555] hover:text-[#E84142] transition">
                        ← Back to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    )
}
