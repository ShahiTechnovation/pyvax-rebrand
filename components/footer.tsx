'use client'

import Link from 'next/link'
import { Github, Twitter, MessageCircle } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-background/50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">Λ</span>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
                PyVax
              </span>
            </div>
            <p className="text-sm text-gray-400">
              Ship Avalanche smart contracts in Python
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-white mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/playground" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Playground
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="#cli" className="text-sm text-gray-400 hover:text-white transition-colors">
                  CLI
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-white mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#blog" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#examples" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Examples
                </Link>
              </li>
              <li>
                <Link href="#roadmap" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Roadmap
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="font-semibold text-white mb-4">Community</h3>
            <ul className="space-y-3">
              <li>
                <a href="#twitter" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                  <Twitter className="w-4 h-4" />
                  Twitter / X
                </a>
              </li>
              <li>
                <a href="#github" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
              </li>
              <li>
                <a href="#discord" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  Discord
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-sm text-gray-500">
            © 2024 PyVax. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="#privacy" className="text-sm text-gray-500 hover:text-gray-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="#terms" className="text-sm text-gray-500 hover:text-gray-400 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
