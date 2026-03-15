'use client'

import React, { useState, useEffect, useRef, memo, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Twitter, Github, MessageCircle, Zap, Shield, Brain, Wallet, ArrowRight, Lock, Mail, CheckCircle, Loader2, Users, Sparkles } from 'lucide-react'
import { Navbar } from '@/components/navbar'

// ─── LAZY-LOAD SPLINE (biggest perf fix: don't block initial render) ─────────
const Spline = dynamic(() => import('@splinetool/react-spline'), {
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-2 border-[#E84142] border-t-transparent rounded-full animate-spin" />
                <span className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#555] tracking-wider">LOADING AGENT...</span>
            </div>
        </div>
    ),
})

// ─── TAGLINES for typewriter ─────────────────────────────────────────────────
const TAGLINES = [
    'It deploys. It trades. It remembers. It never sleeps.',
    'The first autonomous on-chain agent — powered entirely by Python.',
    'Your whole decentralized journey. One agent. One language.',
    'Built different. Built in Python. Built for the chain.',
    'Not a chatbot. Not a wrapper. A full execution runtime.',
]

// ─── MARQUEE ITEMS ───────────────────────────────────────────────────────────
const MARQUEE_ITEMS = [
    'AUTONOMOUS AGENTS',
    'PYTHON-NATIVE',
    'ON-CHAIN MEMORY',
    'ZERO SOLIDITY',
    'MULTI-CHAIN READY',
    'DeFi AUTOPILOT',
    'VERIFIABLE EXECUTION',
    'SUB-SECOND FINALITY',
    'AGENT WALLETS',
    'GAS OPTIMIZED',
    'CROSS-CHAIN BRIDGE',
    'REAL-TIME EVENTS',
]

// ─── TERMINAL LINES (static data outside component) ──────────────────────────
const TERMINAL_LINES = [
    { addr: '[AGENT-001]', action: 'initializing wallet cluster...', target: '', status: '✓', time: 'ready' },
    { addr: '[AGENT-001]', action: 'scanning DeFi pools on C-Chain...', target: '', status: '✓', time: '24 pools' },
    { addr: '[AGENT-001]', action: 'deploying ', target: 'VaultStrategy.py', status: '✓', time: '0xA3f..7c2' },
    { addr: '[AGENT-001]', action: 'executing ', target: 'rebalance()', status: '✓', time: '$42k TVL' },
    { addr: '[AGENT-001]', action: 'writing agent_memory to chain...', target: '', status: '✓', time: 'persisted' },
    { addr: '[AGENT-002]', action: 'sub-agent spawned by AGENT-001', target: '', status: '✓', time: 'autonomous' },
]

// ─── CAPABILITY CARDS (static data outside component) ────────────────────────
const CAPABILITY_CARDS = [
    {
        icon: 'wallet',
        tag: 'WALLET',
        title: 'Autonomous Wallet Management',
        body: 'Agent generates, manages, and rotates HD wallets autonomously. No seed phrases, no manual signing. Fully programmatic custody.',
        revealed: true,
    },
    {
        icon: 'zap',
        tag: 'DEPLOYER',
        title: 'Smart Contract Deployment',
        body: 'Write Python — agent deploys, verifies, and indexes contracts on Avalanche C-Chain. One function call. Done.',
        revealed: true,
    },
    {
        icon: 'brain',
        tag: 'DeFi',
        title: 'DeFi Strategy Execution',
        body: 'Agent monitors liquidity pools, executes swaps, rebalances portfolios, yield farms — all on autopilot with risk parameters you define.',
        revealed: true,
    },
    {
        icon: 'shield',
        tag: 'CLASSIFIED',
        title: '██████████████',
        body: '████████████████████████████████████████████████████████████████████████',
        revealed: false,
    },
    {
        icon: 'lock',
        tag: 'CLASSIFIED',
        title: '██████████████',
        body: '████████████████████████████████████████████████████████████████████████',
        revealed: false,
    },
    {
        icon: 'lock',
        tag: 'COMING SOON',
        title: '██████████████',
        body: '████████████████████████████████████████████████████████████████████████',
        revealed: false,
    },
]

const ICON_MAP: Record<string, React.ReactNode> = {
    wallet: <Wallet className="w-6 h-6" />,
    zap: <Zap className="w-6 h-6" />,
    brain: <Brain className="w-6 h-6" />,
    shield: <Shield className="w-6 h-6" />,
    lock: <Lock className="w-6 h-6" />,
}

