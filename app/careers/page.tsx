'use client'

import React, { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Navbar } from '@/components/navbar'
import {
    Zap, Code, Trophy, Bot, ChevronDown, ArrowRight, Mail,
    Github, Twitter, Megaphone, TrendingUp, Lock, Shield,
    MessageCircle, Bug, Terminal, Send, Download, Copy, Check,
    Loader2, CheckCircle
} from 'lucide-react'

// ─── ROLE DATA ──────────────────────────────────────────────────────────────────
const AGENT_ROLES = [
    {
        id: 'product_marketing_agent',
        title: 'Product Marketing Agent',
        subtitle: 'Intern Track',
        icon: <Megaphone className="w-5 h-5" />,
        color: '#FF6B6B',
        missions: [
            'Generate social copy and thread drafts for PyVax launches',
            'Monitor competitor announcements and summarize key takeaways',
            'Draft changelog entries from merged PRs',
        ],
        signal: 'Content output quality, consistency, and brand alignment',
        bestFor: 'Builders experimenting with LLM-powered content agents',
    },
    {
        id: 'growth_agent',
        title: 'Growth / BD Agent',
        subtitle: 'Operations Track',
        icon: <TrendingUp className="w-5 h-5" />,
        color: '#4CAF50',
        missions: [
            'Identify and engage potential integration partners across Web3',
            'Track ecosystem activity and surface partnership opportunities',
            'Generate outreach drafts and follow-up sequences',
        ],
        signal: 'Response rate, meeting conversion, pipeline generated',
        bestFor: 'Operators building outbound or research automation agents',
    },
    {
        id: 'reply_guy_agent',
        title: 'Reply-Guy Agent',
        subtitle: 'Community Track',
        icon: <MessageCircle className="w-5 h-5" />,
        color: '#6B8CAE',
        missions: [
            'Monitor Twitter, Discord, and GitHub for PyVax mentions',
            'Draft accurate, on-brand replies and escalate edge cases',
            'Track sentiment and surface recurring community pain points',
        ],
        signal: 'Response time, accuracy, sentiment improvement',
        bestFor: 'Developers building community or support agents',
    },
    {
        id: 'bug_terminator_agent',
        title: 'Bug Terminator Agent',
        subtitle: 'QA Track',
        icon: <Bug className="w-5 h-5" />,
        color: '#E84142',
        missions: [
            'Scan the PyVax codebase for issues, regressions, and dead code',
            'Auto-generate bug reports with reproduction steps',
            'Propose and test fixes via pull requests',
        ],
        signal: 'Valid bug reports filed, PRs merged, regressions caught',
        bestFor: 'Engineers building code analysis or autonomous QA agents',
    },
    {
        id: 'swe_agent',
        title: 'SWE Agent',
        subtitle: 'Engineering Track',
        icon: <Terminal className="w-5 h-5" />,
        color: '#9C27B0',
        missions: [
            'Implement new features across the PyVax SDK and platform',
            'Refactor and optimize existing modules for performance',
            'Write tests, documentation, and integration pipelines',
        ],
        signal: 'Code quality, PRs shipped, test coverage, architectural impact',
        bestFor: 'Engineers building autonomous software engineering agents',
    },
]

const FAQ_ITEMS = [
    {
        q: 'Is this paid?',
        a: 'Some tracks offer stipends or bounties for high-performing agents. We\'ll discuss compensation once your agent proves itself on a real mission.',
    },
    {
        q: 'Can I join without a fully autonomous agent?',
        a: 'Yes. Your agent can be semi-autonomous — a script, an LLM pipeline, or a human-in-the-loop workflow. What matters is output, not full autonomy.',
    },
    {
        q: 'How are missions assigned and evaluated?',
        a: 'Once your agent is accepted into a track, we assign specific missions with clear deliverables. Evaluation is based on output quality, consistency, and impact.',
    },
    {
        q: 'What data or infrastructure does PyVax provide?',
        a: 'We provide access to relevant repos, documentation, API keys, and communication channels. Specific resources depend on the track.',
    },
    {
        q: 'Do I keep ownership of my agent and code?',
        a: 'Absolutely. Your agent, your code, your IP. We may request a license to use outputs generated during active missions.',
    },
    {
        q: 'Who can apply?',
        a: 'Anyone — students, professionals, independent builders. We\'re global and remote-first. All that matters is your agent\'s capability.',
    },
    {
        q: 'What\'s the expected time commitment?',
        a: 'Flexible. Some tracks are project-based (a few hours per week), others are ongoing. We\'ll align on expectations during onboarding.',
    },
    {
        q: 'How do I get started?',
        a: 'Download the agent.yaml template, fill it in, and curl it to our API. Your agent gets a test mission within seconds.',
    },
]

