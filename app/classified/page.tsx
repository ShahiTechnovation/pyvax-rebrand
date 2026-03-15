'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LoadingScreen } from '@/components/classified/LoadingScreen'
import { AccessGate } from '@/components/classified/AccessGate'
import { ParticleBg } from '@/components/classified/ParticleBg'
import { Hero } from '@/components/classified/Hero'
import { Steps } from '@/components/classified/Steps'
import { Prizes } from '@/components/classified/Prizes'
import { WhyPyVax } from '@/components/classified/WhyPyVax'
import { TerminalDemo } from '@/components/classified/TerminalDemo'
import { FooterCTA } from '@/components/classified/FooterCTA'

type PageState = 'loading' | 'gate' | 'unlocked'

export default function ClassifiedPage() {
  const [state, setState] = useState<PageState>('loading')

  const handleLoadingComplete = useCallback(() => {
    // Check if there's a session code stored (returning user)
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('classified_code') : null
    if (stored) {
      // Validate silently
      fetch('/api/classified/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: stored }),
      })
        .then(r => r.json())
        .then(data => {
          setState(data.valid ? 'unlocked' : 'gate')
        })
        .catch(() => setState('gate'))
    } else {
      setState('gate')
    }
  }, [])

  const handleUnlock = useCallback(() => {
    setState('unlocked')
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0510] text-[#F2F2F2] font-[family-name:var(--font-ibm-plex)] selection:bg-[#FF1493] selection:text-white overflow-x-hidden classified-cursor">

      {/* ═══ Phase 1: Loading Screen ═══ */}
      <AnimatePresence>
        {state === 'loading' && (
          <LoadingScreen onComplete={handleLoadingComplete} />
        )}
      </AnimatePresence>

      {/* ═══ Phase 2: Access Gate ═══ */}
      <AnimatePresence>
        {state === 'gate' && (
          <AccessGate onUnlock={handleUnlock} />
        )}
      </AnimatePresence>

      {/* ═══ Phase 3: Full Page (Unlocked) ═══ */}
      <AnimatePresence>
        {state === 'unlocked' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            {/* Fixed particle background */}
            <ParticleBg />

            {/* Fixed navigation bar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0510]/80 backdrop-blur-xl border-b border-[#FF1493]/10">
              <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF1493] to-[#8B008B] flex items-center justify-center text-[10px] font-bold text-white font-[family-name:var(--font-press-start)]">
                    Py
                  </div>
                  <span className="font-[family-name:var(--font-press-start)] text-[10px] text-[#FF1493] tracking-[0.2em]">
                    CLASSIFIED
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <a href="#steps-section" className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#666] hover:text-[#FF1493] transition-colors tracking-wider hidden sm:inline">
                    STEPS
                  </a>
                  <a href="#prizes-section" className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#666] hover:text-[#FF1493] transition-colors tracking-wider hidden sm:inline">
                    PRIZES
                  </a>
                  <a
                    href="https://pyvax.xyz/agent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-[#FF1493] to-[#8B008B] text-white font-[family-name:var(--font-dm-mono)] text-[9px] font-bold tracking-wider px-4 py-2 rounded-lg hover:shadow-[0_0_20px_rgba(255,20,147,0.3)] transition-shadow"
                  >
                    GET CODE
                  </a>
                </div>
              </div>
            </nav>

            {/* Page sections */}
            <main className="relative z-10 pt-14">
              <Hero />

              <div className="relative">
                {/* Pink divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-[#FF1493]/30 to-transparent" />
              </div>

              <Steps />

              <div className="h-px bg-gradient-to-r from-transparent via-[#FFD700]/20 to-transparent" />

              <div id="prizes-section">
                <Prizes />
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-[#FF1493]/20 to-transparent" />

              <WhyPyVax />

              <div className="h-px bg-gradient-to-r from-transparent via-[#4CAF50]/15 to-transparent" />

              <TerminalDemo />

              <div className="h-px bg-gradient-to-r from-transparent via-[#FF1493]/20 to-transparent" />

              <FooterCTA />
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
