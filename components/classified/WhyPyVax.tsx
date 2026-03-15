'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Globe, Zap, Shield, Terminal } from 'lucide-react'

const FEATURES = [
  {
    icon: <Globe className="w-6 h-6" />,
    badge: 'WEB3-NATIVE',
    title: 'Built for the Blockchain',
    desc: 'PyVax agents are natively on-chain. Deploy smart contracts, interact with DeFi protocols, and manage wallets — all from Python.',
    color: '#0052FF',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    badge: '1-COMMAND',
    title: 'Zero to Submission',
    desc: 'One pip install, one command run. The classified-agent CLI handles registration, build, test, and submission automatically.',
    color: '#FFD700',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    badge: 'SYNTHESIS OPTIMIZED',
    title: 'Designed for This Hackathon',
    desc: 'Pre-configured templates, Synthesis-specific tracks, and auto-formatted submissions that give you the best chance to win.',
    color: '#FF1493',
  },
  {
    icon: <Terminal className="w-6 h-6" />,
    badge: 'SECURE SANDBOX',
    title: 'Safe Execution Environment',
    desc: 'Your agent runs in a sandboxed environment with dry-run mode, spending limits, and full audit logging. Ship with confidence.',
    color: '#4CAF50',
  },
]

export function WhyPyVax() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#080510]" />

      <div className="relative z-10 max-w-6xl mx-auto px-4" ref={ref}>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 glass-pink px-4 py-2 rounded-full mb-5">
            <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#FF1493] tracking-[0.2em] font-bold">
              WHY PYVAX AGENTS
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-press-start)] text-[18px] sm:text-[24px] md:text-[32px] text-white mb-4 leading-relaxed">
            THE UNFAIR ADVANTAGE
          </h2>
          <p className="font-[family-name:var(--font-ibm-plex)] text-[15px] text-[#777] max-w-lg mx-auto">
            Four reasons why PyVax agents dominate Synthesis hackathons.
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.badge}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.12, duration: 0.5 }}
              className="group relative"
            >
              {/* Particle-like background dots */}
              <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                {Array.from({ length: 6 }).map((_, j) => (
                  <motion.div
                    key={j}
                    className="absolute w-1 h-1 rounded-full"
                    style={{
                      backgroundColor: feature.color,
                      opacity: 0.15,
                      left: `${15 + j * 15}%`,
                      top: `${20 + (j % 3) * 25}%`,
                    }}
                    animate={{
                      y: [-5, 5, -5],
                      opacity: [0.1, 0.25, 0.1],
                    }}
                    transition={{
                      duration: 3 + j,
                      repeat: Infinity,
                      delay: j * 0.5,
                    }}
                  />
                ))}
              </div>

              <div className="relative glass-pink-hover rounded-xl p-7 h-full">
                {/* Badge */}
                <div className="flex items-center justify-between mb-5">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: `${feature.color}15`,
                      border: `1px solid ${feature.color}30`,
                    }}
                  >
                    <div style={{ color: feature.color }}>{feature.icon}</div>
                  </div>
                  <span
                    className="font-[family-name:var(--font-dm-mono)] text-[9px] font-bold tracking-[0.15em] px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: `${feature.color}10`,
                      border: `1px solid ${feature.color}25`,
                      color: feature.color,
                    }}
                  >
                    {feature.badge}
                  </span>
                </div>

                {/* Content */}
                <h3 className="font-[family-name:var(--font-syne)] font-bold text-[18px] text-white mb-2">
                  {feature.title}
                </h3>
                <p className="font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#888] leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
