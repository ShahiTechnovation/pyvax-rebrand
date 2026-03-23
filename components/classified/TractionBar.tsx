'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'

function Counter({ from = 0, to, duration = 2, suffix = '' }: { from?: number, to: number, duration?: number, suffix?: string }) {
  const [count, setCount] = useState(from)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-50px" })

  useEffect(() => {
    if (!inView) return

    let startTime: number
    let animationFrame: number

    const updateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = timestamp - startTime
      
      if (progress < duration * 1000) {
        // easeOutExpo
        const easeProgress = progress / (duration * 1000)
        const currentCount = Math.floor(from + (to - from) * (1 - Math.pow(2, -10 * easeProgress)))
        setCount(currentCount)
        animationFrame = requestAnimationFrame(updateCount)
      } else {
        setCount(to)
      }
    }

    animationFrame = requestAnimationFrame(updateCount)
    return () => cancelAnimationFrame(animationFrame)
  }, [from, to, duration, inView])

  return (
    <span ref={ref}>
      {count}{suffix}
    </span>
  )
}

export function TractionBar() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8 }}
      className="w-full relative z-20 py-12"
    >
      <div className="w-full bg-[#10101a] border-y border-[#FF1493]/40 shadow-[0_0_30px_rgba(255,20,147,0.1)]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-[#FF1493]/30">
            {/* Stat 1 */}
            <div className="flex flex-col items-center justify-center p-4">
              <div className="font-[family-name:var(--font-press-start)] text-[28px] sm:text-[36px] text-white mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                <Counter to={434} />
              </div>
              <div className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#888] tracking-[0.2em]">
                REGISTERED
              </div>
            </div>
            
            {/* Stat 2 */}
            <div className="flex flex-col items-center justify-center p-4">
              <div className="font-[family-name:var(--font-press-start)] text-[28px] sm:text-[36px] text-white mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                <Counter to={165} />
              </div>
              <div className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#888] tracking-[0.2em]">
                COMPLETED
              </div>
            </div>

            {/* Stat 3 */}
            <div className="flex flex-col items-center justify-center p-4">
              <div className="font-[family-name:var(--font-press-start)] text-[28px] sm:text-[36px] text-white mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                <Counter to={81} suffix=".5K" />
              </div>
              <div className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#888] tracking-[0.2em]">
                IMPRESSIONS
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-center mt-6">
        <p className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#555] max-w-2xl mx-auto px-4">
          Classified Hack — student hackathon built to onboard developers into Synthesis
        </p>
      </div>
    </motion.div>
  )
}
