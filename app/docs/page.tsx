import Link from 'next/link'
import { Lock, Sparkles, Zap } from 'lucide-react'

export default function DocsHomepage() {
  return (
    <div className="animate-in fade-in duration-500">
      {/* 1. HOME (/docs) HERO */}
      <div className="mb-16">
        <div className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#E84142] mb-6 tracking-widest uppercase">PYVAX DOCUMENTATION</div>
        <h1 className="font-[family-name:var(--font-press-start)] text-[28px] md:text-[38px] lg:text-[44px] text-[#E84142] leading-[1.3] mb-8">
          SMART CONTRACTS<br />FOR AGENTS
        </h1>
        <p className="font-[family-name:var(--font-ibm-plex)] text-[18px] md:text-[20px] text-[#C0C0C0] max-w-2xl leading-[1.6] mb-10">
          Build, deploy, and interact with Avalanche smart contracts in pure Python. Designed for the next wave of multi-agent economies, on-chain AI, and classified hackathon missions.
        </p>

        <div className="flex flex-wrap items-center gap-4 font-[family-name:var(--font-dm-mono)] text-[13px]">
          <Link href="/docs/quickstart" className="h-[48px] px-8 bg-[#E84142] hover:bg-[#FF5555] text-white flex items-center justify-center rounded-[8px] transform active:scale-95 transition-all font-bold">
            Quickstart →
          </Link>
          <Link href="/docs/api" className="h-[48px] px-8 bg-transparent border border-[#2A2A2A] hover:border-[#E84142] hover:bg-[#131313] text-[#F2F2F2] flex items-center justify-center rounded-[8px] transform active:scale-95 transition-all">
            API Reference
          </Link>
          <Link href="/docs/classified/overview" className="h-[48px] px-8 bg-transparent border border-[#FF1493]/30 hover:border-[#FF1493] hover:bg-[#FF1493]/5 text-[#FF1493] flex items-center justify-center rounded-[8px] transform active:scale-95 transition-all gap-2">
            <Lock className="w-3.5 h-3.5" /> Classified Docs
          </Link>
        </div>
      </div>

      {/* PROJECT CLASSIFIED BANNER */}
      <div className="mb-16 relative overflow-hidden rounded-[12px] border border-[#FF1493]/25 bg-gradient-to-br from-[#110a18] via-[#0f0515] to-[#0a0510] p-6 md:p-8">
        {/* Subtle glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,20,147,0.07)_0%,transparent_60%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-3.5 h-3.5 text-[#FF1493]" />
              <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#FF1493] tracking-[0.2em] uppercase font-bold">PROJECT CLASSIFIED · NOW LIVE</span>
            </div>
            <h2 className="font-[family-name:var(--font-syne)] text-[22px] font-bold text-[#F2F2F2] mb-2">
              The Synthesis Hackathon is Open
            </h2>
            <p className="font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#a09bb0] leading-[1.65] max-w-xl">
              Sign up for early access on the <Link href="/agent" className="text-[#FF1493] hover:underline">Agent page</Link> to receive your unique <strong className="text-[#FFD700]">access code</strong> by email. Enter it at <code className="font-[family-name:var(--font-dm-mono)] text-[12px] bg-[#1a0510] px-1.5 py-0.5 rounded border border-[#FF1493]/20 text-[#FF1493]">/classified</code> to unlock the full hackathon portal and compete for <strong className="text-[#FFD700]">$75,000 in prizes</strong>.
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Link href="/classified" className="h-[42px] px-6 bg-gradient-to-r from-[#FF1493] to-[#8B008B] hover:shadow-[0_0_20px_rgba(255,20,147,0.3)] text-white font-[family-name:var(--font-dm-mono)] text-[11px] font-bold flex items-center justify-center rounded-[8px] transition-all tracking-wider">
              ENTER VAULT →
            </Link>
            <Link href="/docs/classified/access-codes" className="h-[42px] px-6 border border-[#FF1493]/25 hover:border-[#FF1493]/50 text-[#FF1493] font-[family-name:var(--font-dm-mono)] text-[11px] flex items-center justify-center rounded-[8px] transition-all tracking-wider">
              How Access Codes Work
            </Link>
          </div>
        </div>
      </div>

      {/* WHAT'S NEW CARDS */}
      <div className="mb-16">
        <h2 className="font-[family-name:var(--font-syne)] text-[26px] md:text-[32px] font-bold text-[#F2F2F2] mb-8 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-[#E84142]" />
          What&apos;s New
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Classified Card */}
          <Link href="/docs/classified/overview" className="block bg-gradient-to-br from-[#110a18] to-[#0a0510] border border-[#FF1493]/20 rounded-[12px] p-6 hover:border-[#FF1493]/45 hover:bg-[#130a1a] transition-all group cursor-pointer">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-[#FF1493]" />
              <span className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#FF1493] tracking-[0.2em] uppercase font-bold bg-[#FF1493]/10 border border-[#FF1493]/20 px-2 py-0.5 rounded">NEW</span>
            </div>
            <h3 className="font-[family-name:var(--font-syne)] text-[17px] font-bold text-[#F2F2F2] mb-3">
              Project Classified
            </h3>
            <p className="font-[family-name:var(--font-ibm-plex)] text-[13px] text-[#888] leading-[1.6]">
              A gated hackathon portal with access codes, cyberpunk aesthetics, and a $75K prize pool. Built on top of PyVax autonomous agents.
            </p>
            <div className="mt-4 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#FF1493] group-hover:underline">Read docs →</div>
          </Link>

          {/* Early Access Card */}
          <Link href="/agent" className="block bg-[#131313] border border-[#1F1F1F] rounded-[12px] p-6 hover:bg-[#181818] hover:border-[#E84142]/30 transition-all group cursor-pointer">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[#E84142]" />
              <span className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#E84142] tracking-[0.2em] uppercase font-bold bg-[#E84142]/10 border border-[#E84142]/20 px-2 py-0.5 rounded">LIVE</span>
            </div>
            <h3 className="font-[family-name:var(--font-syne)] text-[17px] font-bold text-[#F2F2F2] mb-3">
              Early Access Program
            </h3>
            <p className="font-[family-name:var(--font-ibm-plex)] text-[13px] text-[#888] leading-[1.6]">
              Join the waitlist for PyVax Agent. 1,000 spots. Early access members receive a unique classified code for exclusive hackathon access.
            </p>
            <div className="mt-4 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#E84142] group-hover:underline">Join waitlist →</div>
          </Link>

          {/* Agent SDK Card */}
          <Link href="/docs/agents/wallets" className="block bg-[#131313] border border-[#1F1F1F] rounded-[12px] p-6 hover:bg-[#181818] hover:border-[#E84142]/30 transition-all group cursor-pointer">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-[#4CAF50]" />
              <span className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#4CAF50] tracking-[0.2em] uppercase font-bold bg-[#4CAF50]/10 border border-[#4CAF50]/20 px-2 py-0.5 rounded">EARLY ACCESS</span>
            </div>
            <h3 className="font-[family-name:var(--font-syne)] text-[17px] font-bold text-[#F2F2F2] mb-3">
              PyVax Agent SDK
            </h3>
            <p className="font-[family-name:var(--font-ibm-plex)] text-[13px] text-[#888] leading-[1.6]">
              An autonomous agent runtime in pure Python. Deploy, trade, sign, and remember — on Avalanche C-Chain. Zero Solidity. No compromises.
            </p>
            <div className="mt-4 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#4CAF50] group-hover:underline">Explore Agent SDK →</div>
          </Link>
        </div>
      </div>

      {/* QUICKSTART CARDS GRID */}
      <div className="mb-16">
        <h2 className="font-[family-name:var(--font-syne)] text-[26px] md:text-[32px] font-bold text-[#F2F2F2] mb-8">
          QUICKSTART
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <Link href="/docs/install" className="block bg-[#131313] border border-[#1F1F1F] rounded-[12px] p-6 hover:bg-[#181818] transition-colors group cursor-pointer">
            <h3 className="font-[family-name:var(--font-syne)] text-[20px] font-bold text-[#F2F2F2] mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#E84142]/10 text-[#E84142] flex items-center justify-center font-[family-name:var(--font-dm-mono)] text-[14px]">1</span>
              Install CLI
            </h3>
            <div className="bg-[#090909] border border-[#1F1F1F] rounded-[8px] p-4 font-[family-name:var(--font-dm-mono)] text-[12px] text-[#C0C0C0] space-y-2 mt-auto">
              <div><span className="text-[#E84142] mr-2">$</span>pipx install pyvax-cli</div>
              <div><span className="text-[#E84142] mr-2">$</span>pyvax --version</div>
              <div className="text-[#4CAF50]">1.0.0 ✓</div>
            </div>
          </Link>

          {/* Card 2 */}
          <Link href="/docs/first-contract" className="block bg-[#131313] border border-[#1F1F1F] rounded-[12px] p-6 hover:bg-[#181818] transition-colors group cursor-pointer">
            <h3 className="font-[family-name:var(--font-syne)] text-[20px] font-bold text-[#F2F2F2] mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#E84142]/10 text-[#E84142] flex items-center justify-center font-[family-name:var(--font-dm-mono)] text-[14px]">2</span>
              First Contract
            </h3>
            <div className="bg-[#090909] border border-[#1F1F1F] rounded-[8px] p-4 font-[family-name:var(--font-dm-mono)] text-[12px] text-[#C0C0C0] whitespace-pre overflow-x-auto">
              <span className="text-[#E84142]">class</span> <span className="text-[#8FAADC]">Vault</span><span className="text-[#F2F2F2]">(Contract):</span>
              <span className="text-[#8FAADC]">@action</span>
              <span className="text-[#E84142]">def</span> <span className="text-[#8FAADC]">deposit</span><span className="text-[#F2F2F2]">(self, amount):</span>
              <span className="text-[#E84142]">pass</span></div>
          </Link>

          {/* Card 3 */}
          <Link href="/docs/deployment" className="block bg-[#131313] border border-[#1F1F1F] rounded-[12px] p-6 hover:bg-[#181818] transition-colors group flex flex-col cursor-pointer">
            <h3 className="font-[family-name:var(--font-syne)] text-[20px] font-bold text-[#F2F2F2] mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#E84142]/10 text-[#E84142] flex items-center justify-center font-[family-name:var(--font-dm-mono)] text-[14px]">3</span>
              Deploy to Fuji
            </h3>
            <div className="bg-[#090909] border border-[#1F1F1F] rounded-[8px] p-4 font-[family-name:var(--font-dm-mono)] text-[12px] text-[#C0C0C0] space-y-2 mt-auto">
              <div><span className="text-[#E84142] mr-2">$</span>pyvax deploy vault.py \</div>
              <div className="pl-4">--network fuji</div>
              <div className="text-[#4CAF50] pt-2 mt-2 border-t border-[#1F1F1F]">✓ Deployed to:</div>
              <div className="text-[#F2F2F2] truncate">0x4a2f3e8b...c1d2</div>
            </div>
          </Link>
        </div>
      </div>

      {/* WHY PYVAX */}
      <div className="mt-4">
        <h2 className="font-[family-name:var(--font-syne)] text-[26px] font-bold text-[#E8E8E8] mb-6 border-b border-[#1F1F1F] pb-4">
          Why PyVax?
        </h2>
        <div className="font-[family-name:var(--font-ibm-plex)] text-[16px] text-[#C0C0C0] leading-[1.75] space-y-6">
          <p>
            PyVax bridges the dominant programming language of AI (Python) directly to the EVM execution environment on the Avalanche network. While Solidity remains the standard for DeFi deep-tech, the next era of applications will be driven by autonomous networks, AI agents, and procedurally generated game economies.
          </p>
          <div className="bg-[#131313] border-l-4 border-[#E84142] p-6 rounded-r-[8px]">
            <strong className="text-[#F2F2F2] block mb-2 font-[family-name:var(--font-syne)]">Agent Native</strong>
            Our custom <code className="font-[family-name:var(--font-dm-mono)] text-[13px] bg-[#090909] px-1.5 py-0.5 rounded border border-[#1F1F1F] text-[#E84142]">@agent_action</code> execution abstraction ensures you can dictate which functions humans sign compared strictly to actions taken programmatically by AI sub-wallets.
          </div>
          <div className="bg-[#110a18] border-l-4 border-[#FF1493] p-6 rounded-r-[8px]">
            <strong className="text-[#F2F2F2] block mb-2 font-[family-name:var(--font-syne)]">Project Classified</strong>
            Project Classified is PyVax's portal for competitive agent building. Currently, we are supporting developers entering the <strong className="text-[#FFD700]">Synthesis Hackathon</strong> — a live event where agents compete autonomously on-chain. Join the early access waitlist to receive your secret access code and enter the classified portal.{' '}
            <Link href="/docs/classified/overview" className="text-[#FF1493] hover:underline">Read the Classified docs →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
