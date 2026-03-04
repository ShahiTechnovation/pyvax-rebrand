'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Code2, Zap, Shield, Gamepad2, Github, ChevronRight, Play } from 'lucide-react'
import { ScrollImageSequence } from '@/components/ScrollImageSequence'

export default function Home() {
  return (
    <main className="relative min-h-screen bg-transparent text-foreground overflow-x-hidden">
      <ScrollImageSequence />

      {/* Navigation */}
      <nav className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl hover:text-primary transition">
            <Image src="/icon.svg" alt="PyVax Logo" width={32} height={32} className="rounded-sm" />
            <span>PyVax</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/docs" className="hover:text-primary transition text-sm">DOCS</Link>
            <Link href="/pricing" className="hover:text-primary transition text-sm">PRICING</Link>
            <Link href="#" className="hover:text-primary transition text-sm">GITHUB</Link>
            <Link href="#" className="hover:text-primary transition text-sm">DISCORD</Link>
          </div>

          <Link href="/playground" className="bg-primary text-primary-foreground hover:bg-primary/80 text-sm h-9 px-4 py-2 inline-flex items-center justify-center rounded-md font-medium transition-colors">
            LAUNCH
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-24 md:py-40">
          {/* Scanlines effect background */}
          <div className="absolute inset-0 pointer-events-none opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent 2px)',
              backgroundSize: '100% 4px'
            }} />
          </div>

          <div className="relative space-y-8 text-center">
            <div className="inline-block">
              <div className="border border-primary px-3 py-1 text-xs font-bold tracking-wider">
                Native Python on Avalanche
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight" style={{ fontFamily: 'var(--font-press-start)' }}>
              <span className="block text-primary">SMART CONTRACTS</span>
              <span className="block">FOR AGENTS</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Use one Python codebase to power web apps, backend services, AI agents, and on-chain games with verifiable execution on Avalanche C-Chain.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <Link href="/playground" className="bg-primary text-primary-foreground hover:bg-primary/80 px-8 py-6 text-base font-bold gap-2 inline-flex items-center justify-center rounded-md transition-colors">
                <Play className="w-4 h-4" />
                LAUNCH PLAYGROUND
              </Link>
              <Link href="/docs/install" className="border border-primary text-primary hover:bg-primary/10 px-8 py-6 text-base font-bold gap-2 inline-flex items-center justify-center rounded-md transition-colors">
                INSTALL CLI
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="pt-35 text-xs text-muted-foreground">
              BUILT FOR DEVELOPERS SHIPPING THE NEXT WAVE OF ON-CHAIN APPS, AGENTS, AND ECONOMIES ON AVALANCHE C-CHAIN
            </div>
          </div>
        </div>
      </section>

      {/* Section 1 - APPS */}
      <section className="bg-[#0A0A0A]/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-[55%_45%] gap-12 md:gap-8 items-center">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] uppercase tracking-[0.12em]">01</div>
                <div className="w-[32px] h-px bg-[#E84142] my-[12px]"></div>
                <h2 className="font-[family-name:var(--font-syne)] font-bold text-[42px] text-[#F2F2F2] leading-[1.1] mb-4">
                  Build Onchain Apps
                </h2>
                <p className="font-[family-name:var(--font-ibm-plex)] font-normal text-[15px] text-[#909090] leading-[1.75] max-w-[420px]">
                  From DeFi protocols to data markets — PyVax gives you a clean Python SDK with composable contract primitives. Ship production apps without touching Solidity.
                </p>
              </div>

              <div className="border-t border-[#1A1A1A] mt-8">
                {[
                  { title: 'Composable Primitives', desc: 'ERC-20, ERC-721, vault patterns' },
                  { title: 'One-Line Deployment', desc: 'Avalanche C-Chain or any subnet' },
                  { title: 'ABI Auto-Generation', desc: 'Python type-safe contract interfaces' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center h-[48px] border-b border-[#1A1A1A]">
                    <span className="text-[#E84142] mr-3 text-[12px] leading-none">◆</span>
                    <span className="font-[family-name:var(--font-ibm-plex)] font-medium text-[14px] text-[#C0C0C0]">
                      {item.title} <span className="text-[#555] font-normal ml-2 hidden sm:inline">— {item.desc}</span>
                    </span>
                  </div>
                ))}
              </div>

              <Link href="/docs" className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#E84142] hover:underline inline-block mt-2">
                Explore SDK docs →
              </Link>
            </div>

            {/* Right Column (Code Block) */}
            <div className="bg-[#090909] border border-[#1F1F1F] rounded-lg p-7">
              <div className="flex items-center mb-6">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E84142]"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#333]"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#333]"></div>
                </div>
                <div className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#555] ml-auto">deploy_app.py</div>
              </div>

              <div className="font-[family-name:var(--font-dm-mono)] text-[13px] leading-[1.6] overflow-x-auto whitespace-pre">
                <div><span className="text-[#E84142]">from</span> <span className="text-[#D0D0D0]">pyvax</span> <span className="text-[#E84142]">import</span> <span className="text-[#D0D0D0]">Contract, deploy, network</span></div>
                <br />
                <div className="text-[#444]"># Define your onchain app</div>
                <div><span className="text-[#D0D0D0]">app = Contract(</span><span className="text-[#7EC8A4]">"TokenVault"</span><span className="text-[#D0D0D0]">)</span></div>
                <div><span className="text-[#D0D0D0]">app.set_network(network.AVALANCHE_C)</span></div>
                <br />
                <div className="text-[#444]"># Add contract functions</div>
                <div><span className="text-[#D0D0D0]">app.</span><span className="text-[#8FAADC]">fn</span><span className="text-[#D0D0D0]">(</span><span className="text-[#7EC8A4]">"deposit"</span><span className="text-[#D0D0D0]">, [</span><span className="text-[#7EC8A4]">"uint256"</span><span className="text-[#D0D0D0]">])</span></div>
                <div><span className="text-[#D0D0D0]">app.</span><span className="text-[#8FAADC]">fn</span><span className="text-[#D0D0D0]">(</span><span className="text-[#7EC8A4]">"withdraw"</span><span className="text-[#D0D0D0]">, [</span><span className="text-[#7EC8A4]">"uint256"</span><span className="text-[#D0D0D0]">, </span><span className="text-[#7EC8A4]">"address"</span><span className="text-[#D0D0D0]">])</span></div>
                <br />
                <div className="text-[#444]"># Deploy in one line</div>
                <div><span className="text-[#D0D0D0]">receipt = </span><span className="text-[#8FAADC]">deploy</span><span className="text-[#D0D0D0]">(app)</span></div>
                <div><span className="text-[#8FAADC]">print</span><span className="text-[#D0D0D0]">(</span><span className="text-[#7EC8A4]">f"Live at: </span><span className="text-[#D0D0D0]">{"{"}receipt.address{"}"}</span><span className="text-[#7EC8A4]">"</span><span className="text-[#D0D0D0]">)</span></div>
              </div>

              <div className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888] mt-8 flex items-center gap-2 border-t border-[#1A1A1A] pt-4">
                <span className="text-[#4CAF50] text-[10px]">●</span>
                Deployed to Fuji Testnet <span className="text-[#444] px-1">·</span> 12ms
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 - AGENTS */}
      <section className="bg-[#0E0E0E]/60 border-t border-[#1A1A1A] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          {/* Title Block */}
          <div className="flex flex-col items-center text-center pb-12">
            <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] uppercase tracking-[0.12em]">02</div>
            <div className="w-[32px] h-px bg-[#E84142] my-[12px]"></div>
            <h2 className="font-[family-name:var(--font-syne)] font-bold text-[42px] text-[#F2F2F2] leading-[1.1] mb-5">
              Agents With Onchain Actions
            </h2>
            <p className="font-[family-name:var(--font-ibm-plex)] font-normal text-[15px] text-[#909090] leading-[1.75] max-w-[560px]">
              Give your AI agents a wallet, a contract interface, and the power to execute onchain logic autonomously — entirely in Python.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                title: 'Agent Wallet SDK',
                body: 'Programmatically generate wallets, manage keys, and sign transactions per agent instance — no external wallet required.',
                tag: 'WALLET',
                icon: (
                  <svg className="w-6 h-6 text-[#E84142] mb-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 6h16v2H4V6zm0 4h16v8H4v-8zm16-6h2v14a2 2 0 01-2 2H4a2 2 0 01-2-2V6c0-1.1.9-2 2-2h16zm-4 8h2v2h-2v-2z" />
                  </svg>
                )
              },
              {
                title: 'Contract Execution',
                body: 'Call any deployed contract from agent code. PyVax handles gas estimation, retry logic, and error surfacing so your agent stays unblocked.',
                tag: 'EXECUTOR',
                icon: (
                  <svg className="w-6 h-6 text-[#E84142] mb-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
                  </svg>
                )
              },
              {
                title: 'Onchain Memory',
                body: 'Write agent state directly to chain. Persistent, verifiable, and composable across multi-agent networks and sessions.',
                tag: 'MEMORY',
                icon: (
                  <svg className="w-6 h-6 text-[#E84142] mb-4" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="2" y="4" width="20" height="16" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path d="M2 10h20M2 16h20M8 4v16M16 4v16" stroke="currentColor" strokeWidth="2" />
                  </svg>
                )
              }
            ].map((card, i) => (
              <div key={i} className="bg-[#131313] border border-[#1F1F1F] rounded-lg p-[28px_24px] transition-all duration-200 ease-out hover:border-[rgba(232,65,66,0.28)] hover:bg-[#181818] hover:shadow-[0_0_28px_rgba(232,65,66,0.07)]">
                {card.icon}
                <h3 className="font-[family-name:var(--font-syne)] font-semibold text-[18px] text-[#F0F0F0] mb-2">{card.title}</h3>
                <p className="font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#909090] leading-relaxed mb-6 h-[84px]">{card.body}</p>
                <span className="font-[family-name:var(--font-dm-mono)] text-[10px] tracking-wide bg-[rgba(232,65,66,0.10)] border border-[rgba(232,65,66,0.25)] text-[#E84142] px-2 py-1 rounded">
                  {card.tag}
                </span>
              </div>
            ))}
          </div>

          {/* Terminal Block */}
          <div className="bg-[#080808] border border-[#1C1C1C] rounded-lg p-[24px_28px] mt-[40px] overflow-hidden">
            <div className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#E84142] mb-6 flex items-center gap-2">
              <span className="animate-cursor-blink">●</span> AGENT RUNTIME — LIVE
            </div>
            <div className="font-[family-name:var(--font-dm-mono)] text-[13px] leading-[2] whitespace-nowrap md:whitespace-pre overflow-x-auto pb-2">
              <div className="animate-type-in"><span className="text-[#6B8CAE]">[0x4a2f..c1]</span>  <span className="text-[#333]">→</span>  <span className="text-[#888]">calling </span> <span className="text-[#E84142]">swap()        </span> <span className="text-[#888]">on 0xDeFi3a..</span>   <span className="text-[#4CAF50]">✓</span>  <span className="text-[#555]">9ms</span></div>
              <div className="animate-type-in delay-100"><span className="text-[#6B8CAE]">[0x4a2f..c1]</span>  <span className="text-[#333]">→</span>  <span className="text-[#888]">writing </span> <span className="text-[#E84142]">agent_state   </span> <span className="text-[#888]">to 0xMem9f.. </span>   <span className="text-[#4CAF50]">✓</span>  <span className="text-[#555]">11ms</span></div>
              <div className="animate-type-in delay-200"><span className="text-[#6B8CAE]">[0x9c1e..88]</span>  <span className="text-[#333]">→</span>  <span className="text-[#888]">spawning sub-agent     0xAgent77..</span>     <span className="text-[#4CAF50]">✓</span>  <span className="text-[#555]">deployed</span></div>
              <div className="animate-type-in delay-300"><span className="text-[#6B8CAE]">[0xBB02..41]</span>  <span className="text-[#333]">→</span>  <span className="text-[#888]">calling </span> <span className="text-[#E84142]">price_oracle()</span> <span className="text-[#888]">on 0xOracle1..</span>  <span className="text-[#4CAF50]">✓</span>  <span className="text-[#555]">6ms</span></div>
              <div className="animate-type-in delay-400"><span className="text-[#6B8CAE]">[0x4a2f..c1]</span>  <span className="text-[#333]">→</span>  <span className="text-[#888]">executing</span> <span className="text-[#E84142]">rebalance()  </span> <span className="text-[#888]">on 0xVault2.. </span>  <span className="text-[#4CAF50]">✓</span>  <span className="text-[#555]">14ms</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 - GAMES */}
      <section className="bg-[#0A0A0A]/60 border-t border-[#1A1A1A] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-8 items-center">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] uppercase tracking-[0.12em]">03</div>
                <div className="w-[32px] h-px bg-[#E84142] my-[12px]"></div>
                <h2 className="font-[family-name:var(--font-syne)] font-bold text-[42px] text-[#F2F2F2] leading-[1.1] mb-4 pr-12">
                  Onchain Game Infrastructure
                </h2>
                <p className="font-[family-name:var(--font-ibm-plex)] font-normal text-[15px] text-[#909090] leading-[1.75] max-w-[420px]">
                  True asset ownership, verifiable loot drops, and deterministic game logic — all enforced by Avalanche, all scripted in Python.
                </p>
              </div>

              <div className="border-t border-[#1A1A1A] mt-8">
                {[
                  { title: 'Asset Ownership', sub: 'ERC-1155 multi-token items. Mint, burn, equip — all onchain.' },
                  { title: 'Verifiable Randomness', sub: 'Chainlink VRF integration. Loot drops that are provably fair.' },
                  { title: 'Leaderboards', sub: 'Write scores onchain. Immutable, public, cheat-proof.' }
                ].map((row, i) => (
                  <div key={i} className="flex flex-col justify-center h-[64px] border-b border-[#1A1A1A]">
                    <div className="flex items-center gap-3">
                      <span className="text-[#E84142] font-[family-name:var(--font-dm-mono)] text-[14px]">→</span>
                      <span className="font-[family-name:var(--font-ibm-plex)] font-semibold text-[15px] text-[#E8E8E8]">{row.title}</span>
                      <span className="font-[family-name:var(--font-ibm-plex)] font-normal text-[13px] text-[#666] hidden sm:block truncate ml-2">— {row.sub}</span>
                    </div>
                    {/* Mobile sub text block since overflow isn't ideal */}
                    <div className="font-[family-name:var(--font-ibm-plex)] font-normal text-[13px] text-[#666] sm:hidden pl-7 truncate pr-2 mt-0.5">{row.sub}</div>
                  </div>
                ))}
              </div>

              <Link href="/docs/games/assets" className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#E84142] hover:underline flex items-center mt-6">
                View game SDK examples →
              </Link>
            </div>

            {/* Right Column - NFT Inventory */}
            <div className="bg-[#0D0D0D] border border-[#1F1F1F] rounded-lg p-6 max-w-md ml-auto w-full">
              <div className="flex justify-between font-[family-name:var(--font-dm-mono)] text-[10px] mb-4">
                <span className="text-[#555]">INVENTORY</span>
                <span className="text-[#555]">12 / 64 ITEMS</span>
              </div>

              <div className="grid grid-cols-4 gap-2 justify-items-center sm:justify-items-stretch">
                {/* 3 Legendary */}
                {['⚔️', '🛡️', '👑'].map((icon, i) => (
                  <div key={`leg-${i}`} className="w-full aspect-square max-w-[72px] bg-[rgba(232,65,66,0.15)] border border-[rgba(232,65,66,0.4)] rounded flex items-center justify-center animate-legendary-pulse text-2xl">
                    {icon}
                  </div>
                ))}

                {/* 4 Rare */}
                {['🏹', '⚡', '🗝️', '💎'].map((icon, i) => (
                  <div key={`rare-${i}`} className="w-full aspect-square max-w-[72px] bg-[rgba(255,165,0,0.08)] border border-[rgba(255,165,0,0.25)] rounded flex items-center justify-center text-2xl">
                    {icon}
                  </div>
                ))}

                {/* 9 Common */}
                {['🌿', '🧪', '🦴', '🪙', '📜', '🎣', '🪵', '🍏', '🧵'].map((icon, i) => (
                  <div key={`com-${i}`} className="w-full aspect-square max-w-[72px] bg-[#111] border border-[#1A1A1A] rounded flex items-center justify-center text-2xl">
                    <span className="opacity-50 grayscale">{icon}</span>
                  </div>
                ))}
              </div>

              <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#444] mt-6 flex justify-between px-2">
                <span className="text-[#E84142]">◆ LEGENDARY</span>
                <span className="text-orange-500">◈ RARE</span>
                <span className="">· COMMON</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CLOSING CTA BAND */}
      <section className="bg-[#0E0E0E]/60 border-t border-[#1E1E1E] py-[80px] px-6 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
          <div className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E84142] mb-6 tracking-wide">THE AGENT ERA IS NOW</div>
          <h2 className="font-[family-name:var(--font-press-start)] text-[20px] md:text-[28px] text-[#FFFFFF] mb-6 leading-relaxed">START BUILDING</h2>
          <p className="font-[family-name:var(--font-ibm-plex)] text-[15px] text-[#909090] mb-10 max-w-[420px]">
            "PyVax is open-source. Deploy your first smart contract in under 5 minutes."
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mt-4">
            <Link href="/playground" className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/80 px-8 py-6 text-base font-bold gap-2 rounded-sm border border-transparent inline-flex items-center justify-center transition-colors">
              <Play className="w-4 h-4" fill="currentColor" />
              LAUNCH PLAYGROUND
            </Link>
            <Link href="#" className="w-full sm:w-auto border-[#2A2A2A] text-foreground hover:bg-[#111] hover:text-[#E84142] hover:border-[#1E1E1E] px-8 py-6 text-base font-bold gap-2 rounded-sm border inline-flex items-center justify-center transition-colors">
              <span className="text-lg leading-none">★</span>
              Star on GitHub
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#080808]/60 border-t border-[#161616] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12 md:gap-8 border-b border-[#1A1A1A] pb-12 mb-8">
            <div className="space-y-4">
              <div className="font-[family-name:var(--font-dm-mono)] text-[#E84142] text-xl font-bold flex items-center gap-2">
                <Image src="/icon.svg" alt="PyVax Logo" width={24} height={24} className="rounded-sm" />
                PyVax
              </div>
              <p className="font-[family-name:var(--font-ibm-plex)] text-[13px] text-[#555] max-w-[200px]">
                Smart contracts for the agent era.
              </p>
            </div>

            <div className="flex flex-wrap md:flex-nowrap gap-12 md:gap-24 font-[family-name:var(--font-ibm-plex)] text-[14px]">
              <div className="flex flex-col gap-3">
                <span className="text-[#333] font-[family-name:var(--font-dm-mono)] text-[10px] mb-2">LEARN</span>
                <Link href="/docs" className="text-[#555] hover:text-[#E84142] transition-colors">Docs</Link>
                <Link href="/pricing" className="text-[#555] hover:text-[#E84142] transition-colors">Pricing</Link>
                <Link href="/docs" className="text-[#555] hover:text-[#E84142] transition-colors">Tutorials</Link>
                <Link href="#" className="text-[#555] hover:text-[#E84142] transition-colors">Blog</Link>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-[#333] font-[family-name:var(--font-dm-mono)] text-[10px] mb-2">TOOLS</span>
                <Link href="/docs" className="text-[#555] hover:text-[#E84142] transition-colors">SDK</Link>
                <Link href="/playground" className="text-[#555] hover:text-[#E84142] transition-colors">Playground</Link>
                <Link href="/docs/cli" className="text-[#555] hover:text-[#E84142] transition-colors">CLI</Link>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-[#333] font-[family-name:var(--font-dm-mono)] text-[10px] mb-2">CONNECT</span>
                <Link href="#" className="text-[#555] hover:text-[#E84142] transition-colors">Community</Link>
                <Link href="#" className="text-[#555] hover:text-[#E84142] transition-colors">Twitter</Link>
                <Link href="#" className="text-[#555] hover:text-[#E84142] transition-colors">Discord</Link>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[#444]">
              <Link href="#" className="hover:text-[#E84142] transition-colors">
                <Github className="w-5 h-5" />
              </Link>
              <Link href="#" className="hover:text-[#E84142] transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </Link>
            </div>
          </div>

          <div className="text-center">
            <p className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#333]">
              © 2025 PyVax. Built on Avalanche.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
