'use client'

import { motion } from 'framer-motion'
import React from 'react'

const LOGO_SPONSORS = [
  { name: 'Base', url: 'https://raw.githubusercontent.com/base-org/brand-kit/main/logo/in-product/Base_Network_Logo.svg' },
  { name: 'Protocol Labs', url: 'https://protocol.ai/images/pl-logo.svg' },
  { name: 'MetaMask', url: 'https://metamask.io/images/metamask-logo.svg' },
  { name: 'Uniswap', url: 'https://cryptologos.cc/logos/uniswap-uni-logo.svg' },
  { name: 'Filecoin', url: 'https://filecoin.io/images/filecoin-logo.svg' },
  { name: 'ENS', url: 'https://ens.domains/favicon.ico' },
  { name: 'Lido', url: 'https://lido.fi/favicon-32x32.png' },
  { name: 'Celo', url: 'https://celo.org/favicon.ico' },
]

const TEXT_SPONSORS = [
  'EigenCloud', 'EigenLayer', 'OpenServ', 'Bankr',
  'Moonpay', 'Olas', 'Octant', 'Venice', 'Locus',
  'SuperRare', 'Virtuals', 'Status Network', 'Zyfai',
  'bond.credit', 'Self', 'Arkhai', 'Markee',
  'ampersend', 'Lit Protocol', 'College.xyz', 'Slice'
]

type SponsorItem = 
  | { type: 'logo'; name: string; url: string }
  | { type: 'text'; name: string };

const allItems: SponsorItem[] = [
  ...LOGO_SPONSORS.map(s => ({ type: 'logo' as const, ...s })),
  ...TEXT_SPONSORS.map(s => ({ type: 'text' as const, name: s }))
]

// Split into two rows
const row1 = allItems.slice(0, Math.ceil(allItems.length / 2))
const row2 = allItems.slice(Math.ceil(allItems.length / 2))

function SponsorNode({ item }: { item: SponsorItem }) {
  if (item.type === 'logo') {
    return (
      <div className="flex flex-col items-center justify-center gap-2 group cursor-pointer transition-transform duration-300 min-w-[100px] h-[50px]">
        <img
          src={item.url}
          alt={item.name}
          className="h-[28px] object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
        />
        <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#555] opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-[-10px]">
          {item.name}
        </span>
      </div>
    )
  }
  
  return (
    <div className="flex items-center justify-center min-w-[100px] h-[50px] cursor-pointer group">
      <div className="bg-[#10101a] border border-[#FF1493]/30 px-4 py-2 rounded-full group-hover:border-[#FF1493] transition-colors duration-300">
        <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-white">
          {item.name}
        </span>
      </div>
    </div>
  )
}

function MarqueeRow({ items, reverse = false }: { items: SponsorItem[], reverse?: boolean }) {
  const renderedItems = (
    <div className="flex items-center gap-12 whitespace-nowrap min-w-max pr-12">
      {items.map((item, i) => (
        <SponsorNode key={i} item={item} />
      ))}
    </div>
  )

  return (
    <div className="relative flex overflow-hidden w-full select-none group py-4">
      <div className={`flex min-w-max ${reverse ? 'animate-marquee-infinite-reverse' : 'animate-marquee-infinite'} group-hover:[animation-play-state:paused]`}>
        {renderedItems}
        {renderedItems}
      </div>
    </div>
  )
}

export function SponsorsMarquee() {
  return (
    <section className="py-16 border-y border-[#FF1493]/10 bg-[#0a0510] relative overflow-hidden">
      <div className="text-center mb-10">
        <h3 className="font-[family-name:var(--font-press-start)] text-[12px] sm:text-[14px] text-white tracking-[0.2em] drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
          SYNTHESIS PARTNERS
        </h3>
      </div>
      
      {/* Gradient fades for edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 md:w-64 bg-gradient-to-r from-[#0a0510] via-[#0a0510]/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 md:w-64 bg-gradient-to-l from-[#0a0510] via-[#0a0510]/80 to-transparent z-10 pointer-events-none" />

      <div className="flex flex-col gap-4">
        <MarqueeRow items={row1} />
        <MarqueeRow items={row2} reverse />
      </div>

      <style jsx global>{`
        @keyframes marquee-infinite {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-infinite-reverse {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee-infinite {
          animation: marquee-infinite 35s linear infinite;
        }
        .animate-marquee-infinite-reverse {
          animation: marquee-infinite-reverse 35s linear infinite;
        }
      `}</style>
    </section>
  )
}