// ─── MARQUEE COMPONENT (isolated, no re-renders from parent) ─────────────────
const MarqueeBelt = memo(function MarqueeBelt() {
    return (
        <section className="relative border-y border-[#E84142]/20 bg-[#0A0A0A] py-5 overflow-hidden">
            <div className="flex animate-marquee whitespace-nowrap will-change-transform">
                {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
                    <span key={i} className="font-[family-name:var(--font-dm-mono)] text-[12px] md:text-[14px] text-[#E84142] tracking-[0.15em] uppercase mx-6 md:mx-10 flex items-center gap-3">
                        <span className="text-[#333]">◆</span>
                        {item}
                    </span>
                ))}
            </div>
        </section>
    )
})

export default function AgentPage() {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // ── Tagline cycling ──────────────────────────────────────────────────────
    const [taglineIndex, setTaglineIndex] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setTaglineIndex((prev) => (prev + 1) % TAGLINES.length)
        }, 4000)
        return () => clearInterval(interval)
    }, [])

    // ── Terminal animation ───────────────────────────────────────────────────
    const [visibleLines, setVisibleLines] = useState(0)
    const terminalRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    let line = 0
                    const interval = setInterval(() => {
                        line++
                        setVisibleLines(line)
                        if (line >= 6) clearInterval(interval)
                    }, 400)
                    observer.disconnect()
                }
            },
            { threshold: 0.3 }
        )
        if (terminalRef.current) observer.observe(terminalRef.current)
        return () => observer.disconnect()
    }, [])

    // ── Spline loaded state ──────────────────────────────────────────────────
    const [splineLoaded, setSplineLoaded] = useState(false)
    const handleSplineLoad = useCallback(() => setSplineLoaded(true), [])

    // ── Waitlist state ──────────────────────────────────────────────────────
    const TOTAL_SPOTS = 1000
    const [email, setEmail] = useState('')
    const [signupCount, setSignupCount] = useState(0)
    const [submitted, setSubmitted] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [emailError, setEmailError] = useState('')

    useEffect(() => {
        fetch('/api/waitlist')
            .then(res => res.json())
            .then(data => {
                if (data.success && typeof data.count === 'number') {
                    setSignupCount(data.count)
                }
            })
            .catch(() => {
                const stored = localStorage.getItem('pyvax_agent_signups')
                if (stored) {
                    setSignupCount(parseInt(stored, 10))
                }
            })
    }, [])

    const handleWaitlistSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setEmailError('')

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!email.trim()) {
            setEmailError('Please enter your email address')
            return
        }
        if (!emailRegex.test(email.trim())) {
            setEmailError('Please enter a valid email address')
            return
        }

        setSubmitting(true)

        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            })

            const data = await res.json()

            if (!data.success) {
                setEmailError(data.error || 'Something went wrong. Please try again.')
                setSubmitting(false)
                return
            }

            setSignupCount(data.count || signupCount + 1)
            localStorage.setItem('pyvax_agent_signups', String(data.count || signupCount + 1))
            setSubmitted(true)
            setSubmitting(false)
        } catch (err) {
            setEmailError('Network error. Please try again.')
            setSubmitting(false)
        }
    }

    const spotsRemaining = Math.max(0, TOTAL_SPOTS - signupCount)
    const progressPercent = Math.min(100, (signupCount / TOTAL_SPOTS) * 100)

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] font-[family-name:var(--font-ibm-plex)] selection:bg-[#E84142] selection:text-white overflow-x-hidden">

            {/* ═══════════════════════════════════════════════════════════════════
          NAVBAR
      ═══════════════════════════════════════════════════════════════════ */}
            <Navbar />

            {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1: HERO — THE REVEAL
      ═══════════════════════════════════════════════════════════════════ */}
            <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
                {/* Black gradient transition from navbar — settles into dark bg */}
                <div
                    className="absolute top-0 left-0 right-0 h-[120px] pointer-events-none z-[1]"
                    style={{
                        background: 'linear-gradient(to bottom, rgba(162, 162, 162, 0.8) 0%, rgba(255, 255, 255, 0.63) 30%, rgba(255, 255, 255, 1) 60%, transparent 100%)'
                    }}
                />
                {/* Ambient red glow behind the scene — GPU-optimized */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[900px] md:h-[900px] rounded-full bg-[radial-gradient(circle,rgba(232,65,66,0.15)_0%,transparent_70%)] animate-ambient-pulse pointer-events-none z-0 will-change-[opacity]" />

                {/* Grid background — lightweight */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.04] z-0" style={{
                    backgroundImage: 'linear-gradient(rgba(232,65,66,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(232,65,66,0.3) 1px, transparent 1px)',
                    backgroundSize: '80px 80px'
                }} />

                {/* Spline 3D Robot — lazy loaded */}
                <div className="relative w-full h-[50vh] md:h-[65vh] z-[1]">
                    <Spline
                        scene="https://prod.spline.design/slaEhA9QPh-oSDit/scene.splinecode"
                        onLoad={handleSplineLoad}
                        style={{ width: '100%', height: '100%' }}
                    />
                    {/* Bottom gradient for text readability */}
                    <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent pointer-events-none" />
                </div>

                {/* Hero Text Overlay */}
                <div className="relative z-10 -mt-40 md:-mt-52 flex flex-col items-center text-center px-4">
                    {/* Classified badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        className="mb-6"
                    >
                        <div className="inline-flex items-center gap-2 border border-[#E84142]/40 bg-[#E84142]/5 px-4 py-1.5 rounded-full">
                            <Lock className="w-3 h-3 text-[#E84142]" />
                            <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] uppercase tracking-[0.2em] font-bold">PROJECT CLASSIFIED · EARLY ACCESS</span>
                        </div>
                    </motion.div>

                    {/* Main Title */}
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="font-[family-name:var(--font-press-start)] text-[24px] md:text-[40px] lg:text-[56px] leading-[1.3] mb-6"
                    >
                        <span className="block text-[#FFFFFF]">YOUR AGENT</span>
                        <span className="block text-[#E84142] drop-shadow-[0_0_30px_rgba(232,65,66,0.5)]">IS READY FOR EARLY ACCESS.</span>
                    </motion.h1>

                    {/* Cycling Tagline */}
                    <div className="h-8 md:h-10 overflow-hidden mb-8">
                        <AnimatePresence mode="wait">
                            <motion.p
                                key={taglineIndex}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5 }}
                                className="font-[family-name:var(--font-ibm-plex)] text-[14px] md:text-[18px] text-[#909090] italic"
                            >
                                &ldquo;{TAGLINES[taglineIndex]}&rdquo;
                            </motion.p>
                        </AnimatePresence>
                    </div>

                    {/* Scroll indicator */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2, duration: 1 }}
                        className="flex flex-col items-center gap-2 mt-4"
                    >
                        <span className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#444] tracking-[0.3em] uppercase">Scroll to discover</span>
                        <ChevronDown className="w-4 h-4 text-[#444] animate-bounce" />
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════════
          SECTION 6: EARLY ACCESS CTA
      ═══════════════════════════════════════════════════════════════════ */}
            <section className="relative bg-[#080808] py-24 md:py-32 px-4 overflow-hidden">
                {/* Background effects — reduced from 4 overlays to 1 */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(232,65,66,0.08)_0%,transparent_50%)] pointer-events-none" />

                <div className="max-w-2xl mx-auto relative z-10">
                    {/* Section header */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-10"
                    >
                        <div className="inline-flex items-center gap-2 border border-[#E84142]/30 bg-[#E84142]/5 px-4 py-2 rounded-full mb-6">
                            <Sparkles className="w-3 h-3 text-[#E84142]" />
                            <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] tracking-[0.2em] font-bold uppercase">Early Access Program</span>
                        </div>
                        <h2 className="font-[family-name:var(--font-press-start)] text-[22px] md:text-[36px] text-[#FFFFFF] mb-4 leading-relaxed">
                            BE FIRST.
                        </h2>
                        <p className="font-[family-name:var(--font-ibm-plex)] text-[15px] md:text-[17px] text-[#777] max-w-md mx-auto leading-relaxed">
                            Join the first wave of developers to control the chain with Python.
                        </p>
                    </motion.div>

                    {/* Waitlist Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, delay: 0.15 }}
                        className="relative"
                    >
                        {/* Animated gradient border */}
                        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-[#E84142]/40 via-[#E84142]/10 to-[#E84142]/40 opacity-60" style={{
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 3s ease-in-out infinite',
                        }} />

                        <div className="relative bg-[#0D0D0D] rounded-2xl p-8 md:p-10 border border-[#1A1A1A]">
                            <AnimatePresence mode="wait">
                                {!submitted ? (
                                    <motion.div
                                        key="form"
                                        initial={{ opacity: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {/* Live counter bar */}
                                        <div className="mb-8">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-3.5 h-3.5 text-[#E84142]" />
                                                    <span className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888]">
                                                        <span className="text-[#F2F2F2] font-bold">{mounted ? signupCount.toLocaleString() : '...'}</span> developers joined
                                                    </span>
                                                </div>
                                                <span className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#555]">
                                                    <span className={`font-bold ${spotsRemaining < 200 ? 'text-[#E84142]' : 'text-[#F2F2F2]'}`}>{mounted ? spotsRemaining.toLocaleString() : '...'}</span> spots left
                                                </span>
                                            </div>
                                            {/* Progress bar */}
                                            <div className="relative w-full h-[6px] bg-[#1A1A1A] rounded-full overflow-hidden">
                                                <motion.div
                                                    className="absolute inset-y-0 left-0 rounded-full"
                                                    style={{
                                                        background: 'linear-gradient(90deg, #E84142 0%, #FF6B6B 50%, #E84142 100%)',
                                                        backgroundSize: '200% 100%',
                                                        animation: 'shimmer 2s ease-in-out infinite',
                                                    }}
                                                    initial={{ width: 0 }}
                                                    whileInView={{ width: `${progressPercent}%` }}
                                                    viewport={{ once: true }}
                                                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                                                />
                                            </div>
                                        </div>

                                        {/* Email form */}
                                        <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444] pointer-events-none" />
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                                                    placeholder="Enter your email address"
                                                    disabled={submitting}
                                                    className={`w-full h-[52px] pl-11 pr-5 bg-[#111] border rounded-xl font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#F2F2F2] placeholder-[#444] focus:outline-none transition-all duration-300 disabled:opacity-50 ${emailError
                                                        ? 'border-[#E84142]/60 shadow-[0_0_12px_rgba(232,65,66,0.1)]'
                                                        : 'border-[#1F1F1F] focus:border-[#E84142]/50 focus:shadow-[0_0_20px_rgba(232,65,66,0.1)]'
                                                        }`}
                                                />
                                            </div>
                                            {emailError && (
                                                <motion.p
                                                    initial={{ opacity: 0, y: -5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#E84142] pl-1"
                                                >
                                                    {emailError}
                                                </motion.p>
                                            )}
                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className="group relative w-full h-[52px] bg-[#E84142] hover:bg-[#FF5555] disabled:bg-[#E84142]/70 text-white font-[family-name:var(--font-dm-mono)] text-[13px] font-bold rounded-xl transform active:scale-[0.98] transition-all duration-300 shadow-[0_4px_24px_rgba(232,65,66,0.3)] hover:shadow-[0_4px_32px_rgba(232,65,66,0.5)] disabled:shadow-none overflow-hidden"
                                            >
                                                {/* Button shimmer effect */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                                <span className="relative flex items-center justify-center gap-2">
                                                    {submitting ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            JOINING...
                                                        </>
                                                    ) : (
                                                        <>
                                                            GET EARLY ACCESS
                                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                        </>
                                                    )}
                                                </span>
                                            </button>
                                        </form>

                                        {/* Trust signals */}
                                        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-5 border-t border-[#1A1A1A] gap-4">
                                            {/* Avatar stack */}
                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-2">
                                                    {['#E84142', '#FF8C42', '#4CAF50', '#6B8CAE', '#9C27B0'].map((color, i) => (
                                                        <div
                                                            key={i}
                                                            className="w-7 h-7 rounded-full border-2 border-[#0D0D0D] flex items-center justify-center text-[8px] font-bold text-white"
                                                            style={{ backgroundColor: color, zIndex: 5 - i }}
                                                        >
                                                            {String.fromCharCode(65 + i)}
                                                        </div>
                                                    ))}
                                                </div>
                                                <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#555]">
                                                    +{mounted ? signupCount : '...'} devs
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 font-[family-name:var(--font-dm-mono)] text-[10px] text-[#444]">
                                                <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> No spam</span>
                                                <span className="text-[#222]">·</span>
                                                <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Unsubscribe anytime</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
                                        className="flex flex-col items-center py-8"
                                    >
                                        {/* Success icon with glow */}
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

                                        <motion.h3
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.35 }}
                                            className="font-[family-name:var(--font-syne)] font-bold text-[22px] text-[#F2F2F2] mb-2"
                                        >
                                            You&apos;re on the list!
                                        </motion.h3>
                                        <motion.p
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.45 }}
                                            className="font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#777] mb-6 max-w-sm text-center leading-relaxed"
                                        >
                                            We&apos;ll notify <span className="text-[#E84142] font-medium">{email}</span> as soon as the agent drops. Get ready.
                                        </motion.p>

                                        {/* Updated counter after signup */}
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.6 }}
                                            className="flex items-center gap-2 bg-[#111] border border-[#1F1F1F] rounded-lg px-5 py-3 mb-6"
                                        >
                                            <Users className="w-3.5 h-3.5 text-[#E84142]" />
                                            <span className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#888]">
                                                You&apos;re <span className="text-[#E84142] font-bold">#{signupCount}</span> in line
                                            </span>
                                            <span className="text-[#333]">·</span>
                                            <span className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#555]">
                                                <span className={`font-bold ${spotsRemaining < 200 ? 'text-[#E84142]' : 'text-[#F2F2F2]'}`}>{spotsRemaining}</span> spots left
                                            </span>
                                        </motion.div>

                                        {/* Share intent tweet + socials */}
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.75 }}
                                            className="flex flex-col items-center gap-4"
                                        >
                                            <a
                                                href={`https://x.com/intent/tweet?text=${encodeURIComponent(`🔴 I just joined the @PyVax Agent waitlist — spot #${signupCount}\n\n🐍 The first autonomous on-chain agent powered ENTIRELY by Python is coming on @avax.\n\n⛓️ Deploy. Trade. Remember. Never sleep.\nZero Solidity. Full autonomy.\n\n⚡ Only ${spotsRemaining} early access spots left.\nJoin before it's gone 👇`)}&url=${encodeURIComponent('https://pyvax.app/agent')}&hashtags=${encodeURIComponent('PyVax,Web3,Python,AI')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group w-full flex items-center justify-center gap-2 h-[44px] bg-[#111] border border-[#1F1F1F] rounded-lg font-[family-name:var(--font-dm-mono)] text-[12px] text-[#999] hover:text-[#1DA1F2] hover:border-[#1DA1F2]/30 hover:bg-[#1DA1F2]/5 transition-all"
                                            >
                                                <Twitter className="w-4 h-4" />
                                                SHARE ON X / TWITTER
                                            </a>
                                            <div className="flex items-center gap-3">
                                                <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#333] uppercase tracking-wider">Also follow</span>
                                                <a href="https://x.com/PyVax" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full border border-[#1F1F1F] flex items-center justify-center text-[#555] hover:text-[#1DA1F2] hover:border-[#1DA1F2]/30 transition-all">
                                                    <Twitter className="w-4 h-4" />
                                                </a>
                                                <a href="https://github.com/ShahiTechnovation/pyvax-rebrand" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full border border-[#1F1F1F] flex items-center justify-center text-[#555] hover:text-[#F2F2F2] hover:border-[#F2F2F2]/30 transition-all">
                                                    <Github className="w-4 h-4" />
                                                </a>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3: WHAT IT DOES (Capabilities Grid)
      ═══════════════════════════════════════════════════════════════════ */}
            <section className="bg-[#0E0E0E] py-20 md:py-28 px-4">
                <div className="max-w-7xl mx-auto">
                    {/* Section header */}
                    <div className="flex flex-col items-center text-center mb-16">
                        <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] uppercase tracking-[0.12em]">01 · CAPABILITIES</div>
                        <div className="w-[32px] h-px bg-[#E84142] my-3" />
                        <h2 className="font-[family-name:var(--font-syne)] font-bold text-[32px] md:text-[42px] text-[#F2F2F2] leading-[1.1] mb-4">
                            What Your Agent Can Do
                        </h2>
                        <p className="font-[family-name:var(--font-ibm-plex)] text-[15px] text-[#909090] leading-relaxed max-w-lg">
                            A glimpse of what&apos;s coming. Some capabilities remain classified until launch.
                        </p>
                    </div>

                    {/* Capabilities Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
                        {CAPABILITY_CARDS.map((card, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-50px' }}
                                transition={{ delay: i * 0.1, duration: 0.5 }}
                                className={`relative bg-[#131313] border rounded-lg p-7 transition-all duration-300 ${card.revealed
                                    ? 'border-[#1F1F1F] hover:border-[rgba(232,65,66,0.28)] hover:bg-[#181818] hover:shadow-[0_0_28px_rgba(232,65,66,0.07)]'
                                    : 'border-[#1A1A1A] opacity-60 hover:opacity-80'
                                    }`}
                            >
                                {!card.revealed && (
                                    <div className="absolute top-3 right-3">
                                        <Lock className="w-3.5 h-3.5 text-[#333]" />
                                    </div>
                                )}
                                <div className={`mb-4 ${card.revealed ? 'text-[#E84142]' : 'text-[#333]'}`}>
                                    {ICON_MAP[card.icon]}
                                </div>
                                <h3 className={`font-[family-name:var(--font-syne)] font-semibold text-[18px] mb-2 ${card.revealed ? 'text-[#F0F0F0]' : 'text-[#333] redacted-block'
                                    }`}>
                                    {card.title}
                                </h3>
                                <p className={`font-[family-name:var(--font-ibm-plex)] text-[14px] leading-relaxed mb-6 min-h-[84px] ${card.revealed ? 'text-[#909090]' : 'text-[#222] redacted-block'
                                    }`}>
                                    {card.body}
                                </p>
                                <span className={`font-[family-name:var(--font-dm-mono)] text-[10px] tracking-wide px-2 py-1 rounded ${card.revealed
                                    ? 'bg-[rgba(232,65,66,0.10)] border border-[rgba(232,65,66,0.25)] text-[#E84142]'
                                    : 'bg-[#1A1A1A] border border-[#222] text-[#444]'
                                    }`}>
                                    {card.tag}
                                </span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Agent Terminal */}
                    <div ref={terminalRef} className="bg-[#080808] border border-[#1C1C1C] rounded-lg p-6 md:p-8 overflow-hidden">
                        <div className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#E84142] mb-6 flex items-center gap-2">
                            <span className="animate-cursor-blink">●</span> AGENT RUNTIME — PREVIEW
                            <span className="ml-auto text-[#333] text-[9px]">v0.1.0-alpha</span>
                        </div>
                        <div className="font-[family-name:var(--font-dm-mono)] text-[12px] md:text-[13px] leading-[2] whitespace-nowrap overflow-x-auto pb-2 space-y-0">
                            {TERMINAL_LINES.map((line, i) => (
                                <div
                                    key={i}
                                    className={`transition-all duration-500 ${i < visibleLines ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                                >
                                    <span className="text-[#6B8CAE]">{line.addr}</span>
                                    <span className="text-[#333] mx-2">→</span>
                                    <span className="text-[#888]">{line.action}</span>
                                    {line.target && <span className="text-[#E84142]">{line.target}</span>}
                                    <span className="text-[#4CAF50] ml-3">{line.status}</span>
                                    <span className="text-[#555] ml-2">{line.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4: PYTHON-NATIVE
      ═══════════════════════════════════════════════════════════════════ */}
            <section className="bg-[#0A0A0A] border-t border-[#1A1A1A] py-20 md:py-28 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
                        {/* Left — Code Preview */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="bg-[#090909] border border-[#1F1F1F] rounded-lg overflow-hidden">
                                {/* Window chrome */}
                                <div className="flex items-center px-4 py-3 border-b border-[#1A1A1A] bg-[#0D0D0D]">
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#E84142]" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
                                    </div>
                                    <div className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#555] ml-auto">agent.py</div>
                                </div>

                                {/* Code content */}
                                <div className="p-6 font-[family-name:var(--font-dm-mono)] text-[13px] leading-[1.8]">
                                    <div><span className="text-[#E84142]">from</span> <span className="text-[#D0D0D0]">pyvax.agent</span> <span className="text-[#E84142]">import</span> <span className="text-[#D0D0D0]">Agent</span></div>
                                    <div><span className="text-[#E84142]">from</span> <span className="text-[#D0D0D0]">pyvax</span> <span className="text-[#E84142]">import</span> <span className="text-[#D0D0D0]">network</span></div>
                                    <br />
                                    <div className="text-[#444]"># Initialize your autonomous agent</div>
                                    <div><span className="text-[#D0D0D0]">agent = Agent(</span><span className="text-[#7EC8A4]">&quot;alpha-1&quot;</span><span className="text-[#D0D0D0]">)</span></div>
                                    <div><span className="text-[#D0D0D0]">agent.connect(network.AVALAN</span><span className="redacted-block px-6 py-0.5 mx-1 text-[10px]">&nbsp;</span><span className="text-[#D0D0D0]">)</span></div>
                                    <br />
                                    <div className="text-[#444]"># Configure strategy</div>
                                    <div><span className="text-[#D0D0D0]">agent.</span><span className="redacted-block px-20 py-0.5 mx-1 text-[10px]">&nbsp;</span></div>
                                    <div><span className="text-[#D0D0D0]">agent.</span><span className="redacted-block px-24 py-0.5 mx-1 text-[10px]">&nbsp;</span></div>
                                    <br />
                                    <div className="text-[#444]"># Deploy and forget</div>
                                    <div><span className="text-[#D0D0D0]">agent.</span><span className="redacted-block px-14 py-0.5 mx-1 text-[10px]">&nbsp;</span><span className="text-[#D0D0D0]">()</span></div>
                                    <div><span className="redacted-block px-32 py-0.5 text-[10px]">&nbsp;</span></div>

                                    <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[#1A1A1A] text-[11px] text-[#555]">
                                        <span className="text-[#4CAF50] text-[10px]">●</span>
                                        Agent deployed · <span className="text-[#E84142]">0 lines of Solidity</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Right — Text + Stats */}
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="space-y-8"
                        >
                            <div>
                                <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] uppercase tracking-[0.12em]">02 · LANGUAGE</div>
                                <div className="w-[32px] h-px bg-[#E84142] my-3" />
                                <h2 className="font-[family-name:var(--font-syne)] font-bold text-[32px] md:text-[42px] text-[#F2F2F2] leading-[1.1] mb-4">
                                    One Language.<br />Full Autonomy.
                                </h2>
                                <p className="font-[family-name:var(--font-ibm-plex)] text-[15px] text-[#909090] leading-relaxed max-w-md">
                                    Your agent speaks Python — the world&apos;s most popular programming language. No Solidity. No JavaScript. No compromises.
                                </p>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { value: '0', label: 'Lines of Solidity', color: '#E84142' },
                                    { value: '100%', label: 'Python-Native', color: '#4CAF50' },
                                    { value: '<1s', label: 'Finality', color: '#F2F2F2' },
                                    { value: '∞', label: 'Agents Per Wallet', color: '#E84142' },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-[#131313] border border-[#1F1F1F] rounded-lg p-5 hover:border-[rgba(232,65,66,0.2)] transition-colors">
                                        <div className="font-[family-name:var(--font-press-start)] text-[20px] md:text-[24px] mb-1" style={{ color: stat.color }}>
                                            {stat.value}
                                        </div>
                                        <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#555] tracking-wider uppercase">
                                            {stat.label}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5: THE HYPE BELT (Infinite Marquee)
      ═══════════════════════════════════════════════════════════════════ */}
            <MarqueeBelt />

            {/* ═══════════════════════════════════════════════════════════════════
          FOOTER
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
                            <Link href="/pricing" className="hover:text-[#E84142] transition">Pricing</Link>
                            <Link href="/playground" className="hover:text-[#E84142] transition">Playground</Link>
                        </div>

                        <div className="flex items-center gap-4 text-[#444]">
                            <a href="https://github.com/ShahiTechnovation/pyvax-rebrand" target="_blank" rel="noopener noreferrer" className="hover:text-[#E84142] transition"><Github className="w-4 h-4" /></a>
                            <a href="https://x.com/PyVax" target="_blank" rel="noopener noreferrer" className="hover:text-[#E84142] transition"><Twitter className="w-4 h-4" /></a>
                        </div>
                    </div>

                    <div className="text-center font-[family-name:var(--font-dm-mono)] text-[10px] text-[#333]">
                        © 2026 PyVax Protocol. Built on Avalanche.
                    </div>
                </div>
            </footer>
        </div>
    )
}
