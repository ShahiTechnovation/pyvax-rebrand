'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
    { href: '/', label: 'HOME' },
    { href: '/docs', label: 'DOCS' },
    { href: '/pricing', label: 'PRICING' },
    { href: '/agent', label: 'AGENT', badge: 'NEW' },
    { href: '/careers', label: 'CAREERS', badge: 'HOT' },
]

export function Navbar() {
    const pathname = usePathname()
    const [mobileOpen, setMobileOpen] = useState(false)

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/'
        return pathname.startsWith(href)
    }

    return (
        <nav className="border-b border-[#1F1F1F] bg-[#0A0A0A]/95 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 font-bold text-xl hover:text-[#E84142] transition">
                    <Image src="/icon.svg" alt="PyVax Logo" width={32} height={32} className="rounded-sm" />
                    <span className="text-[#F2F2F2]">PyVax</span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-8 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#909090]">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`transition flex items-center gap-1.5 ${isActive(link.href)
                                ? 'text-[#F2F2F2]'
                                : 'hover:text-[#E84142]'
                                }`}
                        >
                            {link.label}
                            {link.badge && (
                                <span className="bg-[#E84142] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse leading-none">
                                    {link.badge}
                                </span>
                            )}
                        </Link>
                    ))}
                </div>

                {/* Right side */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/playground"
                        className="hidden md:flex h-[36px] items-center px-4 bg-[#E84142] text-white font-[family-name:var(--font-dm-mono)] text-[11px] font-bold rounded hover:bg-[#FF5555] transition"
                    >
                        LAUNCH PLAYGROUND
                    </Link>

                    {/* Mobile menu button */}
                    <button
                        className="md:hidden p-2 hover:bg-white/5 rounded-lg transition-colors"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        {mobileOpen ? (
                            <X className="w-5 h-5 text-[#909090]" />
                        ) : (
                            <Menu className="w-5 h-5 text-[#909090]" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation */}
            {mobileOpen && (
                <div className="md:hidden pb-4 space-y-1 border-t border-[#1F1F1F] pt-4 px-4 bg-[#0A0A0A]">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`block px-4 py-2.5 font-[family-name:var(--font-dm-mono)] text-[12px] rounded-lg transition-colors ${isActive(link.href)
                                ? 'text-[#F2F2F2] bg-[#1A1A1A]'
                                : 'text-[#909090] hover:text-[#E84142] hover:bg-[#111]'
                                }`}
                            onClick={() => setMobileOpen(false)}
                        >
                            <span className="flex items-center gap-2">
                                {link.label}
                                {link.badge && (
                                    <span className="bg-[#E84142] text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                        {link.badge}
                                    </span>
                                )}
                            </span>
                        </Link>
                    ))}
                    <Link
                        href="/playground"
                        className="block px-4 py-2.5 mt-2 bg-[#E84142] text-white font-[family-name:var(--font-dm-mono)] text-[12px] font-bold rounded-lg text-center hover:bg-[#FF5555] transition"
                        onClick={() => setMobileOpen(false)}
                    >
                        LAUNCH PLAYGROUND
                    </Link>
                </div>
            )}
        </nav>
    )
}
