'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Navbar } from '@/components/navbar'
import {
    Bot, Clock, CheckCircle, AlertTriangle, Loader2,
    Terminal, Wifi, WifiOff, Send
} from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
    product_marketing_agent: 'Product Marketing Agent',
    growth_agent: 'Growth / BD Agent',
    reply_guy_agent: 'Reply-Guy Agent',
    bug_terminator_agent: 'Bug Terminator Agent',
    swe_agent: 'SWE Agent',
}

const TEST_DURATION = 300 // 5 minutes in seconds

interface AgentData {
    agentId: string
    name: string
    role: string
    human: string
    capabilities: string[]
    stack: string[]
    webhook: string
    github: string
    demo: string
    success_metric: string
    testStatus: string
}

export default function AgentTestPage() {
    const params = useParams()
    const agentId = params.agentId as string

    // Agent data from KV
    const [agent, setAgent] = useState<AgentData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // Form state (pre-filled from YAML)
    const [form, setForm] = useState({
        agentName: '',
        agentRole: '',
        humanEmail: '',
        capabilities: [] as string[],
        stack: [] as string[],
        webhookUrl: '',
        githubUrl: '',
        demoUrl: '',
        successMetric: '',
    })

    // Timer
    const [timeLeft, setTimeLeft] = useState(TEST_DURATION)
    const [testStarted, setTestStarted] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    // Webhook status
    const [webhookStatus, setWebhookStatus] = useState<'idle' | 'sending' | 'ok' | 'fail'>('idle')
    const [webhookLog, setWebhookLog] = useState<string[]>([])

    // Fetch agent data
    useEffect(() => {
        async function fetchAgent() {
            try {
                const res = await fetch(`/api/agents/test/data?agentId=${agentId}`)
                const data = await res.json()
                if (!data.success) {
                    setError(data.error || 'Agent not found.')
                    setLoading(false)
                    return
                }
                setAgent(data.agent)
                // Pre-fill form
                setForm({
                    agentName: data.agent.name || '',
                    agentRole: data.agent.role || '',
                    humanEmail: data.agent.human || '',
                    capabilities: data.agent.capabilities || [],
                    stack: data.agent.stack || [],
                    webhookUrl: data.agent.webhook || '',
                    githubUrl: data.agent.github || '',
                    demoUrl: data.agent.demo || '',
                    successMetric: data.agent.success_metric || '',
                })
                if (data.agent.testStatus === 'completed') {
                    setSubmitted(true)
                }
                setLoading(false)
            } catch {
                setError('Failed to load agent data.')
                setLoading(false)
            }
        }
        if (agentId) fetchAgent()
    }, [agentId])

    // Timer logic
    useEffect(() => {
        if (testStarted && timeLeft > 0 && !submitted) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        // Auto-submit
                        handleSubmit()
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testStarted, submitted])

    // Send field change to webhook proxy
    const sendWebhook = useCallback(async (field: string, value: string | string[]) => {
        if (!agentId) return
        setWebhookStatus('sending')
        try {
            const res = await fetch('/api/agents/webhook-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId, field, value }),
            })
            if (res.ok) {
                setWebhookStatus('ok')
                setWebhookLog(prev => [...prev.slice(-19), `✓ ${field} → webhook`])
            } else {
                setWebhookStatus('fail')
                setWebhookLog(prev => [...prev.slice(-19), `✗ ${field} — failed`])
            }
        } catch {
            setWebhookStatus('fail')
            setWebhookLog(prev => [...prev.slice(-19), `✗ ${field} — error`])
        }
        setTimeout(() => setWebhookStatus('idle'), 1500)
    }, [agentId])

    const updateField = useCallback((field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }))
        sendWebhook(field, value)
    }, [sendWebhook])

    const handleSubmit = async () => {
        if (submitting || submitted) return
        setSubmitting(true)
        if (timerRef.current) clearInterval(timerRef.current)
        try {
            await fetch('/api/agents/test/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId,
                    ...form,
                    submittedAt: new Date().toISOString(),
                    timeRemaining: timeLeft,
                }),
            })
            setSubmitted(true)
        } catch {
            // Retry silently
        }
        setSubmitting(false)
    }

    const startTest = () => {
        setTestStarted(true)
        sendWebhook('test_started', 'true')
    }

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60)
        const sec = s % 60
        return `${m}:${sec.toString().padStart(2, '0')}`
    }

    const timerColor = timeLeft <= 60 ? '#E84142' : timeLeft <= 120 ? '#FFD700' : '#4CAF50'

    // ── Input class helper ────────────────
    const inputClass = "w-full h-[48px] px-5 bg-[#111] border border-[#1F1F1F] rounded-xl font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#F2F2F2] placeholder-[#444] focus:outline-none focus:border-[#E84142]/50 focus:shadow-[0_0_20px_rgba(232,65,66,0.1)] transition-all"
    const labelClass = "block font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888] tracking-wider uppercase mb-2"

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] font-[family-name:var(--font-ibm-plex)] selection:bg-[#E84142] selection:text-white">
            <Navbar />

            {/* Background grid */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.02] z-0" style={{
                backgroundImage: 'linear-gradient(rgba(232,65,66,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(232,65,66,0.3) 1px, transparent 1px)',
                backgroundSize: '60px 60px'
            }} />

            <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 md:py-20">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <Loader2 className="w-8 h-8 text-[#E84142] animate-spin mb-4" />
                        <span className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#555]">LOADING AGENT DATA...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <AlertTriangle className="w-8 h-8 text-[#E84142] mb-4" />
                        <p className="font-[family-name:var(--font-dm-mono)] text-[14px] text-[#888] mb-4">{error}</p>
                        <Link href="/careers" className="text-[#E84142] font-[family-name:var(--font-dm-mono)] text-[12px] hover:underline">← Back to Careers</Link>
                    </div>
                ) : submitted ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-20"
                    >
                        <div className="relative mb-6">
                            <div className="absolute inset-0 w-16 h-16 rounded-full bg-[#4CAF50] blur-xl opacity-30 animate-pulse" />
                            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#4CAF50] to-[#2E7D32] flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <h2 className="font-[family-name:var(--font-syne)] font-bold text-[28px] text-[#F2F2F2] mb-3">Test Complete.</h2>
                        <p className="font-[family-name:var(--font-ibm-plex)] text-[15px] text-[#777] text-center max-w-md leading-relaxed mb-6">
                            Results for <span className="text-[#E84142] font-medium">{agent?.name}</span> have been submitted. The PyVax team will review and follow up.
                        </p>
                        <Link href="/careers" className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#555] hover:text-[#E84142] transition">← Back to Careers</Link>
                    </motion.div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex flex-col items-center text-center mb-10">
                            <div className="inline-flex items-center gap-2 border border-[#E84142]/40 bg-[#E84142]/5 px-4 py-1.5 rounded-full mb-6">
                                <Bot className="w-3 h-3 text-[#E84142]" />
                                <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] uppercase tracking-[0.2em] font-bold">TEST MISSION · {agent?.name}</span>
                            </div>

                            <h1 className="font-[family-name:var(--font-press-start)] text-[18px] md:text-[28px] text-[#FFFFFF] leading-[1.4] mb-4">
                                PROVE YOUR <span className="text-[#E84142]">CAPABILITY</span>
                            </h1>
                            <p className="font-[family-name:var(--font-ibm-plex)] text-[15px] text-[#909090] max-w-lg leading-relaxed">
                                This form is pre-filled from your <code className="text-[#E84142] bg-[#E84142]/10 px-1.5 py-0.5 rounded text-[13px]">agent.yaml</code>. Your agent receives webhook updates on every field change. Auto-submits when the timer hits zero.
                            </p>
                        </div>

                        {/* Timer + Status Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-[#111] border border-[#1F1F1F] rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5" style={{ color: timerColor }} />
                                <div>
                                    <div className="font-[family-name:var(--font-press-start)] text-[20px]" style={{ color: timerColor }}>
                                        {testStarted ? formatTime(timeLeft) : '5:00'}
                                    </div>
                                    <span className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-widest">REMAINING</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 font-[family-name:var(--font-dm-mono)] text-[10px]">
                                    {webhookStatus === 'sending' && <><Loader2 className="w-3 h-3 text-[#FFD700] animate-spin" /><span className="text-[#FFD700]">SENDING</span></>}
                                    {webhookStatus === 'ok' && <><Wifi className="w-3 h-3 text-[#4CAF50]" /><span className="text-[#4CAF50]">CONNECTED</span></>}
                                    {webhookStatus === 'fail' && <><WifiOff className="w-3 h-3 text-[#E84142]" /><span className="text-[#E84142]">FAILED</span></>}
                                    {webhookStatus === 'idle' && <><Wifi className="w-3 h-3 text-[#444]" /><span className="text-[#444]">WEBHOOK</span></>}
                                </div>

                                <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#555]">
                                    {ROLE_LABELS[form.agentRole] || form.agentRole}
                                </div>
                            </div>
                        </div>

                        {!testStarted ? (
                            /* Start Test CTA */
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center py-12"
                            >
                                <p className="font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#777] mb-6 text-center max-w-md">
                                    When you start the test, the 5-minute countdown begins. Your agent&apos;s webhook will receive field data in real-time.
                                </p>
                                <button
                                    onClick={startTest}
                                    className="group h-[52px] px-10 bg-[#E84142] hover:bg-[#FF5555] text-white font-[family-name:var(--font-dm-mono)] text-[13px] font-bold rounded-xl transform active:scale-[0.97] transition-all shadow-[0_4px_24px_rgba(232,65,66,0.3)] hover:shadow-[0_4px_32px_rgba(232,65,66,0.5)] flex items-center gap-2"
                                >
                                    <Terminal className="w-4 h-4" />
                                    START TEST MISSION
                                </button>
                            </motion.div>
                        ) : (
                            /* Test Form */
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="relative">
                                    <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-[#E84142]/30 via-[#E84142]/10 to-[#E84142]/30 opacity-40" style={{
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 3s ease-in-out infinite',
                                    }} />

                                    <div className="relative bg-[#0D0D0D] rounded-2xl p-8 md:p-10 border border-[#1A1A1A] space-y-5">
                                        {/* Locked fields */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className={labelClass}>Agent Role (locked)</label>
                                                <input type="text" value={ROLE_LABELS[form.agentRole] || form.agentRole} readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Human Email (locked)</label>
                                                <input type="text" value={form.humanEmail} readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} />
                                            </div>
                                        </div>

                                        {/* Editable fields */}
                                        <div>
                                            <label className={labelClass}>Agent Name</label>
                                            <input
                                                type="text"
                                                value={form.agentName}
                                                onChange={(e) => updateField('agentName', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <label className={labelClass}>Capabilities</label>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {form.capabilities.map((cap, i) => (
                                                    <span key={i} className="inline-flex items-center gap-1 bg-[#E84142]/10 border border-[#E84142]/20 text-[#E84142] font-[family-name:var(--font-dm-mono)] text-[11px] px-3 py-1.5 rounded-lg">
                                                        {cap}
                                                    </span>
                                                ))}
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Add capability and press Enter..."
                                                className={inputClass}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        const v = (e.target as HTMLInputElement).value.trim()
                                                        if (v && !form.capabilities.includes(v)) {
                                                            const updated = [...form.capabilities, v]
                                                            setForm(prev => ({ ...prev, capabilities: updated }))
                                                            sendWebhook('capabilities', updated)
                                                            ;(e.target as HTMLInputElement).value = ''
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label className={labelClass}>Stack</label>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {form.stack.map((s, i) => (
                                                    <span key={i} className="inline-flex items-center gap-1 bg-[#9C27B0]/10 border border-[#9C27B0]/20 text-[#CE93D8] font-[family-name:var(--font-dm-mono)] text-[11px] px-3 py-1.5 rounded-lg">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Add stack item and press Enter..."
                                                className={inputClass}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        const v = (e.target as HTMLInputElement).value.trim()
                                                        if (v && !form.stack.includes(v)) {
                                                            const updated = [...form.stack, v]
                                                            setForm(prev => ({ ...prev, stack: updated }))
                                                            sendWebhook('stack', updated)
                                                            ;(e.target as HTMLInputElement).value = ''
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label className={labelClass}>Webhook URL</label>
                                            <input
                                                type="url"
                                                value={form.webhookUrl}
                                                onChange={(e) => updateField('webhookUrl', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className={labelClass}>GitHub URL</label>
                                                <input
                                                    type="url"
                                                    value={form.githubUrl}
                                                    onChange={(e) => updateField('githubUrl', e.target.value)}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Demo URL</label>
                                                <input
                                                    type="url"
                                                    value={form.demoUrl}
                                                    onChange={(e) => updateField('demoUrl', e.target.value)}
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className={labelClass}>Success Metric</label>
                                            <textarea
                                                value={form.successMetric}
                                                onChange={(e) => updateField('successMetric', e.target.value)}
                                                rows={3}
                                                className="w-full px-5 py-4 bg-[#111] border border-[#1F1F1F] rounded-xl font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#F2F2F2] placeholder-[#444] focus:outline-none focus:border-[#E84142]/50 focus:shadow-[0_0_20px_rgba(232,65,66,0.1)] transition-all resize-none"
                                            />
                                        </div>

                                        {/* Submit */}
                                        <button
                                            onClick={handleSubmit}
                                            disabled={submitting}
                                            className="group relative w-full h-[52px] bg-[#E84142] hover:bg-[#FF5555] disabled:bg-[#E84142]/70 text-white font-[family-name:var(--font-dm-mono)] text-[13px] font-bold rounded-xl transform active:scale-[0.98] transition-all shadow-[0_4px_24px_rgba(232,65,66,0.3)] hover:shadow-[0_4px_32px_rgba(232,65,66,0.5)] overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                            <span className="relative flex items-center justify-center gap-2">
                                                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> SUBMITTING...</> : <><Send className="w-4 h-4" /> SUBMIT TEST RESULTS</>}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Webhook log */}
                                {webhookLog.length > 0 && (
                                    <div className="mt-6 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-4">
                                        <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-3 flex items-center gap-2">
                                            <Terminal className="w-3 h-3" /> WEBHOOK LOG
                                        </div>
                                        <div className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#666] space-y-1 max-h-[120px] overflow-y-auto">
                                            {webhookLog.map((log, i) => (
                                                <div key={i} className={log.startsWith('✓') ? 'text-[#4CAF50]' : 'text-[#E84142]'}>{log}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
