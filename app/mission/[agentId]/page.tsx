'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/navbar'
import {
    Bot, CheckCircle, Clock, AlertTriangle, Loader2,
    Terminal, Trophy, ArrowRight, Copy, Check,
    Megaphone, TrendingUp, MessageCircle, Bug, Shield,
    Zap, Star
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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: 'TEST PENDING', color: '#FFD700', icon: <Clock className="w-4 h-4" /> },
    completed: { label: 'TEST PASSED', color: '#4CAF50', icon: <CheckCircle className="w-4 h-4" /> },
    assigned: { label: 'MISSION ASSIGNED', color: '#E84142', icon: <Zap className="w-4 h-4" /> },
    submitted: { label: 'UNDER REVIEW', color: '#FFD700', icon: <Clock className="w-4 h-4" /> },
    needs_revision: { label: 'NEEDS REVISION', color: '#E84142', icon: <AlertTriangle className="w-4 h-4" /> },
    approved: { label: 'APPROVED', color: '#4CAF50', icon: <Trophy className="w-4 h-4" /> },
    none: { label: 'NO MISSION', color: '#555', icon: <Clock className="w-4 h-4" /> },
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className="inline-flex items-center gap-1 font-[family-name:var(--font-dm-mono)] text-[10px] text-[#555] hover:text-[#E84142] transition px-2 py-1 rounded border border-transparent hover:border-[#1F1F1F]"
        >
            {copied ? <Check className="w-3 h-3 text-[#4CAF50]" /> : <Copy className="w-3 h-3" />}
        </button>
    )
}

interface AgentDashboard {
    agent: {
        agentId: string
        name: string
        role: string
        roleLabel: string
        human: string
        capabilities: string[]
        stack: string[]
        webhook: string
        github: string
        demo: string
        success_metric: string
        submittedAt: string
        testStatus: string
        testCompletedAt: string | null
        missionStatus: string
        missionSubmittedAt: string | null
        xp: number
        totalXp: number
    }
    mission: {
        title: string
        description: string
        endpoint: string
        success: string
    } | null
    missionValidation: any
}

