'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Trophy } from 'lucide-react'

const TRACKS = [
  {
    title: 'AGENTS WITH RECEIPTS — ERC-8004',
    icon: '🧾',
    sponsor: 'Protocol Labs',
    prizes: '$2,000 · $1,500 · $500',
    desc: 'Our core stack — ERC-8004 identity on Base Mainnet',
    color: '#FF1493', // pink
  },
  {
    title: 'LET THE AGENT COOK — NO HUMANS REQUIRED',
    icon: '🤖',
    sponsor: 'Protocol Labs',
    prizes: '$2,000 · $1,500 · $500',
    desc: 'pip install classified-agent. Zero EVM knowledge needed.',
    color: '#FF8C00', // orange
  },
  {
    title: 'AGENT SERVICES ON BASE',
    icon: '⬡',
    sponsor: 'Base',
    prizes: '$1,666 · $1,666 · $1,666',
    desc: 'On-chain agent identity lives on Base Mainnet',
    color: '#0052FF', // blue
  },
  {
    title: 'BEST OPENSERV BUILD STORY',
    icon: '📖',
    sponsor: 'OpenServ',
    prizes: '$250 · $250',
    desc: '434 tried. 165 finished. We shipped the fix.',
    color: '#4CAF50', // green
  },
  {
    title: 'STUDENT FOUNDER\'S BET',
    icon: '🎓',
    sponsor: 'College.xyz',
    prizes: '5× $500',
    desc: 'Team MECH X4 · Avalanche Kolkata Hackathon 2025',
    color: '#FFD700', // yellow
  },
]

export function Prizes() {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0a0510] z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,215,0,0.04)_0%,transparent_50%)] z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(255,20,147,0.04)_0%,transparent_50%)] z-0" />

      <div className="relative z-10 max-w-6xl mx-auto px-4" ref={sectionRef}>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 glass-pink px-4 py-2 rounded-full mb-5">
            <Trophy className="w-3.5 h-3.5 text-[#FFD700]" />
            <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#FFD700] tracking-[0.2em] font-bold">
              TRACKS WE ENTERED
            </span>
          </div>

          {/* Big title */}
          <h2 className="font-[family-name:var(--font-syne)] font-bold text-[28px] sm:text-[36px] md:text-[48px] text-white leading-tight max-w-4xl mx-auto mb-4">
            Out of <span className="text-[#FFD700] drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]">$100K+</span> total Synthesis prize pool
          </h2>
        </motion.div>

        {/* Prize cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {TRACKS.map((track, i) => (
            <motion.div
              key={track.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
              className="group relative overflow-hidden rounded-xl"
            >
              {/* Dynamic border glow */}
              <div
                className="absolute inset-[0px] rounded-xl transition-all duration-500 z-0"
                style={{
                  border: `2px solid ${track.color}40`,
                  boxShadow: `0 0 20px ${track.color}15 inset`,
                }}
              />
              
              <div
                className="absolute inset-[0px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0"
                style={{
                  boxShadow: `0 0 30px ${track.color}30 inset, 0 0 30px ${track.color}20`,
                  border: `2px solid ${track.color}80`,
                }}
              />

              <div className="relative z-10 bg-[#10101a]/80 backdrop-blur-md rounded-xl p-6 h-full flex flex-col">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-3xl">{track.icon}</span>
                  <div className="flex-1 pt-0.5">
                    <h3 
                      className="font-[family-name:var(--font-press-start)] text-[11px] sm:text-[13px] leading-relaxed mb-1"
                      style={{ color: track.color, textShadow: `0 0 15px ${track.color}50` }}
                    >
                      {track.title}
                    </h3>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-[#333]/30">
                  <div className="font-[family-name:var(--font-syne)] font-bold text-[16px] text-white flex items-center justify-between flex-wrap gap-2">
                    <span className="text-gray-300">{track.sponsor}</span>
                    <span className="text-[#FFD700]">{track.prizes}</span>
                  </div>
                  <p className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888] tracking-wide mt-3 leading-relaxed">
                    {track.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footnote */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-center"
        >
          <p className="font-[family-name:var(--font-dm-mono)] text-[10px] sm:text-[11px] text-[#555] tracking-widest uppercase">
            Submitted March 23 2026 · ERC-8004 on Base · classified-agent × PyVax
          </p>
        </motion.div>
      </div>
    </section>
  )
}
