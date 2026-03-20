'use client'

import { motion } from 'framer-motion'
import { ArrowDown, Terminal } from 'lucide-react'
import { useState, useEffect } from 'react'

// Sponsor logos data
const SPONSORS = [
  { name: 'Uniswap', color: '#FF007A' },
  { name: 'Base', color: '#0052FF' },
  { name: 'Lido', color: '#00A3FF' },
  { name: 'Synthesis', color: '#FFD700' },
]

// Terminal typewriter lines
const TERMINAL_LINES = [
  { text: '$ pip install classified-agent==1.2.0', delay: 0 },
  { text: '✓ classified-agent v1.1.0 installed', delay: 0.6 },
  { text: '$ classified-agent init DeFiBot', delay: 1.2 },
  { text: '✓ agent.toml + workspace created', delay: 1.8 },
  { text: '$ classified-agent run', delay: 2.3 },
  { text: '✓ Skill.md fetched → Claude building...', delay: 2.9 },
  { text: '✓ PyVax compiled → 12kb WASM', delay: 3.4 },
  { text: '🎉 SUBMITTED → $75K unlocked!', delay: 4.0 },
]

export function Hero() {
  const [typedLines, setTypedLines] = useState(0)

  useEffect(() => {
    const timers = TERMINAL_LINES.map((line, i) =>
      setTimeout(() => setTypedLines(i + 1), (line.delay + 1) * 1000)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  const scrollToSteps = () => {
    document.getElementById('steps-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-20">
      {/* Halftone background overlay */}
      <div
        className="absolute inset-0 pointer-events-none animate-halftone-pulse z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,20,147,0.3) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,rgba(255,20,147,0.12)_0%,rgba(139,0,139,0.05)_40%,transparent_70%)] animate-pink-pulse pointer-events-none z-0" />

      {/* Floating orbs */}
      {[
        { size: 120, top: '15%', left: '10%', delay: 0 },
        { size: 80, top: '60%', right: '8%', delay: 2 },
        { size: 60, top: '30%', right: '20%', delay: 4 },
        { size: 100, bottom: '20%', left: '15%', delay: 1 },
      ].map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none z-0"
          style={{
            width: orb.size,
            height: orb.size,
            top: orb.top,
            left: orb.left,
            right: (orb as any).right,
            bottom: (orb as any).bottom,
            background: `radial-gradient(circle, rgba(255,20,147,${0.08 + i * 0.02}) 0%, transparent 70%)`,
          }}
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 6 + i,
            repeat: Infinity,
            delay: orb.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 glass-pink px-5 py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-[#FF1493] animate-pulse" />
            <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#FF1493] uppercase tracking-[0.25em] font-bold">
              SYNTHESIS HACKATHON · $75K IN PRIZES
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mb-6"
        >
          <span
            className="block font-[family-name:var(--font-press-start)] text-[28px] sm:text-[48px] md:text-[64px] lg:text-[80px] leading-[1.1] text-white"
            style={{
              textShadow: '0 0 40px rgba(255, 20, 147, 0.3)',
            }}
          >
            AGENT
          </span>
          <span
            className="block font-[family-name:var(--font-press-start)] text-[28px] sm:text-[48px] md:text-[64px] lg:text-[80px] leading-[1.1] mt-2"
            style={{
              background: 'linear-gradient(135deg, #FFD700, #FF1493, #FFD700)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: 'none',
              filter: 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.3))',
            }}
          >
            CLASSIFIED
          </span>
          <span
            className="block font-[family-name:var(--font-press-start)] text-[28px] sm:text-[48px] md:text-[64px] lg:text-[80px] leading-[1.1] text-white mt-2"
            style={{
              textShadow: '0 0 40px rgba(255, 20, 147, 0.3)',
            }}
          >
            HACK
          </span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="font-[family-name:var(--font-ibm-plex)] text-[16px] sm:text-[20px] md:text-[24px] text-[#999] mb-10 max-w-2xl leading-relaxed"
        >
          <span className="text-[#FFD700] font-bold">$75K</span> Synthesis × Classified Hackathon —{' '}
          <span className="text-[#FF1493]">pip install → run → submit</span>
        </motion.p>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          onClick={() => window.open('https://unstop.com/o/nfj1CVW?lb=TUn3UTaD', '_blank')}
          className="group relative bg-gradient-to-r from-[#FF1493] to-[#8B008B] hover:from-[#FF1493] hover:to-[#FF1493] text-white font-[family-name:var(--font-press-start)] text-[11px] sm:text-[13px] px-10 py-5 rounded-xl transition-all duration-300 shadow-[0_0_30px_rgba(255,20,147,0.4)] hover:shadow-[0_0_60px_rgba(255,20,147,0.6)] transform hover:scale-[1.03] active:scale-95 mb-4"
        >
          <span className="flex items-center gap-3">
            JOIN CLASSIFIED HACKATHON
            <ArrowDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
          </span>
        </motion.button>

        {/* Secondary CTA */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          onClick={scrollToSteps}
          className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888] hover:text-[#FF1493] transition-colors tracking-wider mb-12 cursor-pointer"
        >
          ↓ SEE THE 6-STEP WORKFLOW
        </motion.button>

        {/* Agent Terminal Demo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.7 }}
          className="w-full max-w-xl"
        >
          <div className="glass-pink rounded-xl overflow-hidden">
            {/* Terminal header */}
            <div className="flex items-center px-4 py-3 border-b border-[#FF1493]/10 bg-[#0a0510]/50">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF1493]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFD700]/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <Terminal className="w-3 h-3 text-[#FF1493]/50" />
                <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#555]">classified-agent</span>
              </div>
            </div>

            {/* Terminal body */}
            <div className="p-5 font-[family-name:var(--font-dm-mono)] text-[12px] sm:text-[13px] leading-[2] space-y-0">
              {TERMINAL_LINES.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={i < typedLines ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.3 }}
                  className={i < typedLines ? '' : 'opacity-0'}
                >
                  {line.text.startsWith('$') ? (
                    <span className="text-[#FFD700]">{line.text}</span>
                  ) : line.text.startsWith('✓') ? (
                    <span className="text-[#4CAF50]">{line.text}</span>
                  ) : (
                    <span className="text-[#FF1493]">{line.text}</span>
                  )}
                </motion.div>
              ))}
              {typedLines < TERMINAL_LINES.length && (
                <span className="animate-terminal-cursor">&nbsp;</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Sponsor logos */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="mt-12 flex items-center gap-6 sm:gap-10"
        >
          <span className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#444] tracking-wider uppercase">
            Prize sponsors
          </span>
          {SPONSORS.map((sponsor, i) => (
            <motion.span
              key={sponsor.name}
              animate={{ y: [-3, 3, -3] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
              className="font-[family-name:var(--font-dm-mono)] text-[11px] font-bold tracking-wider"
              style={{ color: sponsor.color, opacity: 0.7 }}
            >
              {sponsor.name.toUpperCase()}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
