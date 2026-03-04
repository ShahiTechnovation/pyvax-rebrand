import Link from 'next/link'

export default function DocsHomepage() {
  return (
    <div className="animate-in fade-in duration-500">
      {/* 1. HOME (/docs) HERO */}
      <div className="mb-20">
        <div className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#E84142] mb-6 tracking-widest uppercase">PYVAX DOCUMENTATION</div>
        <h1 className="font-[family-name:var(--font-press-start)] text-[32px] md:text-[42px] lg:text-[48px] text-[#E84142] leading-[1.3] mb-8">
          SMART CONTRACTS<br />FOR AGENTS
        </h1>
        <p className="font-[family-name:var(--font-ibm-plex)] text-[18px] md:text-[20px] text-[#C0C0C0] max-w-2xl leading-[1.6] mb-10">
          Build, deploy, and interact with Avalanche smart contracts in pure Python. Designed exclusively for the next wave of multi-agent economies and on-chain games.
        </p>

        <div className="flex flex-wrap items-center gap-4 font-[family-name:var(--font-dm-mono)] text-[13px]">
          <Link href="/docs/install" className="h-[48px] px-8 bg-[#E84142] hover:bg-[#FF5555] text-white flex items-center justify-center rounded-[8px] transform active:scale-95 transition-all font-bold">
            Quickstart →
          </Link>
          <Link href="/docs/api" className="h-[48px] px-8 bg-transparent border border-[#2A2A2A] hover:border-[#E84142] hover:bg-[#131313] text-[#F2F2F2] flex items-center justify-center rounded-[8px] transform active:scale-95 transition-all">
            API Reference
          </Link>
        </div>
      </div>

      {/* QUICKSTART CARDS GRID */}
      <div>
        <h2 className="font-[family-name:var(--font-syne)] text-[32px] md:text-[42px] font-bold text-[#F2F2F2] mb-8">
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
              <div><span className="text-[#E84142] mr-2">$</span>npm install -g @pyvax/cli</div>
              <div><span className="text-[#E84142] mr-2">$</span>pyvax --version</div>
              <div className="text-[#4CAF50]">0.1.2 ✓</div>
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

      <div className="mt-20">
        <h2 className="font-[family-name:var(--font-syne)] text-[32px] font-bold text-[#E8E8E8] mb-6 border-b border-[#1F1F1F] pb-4">
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
        </div>
      </div>
    </div>
  )
}
