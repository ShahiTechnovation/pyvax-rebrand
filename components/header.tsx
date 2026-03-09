'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

export function Header() {
  const [isOpen, setIsOpen] = useState(false)

  const navLinks = [
    { href: '#product', label: 'Product' },
    { href: '/playground', label: 'Playground' },
    { href: '/docs', label: 'Docs' },
    { href: '/pricing', label: 'Pricing' },
  ]

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/10">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">Λ</span>
            </div>
            <span className="hidden sm:inline text-xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
              PyVax
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side buttons */}
          <div className="flex items-center gap-3">
            <Link href="#signin" className="hidden sm:inline">
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                Sign in
              </Button>
            </Link>
            <Link href="/playground">
              <Button
                size="sm"
                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white glow-sm"
              >
                Launch Playground
              </Button>
            </Link>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 hover:bg-white/5 rounded-lg transition-colors"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? (
                <X className="w-5 h-5 text-gray-300" />
              ) : (
                <Menu className="w-5 h-5 text-gray-300" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2 border-t border-white/10 pt-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link href="#signin" className="block">
              <Button variant="ghost" size="sm" className="w-full justify-start text-gray-300 hover:text-white">
                Sign in
              </Button>
            </Link>
          </div>
        )}
      </nav>
    </header>
  )
}
