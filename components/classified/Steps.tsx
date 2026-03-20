'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, Clock, ExternalLink } from 'lucide-react'

const STEPS = [
  {
    num: 1,
    title: 'Register @ Classified Hackathon',
    desc: 'Sign up on Unstop → team up → get your waitlist code emailed.',
    time: '2 MIN',
    action: 'REGISTER',
    link: 'https://unstop.com/o/nfj1CVW?lb=TUn3UTaD',
    icon: '📋',
  },
  {
    num: 2,
    title: 'Unlock Classified Access',
    desc: 'Enter your code at classified.pyvax.xyz/[code] → pink glitch → full access.',
    time: '10 SEC',
    action: 'GET CODE',
    link: 'https://pyvax.xyz/agent',
    icon: '🔐',
  },
  {
    num: 3,
    title: 'Install classified-agent',
    desc: 'One pip install — PyVax-powered offline agent CLI, live on PyPI.',
    time: '20 SEC',
    action: 'PyPI',
    link: 'https://pypi.org/project/classified-agent/',
    icon: '⚡',
    command: 'pip install classified-agent==1.2.0',
  },
  {
    num: 4,
    title: 'Init Your Agent',
    desc: 'Scaffold agent.toml + workspace. Set Anthropic & Uniswap API keys.',
    time: '30 SEC',
    action: 'INIT',
    link: null,
    icon: '🛠️',
    command: 'classified-agent init DeFiBot',
  },
  {
    num: 5,
    title: 'Build + Submit',
    desc: 'Auto-fetches skill.md → Claude code gen → PyVax WASM → Synthesis registered.',
    time: '60 SEC',
    action: 'RUN',
    link: null,
    icon: '🤖',
    command: 'classified-agent run',
  },
  {
    num: 6,
    title: 'Win $75K 🏆',
    desc: 'GitHub repo live + Twitter proof → leaderboard domination!',
    time: '1 MIN',
    action: 'TWEET PROOF',
    link: 'https://x.com/intent/tweet?text=🧪%20I%20just%20submitted%20to%20%23ClassifiedHackathon%20via%20%40PyVax!%0A%0Apip%20install%20classified-agent%0Aclassified-agent%20run%0A%0A%2475K%20Synthesis%20prizes%20%E2%9A%A1&url=https%3A%2F%2Fclassified.pyvax.xyz',
    icon: '🐦',
  },
]

export function Steps() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inViewRef = useRef(null)
  const isInView = useInView(inViewRef, { once: true, margin: '-100px' })

  return (
    <section id="steps-section" className="relative py-20 md:py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#080510] z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,20,147,0.06)_0%,transparent_60%)] z-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-4" ref={inViewRef}>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 glass-pink px-4 py-2 rounded-full mb-5">
            <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#FF1493] tracking-[0.2em] font-bold">
              YOUR 6-STEP JOURNEY
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-press-start)] text-[20px] sm:text-[28px] md:text-[36px] text-white mb-4 leading-relaxed">
            START TO SUBMIT
          </h2>
          <p className="font-[family-name:var(--font-ibm-plex)] text-[15px] text-[#777] max-w-lg mx-auto">
            From zero to $75K submission in under 15 minutes. Every step designed for speed.
          </p>
        </motion.div>

        {/* Horizontal scroll container */}
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto scroll-snap-x pb-6 -mx-4 px-4 md:px-0 md:mx-0 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="flex-shrink-0 w-[280px] sm:w-[300px] scroll-snap-center"
            >
              <div className="glass-pink-hover rounded-xl p-6 h-full flex flex-col relative group">
                {/* Step number */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="font-[family-name:var(--font-press-start)] text-[24px] text-[#FF1493]"
                      style={{ textShadow: '0 0 20px rgba(255, 20, 147, 0.3)' }}
                    >
                      {step.num}
                    </span>
                    <span className="text-2xl">{step.icon}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-[#FFD700]/10 border border-[#FFD700]/20 px-2 py-1 rounded-full">
                    <Clock className="w-3 h-3 text-[#FFD700]" />
                    <span className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#FFD700] font-bold">
                      {step.time}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <h3 className="font-[family-name:var(--font-syne)] font-bold text-[16px] text-white mb-2">
                  {step.title}
                </h3>
                <p className="font-[family-name:var(--font-ibm-plex)] text-[13px] text-[#888] leading-relaxed mb-4 flex-grow">
                  {step.desc}
                </p>

                {/* Command preview */}
                {step.command && (
                  <div className="bg-[#0a0510] border border-[#FF1493]/10 rounded-lg px-3 py-2 mb-4">
                    <code className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#FF1493]">
                      $ {step.command}
                    </code>
                  </div>
                )}

                {/* Action button */}
                {step.link ? (
                  <a
                    href={step.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF1493]/20 to-[#8B008B]/20 hover:from-[#FF1493]/30 hover:to-[#8B008B]/30 border border-[#FF1493]/30 text-[#FF1493] font-[family-name:var(--font-dm-mono)] text-[11px] font-bold tracking-wider py-2.5 rounded-lg transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(255,20,147,0.15)]"
                  >
                    {step.action}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <div className="inline-flex items-center justify-center gap-2 bg-[#1a1025] border border-[#FF1493]/10 text-[#666] font-[family-name:var(--font-dm-mono)] text-[11px] tracking-wider py-2.5 rounded-lg">
                    {step.action}
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}

                {/* Connector line (except last) */}
                {step.num < 6 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-[#FF1493]/40 to-transparent" />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
