'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { Trophy, Award, Star } from 'lucide-react'

const PRIZES = [
  { sponsor: 'Uniswap', amount: 25000, color: '#FF007A', icon: '🦄' },
  { sponsor: 'Base', amount: 15000, color: '#0052FF', icon: '🔵' },
  { sponsor: 'Lido', amount: 12000, color: '#00A3FF', icon: '💧' },
  { sponsor: 'Synthesis', amount: 10000, color: '#FFD700', icon: '⚡' },
  { sponsor: 'Community', amount: 8000, color: '#FF1493', icon: '🌐' },
  { sponsor: 'Innovation', amount: 5000, color: '#8B008B', icon: '🧪' },
]

function AnimatedCounter({ target, duration = 2 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return

    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const pct = Math.min(1, elapsed / (duration * 1000))
      // Ease out quad
      const eased = 1 - (1 - pct) * (1 - pct)
      setCount(Math.floor(eased * target))
      if (pct < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [isInView, target, duration])

  return <span ref={ref}>${count.toLocaleString()}</span>
}

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
              PRIZE POOL
            </span>
          </div>

          {/* Big counter */}
          <div
            className="font-[family-name:var(--font-press-start)] text-[40px] sm:text-[56px] md:text-[72px] leading-none mb-4"
            style={{
              background: 'linear-gradient(135deg, #FFD700, #FF1493, #FFD700)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.3))',
            }}
          >
            <AnimatedCounter target={75000} duration={2.5} />
          </div>
          <p className="font-[family-name:var(--font-ibm-plex)] text-[16px] text-[#777]">
            In total prizes across all tracks
          </p>
        </motion.div>

        {/* Prize cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {PRIZES.map((prize, i) => (
            <motion.div
              key={prize.sponsor}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
              className="group relative overflow-hidden rounded-xl"
            >
              {/* Gold border glow */}
              <div
                className="absolute -inset-[1px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: `linear-gradient(135deg, ${prize.color}40, transparent, ${prize.color}40)`,
                }}
              />

              <div className="relative glass-pink-hover rounded-xl p-6">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{prize.icon}</span>
                  <div
                    className="font-[family-name:var(--font-press-start)] text-[20px] sm:text-[24px]"
                    style={{ color: prize.color }}
                  >
                    <AnimatedCounter target={prize.amount} duration={2 + i * 0.2} />
                  </div>
                </div>
                <h3 className="font-[family-name:var(--font-syne)] font-bold text-[16px] text-white mb-1">
                  {prize.sponsor} Track
                </h3>
                <p className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#666] tracking-wide">
                  BUILD · DEPLOY · WIN
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Badges row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-4"
        >
          <div className="flex items-center gap-2 glass-pink px-5 py-3 rounded-full">
            <Award className="w-4 h-4 text-[#FFD700]" />
            <span className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#FFD700] font-bold tracking-wide">
              100% GET CERTIFICATES
            </span>
          </div>
          <div className="flex items-center gap-2 glass-pink px-5 py-3 rounded-full">
            <Star className="w-4 h-4 text-[#FF1493]" />
            <span className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#FF1493] font-bold tracking-wide">
              TWITTER SHOUTOUTS
            </span>
          </div>
          <div className="flex items-center gap-2 glass-pink px-5 py-3 rounded-full">
            <Trophy className="w-4 h-4 text-[#4CAF50]" />
            <span className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#4CAF50] font-bold tracking-wide">
              EXCLUSIVE MERCH
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