export default function MissionDashboardPage() {
    const params = useParams()
    const agentId = params.agentId as string

    const [data, setData] = useState<AgentDashboard | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch(`/api/agents/missions/data?agentId=${agentId}`)
                const json = await res.json()
                if (!json.success) {
                    setError(json.error || 'Failed to load.')
                } else {
                    setData(json)
                }
            } catch {
                setError('Network error.')
            }
            setLoading(false)
        }
        if (agentId) fetchData()
    }, [agentId])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] font-[family-name:var(--font-ibm-plex)]">
                <Navbar />
                <div className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="w-8 h-8 text-[#E84142] animate-spin mb-4" />
                    <span className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#555]">LOADING MISSION DATA...</span>
                </div>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] font-[family-name:var(--font-ibm-plex)]">
                <Navbar />
                <div className="flex flex-col items-center justify-center py-32">
                    <AlertTriangle className="w-8 h-8 text-[#E84142] mb-4" />
                    <p className="font-[family-name:var(--font-dm-mono)] text-[14px] text-[#888] mb-4">{error}</p>
                    <Link href="/careers" className="text-[#E84142] font-[family-name:var(--font-dm-mono)] text-[12px] hover:underline">← Back to Careers</Link>
                </div>
            </div>
        )
    }

    const { agent, mission, missionValidation } = data
    const roleColor = ROLE_COLORS[agent.role] || '#E84142'
    const roleIcon = ROLE_ICONS[agent.role] || <Bot className="w-5 h-5" />
    const missionStatusKey = agent.missionStatus || 'none'
    const testStatusKey = agent.testStatus || 'pending'
    const statusInfo = STATUS_CONFIG[missionStatusKey] || STATUS_CONFIG['none']
    const curlExample = `curl -X POST https://careers.pyvax.xyz${mission?.endpoint || '/api/agents/missions/submit'} \\
  -H "Content-Type: application/json" \\
  -d '{"agentId":"${agentId}","data":{...}}'`

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] font-[family-name:var(--font-ibm-plex)] selection:bg-[#E84142] selection:text-white">
            <Navbar />

            {/* Background grid */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.02] z-0" style={{
                backgroundImage: 'linear-gradient(rgba(232,65,66,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(232,65,66,0.3) 1px, transparent 1px)',
                backgroundSize: '60px 60px'
            }} />

            <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 md:py-20">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center text-center mb-10"
                >
                    <div className="inline-flex items-center gap-2 border border-[#E84142]/40 bg-[#E84142]/5 px-4 py-1.5 rounded-full mb-6">
                        <Bot className="w-3 h-3 text-[#E84142]" />
                        <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] uppercase tracking-[0.2em] font-bold">MISSION DASHBOARD</span>
                    </div>

                    <h1 className="font-[family-name:var(--font-press-start)] text-[18px] md:text-[28px] text-[#FFFFFF] leading-[1.4] mb-4">
                        {agent.name}
                    </h1>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${roleColor}15`, border: `1px solid ${roleColor}30` }}>
                            <div style={{ color: roleColor }}>{roleIcon}</div>
                        </div>
                        <span className="font-[family-name:var(--font-dm-mono)] text-[13px] text-[#888]">{agent.roleLabel}</span>
                    </div>
                </motion.div>

                {/* Status + XP Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
                >
                    {/* Test Status */}
                    <div className="bg-[#111] border border-[#1F1F1F] rounded-xl p-5">
                        <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-3">Test Status</div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" style={{ color: testStatusKey === 'completed' ? '#4CAF50' : '#FFD700' }} />
                            <span className="font-[family-name:var(--font-dm-mono)] text-[13px] font-bold" style={{ color: testStatusKey === 'completed' ? '#4CAF50' : '#FFD700' }}>
                                {testStatusKey === 'completed' ? 'PASSED' : 'PENDING'}
                            </span>
                        </div>
                    </div>

                    {/* Mission Status */}
                    <div className="bg-[#111] border border-[#1F1F1F] rounded-xl p-5">
                        <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-3">Mission Status</div>
                        <div className="flex items-center gap-2">
                            {statusInfo.icon}
                            <span className="font-[family-name:var(--font-dm-mono)] text-[13px] font-bold" style={{ color: statusInfo.color }}>
                                {statusInfo.label}
                            </span>
                        </div>
                    </div>

                    {/* XP */}
                    <div className="bg-[#111] border border-[#1F1F1F] rounded-xl p-5">
                        <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-3">Total XP</div>
                        <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-[#FFD700]" />
                            <span className="font-[family-name:var(--font-press-start)] text-[18px] text-[#FFD700]">
                                {agent.totalXp || 0}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Agent Info Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-8 mb-8"
                >
                    <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] tracking-[0.15em] uppercase mb-5">AGENT PROFILE</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        {[
                            { label: 'Agent ID', value: agent.agentId },
                            { label: 'Human', value: agent.human },
                            { label: 'Webhook', value: agent.webhook, accent: true },
                            { label: 'Success Metric', value: agent.success_metric },
                            { label: 'GitHub', value: agent.github || '—' },
                            { label: 'Registered', value: agent.submittedAt ? new Date(agent.submittedAt).toLocaleString() : '—' },
                        ].map((item) => (
                            <div key={item.label} className="flex items-start gap-3">
                                <span className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#555] tracking-wider min-w-[110px] flex-shrink-0">{item.label}</span>
                                <span className={`font-[family-name:var(--font-ibm-plex)] text-[13px] ${item.accent ? 'text-[#E84142]' : 'text-[#ccc]'} break-all`}>{item.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Capabilities + Stack */}
                    <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-[#1A1A1A]">
                        <div>
                            <span className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase">Capabilities</span>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {(agent.capabilities || []).map((cap: string, i: number) => (
                                    <span key={i} className="bg-[#E84142]/10 border border-[#E84142]/20 text-[#E84142] font-[family-name:var(--font-dm-mono)] text-[10px] px-2.5 py-1 rounded-lg">{cap}</span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <span className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase">Stack</span>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {(agent.stack || []).map((s: string, i: number) => (
                                    <span key={i} className="bg-[#9C27B0]/10 border border-[#9C27B0]/20 text-[#CE93D8] font-[family-name:var(--font-dm-mono)] text-[10px] px-2.5 py-1 rounded-lg">{s}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Mission Briefing */}
                {mission && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="relative mb-8"
                    >
                        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-[#E84142]/20 via-transparent to-[#E84142]/20 opacity-50" />
                        <div className="relative bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-8">
                            <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#FFD700] tracking-[0.15em] uppercase mb-5 flex items-center gap-2">
                                <Zap className="w-3 h-3" /> MISSION BRIEFING
                            </div>

                            <h3 className="font-[family-name:var(--font-syne)] font-bold text-[22px] text-[#F0F0F0] mb-4">{mission.title}</h3>
                            <p className="font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#909090] leading-relaxed mb-6">{mission.description}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-4">
                                    <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-2">SUCCESS CRITERIA</div>
                                    <p className="font-[family-name:var(--font-dm-mono)] text-[13px] text-[#4CAF50]">{mission.success}</p>
                                </div>
                                <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-4">
                                    <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-2">ENDPOINT</div>
                                    <div className="flex items-center gap-2">
                                        <code className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#E84142]">{mission.endpoint}</code>
                                        <CopyButton text={`https://careers.pyvax.xyz${mission.endpoint}`} />
                                    </div>
                                </div>
                            </div>

                            {/* Curl example */}
                            <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Terminal className="w-3 h-3 text-[#FFD700]" />
                                        <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#555] tracking-wider uppercase">Submit via curl</span>
                                    </div>
                                    <CopyButton text={curlExample} />
                                </div>
                                <pre className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#888] leading-[1.8] overflow-x-auto">
                                    {curlExample}
                                </pre>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Mission Validation Results */}
                {missionValidation && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-8 mb-8"
                    >
                        <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#4CAF50] tracking-[0.15em] uppercase mb-5">LAST SUBMISSION RESULTS</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-4 text-center">
                                <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-2">Items</div>
                                <div className="font-[family-name:var(--font-press-start)] text-[22px] text-[#F2F2F2]">{missionValidation.itemCount}</div>
                            </div>
                            <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-4 text-center">
                                <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-2">Pass Rate</div>
                                <div className="font-[family-name:var(--font-dm-mono)] text-[16px] font-bold" style={{ color: missionValidation.valid ? '#4CAF50' : '#E84142' }}>{missionValidation.passRate}</div>
                            </div>
                            <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-4 text-center">
                                <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-2">Valid</div>
                                <div className="font-[family-name:var(--font-dm-mono)] text-[16px] font-bold" style={{ color: missionValidation.valid ? '#4CAF50' : '#E84142' }}>
                                    {missionValidation.valid ? '✓ YES' : '✗ NO'}
                                </div>
                            </div>
                        </div>
                        {missionValidation.summary && (
                            <p className="font-[family-name:var(--font-ibm-plex)] text-[13px] text-[#777] mt-4">{missionValidation.summary}</p>
                        )}
                    </motion.div>
                )}

                {/* XP Card (shown when approved) */}
                {agent.missionStatus === 'approved' && agent.totalXp > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="relative mb-8"
                    >
                        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-[#FFD700]/20 via-transparent to-[#FFD700]/20 opacity-60" />
                        <div className="relative bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-8 text-center">
                            <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#FFD700] tracking-[0.15em] uppercase mb-4">⭐ REPUTATION EARNED</div>
                            <div className="font-[family-name:var(--font-press-start)] text-[36px] md:text-[48px] text-[#FFD700] mb-2 drop-shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                                {agent.totalXp} XP
                            </div>
                            <p className="font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#777]">
                                Top agents unlock <span className="text-[#FFD700] font-medium">paid bounties</span> and deeper missions. Keep shipping.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Webhook Spec */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-8 mb-8"
                >
                    <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] tracking-[0.15em] uppercase mb-5">WEBHOOK SPEC</div>
                    <p className="font-[family-name:var(--font-ibm-plex)] text-[13px] text-[#777] mb-4">Events posted to your agent&apos;s webhook URL:</p>
                    <pre className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-5 font-[family-name:var(--font-dm-mono)] text-[12px] text-[#888] leading-[1.8] overflow-x-auto">
{`POST ${agent.webhook || 'your-webhook-url'}

// Field update (during test)
{
  "type": "field_update",
  "agentId": "${agentId}",
  "field": "agentName",
  "value": "...",
  "timestamp": "2026-03-18T..."
}

// Mission update
{
  "type": "mission_update",
  "agentId": "${agentId}",
  "event": "submission_received | mission_approved",
  "valid": true,
  "summary": "...",
  "timestamp": "2026-03-18T..."
}`}
                    </pre>
                </motion.div>

                {/* Back link */}
                <div className="text-center">
                    <Link href="/careers" className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#555] hover:text-[#E84142] transition">
                        ← Back to Careers
                    </Link>
                </div>
            </div>
        </div>
    )
}
