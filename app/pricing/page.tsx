'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const FAQ_ITEMS = [
  { q: 'What counts as an "execution"?', a: 'An execution is any on-chain action initiated by your agents via the PyVax infrastructure. For example, deploying a contract, or an agent calling a function.' },
  { q: 'Can I upgrade/downgrade anytime?', a: 'Yes. You can upgrade or downgrade your plan at any time. Prorated charges or credits will be applied automatically.' },
  { q: 'Do agent wallets cost extra?', a: 'Agent wallets are included in your plan. The Builder plan offers unlimited HD wallets natively generated for your AI agents.' },
  { q: "What's the SLA for Pro support?", a: 'Our SLA for Pro (Builder) support guarantees an email response within 48 hours. Team plan offers a 24-hour response SLA.' },
  { q: 'How does billing work on free tier?', a: 'The Hacker tier is completely free. If you exceed 10,000 executions in a month, your agent actions will automatically pause until the next cycle unless you upgrade.' },
  { q: 'Can I self-host PyVax?', a: 'While the PyVax CLI compiler is fully open-source, our managed execution nodes and RPC routing are hosted by us for maximum agent stability.' },
  { q: 'Enterprise pricing available?', a: 'Yes. If you are building a massive autonomous network or AAA game, contact sales for volume discounts and custom SLA contracts.' },
  { q: 'Cancel anytime?', a: 'Absolutely. We do not lock you into rigid contracts on our self-serve tiers.' },
]

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F2F2F2] font-[family-name:var(--font-ibm-plex)] selection:bg-[#E84142] selection:text-white">

      {/* NAVBAR MATCHING HOME/DOCS */}
      <nav className="border-b border-[#1F1F1F] bg-[#0E0E0E]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-[family-name:var(--font-press-start)] text-[#E84142] text-[14px]">
            PYVAX
          </Link>
          <div className="hidden md:flex items-center gap-8 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#909090]">
            <Link href="/docs" className="hover:text-[#E84142] transition">DOCS</Link>
            <Link href="/pricing" className="text-[#F2F2F2]">PRICING</Link>
            <Link href="#" className="hover:text-[#E84142] transition">GITHUB</Link>
          </div>
          <Link href="/playground" className="hidden md:flex h-[36px] items-center px-4 bg-[#E84142] text-white font-[family-name:var(--font-dm-mono)] text-[11px] font-bold rounded hover:bg-[#FF5555] transition">
            LAUNCH PLAYGROUND
          </Link>
        </div>
      </nav>

      {/* 1. HERO SECTION */}
      <section className="relative pt-24 pb-16 px-6 overflow-hidden flex flex-col items-center justify-center text-center">
        {/* Decorative dark cinematic background effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/50 to-[#0E0E0E] pointer-events-none -z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(232,65,66,0.1),transparent_50%)] pointer-events-none -z-10" />

        <div className="inline-block relative mb-8">
          <div className="border border-[#E84142]/50 bg-[#0A0A0A] px-4 py-1.5 rounded-full">
            <span className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#E84142] uppercase tracking-wider">
              PRICING · SIMPLE SCALABLE AGENTIC
            </span>
          </div>
        </div>

        <h1 className="font-[family-name:var(--font-press-start)] text-[28px] md:text-[52px] lg:text-[72px] leading-[1.2] mb-6 drop-shadow-lg">
          <span className="text-[#FFFFFF]">AGENT ECONOMY</span>
          <br />
          <span className="text-[#E84142]">PRICING</span>
        </h1>

        <p className="font-[family-name:var(--font-ibm-plex)] text-[18px] md:text-[20px] text-[#C0C0C0] max-w-2xl mb-12">
          Start free. Scale with your agents. Pay per execution.
        </p>

        {/* BILLING TOGGLE */}
        <div className="flex items-center gap-4 mb-12">
          <span className={`font-[family-name:var(--font-dm-mono)] text-[13px] transition-colors ${!isYearly ? 'text-[#F2F2F2]' : 'text-[#909090]'}`}>MONTHLY</span>

          <button
            onClick={() => setIsYearly(!isYearly)}
            className="relative w-14 h-7 rounded-full bg-[#1F1F1F] border border-[#2A2A2A] shadow-inner transition-colors focus:outline-none"
          >
            <div className={`absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-[#E84142] transition-transform duration-300 ${isYearly ? 'translate-x-7' : 'translate-x-0'}`} />
          </button>

          <div className="flex items-center gap-2">
            <span className={`font-[family-name:var(--font-dm-mono)] text-[13px] transition-colors ${isYearly ? 'text-[#F2F2F2]' : 'text-[#909090]'}`}>YEARLY</span>
            <span className="bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/20 font-[family-name:var(--font-dm-mono)] text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
              20% Savings
            </span>
          </div>
        </div>

      </section>

      {/* 2. PRICING CARDS */}
      <section className="px-4 max-w-7xl mx-auto -mt-8 relative z-10 mb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* TIER 1: HACKER */}
          <div className="bg-[#131313] border border-[#1F1F1F] hover:border-[#E84142]/50 hover:bg-[#181818] rounded-[16px] p-[48px_32px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-200 hover:scale-[1.02] flex flex-col h-full group">
            <h2 className="font-[family-name:var(--font-syne)] font-semibold text-[28px] text-[#F2F2F2] mb-6 flex items-center gap-3">
              🧑💻 HACKER
            </h2>
            <div className="mb-2 flex items-baseline gap-1">
              <span className="font-[family-name:var(--font-dm-mono)] text-[48px] text-[#4CAF50] font-bold leading-none">$0</span>
              <span className="font-[family-name:var(--font-dm-mono)] text-[16px] text-[#909090]">/mo</span>
            </div>
            <p className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#C0C0C0] mb-8 pb-8 border-b border-[#1F1F1F]">
              10k agent executions/mo
            </p>

            <ul className="space-y-4 font-[family-name:var(--font-dm-mono)] text-[13px] text-[#C0C0C0] mb-12 flex-grow">
              <li className="flex items-start gap-3"><span className="text-[#4CAF50] font-bold">✓</span> CLI + Playground access</li>
              <li className="flex items-start gap-3"><span className="text-[#4CAF50] font-bold">✓</span> Avalanche Fuji + C-Chain</li>
              <li className="flex items-start gap-3"><span className="text-[#4CAF50] font-bold">✓</span> 10 agent wallets</li>
              <li className="flex items-start gap-3"><span className="text-[#4CAF50] font-bold">✓</span> Basic contract templates</li>
              <li className="flex items-start gap-3"><span className="text-[#4CAF50] font-bold">✓</span> Community support (Discord)</li>
            </ul>

            <button className="w-full h-[48px] bg-[#4CAF50] hover:bg-[#45a049] text-[#0A0A0A] font-[family-name:var(--font-dm-mono)] text-[13px] font-bold rounded-[8px] transform active:scale-95 transition-all shadow-[0_0_15px_rgba(76,175,80,0.3)]">
              Get Started Free
            </button>
          </div>

          {/* TIER 2: BUILDER */}
          <div className="bg-[#131313] border-2 border-[#E84142] hover:bg-[#181818] rounded-[16px] p-[48px_32px] shadow-[0_20px_40px_rgba(232,65,66,0.15)] transition-all duration-200 hover:scale-[1.02] flex flex-col h-full relative lg:-mt-4 group z-10">
            <div className="absolute top-0 right-[32px] transform -translate-y-1/2">
              <div className="bg-[#E84142] text-white font-[family-name:var(--font-dm-mono)] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1">
                ★ MOST POPULAR
              </div>
            </div>

            <h2 className="font-[family-name:var(--font-syne)] font-bold text-[32px] text-[#F2F2F2] mb-6 flex items-center gap-3">
              🚀 BUILDER
            </h2>
            <div className="mb-2 flex items-baseline gap-1">
              <span className="font-[family-name:var(--font-dm-mono)] text-[56px] text-[#E84142] font-bold leading-none">${isYearly ? '23' : '29'}</span>
              <span className="font-[family-name:var(--font-dm-mono)] text-[16px] text-[#909090]">/mo</span>
            </div>
            <p className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#C0C0C0] mb-8 pb-8 border-b border-[#1F1F1F]">
              100k agent executions/mo
            </p>

            <ul className="space-y-4 font-[family-name:var(--font-dm-mono)] text-[13px] text-[#C0C0C0] mb-12 flex-grow">
              <li className="flex items-start gap-3"><span className="text-[#4CAF50] font-bold">✓</span> Everything in Hacker</li>
              <li className="flex items-start gap-3"><span className="text-[#4CAF50] font-bold">✓</span> Unlimited agent wallets</li>
              <li className="flex items-start gap-3"><span className="text-[#4CAF50] font-bold">✓</span> Custom RPC endpoints</li>
              <li className="flex items-start gap-3"><span className="text-[#4CAF50] font-bold">✓</span> Priority contract templates</li>
              <li className="flex items-start gap-3"><span className="text-[#4CAF50] font-bold">✓</span> Gas optimization pipelines</li>
              <li className="flex items-start gap-3"><span className="text-[#4CAF50] font-bold">✓</span> Email support (48h SLA)</li>
              <li className="flex items-start gap-3"><span className="text-[#4CAF50] font-bold">✓</span> Advanced visual debugging</li>
            </ul>

            <button className="w-full h-[48px] bg-[#E84142] hover:bg-[#FF5555] text-[white] font-[family-name:var(--font-dm-mono)] text-[13px] font-bold rounded-[8px] transform active:scale-95 transition-all shadow-[0_0_20px_rgba(232,65,66,0.4)]">
              Start 14-Day Trial
            </button>
          </div>

          {/* TIER 3: TEAM */}
          <div className="bg-[#131313] border border-[#1F1F1F] hover:border-[#E84142]/50 hover:bg-[#181818] rounded-[16px] p-[48px_32px] shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-200 hover:scale-[1.02] flex flex-col h-full group relative">
            <h2 className="font-[family-name:var(--font-syne)] font-semibold text-[28px] text-[#F2F2F2] mb-6 flex items-center gap-3">
              👥 TEAM
            </h2>
            <div className="mb-2 flex items-baseline gap-1">
              <span className="font-[family-name:var(--font-dm-mono)] text-[48px] text-[#F2F2F2] font-bold leading-none">${isYearly ? '82' : '99'}</span>
              <span className="font-[family-name:var(--font-dm-mono)] text-[16px] text-[#909090]">/mo</span>
            </div>
            <p className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#C0C0C0] mb-8 pb-8 border-b border-[#1F1F1F]">
              1M agent executions/mo
            </p>

            <ul className="space-y-4 font-[family-name:var(--font-dm-mono)] text-[13px] text-[#C0C0C0] mb-12 flex-grow">
              <li className="flex items-start gap-3"><span className="text-[#4CAF50] font-bold">✓</span> Everything in Builder</li>
              <li className="flex items-start gap-3"><span className="text-[#4CAF50] font-bold">✓</span> Team workspaces (5 seats)</li>
              <li className="flex items-start gap-3"><span className="text-[#4CAF50] font-bold">✓</span> AI contract assistant</li>
              <li className="flex items-start gap-3"><span className="text-[#4CAF50] font-bold">✓</span> Onchain analytics dashboard</li>
              <li className="flex items-start gap-3"><span className="text-[#4CAF50] font-bold">✓</span> Custom gas sponsors</li>
              <li className="flex items-start gap-3"><span className="text-[#4CAF50] font-bold">✓</span> SLA support (24h)</li>
              <li className="flex items-start gap-3"><span className="text-[#4CAF50] font-bold">✓</span> Dedicated onboarding</li>
            </ul>

            <button className="w-full h-[48px] bg-transparent border border-[#2A2A2A] hover:border-[#E84142] hover:bg-[#E84142]/10 text-[#F2F2F2] hover:text-[#E84142] font-[family-name:var(--font-dm-mono)] text-[13px] font-bold rounded-[8px] transform active:scale-95 transition-all">
              Contact Sales
            </button>
          </div>

        </div>
      </section>

      {/* 3. FEATURE COMPARISON MATRIX */}
      <section className="bg-[#0A0A0A] py-[80px]">
        <div className="max-w-5xl mx-auto px-6 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="sticky top-[64px] bg-[#131313] border-b border-[#1F1F1F] z-20 shadow-md">
              <tr className="font-[family-name:var(--font-syne)] text-[14px] text-[#F2F2F2]">
                <th className="p-6 font-semibold w-1/4">FEATURE OVERVIEW</th>
                <th className="p-6 w-1/4 text-center">
                  <div className="text-[#909090] text-[12px] uppercase">Hacker</div>
                  <div className="font-[family-name:var(--font-dm-mono)] text-[14px]">FREE</div>
                </th>
                <th className="p-6 w-1/4 text-center border-x border-[#1F1F1F] bg-[#1A0A0A]/50">
                  <div className="text-[#E84142] text-[12px] uppercase flex items-center justify-center gap-1">Builder <span className="text-[8px]">●</span></div>
                  <div className="font-[family-name:var(--font-dm-mono)] text-[14px] text-[#E84142]">${isYearly ? '23' : '29'}/mo</div>
                </th>
                <th className="p-6 w-1/4 text-center">
                  <div className="text-[#909090] text-[12px] uppercase">Team</div>
                  <div className="font-[family-name:var(--font-dm-mono)] text-[14px]">${isYearly ? '82' : '99'}/mo</div>
                </th>
              </tr>
            </thead>
            <tbody className="font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#C0C0C0]">
              {[
                { name: 'CLI Access', h: '✓', b: '✓', t: '✓' },
                { name: 'Playground Web IDE', h: '✓', b: '✓', t: '✓' },
                { name: 'Agent Wallets', h: '10', b: '∞', t: '∞' },
                { name: 'Executions / mo', h: '10k', b: '100k', t: '1M' },
                { name: 'Custom RPC Injection', h: '✗', b: '✓', t: '✓' },
                { name: 'Team Seats', h: '✗', b: '✗', t: '5' },
                { name: 'AI Gen. Assistant', h: '✗', b: '✗', t: '✓' },
                { name: 'Onchain Analytics', h: '✗', b: '✗', t: '✓' },
                { name: 'Support Channels', h: 'Discord', b: 'Email', t: 'SLA Priority' },
              ].map((row, idx) => (
                <tr key={idx} className={`border-b border-[#1F1F1F] hover:bg-[#181818] transition-colors ${idx % 2 === 0 ? 'bg-[#0A0A0A]' : 'bg-[#0E0E0E]'}`}>
                  <td className="p-5 font-semibold">{row.name}</td>
                  <td className="p-5 text-center font-[family-name:var(--font-dm-mono)] text-[12px]">
                    {row.h === '✓' ? <span className="text-[#4CAF50]">✓</span> : row.h === '✗' ? <span className="text-[#666666]">✗</span> : row.h}
                  </td>
                  <td className="p-5 text-center font-[family-name:var(--font-dm-mono)] text-[12px] border-x border-[#1F1F1F] bg-[#1A0A0A]/30">
                    {row.b === '✓' ? <span className="text-[#4CAF50]">✓</span> : row.b === '✗' ? <span className="text-[#666666]">✗</span> : row.b}
                  </td>
                  <td className="p-5 text-center font-[family-name:var(--font-dm-mono)] text-[12px]">
                    {row.t === '✓' ? <span className="text-[#4CAF50]">✓</span> : row.t === '✗' ? <span className="text-[#666666]">✗</span> : row.t}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. HOW USAGE WORKS */}
      <section className="bg-[#0E0E0E] py-[80px] px-6 border-y border-[#1F1F1F]">
        <div className="max-w-5xl mx-auto flex flex-col items-center">

          <h2 className="font-[family-name:var(--font-syne)] text-[32px] md:text-[40px] font-bold text-[#F2F2F2] mb-4 text-center">
            Transparent Execution Billing
          </h2>
          <p className="font-[family-name:var(--font-ibm-plex)] text-[18px] text-[#909090] max-w-2xl text-center mb-16">
            Executions = any onchain action executed natively by your agents via the PyVax infrastructure.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center w-full">

            {/* Text flow */}
            <div className="space-y-6 lg:pr-12">
              <div className="bg-[#131313] border border-[#1F1F1F] p-5 rounded-[12px]">
                <div className="flex items-center gap-3 font-[family-name:var(--font-syne)] text-[16px] text-[#F2F2F2] mb-2 font-bold">
                  <div className="w-6 h-6 rounded bg-[#E84142]/10 border border-[#E84142] flex items-center justify-center text-[#E84142] text-[12px]">1</div>
                  Deploy Vault Contract
                </div>
                <div className="font-[family-name:var(--font-dm-mono)] text-[12px] pl-9 text-[#555]">→ Consumes 1 execution</div>
              </div>

              <div className="bg-[#131313] border border-[#1F1F1F] p-5 rounded-[12px]">
                <div className="flex items-center gap-3 font-[family-name:var(--font-syne)] text-[16px] text-[#F2F2F2] mb-2 font-bold">
                  <div className="w-6 h-6 rounded bg-[#E84142]/10 border border-[#E84142] flex items-center justify-center text-[#E84142] text-[12px]">2</div>
                  Agent calls <code className="text-[#E84142] bg-[#0A0A0A] px-1 rounded">deposit()</code>
                </div>
                <div className="font-[family-name:var(--font-dm-mono)] text-[12px] pl-9 text-[#555]">→ Consumes 1 execution</div>
              </div>

              <div className="bg-[#131313] border border-[#E84142]/30 p-5 rounded-[12px] relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-[#4CAF50] text-[#0A0A0A] text-[10px] font-bold px-2 py-1 rounded-bl-lg">FREE TIER FIT ✓</div>
                <div className="flex items-center gap-3 font-[family-name:var(--font-syne)] text-[16px] text-[#F2F2F2] mb-2 font-bold">
                  <div className="w-6 h-6 rounded bg-[#E84142]/10 border border-[#E84142] flex items-center justify-center text-[#E84142] text-[12px]">3</div>
                  10 agents × 100 calls/day
                </div>
                <div className="font-[family-name:var(--font-dm-mono)] text-[12px] pl-9 text-[#4CAF50]">→ 3,000 / 10,000 threshold</div>
              </div>
            </div>

            {/* Terminal Demo */}
            <div className="bg-[#090909] border border-[#1F1F1F] rounded-[8px] overflow-hidden shadow-2xl">
              <div className="bg-[#111111] border-b border-[#222222] px-4 py-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
                <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
                <div className="ml-auto font-[family-name:var(--font-dm-mono)] text-[10px] text-[#555]">pyvax-cli</div>
              </div>
              <div className="p-6 font-[family-name:var(--font-dm-mono)] text-[13px] leading-[1.8] text-[#C0C0C0] space-y-4">
                <div><span className="text-[#E84142] mr-2">$</span>pyvax usage</div>
                <div className="pl-4">
                  <div className="text-[#F2F2F2] mb-1">AGENT EXECUTIONS:</div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[#4CAF50] font-bold">2,847</span> <span className="text-[#555]">/ 10,000</span> <span className="text-[#E84142]">(28%)</span>
                  </div>
                  {/* Progress bar visual */}
                  <div className="w-full h-2 bg-[#1A1A1A] rounded overflow-hidden">
                    <div className="h-full bg-[#E84142] w-[28%]"></div>
                  </div>
                </div>
                <div className="pl-4 mt-6">
                  <span className="text-[#555]">NEXT BILL:</span> <span className="text-[#F2F2F2]">May 1st</span> <span className="text-[#4CAF50]">✓</span>
                </div>
                <div className="pl-4">
                  <span className="text-[#555]">RESET RULES:</span> <span className="text-[#F2F2F2]">Monthly on 1st</span>
                </div>
                <div className="mt-4"><span className="text-[#E84142] mr-2">$</span><span className="animate-pulse bg-[#909090] w-2 h-4 inline-block align-middle"></span></div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 5. FAQ ACCORDION */}
      <section className="bg-[#0A0A0A] py-[80px] px-6">
        <div className="max-w-3xl mx-auto flex flex-col">
          <h2 className="font-[family-name:var(--font-syne)] text-[32px] font-bold text-[#F2F2F2] mb-12 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx
              return (
                <div
                  key={idx}
                  className={`bg-[#131313] border border-[#1F1F1F] rounded-[8px] overflow-hidden transition-all duration-300 ${isOpen ? 'border-l-4 border-l-[#E84142]' : 'border-l-4 border-l-transparent'}`}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-6 py-5 flex items-center text-left text-[#F2F2F2] hover:text-[#E84142] transition-colors font-[family-name:var(--font-dm-mono)] text-[14px]"
                  >
                    <span className="mr-3 text-[#555] font-bold text-lg w-4">{isOpen ? '▾' : '▸'}</span>
                    {item.q}
                  </button>
                  <div
                    className={`px-6 pb-5 pl-14 text-[#C0C0C0] font-[family-name:var(--font-ibm-plex)] text-[14px] leading-[1.6] transition-all duration-300 ${isOpen ? 'opacity-100 max-h-[200px]' : 'opacity-0 max-h-0 pb-0 overflow-hidden'}`}
                  >
                    {item.a}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 6. FINAL CTA */}
      <section className="bg-[#131313] pt-[100px] pb-[120px] px-6 border-t border-[#1F1F1F] text-center">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <div className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#E84142] mb-6 tracking-widest uppercase">
            READY TO BUILD AGENTS?
          </div>
          <h2 className="font-[family-name:var(--font-syne)] font-bold text-[36px] md:text-[56px] text-[#F2F2F2] mb-6">
            Pick a plan. Ship tomorrow.
          </h2>
          <p className="font-[family-name:var(--font-ibm-plex)] text-[18px] text-[#909090] mb-12">
            14-day trial on paid plans. No contracts. Cancel anytime.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto font-[family-name:var(--font-dm-mono)] text-[13px] font-bold">
            <button className="w-full sm:w-auto h-[48px] px-8 bg-[#4CAF50] hover:bg-[#45a049] text-[#0A0A0A] rounded-[8px] transform active:scale-95 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(76,175,80,0.3)]">
              Start Free
            </button>
            <button className="w-full sm:w-auto h-[48px] px-8 bg-[#E84142] hover:bg-[#FF5555] text-white rounded-[8px] transform active:scale-95 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(232,65,66,0.3)]">
              Start Builder Trial
            </button>
            <button className="w-full sm:w-auto h-[48px] px-8 bg-transparent border border-[#2A2A2A] hover:border-[#E84142] text-[#F2F2F2] hover:text-[#E84142] rounded-[8px] transform active:scale-95 transition-all">
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#080808]/60 border-t border-[#161616] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12 md:gap-8 border-b border-[#1A1A1A] pb-12 mb-8">
            <div className="space-y-4">
              <Link href="/" className="flex items-center gap-2 font-[family-name:var(--font-press-start)] text-[#FFFFFF] text-[16px]">
                PYVAX
              </Link>
              <p className="text-[#666] font-[family-name:var(--font-ibm-plex)] text-[14px] max-w-sm">
                Next generation smart contracts for builders and agents.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-16 font-[family-name:var(--font-dm-mono)] text-[13px]">
              <div className="flex flex-col gap-4">
                <span className="text-[#F2F2F2] font-semibold mb-2">Learn</span>
                <Link href="/docs" className="text-[#888] hover:text-[#E84142] transition">Documentation</Link>
                <Link href="/pricing" className="text-[#888] hover:text-[#E84142] transition">Pricing</Link>
              </div>
              <div className="flex flex-col gap-4">
                <span className="text-[#F2F2F2] font-semibold mb-2">Tools</span>
                <Link href="/playground" className="text-[#888] hover:text-[#E84142] transition">Playground</Link>
                <Link href="#" className="text-[#888] hover:text-[#E84142] transition">CLI Transpiler</Link>
              </div>
              <div className="flex flex-col gap-4">
                <span className="text-[#F2F2F2] font-semibold mb-2">Connect</span>
                <Link href="#" className="text-[#888] hover:text-[#E84142] transition">Discord</Link>
                <Link href="#" className="text-[#888] hover:text-[#E84142] transition">GitHub</Link>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[#555] font-[family-name:var(--font-dm-mono)] text-[11px]">
            <p>© 2026 PyVax Protocol. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="#" className="hover:text-[#F2F2F2] transition">Twitter / X</Link>
              <Link href="#" className="hover:text-[#F2F2F2] transition">GitHub</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
