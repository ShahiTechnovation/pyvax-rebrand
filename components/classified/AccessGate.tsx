'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Unlock, AlertTriangle, ArrowRight } from 'lucide-react'

interface AccessGateProps {
  onUnlock: () => void
}

export function AccessGate({ onUnlock }: AccessGateProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [validating, setValidating] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      setError('Enter your access code')
      return
    }

    setValidating(true)

    try {
      const res = await fetch('/api/classified/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      })

      const data = await res.json()

      if (data.valid) {
        setUnlocked(true)
        // Store in session so they don't need to re-enter
        sessionStorage.setItem('classified_code', trimmed)
        setTimeout(onUnlock, 1500)
      } else {
        setError(data.error || 'Invalid or expired code')
        // Shake animation happens via CSS
        if (inputRef.current) {
          inputRef.current.classList.add('animate-shake')
          setTimeout(() => inputRef.current?.classList.remove('animate-shake'), 500)
        }
      }
    } catch {
      setError('Network error. Try again.')
    } finally {
      setValidating(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.6, type: 'spring', stiffness: 200 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0a0510]/95 backdrop-blur-xl px-4"
    >
      {/* Background radial glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(255,20,147,0.08)_0%,transparent_70%)] animate-pink-pulse" />

      <AnimatePresence mode="wait">
        {!unlocked ? (
          <motion.div
            key="gate"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className="relative glass-pink rounded-2xl p-8 sm:p-10 md:p-12 max-w-md w-full"
          >
            {/* Lock icon */}
            <div className="flex justify-center mb-6">
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(255, 20, 147, 0.2)',
                    '0 0 40px rgba(255, 20, 147, 0.4)',
                    '0 0 20px rgba(255, 20, 147, 0.2)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF1493]/20 to-[#8B008B]/20 border border-[#FF1493]/30 flex items-center justify-center"
              >
                <Lock className="w-7 h-7 text-[#FF1493]" />
              </motion.div>
            </div>

            {/* Title */}
            <h2
              className="text-center font-[family-name:var(--font-press-start)] text-[14px] sm:text-[16px] text-[#FF1493] mb-2 tracking-wider"
              style={{ textShadow: '0 0 20px rgba(255, 20, 147, 0.4)' }}
            >
              ENTER ACCESS CODE
            </h2>
            <p className="text-center font-[family-name:var(--font-dm-mono)] text-[11px] text-[#666] mb-8 tracking-wide">
              CLASSIFIED · AUTHORIZED PERSONNEL ONLY
            </p>

            {/* Input form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
                  placeholder="DEMO"
                  maxLength={12}
                  disabled={validating}
                  autoFocus
                  className={`w-full h-[56px] text-center font-[family-name:var(--font-press-start)] text-[18px] sm:text-[22px] tracking-[0.5em] bg-[#0a0510] border-2 rounded-xl text-[#FFD700] placeholder-[#333] focus:outline-none transition-all duration-300 disabled:opacity-50 ${
                    error
                      ? 'border-red-500/60 shadow-[0_0_20px_rgba(255,0,0,0.15)]'
                      : 'border-[#FF1493]/30 focus:border-[#FF1493]/60 focus:shadow-[0_0_30px_rgba(255,20,147,0.15)]'
                  }`}
                  style={{
                    caretColor: '#FF1493',
                  }}
                />
              </div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span className="font-[family-name:var(--font-dm-mono)] text-[11px] text-red-400">
                      {error}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit button */}
              <button
                type="submit"
                disabled={validating || !code.trim()}
                className="group w-full h-[48px] bg-gradient-to-r from-[#FF1493] to-[#8B008B] hover:from-[#FF1493] hover:to-[#FF1493] disabled:from-[#333] disabled:to-[#333] text-white font-[family-name:var(--font-dm-mono)] text-[12px] font-bold tracking-wider rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(255,20,147,0.3)] hover:shadow-[0_0_40px_rgba(255,20,147,0.5)] disabled:shadow-none transform hover:scale-[1.02] active:scale-95"
              >
                <span className="flex items-center justify-center gap-2">
                  {validating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      VALIDATING...
                    </>
                  ) : (
                    <>
                      DECRYPT ACCESS
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Waitlist fallback */}
            <div className="mt-6 pt-5 border-t border-[#FF1493]/10 text-center flex flex-col items-center gap-2">
              <p className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#555]">
                Don&apos;t have a code? Use <span className="text-[#FFD700] font-bold">DEMO</span>
              </p>
              <a
                href="https://pyvax.xyz/agent"
                className="inline-flex items-center gap-1.5 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#FF1493] hover:text-[#FFD700] transition-colors tracking-wide"
              >
                JOIN WAITLIST → pyvax.xyz/agent
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </motion.div>
        ) : (
          /* Success state */
          <motion.div
            key="unlocked"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 200 }}
            className="flex flex-col items-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4CAF50] to-[#2E7D32] flex items-center justify-center mb-6"
              style={{ boxShadow: '0 0 60px rgba(76, 175, 80, 0.4)' }}
            >
              <Unlock className="w-10 h-10 text-white" />
            </motion.div>
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-[family-name:var(--font-press-start)] text-[16px] text-[#4CAF50] tracking-wider"
              style={{ textShadow: '0 0 20px rgba(76, 175, 80, 0.5)' }}
            >
              ACCESS GRANTED
            </motion.h3>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#666] mt-3 tracking-wider"
            >
              DECRYPTING CLASSIFIED DATA...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shake animation keyframes via inline style */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </motion.div>
  )
}
