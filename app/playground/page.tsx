'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Playground() {
  const [activeTab, setActiveTab] = useState('output')

  return (
    <div className="flex flex-col h-screen w-full bg-[#0A0A0A] overflow-hidden text-[#909090] font-[family-name:var(--font-ibm-plex)] selection:bg-[#E84142] selection:text-white">
      {/* 1. HEADER BAR (sticky, 64px height, bg #0E0E0E, border-b #1F1F1F) */}
      <header className="h-[64px] shrink-0 bg-[#0E0E0E] border-b border-[#1F1F1F] px-6 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-[family-name:var(--font-press-start)] text-[18px] text-[#E84142] hover:text-[#FF5555] transition-colors">
            PYVAX
          </Link>

          <div className="hidden md:flex items-center gap-6 ml-4">
            {/* Network Selector */}
            <div className="flex items-center gap-2 group cursor-pointer relative">
              <span className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#909090] group-hover:text-[#E84142] transition-colors">
                AVALANCHE FUJI ▼
              </span>
            </div>

            {/* Wallet Status */}
            <div className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#4CAF50] flex items-center gap-1.5 cursor-pointer">
              <span className="animate-pulse">●</span> CONNECTED (0x4a2f...)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button className="text-[#555] hover:text-[#E84142] transition-colors w-6 h-6 flex items-center justify-center text-lg">
            ☀️
          </button>
          {/* Settings */}
          <button className="text-[#555] hover:text-[#E84142] transition-colors w-6 h-6 flex items-center justify-center text-lg">
            ⚙️
          </button>
        </div>
      </header>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* TOP MAIN ROW */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

          {/* 2. LEFT PANE: FILE EXPLORER (20%) */}
          <aside className="w-full lg:w-[20%] shrink-0 bg-[#0D0D0D] border-b lg:border-b-0 lg:border-r border-[#1F1F1F] p-5 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-[#E84142]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
              </svg>
              <span className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#F2F2F2] font-semibold tracking-wide">
                PROJECT: agent-vault
              </span>
            </div>

            <div className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#C0C0C0] space-y-1 ml-2">
              <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#181818] cursor-pointer transition-colors duration-150">
                <span className="text-[#555] w-3">▾</span> contracts/
              </div>
              <div className="flex items-center gap-2 py-1 px-2 ml-4 rounded bg-[#181818] font-bold text-[#F2F2F2] cursor-pointer">
                <span className="text-[#555] w-3 text-center">📄</span> vault.py <span className="text-[#4CAF50] ml-auto text-[8px]">●</span>
              </div>
              <div className="flex items-center gap-2 py-1 px-2 ml-4 rounded hover:bg-[#181818] cursor-pointer transition-colors duration-150">
                <span className="text-[#555] w-3 text-center">📄</span> token.py
              </div>
              <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#181818] cursor-pointer transition-colors duration-150">
                <span className="text-[#555] w-3">▾</span> agent/
              </div>
              <div className="flex items-center gap-2 py-1 px-2 ml-4 rounded hover:bg-[#181818] cursor-pointer transition-colors duration-150">
                <span className="text-[#555] w-3 text-center">📄</span> runtime.py
              </div>
              <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#181818] cursor-pointer transition-colors duration-150">
                <span className="text-[#555] w-3 text-center">📄</span> config.py
              </div>
            </div>
          </aside>

          {/* 3. CENTER PANE: PYTHON EDITOR (55%) */}
          <main className="w-full lg:w-[55%] flex flex-col min-w-0 bg-[#090909]">
            {/* TOP CONTROL BAR (48px height) */}
            <div className="h-[48px] shrink-0 flex items-center px-4 gap-2 border-b border-[#1F1F1F] bg-[#111111]">
              <button className="h-[32px] px-3 font-[family-name:var(--font-dm-mono)] text-[11px] font-medium rounded-[6px] bg-[#E84142] text-white flex items-center gap-2 transform active:scale-[0.98] transition-all">
                WRITE <span className="text-[8px]">●</span>
              </button>
              <button className="h-[32px] px-3 font-[family-name:var(--font-dm-mono)] text-[11px] font-medium rounded-[6px] bg-[#111111] border border-[#222222] text-[#909090] flex items-center gap-2 hover:bg-[#1A1A1A] hover:text-white transform active:scale-[0.98] transition-all">
                COMPILE <span className="text-[8px]">▶</span>
              </button>
              <button className="h-[32px] px-3 font-[family-name:var(--font-dm-mono)] text-[11px] font-medium rounded-[6px] bg-[#111111] border border-[#222222] text-[#909090] flex items-center gap-2 hover:bg-[#1A1A1A] hover:text-white transform active:scale-[0.98] transition-all">
                DEPLOY <span className="text-[8px]">▶</span>
              </button>
              <button className="h-[32px] px-3 font-[family-name:var(--font-dm-mono)] text-[11px] font-medium rounded-[6px] bg-[#111111] border border-[#222222] text-[#909090] flex items-center gap-2 hover:bg-[#1A1A1A] hover:text-white transform active:scale-[0.98] transition-all">
                TEST <span className="text-[8px]">▶</span>
              </button>
            </div>

            {/* EDITOR AREA */}
            <div className="flex-1 overflow-y-auto flex relative text-[13px] font-[family-name:var(--font-dm-mono)] leading-[1.6]">
              {/* Line Numbers Gutter */}
              <div className="w-[40px] shrink-0 bg-[#090909] text-[#444] text-right pr-3 py-4 select-none border-r border-[#151515]">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div key={i} className="relative">
                    {i + 1}
                    {i === 17 && <span className="absolute left-[-20px] top-[6px] w-2 h-2 rounded-full bg-[#E84142]"></span>}
                  </div>
                ))}
              </div>

              {/* Code Content */}
              <div className="flex-1 py-4 px-4 overflow-x-auto whitespace-pre pb-[100px]">
                <div><span className="text-[#E84142]">from</span> <span className="text-[#F2F2F2]">pyvax</span> <span className="text-[#E84142]">import</span> <span className="text-[#F2F2F2]">Contract, network</span></div>
                <br />
                <div><span className="text-[#E84142]">class</span> <span className="text-[#8FAADC]">AgentVault</span><span className="text-[#F2F2F2]">(Contract):</span></div>
                <div>    <span className="text-[#E84142]">def</span> <span className="text-[#8FAADC]">__init__</span><span className="text-[#F2F2F2]">(self):</span></div>
                <div>        <span className="text-[#F2F2F2]">self.network = network.AVALANCHE_FUJI</span></div>
                <div>        <span className="text-[#F2F2F2]">self.owner = </span><span className="text-[#E84142]">None</span></div>
                <br />
                <div>    <span className="text-[#8FAADC]">@agent_action</span></div>
                <div>    <span className="text-[#E84142]">def</span> <span className="text-[#8FAADC]">deposit</span><span className="text-[#F2F2F2]">(self, amount: </span><span className="text-[#8FAADC]">int</span><span className="text-[#F2F2F2]">):</span></div>
                <div>        <span className="text-[#7EC8A4]">"""Deposit tokens for agent operations"""</span></div>
                <div>        <span className="text-[#F2F2F2]">self.balance[msg.sender] += amount</span></div>
                <br />
                <div>    <span className="text-[#8FAADC]">@agent_action</span></div>
                <div>    <span className="text-[#E84142]">def</span> <span className="text-[#8FAADC]">execute_swap</span><span className="text-[#F2F2F2]">(self, token_in: </span><span className="text-[#8FAADC]">str</span><span className="text-[#F2F2F2]">, token_out: </span><span className="text-[#8FAADC]">str</span><span className="text-[#F2F2F2]">, amount: </span><span className="text-[#8FAADC]">int</span><span className="text-[#F2F2F2]">):</span></div>
                <div>        <span className="text-[#7EC8A4]">"""Execute DEX swap via agent wallet"""</span></div>
                <div>        <span className="text-[#444]"># Call Uniswap-like router onchain</span></div>
                <div>        <span className="text-[#E84142]">pass</span></div>
              </div>
              {/* Active line indicator overlay */}
              <div className="absolute top-[384px] left-[40px] right-0 h-[22px] bg-[#1A1A1A]/30 border-l-[3px] border-[#E84142] pointer-events-none"></div>
            </div>

            {/* STATUS BAR BOTTOM */}
            <div className="h-[24px] shrink-0 bg-[#0E0E0E] text-[#555] font-[family-name:var(--font-dm-mono)] text-[10px] flex items-center justify-between px-4 border-t border-[#1F1F1F]">
              <div className="flex gap-4">
                <span>Python 3.11</span>
                <span>Linting: pylint</span>
              </div>
              <div className="flex items-center gap-4">
                <span>Line 18:18</span>
              </div>
            </div>
          </main>

          {/* 4. RIGHT PANE: CONTRACT PREVIEW (25%) */}
          <aside className="w-full lg:w-[25%] shrink-0 bg-[#111111] border-t lg:border-t-0 lg:border-l border-[#1F1F1F] p-6 overflow-y-auto">
            <h3 className="font-[family-name:var(--font-syne)] font-bold text-[14px] text-[#F2F2F2] tracking-wider flex items-center justify-between mb-6 h-[20px]">
              <span className="flex items-center gap-2">COMPILED <span className="text-[#4CAF50] font-normal text-xs">✓ (2.3s ago)</span></span>
              <button className="text-[#E84142] font-[family-name:var(--font-dm-mono)] text-[10px] flex items-center gap-1 hover:text-[#FF5555]">
                [REFRESH 🔄]
              </button>
            </h3>

            {/* Contract Card */}
            <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-[12px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)] mb-6">
              <div className="grid grid-cols-2 gap-y-4 font-[family-name:var(--font-dm-mono)] text-[11px]">
                <div className="col-span-1">
                  <div className="text-[#555] mb-1">NAME</div>
                  <div className="text-[#F2F2F2]">AgentVault</div>
                </div>
                <div className="col-span-1 border-l border-[#1F1F1F] pl-4">
                  <div className="text-[#555] mb-1">SIZE</div>
                  <div className="text-[#F2F2F2]">2.1kb</div>
                </div>
                <div className="col-span-1 pt-2 border-t border-[#1F1F1F]">
                  <div className="text-[#555] mb-1">NETWORK</div>
                  <div className="text-[#F2F2F2] flex items-center gap-1">Fuji Testnet <span className="text-[#4CAF50] text-[8px]">●</span></div>
                </div>
                <div className="col-span-1 pt-2 border-t border-l border-[#1F1F1F] pl-4">
                  <div className="text-[#555] mb-1">ADDRESS</div>
                  <div className="text-[#F2F2F2]">0x4a2f3e...c1d2</div>
                </div>
                <div className="col-span-1 pt-2 border-t border-[#1F1F1F]">
                  <div className="text-[#555] mb-1">CREATOR</div>
                  <div className="text-[#F2F2F2] truncate pr-2">0xYourAgent...</div>
                </div>
                <div className="col-span-1 pt-2 border-t border-l border-[#1F1F1F] pl-4">
                  <div className="text-[#555] mb-1">CREATED</div>
                  <div className="text-[#F2F2F2]">2min ago</div>
                </div>
              </div>
            </div>

            {/* Deploy Form */}
            <div className="flex flex-col gap-3 mt-6">
              <div className="bg-[#131313] border border-[#2A2A2A] rounded-[8px] px-3 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex justify-between items-center cursor-pointer hover:border-[#E84142] transition-colors group">
                <span className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#909090] group-hover:text-[#F2F2F2]">▽ CONTRACT:</span>
                <span className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#F2F2F2] font-medium">AgentVault ▼</span>
              </div>

              <div className="space-y-3 font-[family-name:var(--font-dm-mono)] text-[11px] mt-4 px-1">
                <div className="text-[#555] mb-2 tracking-wide font-semibold">INPUTS:</div>
                <div className="grid grid-cols-2 items-center gap-2">
                  <span className="text-[#C0C0C0]">amount</span>
                  <span className="text-[#555]">(uint256)</span>
                </div>
                <div className="grid grid-cols-[1fr_1.2fr] items-center gap-2">
                  <span className="text-[#C0C0C0]">token_in</span>
                  <span className="text-[#555] truncate hover:text-[#E84142] cursor-text transition-colors">[0xUniswap...]</span>
                </div>
                <div className="grid grid-cols-[1fr_1.2fr] items-center gap-2">
                  <span className="text-[#C0C0C0]">token_out</span>
                  <span className="text-[#555] truncate hover:text-[#E84142] cursor-text transition-colors">[0xAVAX...]</span>
                </div>
              </div>

              <button className="w-full mt-6 h-[40px] bg-[#E84142] hover:bg-[#FF5555] text-white font-[family-name:var(--font-dm-mono)] text-[13px] font-medium rounded-[8px] shadow-lg transform active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                DEPLOY →
              </button>

              <div className="text-center font-[family-name:var(--font-dm-mono)] text-[11px] text-[#555] mt-2 flex items-center justify-center gap-1.5">
                EST GAS: 89,234 <span className="text-[#4CAF50]">●</span>
              </div>
            </div>
          </aside>
        </div>

        {/* 5. BOTTOM TERMINAL PANE (25% height) */}
        <div className="h-[25vh] min-h-[200px] shrink-0 bg-[#080808] border-t border-[#1C1C1C] flex flex-col relative z-20">
          {/* Tabs */}
          <div className="flex border-b border-[#1C1C1C] h-[40px] bg-[#0A0A0A]">
            <button
              onClick={() => setActiveTab('output')}
              className={`px-6 flex items-center font-[family-name:var(--font-dm-mono)] text-[11px] transition-colors border-b-2 ${activeTab === 'output' ? 'text-[#F2F2F2] border-[#E84142]' : 'text-[#555] border-transparent hover:text-[#909090]'}`}
            >
              OUTPUT {activeTab === 'output' && <span className="text-[#4CAF50] ml-2 text-[8px]">●</span>}
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-6 flex items-center font-[family-name:var(--font-dm-mono)] text-[11px] transition-colors border-b-2 ${activeTab === 'logs' ? 'text-[#F2F2F2] border-[#E84142]' : 'text-[#555] border-transparent hover:text-[#909090]'}`}
            >
              LOGS
            </button>
            <button
              onClick={() => setActiveTab('debug')}
              className={`px-6 flex items-center font-[family-name:var(--font-dm-mono)] text-[11px] transition-colors border-b-2 ${activeTab === 'debug' ? 'text-[#F2F2F2] border-[#E84142]' : 'text-[#555] border-transparent hover:text-[#909090]'}`}
            >
              DEBUG
            </button>
          </div>

          {/* Terminal Content */}
          <div className="flex-1 overflow-y-auto p-4 font-[family-name:var(--font-dm-mono)] text-[12px] leading-[1.8]">
            {activeTab === 'output' && (
              <>
                <div className="mb-1"><span className="text-[#555] mr-2">$</span><span className="text-[#E84142]">pyvax compile vault.py</span></div>
                <div className="text-[#4CAF50] flex items-center gap-2"><span>✓</span> Compiled to EVM bytecode (2.1kb)</div>
                <div className="text-[#4CAF50] flex items-center gap-2"><span>✓</span> ABI generated (18 functions)</div>
                <div className="text-[#4CAF50] flex items-center gap-2"><span>✓</span> Gas estimates complete</div>
                <div className="mt-3 mb-1"><span className="text-[#555] mr-2">$</span><span className="text-[#E84142]">deploy vault --network fuji</span></div>
                <div className="text-[#4CAF50] flex items-center gap-2"><span>✓</span> Transaction 0xabc123... submitted</div>
                <div className="text-[#4CAF50] flex items-center gap-2"><span>✓</span> Confirmed in block 1847291</div>
                <div className="text-[#4CAF50] flex items-center gap-2"><span>✓</span> Contract deployed: <span className="text-[#F2F2F2]">0x4a2f3e...c1d2</span></div>
                <div className="mt-3 flex items-center"><span className="text-[#555] mr-2">$</span><span className="animate-cursor-blink bg-[#909090] w-2 h-[14px] inline-block"></span></div>
              </>
            )}
            {activeTab === 'logs' && (
              <div className="text-[#555] italic">No active log streams. Run a transaction to see live logs.</div>
            )}
            {activeTab === 'debug' && (
              <div className="text-[#FFAA00]">⚠ Debugger attached. Awaiting breakpoints...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
