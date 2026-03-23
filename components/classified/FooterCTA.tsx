'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { Users, ArrowRight } from 'lucide-react'

export function FooterCTA() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const [builderCount, setBuilderCount] = useState(0)

  useEffect(() => {
    if (!isInView) return

    const target = 1000
    const duration = 2000
    const start = Date.now()

    const tick = () => {
      const elapsed = Date.now() - start
      const pct = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - pct, 3)
      setBuilderCount(Math.floor(eased * target))
      if (pct < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [isInView])

  return (
    <footer className="relative py-20 md:py-28 overflow-hidden" ref={ref}>
      {/* Background */}
      <div className="absolute inset-0 bg-[#060310]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,20,147,0.08)_0%,transparent_50%)]" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
        {/* Builder counter */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-3 glass-pink px-6 py-3 rounded-full mb-8">
            <Users className="w-4 h-4 text-[#FF1493]" />
            <span
              className="font-[family-name:var(--font-press-start)] text-[16px] sm:text-[20px] text-[#FF1493]"
              style={{ textShadow: '0 0 20px rgba(255, 20, 147, 0.4)' }}
            >
              {builderCount.toLocaleString()}+
            </span>
            <span className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#999] tracking-wide">
              BUILDERS JOINING
            </span>
          </div>
        </motion.div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <h2 className="font-[family-name:var(--font-press-start)] text-[18px] sm:text-[24px] md:text-[32px] text-white mb-4 leading-relaxed">
            DON&apos;T MISS $100K+
          </h2>
          <p className="font-[family-name:var(--font-ibm-plex)] text-[15px] text-[#777] mb-8 max-w-md mx-auto">
            Join the Classified Hackathon. Build with PyVax. Win Synthesis prizes.
          </p>

          <a
            href="https://unstop.com/o/nfj1CVW?lb=TUn3UTaD"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 bg-gradient-to-r from-[#FF1493] to-[#8B008B] hover:from-[#FF1493] hover:to-[#FF1493] text-white font-[family-name:var(--font-press-start)] text-[11px] sm:text-[13px] px-10 py-5 rounded-xl transition-all duration-300 shadow-[0_0_30px_rgba(255,20,147,0.4)] hover:shadow-[0_0_60px_rgba(255,20,147,0.6)] transform hover:scale-[1.03] active:scale-95 mb-4"
          >
            JOIN CLASSIFIED HACKATHON
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <div className="mt-3">
            <a
              href="https://pypi.org/project/classified-agent/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888] hover:text-[#4CAF50] transition-colors tracking-wide"
            >
              pip install classified-agent==1.2.0 →
            </a>
          </div>
        </motion.div>

        {/* Social links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-12 flex items-center justify-center gap-6"
        >
          <a
            href="https://discord.gg/pyvax"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#555] hover:text-[#FF1493] transition-colors tracking-wide"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
            </svg>
            DISCORD
          </a>
          <span className="text-[#222]">·</span>
          <a
            href="https://x.com/PyVax"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#555] hover:text-[#FF1493] transition-colors tracking-wide"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            TWITTER
          </a>
          <span className="text-[#222]">·</span>
          <a
            href="https://github.com/ShahiTechnovation/pyvax-rebrand"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#555] hover:text-[#FF1493] transition-colors tracking-wide"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GITHUB
          </a>
        </motion.div>

        {/* Bottom text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mt-10 space-y-2"
        >
          <p className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#444] tracking-wide">
            Powered by <span className="text-[#FF1493]">PyVax</span> · <a href="https://github.com/ShahiTechnovation/pyvax-rebrand" target="_blank" rel="noopener noreferrer" className="hover:text-[#FF1493] transition-colors">github.com/ShahiTechnovation/pyvax-rebrand</a>
          </p>
          <p className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#333] tracking-wider">
            © 2026 PyVax. All rights reserved.
          </p>
        </motion.div>
      </div>
    </footer>
  )
}
