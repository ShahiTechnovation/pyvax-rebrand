'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LoadingScreenProps {
  onComplete: () => void
}

// Characters for the code rain effect
const RAIN_CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(true)

  // Code rain canvas effect
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const fontSize = 14
    const columns = Math.floor(canvas.width / fontSize)
    const drops: number[] = Array(columns).fill(1).map(() => Math.random() * -100)

    const draw = () => {
      ctx.fillStyle = 'rgba(10, 5, 15, 0.08)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < drops.length; i++) {
        const char = RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)]
        const x = i * fontSize
        const y = drops[i] * fontSize

        // Pink gradient color
        const brightness = Math.random()
        if (brightness > 0.95) {
          ctx.fillStyle = '#FFD700' // occasional gold
        } else if (brightness > 0.7) {
          ctx.fillStyle = '#FF1493' // deep pink
        } else {
          ctx.fillStyle = `rgba(255, 20, 147, ${0.15 + Math.random() * 0.3})`
        }

        ctx.fillText(char, x, y)

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
    }

    const interval = setInterval(draw, 40)

    return () => clearInterval(interval)
  }, [])

  // Progress bar animation
  useEffect(() => {
    const duration = 2800
    const start = Date.now()

    const tick = () => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, (elapsed / duration) * 100)
      setProgress(pct)

      if (pct < 100) {
        requestAnimationFrame(tick)
      } else {
        setTimeout(() => {
          setVisible(false)
          setTimeout(onComplete, 500)
        }, 200)
      }
    }

    requestAnimationFrame(tick)
  }, [onComplete])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0510]"
        >
          {/* Code rain canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0"
          />

          {/* Scanner beam */}
          <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
            <motion.div
              className="absolute left-0 right-0 h-[2px]"
              style={{
                background: 'linear-gradient(90deg, transparent, #FF1493, #FFD700, #FF1493, transparent)',
                boxShadow: '0 0 30px 10px rgba(255, 20, 147, 0.3)',
              }}
              animate={{
                top: ['0%', '100%', '0%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </div>

          {/* Center content */}
          <div className="relative z-10 flex flex-col items-center gap-6 px-4">
            {/* Radial glow behind text */}
            <div className="absolute w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(255,20,147,0.15)_0%,transparent_70%)] animate-pink-pulse" />

            {/* Glitch text */}
            <motion.div
              className="relative"
              animate={{
                x: [0, -2, 2, -1, 0],
                filter: ['hue-rotate(0deg)', 'hue-rotate(10deg)', 'hue-rotate(-10deg)', 'hue-rotate(5deg)', 'hue-rotate(0deg)'],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatDelay: 2,
              }}
            >
              <h2
                className="font-[family-name:var(--font-press-start)] text-[12px] sm:text-[16px] md:text-[20px] tracking-[0.3em] text-[#FF1493]"
                style={{
                  textShadow: '0 0 20px rgba(255, 20, 147, 0.5), 0 0 40px rgba(255, 20, 147, 0.3)',
                }}
              >
                ACCESSING CLASSIFIED...
              </h2>
            </motion.div>

            {/* Progress bar */}
            <div className="w-[280px] sm:w-[350px] md:w-[400px]">
              <div className="w-full h-[6px] bg-[#1a1025] rounded-full overflow-hidden border border-[rgba(255,20,147,0.2)]">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #8B008B, #FF1493, #FFD700)',
                    width: `${progress}%`,
                    boxShadow: '0 0 10px rgba(255, 20, 147, 0.5)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#FF1493]/60 tracking-wider">
                  DECRYPTING
                </span>
                <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#FFD700] tracking-wider">
                  {Math.floor(progress)}%
                </span>
              </div>
            </div>

            {/* Decorative status lines */}
            <div className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#FF1493]/30 tracking-widest space-y-1 text-center">
              <motion.div
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ▸ INITIALIZING SECURE CHANNEL
              </motion.div>
              {progress > 30 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                >
                  ▸ VALIDATING CREDENTIALS
                </motion.div>
              )}
              {progress > 60 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                >
                  ▸ DECODING CLASSIFIED DATA
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