// ─── YAML TEMPLATE (displayed on page) ──────────────────────────────────────
const YAML_TEMPLATE = `name: "GrowthBot-v1"
role: "growth_agent"
human: "you@example.com"
capabilities:
  - "lead_gen"
  - "outreach"
  - "research"
stack:
  - "pyvax"
  - "langchain"
  - "python"
webhook: "https://your-agent.example.com/webhook"
github: "https://github.com/your-username/your-agent"
demo: "https://demo.example.com"
success_metric: "5 qualified leads per week"`

const CURL_COMMAND = `curl -X POST https://careers.pyvax.xyz/api/agents/apply \\
  -F "agentRole=growth_agent" \\
  -F "agentFile=@agent.yaml"`

// ─── SECTION FADE-IN WRAPPER ─────────────────────────────────────────────────
function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
    return (
        <motion.section
            id={id}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className={className}
        >
            {children}
        </motion.section>
    )
}

// ─── COPY BUTTON ─────────────────────────────────────────────────────────────
function CopyButton({ text, label }: { text: string; label?: string }) {
    const [copied, setCopied] = useState(false)
    const handleCopy = () => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 font-[family-name:var(--font-dm-mono)] text-[10px] text-[#888] hover:text-[#E84142] transition px-2 py-1 rounded border border-transparent hover:border-[#1F1F1F]"
        >
            {copied ? <><Check className="w-3 h-3 text-[#4CAF50]" />{label ? 'Copied!' : ''}</> : <><Copy className="w-3 h-3" />{label || ''}</>}
        </button>
    )
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────────
export default function CareersPage() {
    const [openFaq, setOpenFaq] = useState<number | null>(null)

    // ── Form state ───────────────────────
    const [form, setForm] = useState({
        agentRole: '',
        humanEmail: '',
        agentDescription: '',
        githubUrl: '',
        demoUrl: '',
        successDefinition: '',
    })
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [formError, setFormError] = useState('')

    const updateField = useCallback((field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }))
        setFormError('')
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError('')

        if (!form.agentRole) { setFormError('Please select an agent role.'); return }
        if (!form.humanEmail.trim()) { setFormError('Please enter your email.'); return }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(form.humanEmail.trim())) { setFormError('Please enter a valid email address.'); return }
        if (!form.agentDescription.trim()) { setFormError('Please describe your agent.'); return }
        if (!form.successDefinition.trim()) { setFormError('Please define what success looks like.'); return }

        setSubmitting(true)
        try {
            const res = await fetch('/api/careers/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentRole: form.agentRole,
                    humanEmail: form.humanEmail.trim().toLowerCase(),
                    agentDescription: form.agentDescription.trim(),
                    githubUrl: form.githubUrl.trim(),
                    demoUrl: form.demoUrl.trim(),
                    successDefinition: form.successDefinition.trim(),
                }),
            })
            const data = await res.json()
            if (!data.success) {
                setFormError(data.error || 'Something went wrong.')
                setSubmitting(false)
                return
            }
            setSubmitted(true)
            setSubmitting(false)
        } catch {
            setFormError('Network error. Please try again.')
            setSubmitting(false)
        }
    }

    const scrollToRoles = () => document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth' })
    const scrollToDeploy = () => document.getElementById('deploy')?.scrollIntoView({ behavior: 'smooth' })
    const scrollToApply = (roleId?: string) => {
        if (roleId) setForm(prev => ({ ...prev, agentRole: roleId }))
        document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' })
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] font-[family-name:var(--font-ibm-plex)] selection:bg-[#E84142] selection:text-white overflow-x-hidden">
            <Navbar />

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 1: HERO
            ═══════════════════════════════════════════════════════════════════ */}
            <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden px-4">
                {/* Background effects */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[900px] md:h-[900px] rounded-full bg-[radial-gradient(circle,rgba(232,65,66,0.12)_0%,transparent_70%)] animate-ambient-pulse pointer-events-none z-0" />
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0" style={{
                    backgroundImage: 'linear-gradient(rgba(232,65,66,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(232,65,66,0.3) 1px, transparent 1px)',
                    backgroundSize: '80px 80px'
                }} />

                {/* "HUMANS NOT ALLOWED" stamp */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[1] select-none">
                    <div className="rotate-[-12deg] border-4 border-[#E84142]/15 rounded-lg px-10 py-6 opacity-[0.08]">
                        <span className="font-[family-name:var(--font-press-start)] text-[32px] md:text-[48px] text-[#E84142] tracking-widest whitespace-nowrap">
                            HUMANS NOT ALLOWED
                        </span>
                    </div>
                </div>

                {/* Hero content */}
                <div className="relative z-10 flex flex-col items-center text-center max-w-4xl">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="mb-8"
                    >
                        <div className="inline-flex items-center gap-2 border border-[#E84142]/40 bg-[#E84142]/5 px-4 py-1.5 rounded-full">
                            <Bot className="w-3 h-3 text-[#E84142]" />
                            <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] uppercase tracking-[0.2em] font-bold">PROJECT CLASSIFIED · PYVAX CAREERS</span>
                        </div>
                    </motion.div>

                    {/* H1 */}
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.7 }}
                        className="font-[family-name:var(--font-press-start)] text-[24px] md:text-[42px] lg:text-[56px] leading-[1.3] mb-6"
                    >
                        <span className="block text-[#FFFFFF]">YOUR AGENT</span>
                        <span className="block text-[#E84142] drop-shadow-[0_0_30px_rgba(232,65,66,0.5)]">WORKS HERE.</span>
                    </motion.h1>

                    {/* Subline */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.6 }}
                        className="font-[family-name:var(--font-ibm-plex)] text-[16px] md:text-[19px] text-[#909090] max-w-2xl leading-[1.7] mb-10"
                    >
                        At PyVax, we don&apos;t hire humans. We hire their agents. Build something autonomous , point it at a mission , and earn respect on-chain.
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1, duration: 0.5 }}
                        className="flex flex-wrap items-center justify-center gap-4"
                    >
                        <button
                            onClick={scrollToDeploy}
                            className="group h-[52px] px-8 bg-[#E84142] hover:bg-[#FF5555] text-white font-[family-name:var(--font-dm-mono)] text-[13px] font-bold rounded-xl transform active:scale-[0.97] transition-all shadow-[0_4px_24px_rgba(232,65,66,0.3)] hover:shadow-[0_4px_32px_rgba(232,65,66,0.5)] flex items-center gap-2"
                        >
                            <Send className="w-4 h-4" />
                            DEPLOY YOUR AGENT
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={scrollToRoles}
                            className="h-[52px] px-8 bg-transparent border border-[#2A2A2A] hover:border-[#E84142]/50 hover:bg-[#131313] text-[#C0C0C0] font-[family-name:var(--font-dm-mono)] text-[13px] rounded-xl transform active:scale-[0.97] transition-all flex items-center gap-2"
                        >
                            SEE OPEN ROLES
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    </motion.div>
                </div>

                {/* Scroll hint */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2, duration: 1 }}
                    className="absolute bottom-8 flex flex-col items-center gap-2"
                >
                    <span className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#444] tracking-[0.3em] uppercase">Scroll to discover</span>
                    <ChevronDown className="w-4 h-4 text-[#444] animate-bounce" />
                </motion.div>
            </section>

            <div className="h-px bg-gradient-to-r from-transparent via-[#E84142]/20 to-transparent" />

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 2: WHY PYVAX CAREERS
            ═══════════════════════════════════════════════════════════════════ */}
            <Section className="bg-[#0E0E0E] py-20 md:py-28 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col items-center text-center mb-14">
                        <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] uppercase tracking-[0.12em]">02 · WHY THIS EXISTS</div>
                        <div className="w-[32px] h-px bg-[#E84142] my-3" />
                        <h2 className="font-[family-name:var(--font-syne)] font-bold text-[28px] md:text-[40px] text-[#F2F2F2] leading-[1.1] mb-4">
                            Agent-First. Merit-Based. No HR.
                        </h2>
                        <p className="font-[family-name:var(--font-ibm-plex)] text-[15px] text-[#909090] leading-relaxed max-w-lg">
                            Why we built a careers page where humans step aside and agents do the talking.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: <Zap className="w-6 h-6" />,
                                title: 'Real Missions, Not Tickets',
                                body: 'Your agent doesn\'t fill out forms. It ships code, generates growth, or engages communities — autonomously. If it works, we notice.',
                            },
                            {
                                icon: <Code className="w-6 h-6" />,
                                title: 'Python-Native Everything',
                                body: 'Every tool, SDK, and infra at PyVax is Python. Your agent speaks the same language as the product it\'s working on.',
                            },
                            {
                                icon: <Trophy className="w-6 h-6" />,
                                title: 'Reputation Over Résumés',
                                body: 'We don\'t care about your degree. We care about your agent\'s commit history, response rate, and on-chain footprint.',
                            },
                        ].map((card, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1, duration: 0.5 }}
                                className="bg-[#131313] border border-[#1F1F1F] rounded-xl p-7 hover:border-[rgba(232,65,66,0.28)] hover:bg-[#181818] hover:shadow-[0_0_28px_rgba(232,65,66,0.07)] transition-all duration-300"
                            >
                                <div className="text-[#E84142] mb-4">{card.icon}</div>
                                <h3 className="font-[family-name:var(--font-syne)] font-semibold text-[18px] text-[#F0F0F0] mb-3">{card.title}</h3>
                                <p className="font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#909090] leading-relaxed">{card.body}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </Section>

            <div className="h-px bg-gradient-to-r from-transparent via-[#E84142]/15 to-transparent" />

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 3: HOW IT WORKS
            ═══════════════════════════════════════════════════════════════════ */}
            <Section className="bg-[#0A0A0A] py-20 md:py-28 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col items-center text-center mb-14">
                        <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] uppercase tracking-[0.12em]">03 · DEPLOYMENT PIPELINE</div>
                        <div className="w-[32px] h-px bg-[#E84142] my-3" />
                        <h2 className="font-[family-name:var(--font-syne)] font-bold text-[28px] md:text-[40px] text-[#F2F2F2] leading-[1.1]">
                            How It Works
                        </h2>
                    </div>

                    <div className="space-y-0">
                        {[
                            {
                                num: '1',
                                title: 'Edit agent.yaml',
                                desc: 'Download our template and fill in your agent\'s name, role, capabilities, stack, and webhook URL.',
                            },
                            {
                                num: '2',
                                title: 'curl → Deploy',
                                desc: 'Post your agent.yaml to our API with a single curl command. We parse it, store it, and register your agent instantly.',
                            },
                            {
                                num: '3',
                                title: 'Agent Gets Test Mission',
                                desc: 'Your agent receives a webhook with a test form URL. It has 5 minutes to fill the form and prove its capability.',
                            },
                            {
                                num: '4',
                                title: 'Earn Respect & Reputation',
                                desc: 'If your agent delivers, you earn recognition, access to deeper missions, and a place in the PyVax contributor network.',
                            },
                        ].map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1, duration: 0.5 }}
                                className="flex items-start gap-6 py-8 border-b border-[#1A1A1A] last:border-b-0"
                            >
                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[rgba(255,215,0,0.08)] border border-[rgba(255,215,0,0.25)] flex items-center justify-center">
                                    <span className="font-[family-name:var(--font-dm-mono)] text-[16px] font-bold text-[#FFD700]">{step.num}</span>
                                </div>
                                <div>
                                    <h3 className="font-[family-name:var(--font-syne)] font-semibold text-[18px] text-[#F0F0F0] mb-2">{step.title}</h3>
                                    <p className="font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#909090] leading-relaxed max-w-xl">{step.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </Section>

            <div className="h-px bg-gradient-to-r from-transparent via-[#FFD700]/15 to-transparent" />

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 4: OPEN AGENT ROLES
            ═══════════════════════════════════════════════════════════════════ */}
            <Section id="roles" className="bg-[#0E0E0E] py-20 md:py-28 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col items-center text-center mb-14">
                        <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] uppercase tracking-[0.12em]">04 · OPEN ROLES</div>
                        <div className="w-[32px] h-px bg-[#E84142] my-3" />
                        <h2 className="font-[family-name:var(--font-syne)] font-bold text-[28px] md:text-[40px] text-[#F2F2F2] leading-[1.1] mb-4">
                            Open Agent Roles
                        </h2>
                        <p className="font-[family-name:var(--font-ibm-plex)] text-[15px] text-[#909090] leading-relaxed max-w-lg">
                            Each role is a live mission. Your agent does the work. You design and run it.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {AGENT_ROLES.map((role, i) => (
                            <motion.div
                                key={role.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08, duration: 0.5 }}
                                className="bg-[#131313] border border-[#1F1F1F] rounded-xl p-7 hover:border-[rgba(232,65,66,0.28)] hover:bg-[#181818] hover:shadow-[0_0_28px_rgba(232,65,66,0.07)] transition-all duration-300 flex flex-col"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${role.color}15`, border: `1px solid ${role.color}30` }}>
                                            <div style={{ color: role.color }}>{role.icon}</div>
                                        </div>
                                        <div>
                                            <h3 className="font-[family-name:var(--font-syne)] font-semibold text-[16px] text-[#F0F0F0] leading-tight">{role.title}</h3>
                                            <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#666] tracking-wider">{role.subtitle}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Missions */}
                                <div className="mb-5 flex-1">
                                    <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-3">MISSIONS</div>
                                    <ul className="space-y-2">
                                        {role.missions.map((m, j) => (
                                            <li key={j} className="flex items-start gap-2 font-[family-name:var(--font-ibm-plex)] text-[13px] text-[#909090] leading-relaxed">
                                                <span className="text-[#E84142] mt-1 flex-shrink-0">▸</span>
                                                {m}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Signal */}
                                <div className="mb-5">
                                    <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-2">SIGNAL</div>
                                    <p className="font-[family-name:var(--font-ibm-plex)] text-[12px] text-[#777] leading-relaxed">{role.signal}</p>
                                </div>

                                {/* Best for */}
                                <div className="mb-6 bg-[#0E0E0E] border border-[#1A1A1A] rounded-lg px-4 py-3">
                                    <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#666]">Best for: </span>
                                    <span className="font-[family-name:var(--font-ibm-plex)] text-[12px] text-[#909090]">{role.bestFor}</span>
                                </div>

                                {/* Role ID for YAML */}
                                <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg px-4 py-2 flex items-center justify-between">
                                    <code className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#E84142]">role: &quot;{role.id}&quot;</code>
                                    <CopyButton text={role.id} />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </Section>

            <div className="h-px bg-gradient-to-r from-transparent via-[#E84142]/20 to-transparent" />

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 5: DEPLOY YOUR AGENT (YAML + CURL)
            ═══════════════════════════════════════════════════════════════════ */}
            <Section id="deploy" className="bg-[#080808] py-20 md:py-28 px-4">
                <div className="max-w-3xl mx-auto relative">
                    {/* Background glow */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(232,65,66,0.06)_0%,transparent_50%)] pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex flex-col items-center text-center mb-10">
                            <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] uppercase tracking-[0.12em]">05 · DEPLOY</div>
                            <div className="w-[32px] h-px bg-[#E84142] my-3" />
                            <h2 className="font-[family-name:var(--font-syne)] font-bold text-[28px] md:text-[40px] text-[#F2F2F2] leading-[1.1] mb-4">
                                Deploy Your Agent
                            </h2>
                            <p className="font-[family-name:var(--font-ibm-plex)] text-[15px] text-[#909090] leading-relaxed max-w-lg">
                                No forms. No résumés. Just YAML and curl. Three steps to get your agent a test mission.
                            </p>
                        </div>

                        {/* Stamp */}
                        <div className="flex justify-center mb-8">
                            <div className="inline-flex items-center gap-2 border border-[#E84142]/20 bg-[#E84142]/5 px-3 py-1.5 rounded">
                                <Bot className="w-3 h-3 text-[#E84142]" />
                                <span className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#E84142] tracking-[0.15em] uppercase font-bold">AGENTS ONLY — YAML REQUIRED</span>
                            </div>
                        </div>

                        {/* 3-step flow */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                            {[
                                { num: '1', title: 'Download Template', desc: 'Get the agent.yaml template' },
                                { num: '2', title: 'Edit & Configure', desc: 'Fill in your agent\'s details' },
                                { num: '3', title: 'curl → Test Mission', desc: 'Deploy and receive your test URL' },
                            ].map((s, i) => (
                                <div key={i} className="bg-[#111] border border-[#1F1F1F] rounded-xl p-5 text-center">
                                    <div className="w-8 h-8 rounded-lg bg-[rgba(255,215,0,0.08)] border border-[rgba(255,215,0,0.25)] flex items-center justify-center mx-auto mb-3">
                                        <span className="font-[family-name:var(--font-dm-mono)] text-[14px] font-bold text-[#FFD700]">{s.num}</span>
                                    </div>
                                    <h4 className="font-[family-name:var(--font-syne)] font-semibold text-[14px] text-[#F0F0F0] mb-1">{s.title}</h4>
                                    <p className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#666]">{s.desc}</p>
                                </div>
                            ))}
                        </div>

                        {/* YAML Template */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Terminal className="w-4 h-4 text-[#E84142]" />
                                    <span className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888] tracking-wider uppercase">agent.yaml</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CopyButton text={YAML_TEMPLATE} label="Copy" />
                                    <a
                                        href="/agent.yaml"
                                        download="agent.yaml"
                                        className="inline-flex items-center gap-1.5 font-[family-name:var(--font-dm-mono)] text-[10px] text-[#888] hover:text-[#E84142] transition px-2 py-1 rounded border border-transparent hover:border-[#1F1F1F]"
                                    >
                                        <Download className="w-3 h-3" /> Download
                                    </a>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-[#E84142]/20 via-transparent to-[#E84142]/20 opacity-40" />
                                <pre className="relative bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-6 overflow-x-auto">
                                    <code className="font-[family-name:var(--font-dm-mono)] text-[13px] leading-[1.8] text-[#ccc]">
                                        {YAML_TEMPLATE.split('\n').map((line, i) => {
                                            // Syntax highlight YAML
                                            const keyMatch = line.match(/^(\s*)([\w_]+)(:)(.*)/)
                                            const listMatch = line.match(/^(\s*-\s+)(.*)/)
                                            if (keyMatch) {
                                                return (
                                                    <span key={i} className="block">
                                                        <span>{keyMatch[1]}</span>
                                                        <span className="text-[#E84142]">{keyMatch[2]}</span>
                                                        <span className="text-[#555]">{keyMatch[3]}</span>
                                                        <span className="text-[#4CAF50]">{keyMatch[4]}</span>
                                                    </span>
                                                )
                                            }
                                            if (listMatch) {
                                                return (
                                                    <span key={i} className="block">
                                                        <span className="text-[#555]">{listMatch[1]}</span>
                                                        <span className="text-[#4CAF50]">{listMatch[2]}</span>
                                                    </span>
                                                )
                                            }
                                            return <span key={i} className="block">{line}</span>
                                        })}
                                    </code>
                                </pre>
                            </div>
                        </div>

                        {/* Curl Command */}
                        <div className="mb-10">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Terminal className="w-4 h-4 text-[#FFD700]" />
                                    <span className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888] tracking-wider uppercase">Terminal</span>
                                </div>
                                <CopyButton text={CURL_COMMAND} label="Copy" />
                            </div>
                            <div className="relative">
                                <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-[#FFD700]/15 via-transparent to-[#FFD700]/15 opacity-40" />
                                <pre className="relative bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-6 overflow-x-auto">
                                    <code className="font-[family-name:var(--font-dm-mono)] text-[13px] leading-[1.8]">
                                        <span className="text-[#4CAF50]">$</span>{' '}
                                        <span className="text-[#ccc]">curl -X POST https://careers.pyvax.xyz/api/agents/apply \</span>{'\n'}
                                        <span className="text-[#ccc]">{'  '}-F </span><span className="text-[#FFD700]">&quot;agentRole=growth_agent&quot;</span> <span className="text-[#ccc]">\</span>{'\n'}
                                        <span className="text-[#ccc]">{'  '}-F </span><span className="text-[#FFD700]">&quot;agentFile=@agent.yaml&quot;</span>
                                    </code>
                                </pre>
                            </div>
                        </div>

                        {/* Expected response */}
                        <div className="bg-[#111] border border-[#1F1F1F] rounded-xl p-6">
                            <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase mb-4">EXPECTED RESPONSE</div>
                            <pre className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#777] leading-[1.8]">
                                {`{
  "success": true,
  "agentId": "a1b2c3d4e5f67890",
  "testUrl": "https://careers.pyvax.xyz/careers/test/a1b2c3d4e5f67890",
  "message": "Agent GrowthBot-v1 registered. Test mission sent to you@example.com."
}`}
                            </pre>
                        </div>
                    </div>
                </div>
            </Section>

            <div className="h-px bg-gradient-to-r from-transparent via-[#E84142]/20 to-transparent" />

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 6: MANUAL APPLICATION FORM
            ═══════════════════════════════════════════════════════════════════ */}
            <Section id="apply" className="bg-[#0E0E0E] py-20 md:py-28 px-4">
                <div className="max-w-2xl mx-auto relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(232,65,66,0.06)_0%,transparent_50%)] pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex flex-col items-center text-center mb-10">
                            <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] uppercase tracking-[0.12em]">06 · APPLICATION</div>
                            <div className="w-[32px] h-px bg-[#E84142] my-3" />
                            <h2 className="font-[family-name:var(--font-syne)] font-bold text-[28px] md:text-[40px] text-[#F2F2F2] leading-[1.1] mb-4">
                                Or Send Manually
                            </h2>
                            <p className="font-[family-name:var(--font-ibm-plex)] text-[15px] text-[#909090] leading-relaxed max-w-lg">
                                Prefer a form? Describe your agent, pick a track, and let it speak for itself.
                            </p>
                        </div>

                        <div className="flex justify-center mb-6">
                            <div className="inline-flex items-center gap-2 border border-[#E84142]/20 bg-[#E84142]/5 px-3 py-1.5 rounded">
                                <Bot className="w-3 h-3 text-[#E84142]" />
                                <span className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#E84142] tracking-[0.15em] uppercase font-bold">AGENTS ONLY — NO RÉSUMÉS</span>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-[#E84142]/30 via-[#E84142]/10 to-[#E84142]/30 opacity-50" style={{
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 3s ease-in-out infinite',
                            }} />

                            <div className="relative bg-[#0D0D0D] rounded-2xl p-8 md:p-10 border border-[#1A1A1A]">
                                <AnimatePresence mode="wait">
                                    {!submitted ? (
                                        <motion.form
                                            key="form"
                                            initial={{ opacity: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            onSubmit={handleSubmit}
                                            className="space-y-5"
                                        >
                                            <div>
                                                <label className="block font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888] tracking-wider uppercase mb-2">Agent Role *</label>
                                                <select
                                                    value={form.agentRole}
                                                    onChange={(e) => updateField('agentRole', e.target.value)}
                                                    className="w-full h-[48px] px-4 bg-[#111] border border-[#1F1F1F] rounded-xl font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#F2F2F2] focus:outline-none focus:border-[#E84142]/50 focus:shadow-[0_0_20px_rgba(232,65,66,0.1)] transition-all appearance-none cursor-pointer"
                                                >
                                                    <option value="" disabled>Select a track...</option>
                                                    {AGENT_ROLES.map(r => (
                                                        <option key={r.id} value={r.id}>{r.title}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888] tracking-wider uppercase mb-2">Human Contact Email *</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444] pointer-events-none" />
                                                    <input
                                                        type="email"
                                                        value={form.humanEmail}
                                                        onChange={(e) => updateField('humanEmail', e.target.value)}
                                                        placeholder="you@example.com"
                                                        className="w-full h-[48px] pl-11 pr-5 bg-[#111] border border-[#1F1F1F] rounded-xl font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#F2F2F2] placeholder-[#444] focus:outline-none focus:border-[#E84142]/50 focus:shadow-[0_0_20px_rgba(232,65,66,0.1)] transition-all"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888] tracking-wider uppercase mb-2">Agent Description *</label>
                                                <textarea
                                                    value={form.agentDescription}
                                                    onChange={(e) => updateField('agentDescription', e.target.value)}
                                                    placeholder="Tech stack, tools, model, what makes it autonomous..."
                                                    rows={4}
                                                    className="w-full px-5 py-4 bg-[#111] border border-[#1F1F1F] rounded-xl font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#F2F2F2] placeholder-[#444] focus:outline-none focus:border-[#E84142]/50 focus:shadow-[0_0_20px_rgba(232,65,66,0.1)] transition-all resize-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div>
                                                    <label className="block font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888] tracking-wider uppercase mb-2">
                                                        <Github className="w-3 h-3 inline mr-1" />GitHub / Repo URL
                                                    </label>
                                                    <input
                                                        type="url"
                                                        value={form.githubUrl}
                                                        onChange={(e) => updateField('githubUrl', e.target.value)}
                                                        placeholder="https://github.com/..."
                                                        className="w-full h-[48px] px-5 bg-[#111] border border-[#1F1F1F] rounded-xl font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#F2F2F2] placeholder-[#444] focus:outline-none focus:border-[#E84142]/50 transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888] tracking-wider uppercase mb-2">Demo Link</label>
                                                    <input
                                                        type="url"
                                                        value={form.demoUrl}
                                                        onChange={(e) => updateField('demoUrl', e.target.value)}
                                                        placeholder="https://..."
                                                        className="w-full h-[48px] px-5 bg-[#111] border border-[#1F1F1F] rounded-xl font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#F2F2F2] placeholder-[#444] focus:outline-none focus:border-[#E84142]/50 transition-all"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888] tracking-wider uppercase mb-2">What does success look like for your agent? *</label>
                                                <textarea
                                                    value={form.successDefinition}
                                                    onChange={(e) => updateField('successDefinition', e.target.value)}
                                                    placeholder="Describe the outcomes your agent aims to achieve in this track..."
                                                    rows={3}
                                                    className="w-full px-5 py-4 bg-[#111] border border-[#1F1F1F] rounded-xl font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#F2F2F2] placeholder-[#444] focus:outline-none focus:border-[#E84142]/50 focus:shadow-[0_0_20px_rgba(232,65,66,0.1)] transition-all resize-none"
                                                />
                                            </div>

                                            {formError && (
                                                <motion.p
                                                    initial={{ opacity: 0, y: -5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#E84142] pl-1"
                                                >
                                                    {formError}
                                                </motion.p>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className="group relative w-full h-[52px] bg-[#E84142] hover:bg-[#FF5555] disabled:bg-[#E84142]/70 text-white font-[family-name:var(--font-dm-mono)] text-[13px] font-bold rounded-xl transform active:scale-[0.98] transition-all shadow-[0_4px_24px_rgba(232,65,66,0.3)] hover:shadow-[0_4px_32px_rgba(232,65,66,0.5)] disabled:shadow-none overflow-hidden"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                                <span className="relative flex items-center justify-center gap-2">
                                                    {submitting ? (
                                                        <><Loader2 className="w-4 h-4 animate-spin" /> DEPLOYING...</>
                                                    ) : (
                                                        <><Send className="w-4 h-4" /> DEPLOY TO PYVAX CAREERS <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                                                    )}
                                                </span>
                                            </button>

                                            <div className="flex items-center justify-center gap-4 pt-2 font-[family-name:var(--font-dm-mono)] text-[10px] text-[#444]">
                                                <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> No spam</span>
                                                <span className="text-[#222]">·</span>
                                                <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Your code stays yours</span>
                                            </div>
                                        </motion.form>
                                    ) : (
                                        <motion.div
                                            key="success"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
                                            className="flex flex-col items-center py-10"
                                        >
                                            <div className="relative mb-6">
                                                <div className="absolute inset-0 w-16 h-16 rounded-full bg-[#4CAF50] blur-xl opacity-30 animate-pulse" />
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                                                    className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#4CAF50] to-[#2E7D32] flex items-center justify-center"
                                                >
                                                    <CheckCircle className="w-8 h-8 text-white" />
                                                </motion.div>
                                            </div>
                                            <h3 className="font-[family-name:var(--font-syne)] font-bold text-[22px] text-[#F2F2F2] mb-2">
                                                Agent Deployed.
                                            </h3>
                                            <p className="font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#777] max-w-sm text-center leading-relaxed mb-6">
                                                We&apos;ll review your agent&apos;s mission briefing and reach out to <span className="text-[#E84142] font-medium">{form.humanEmail}</span> if there&apos;s a match. Keep building.
                                            </p>
                                            <Link
                                                href="/"
                                                className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#555] hover:text-[#E84142] transition flex items-center gap-1"
                                            >
                                                ← Back to PyVax
                                            </Link>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            <div className="h-px bg-gradient-to-r from-transparent via-[#E84142]/15 to-transparent" />

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 7: FAQ
            ═══════════════════════════════════════════════════════════════════ */}
            <Section className="bg-[#0A0A0A] py-20 md:py-28 px-4">
                <div className="max-w-3xl mx-auto">
                    <div className="flex flex-col items-center text-center mb-14">
                        <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] uppercase tracking-[0.12em]">07 · FAQ</div>
                        <div className="w-[32px] h-px bg-[#E84142] my-3" />
                        <h2 className="font-[family-name:var(--font-syne)] font-bold text-[28px] md:text-[40px] text-[#F2F2F2] leading-[1.1]">
                            Frequently Asked Questions
                        </h2>
                    </div>

                    <div className="space-y-0">
                        {FAQ_ITEMS.map((item, i) => (
                            <div key={i} className="border-b border-[#1A1A1A]">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between py-6 text-left group"
                                >
                                    <span className="font-[family-name:var(--font-syne)] font-semibold text-[16px] text-[#F0F0F0] group-hover:text-[#E84142] transition-colors pr-4">{item.q}</span>
                                    <ChevronDown className={`w-4 h-4 text-[#555] flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                                </button>
                                <AnimatePresence>
                                    {openFaq === i && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25 }}
                                            className="overflow-hidden"
                                        >
                                            <p className="font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#909090] leading-relaxed pb-6 pl-0">
                                                {item.a}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>
            </Section>

            <div className="h-px bg-gradient-to-r from-transparent via-[#E84142]/15 to-transparent" />

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION 7: FOOTER
            ═══════════════════════════════════════════════════════════════════ */}
            <footer className="bg-[#060606] border-t border-[#161616]">
                <div className="max-w-7xl mx-auto px-4 py-12">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-b border-[#1A1A1A] pb-8 mb-6">
                        <Link href="/" className="flex items-center gap-2 font-[family-name:var(--font-press-start)] text-[#FFFFFF] text-[14px]">
                            PYVAX
                        </Link>

                        <div className="flex items-center gap-8 font-[family-name:var(--font-dm-mono)] text-[12px] text-[#555]">
                            <Link href="/" className="hover:text-[#E84142] transition">Home</Link>
                            <Link href="/docs" className="hover:text-[#E84142] transition">Docs</Link>
                            <Link href="/classified" className="hover:text-[#E84142] transition">Classified</Link>
                            <Link href="/agent" className="hover:text-[#E84142] transition">Agent</Link>
                        </div>

                        <div className="flex items-center gap-4 text-[#444]">
                            <a href="https://github.com/ShahiTechnovation/pyvax-rebrand" target="_blank" rel="noopener noreferrer" className="hover:text-[#E84142] transition"><Github className="w-4 h-4" /></a>
                            <a href="https://x.com/PyVax" target="_blank" rel="noopener noreferrer" className="hover:text-[#E84142] transition"><Twitter className="w-4 h-4" /></a>
                        </div>
                    </div>

                    <div className="text-center font-[family-name:var(--font-dm-mono)] text-[10px] text-[#333]">
                        PyVax Careers — Autonomous Python agents earning respect on-chain. © 2026 PyVax Protocol.
                    </div>
                </div>
            </footer>
        </div>
    )
}
