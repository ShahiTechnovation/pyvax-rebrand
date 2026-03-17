'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search } from 'lucide-react'
import { Navbar } from '@/components/navbar'

const NAV_MENU = [
    {
        category: "GETTING STARTED",
        items: [
            { name: "Quickstart", href: "/docs/quickstart" },
            { name: "Installation", href: "/docs/install" },
            { name: "Playground Tour", href: "/docs/playground" },
            { name: "First Contract", href: "/docs/first-contract" }
        ]
    },
    {
        category: "CORE REFERENCE",
        items: [
            { name: "CLI Commands", href: "/docs/cli" },
            { name: "Python API", href: "/docs/api" },
            { name: "Contract Syntax", href: "/docs/contracts" },
            { name: "Deployment Guide", href: "/docs/deployment" }
        ]
    },
    {
        category: "AGENT DEVELOPMENT",
        items: [
            { name: "Agent Wallets", href: "/docs/agents/wallets" },
            { name: "Onchain Execution", href: "/docs/agents/execution" },
            { name: "Agent Memory", href: "/docs/agents/memory" },
            { name: "Multi-Agent Systems", href: "/docs/agents/systems" }
        ]
    },
    {
        category: "GAMES & ASSETS",
        items: [
            { name: "ERC1155 Assets", href: "/docs/games/assets" },
            { name: "Loot Systems", href: "/docs/games/loot" },
            { name: "Leaderboards", href: "/docs/games/leaderboards" },
            { name: "Game Economies", href: "/docs/games/economies" }
        ]
    },
    {
        category: "ADVANCED",
        items: [
            { name: "Custom RPCs", href: "/docs/advanced/rpc" },
            { name: "Gas Optimization", href: "/docs/advanced/gas" },
            { name: "Testing Suite", href: "/docs/advanced/testing" },
            { name: "Debugging", href: "/docs/advanced/debugging" }
        ]
    },
    {
        category: "PROJECT CLASSIFIED",
        items: [
            { name: "Overview", href: "/docs/classified/overview" },
            { name: "Access Codes", href: "/docs/classified/access-codes" },
        ]
    }
]

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    return (
        <>
            <Navbar />
            <div className="min-h-screen grow flex flex-col md:flex-row bg-[#0A0A0A] text-[#F2F2F2] selection:bg-[#E84142] selection:text-white font-[family-name:var(--font-ibm-plex)] relative">

                {/* 2. SIDEBAR NAVIGATION (sticky left, 280px, bg #0D0D0D, border-r #1F1F1F) */}
                <aside className="hidden md:flex flex-col w-[280px] shrink-0 bg-[#0D0D0D] border-r border-[#1F1F1F] sticky top-16 h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <Link href="/" className="flex items-center gap-3">
                                <div className="font-[family-name:var(--font-press-start)] text-[12px] text-[#E84142]">PYVAX</div>
                                <div className="font-[family-name:var(--font-dm-mono)] text-[14px] text-[#F2F2F2] font-semibold tracking-wider">DOCS</div>
                            </Link>

                            <div className="group relative">
                                <button className="flex items-center gap-2 bg-[#131313] border border-[#1F1F1F] rounded-full px-3 py-1 font-[family-name:var(--font-dm-mono)] text-[10px] text-[#C0C0C0] hover:text-[#F2F2F2] hover:border-[#333] transition-colors">
                                    v1.0.0 <div className="w-1.5 h-1.5 rounded-full bg-[#E84142]"></div>
                                </button>
                                <div className="absolute top-full right-0 mt-2 w-32 bg-[#131313] border border-[#1F1F1F] rounded-[8px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-2xl overflow-hidden p-1">
                                    <div className="text-[#F2F2F2] text-[10px] font-[family-name:var(--font-dm-mono)] p-2 bg-[#1A1A1A] rounded">v1.0.0 (Latest)</div>
                                </div>
                            </div>
                        </div>

                        {/* Global search bar */}
                        <div className="relative mb-8 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] group-focus-within:text-[#E84142] transition-colors" />
                            <input
                                type="text"
                                placeholder="Search docs..."
                                className="w-full bg-[#131313] border border-[#1F1F1F] rounded-[8px] py-2 pl-9 pr-4 font-[family-name:var(--font-dm-mono)] text-[12px] text-[#F2F2F2] placeholder-[#555] focus:outline-none focus:border-[#E84142] transition-colors"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <kbd className="hidden lg:inline-flex bg-[#1F1F1F] border border-[#2A2A2A] rounded px-1.5 font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555]">Ctrl</kbd>
                                <kbd className="hidden lg:inline-flex bg-[#1F1F1F] border border-[#2A2A2A] rounded px-1.5 font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555]">K</kbd>
                            </div>
                        </div>

                        <nav className="flex flex-col gap-6">
                            {NAV_MENU.map((section, idx) => (
                                <div key={idx}>
                                    <div className="font-[family-name:var(--font-dm-mono)] text-[11px] font-bold text-[#E84142] mb-3 flex items-center gap-2">
                                        {section.category} {pathname.startsWith('/docs') && idx === 0 && <span className="animate-pulse">●</span>}
                                    </div>
                                    <div className="flex flex-col border-l border-[#1F1F1F] ml-[5px] pl-3 space-y-1 relative">
                                        {section.items.map((item, idj) => {
                                            const isActive = pathname === item.href
                                            return (
                                                <Link
                                                    key={idj}
                                                    href={item.href}
                                                    className={`relative font-[family-name:var(--font-dm-mono)] text-[13px] py-1.5 px-3 rounded-[6px] transition-colors duration-200 ${isActive
                                                        ? 'bg-[#181818] text-[#F2F2F2] font-semibold before:absolute before:left-[-14px] before:top-1/2 before:-translate-y-1/2 before:w-[2px] before:h-full before:bg-[#E84142]'
                                                        : 'text-[#909090] hover:bg-[#131313] hover:text-[#C0C0C0]'
                                                        }`}
                                                >
                                                    {item.name}
                                                </Link>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* Main Content Container */}
                <main className="flex-1 flex justify-center">
                    <div className="w-full max-w-5xl px-6 py-12 md:px-12 md:py-16 pb-32">
                        {children}
                    </div>
                </main>

                {/* Right Margin Nav Space (Desktop Only) */}
                <div className="hidden xl:block w-[240px] shrink-0 p-8 sticky top-16 h-[calc(100vh-64px)]">
                    <div className="font-[family-name:var(--font-dm-mono)] text-[11px] font-bold text-[#555] mb-4 tracking-wider">ON THIS PAGE</div>
                    {/* Placeholder TOC for all pages in this layout */}
                    <div className="space-y-3 font-[family-name:var(--font-ibm-plex)] text-[13px] text-[#909090] border-l border-[#1F1F1F] pl-4">
                        <a href="#top" className="block hover:text-[#E84142] transition-colors">Overview</a>
                        <a href="#install" className="block hover:text-[#E84142] transition-colors">Installation</a>
                        <a href="#first-contract" className="block hover:text-[#E84142] transition-colors">First Contract</a>
                        <a href="#deploy" className="block hover:text-[#E84142] transition-colors">Deployment</a>
                    </div>
                </div>
            </div>
        </>
    )
}
