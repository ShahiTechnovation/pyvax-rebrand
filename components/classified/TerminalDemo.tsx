'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, useInView } from 'framer-motion'
import { Terminal } from 'lucide-react'

const DEMO_LINES = [
  { text: '$ pip install classified-agent', type: 'command', pause: 800 },
  { text: 'Successfully installed classified-agent-1.1.0', type: 'output', pause: 600 },
  { text: '', type: 'blank', pause: 300 },
  { text: '$ classified-agent init DeFiBot', type: 'command', pause: 700 },
  { text: '✓ Created classified.toml', type: 'success', pause: 400 },
  { text: '✓ Workspace scaffolded', type: 'success', pause: 400 },
  { text: '', type: 'blank', pause: 300 },
  { text: '$ export ANTHROPIC_API_KEY=sk-ant-...', type: 'command', pause: 500 },
  { text: '', type: 'blank', pause: 200 },
  { text: '$ classified-agent run', type: 'command', pause: 800 },
  { text: '▸ Fetching https://synthesis.md/skill.md...', type: 'progress', pause: 700 },
  { text: '✓ Skill cached (2.4kb)', type: 'success', pause: 400 },
  { text: '▸ Claude 3.5 Sonnet building agent...', type: 'progress', pause: 900 },
  { text: '▸ PyVax compiling → 12kb WASM', type: 'progress', pause: 700 },
  { text: '✓ Compiled via PyVax (fallback: solidity ready)', type: 'success', pause: 500 },
  { text: '✓ Registered @synthesis_md: agent_id synth_7f3a', type: 'success', pause: 500 },
  { text: '✓ GitHub: github.com/user/DeFiBot-synthesis', type: 'success', pause: 500 },
  { text: '✓ Twitter proof posted!', type: 'success', pause: 400 },
  { text: '', type: 'blank', pause: 300 },
  { text: '🎉 CLASSIFIED HACKATHON SUBMITTED → $75K!', type: 'final', pause: 0 },
]

const LINE_COLORS: Record<string, string> = {
  command: '#FFD700',
  output: '#888',
  prompt: '#FF1493',
  success: '#4CAF50',
  config: '#6B8CAE',
  progress: '#FF1493',
  final: '#FFD700',
  blank: 'transparent',
}

export function TerminalDemo() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [visibleLines, setVisibleLines] = useState(0)
  const [started, setStarted] = useState(false)

  const startAnimation = useCallback(() => {
    if (started) return
    setStarted(true)

    let lineIndex = 0
    const showNext = () => {
      if (lineIndex >= DEMO_LINES.length) return
      lineIndex++
      setVisibleLines(lineIndex)
      if (lineIndex < DEMO_LINES.length) {
        setTimeout(showNext, DEMO_LINES[lineIndex - 1].pause)
      }
    }
    showNext()
  }, [started])

  useEffect(() => {
    if (isInView) {
      // Small delay before starting
      const timer = setTimeout(startAnimation, 500)
      return () => clearTimeout(timer)
    }
  }, [isInView, startAnimation])

  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0510]" />

      <div className="relative z-10 max-w-3xl mx-auto px-4" ref={ref}>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 glass-pink px-4 py-2 rounded-full mb-5">
            <Terminal className="w-3.5 h-3.5 text-[#4CAF50]" />
            <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#4CAF50] tracking-[0.2em] font-bold">
              LIVE DEMO
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-press-start)] text-[18px] sm:text-[24px] md:text-[32px] text-white mb-4 leading-relaxed">
            SEE IT IN ACTION
          </h2>
        </motion.div>

        {/* Terminal window */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative"
        >
          {/* Glow behind terminal */}
          <div className="absolute -inset-4 rounded-2xl bg-[radial-gradient(ellipse,rgba(76,175,80,0.06)_0%,transparent_70%)] pointer-events-none" />

          <div className="relative glass-pink rounded-xl overflow-hidden border border-[#4CAF50]/10">
            {/* Window chrome */}
            <div className="flex items-center px-4 py-3 border-b border-[#4CAF50]/10 bg-[#0a0510]/80">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <Terminal className="w-3 h-3 text-[#4CAF50]/50" />
                <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#555]">classified-agent v1.1.0</span>
              </div>
            </div>

            {/* Terminal body */}
            <div className="p-5 sm:p-6 min-h-[400px] max-h-[500px] overflow-y-auto">
              <div className="font-[family-name:var(--font-dm-mono)] text-[12px] sm:text-[13px] leading-[1.9] space-y-0">
                {DEMO_LINES.map((line, i) => (
                  <div
                    key={i}
                    className={`transition-all duration-300 ${
                      i < visibleLines ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
                    }`}
                    style={{ color: LINE_COLORS[line.type] }}
                  >
                    {line.type === 'blank' ? <br /> : line.text}
                  </div>
                ))}
                {visibleLines > 0 && visibleLines < DEMO_LINES.length && (
                  <span className="animate-terminal-cursor">&nbsp;</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
