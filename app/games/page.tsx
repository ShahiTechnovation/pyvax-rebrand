'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Section, SectionHeading, SectionSubheading } from '@/components/section'
import {
  Gamepad2,
  Coins,
  Users,
  Trophy,
  Shield,
  Zap,
  Grid3x3,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'

export default function Games() {
  const gamePatterns = [
    {
      icon: Gamepad2,
      title: 'In-Game Items & Inventories',
      desc: 'Create NFT-based items and player inventories on-chain. Players own their assets.',
      example: 'Weapons, armor, skins, collectibles',
    },
    {
      icon: Users,
      title: 'Player Progression',
      desc: 'Track XP, levels, achievements, and seasonal rankings on the blockchain.',
      example: 'Leaderboards, seasons, battle passes',
    },
    {
      icon: Coins,
      title: 'In-Game Currencies & Economies',
      desc: 'Create tradeable game tokens and marketplaces for player-to-player commerce.',
      example: 'Game tokens, marketplace fees, royalties',
    },
    {
      icon: Trophy,
      title: 'Tournaments & Rewards',
      desc: 'Run on-chain tournaments with automatic prize distribution and trustless mechanics.',
      example: 'Tournament brackets, prize pools, stakes',
    },
  ]

  const caseStudies = [
    {
      title: 'Web3 RPG with Player-Owned Items',
      description: 'Build an RPG where players truly own their gear and can trade them freely.',
      features: ['NFT Inventory', 'Trading System', 'Rarity Tiers', 'Dynamic Pricing'],
    },
    {
      title: 'Seasonal Multiplayer Arena',
      description: 'Create a PvP game with ranked seasons and leaderboard-based rewards.',
      features: ['ELO Rating', 'Seasonal Passes', 'Ranked Ladder', 'Reward Distribution'],
    },
    {
      title: 'Idle Game with Staking',
      description: 'Design an idle game where players stake tokens to earn passive rewards.',
      features: ['Staking Pools', 'Yield Farming', 'Governance', 'Compound Rewards'],
    },
    {
      title: 'Collaborative World-Building',
      description: 'Let players contribute to and own parts of the game world.',
      features: ['Land Ownership', 'Construction', 'Revenue Sharing', 'Governance'],
    },
  ]

  const integrationSteps = [
    {
      num: '1',
      title: 'Define Game Logic',
      desc: 'Write smart contracts for your game mechanics in Python',
    },
    {
      num: '2',
      title: 'Deploy Contracts',
      desc: 'Deploy to Avalanche C-Chain using the CLI or Playground',
    },
    {
      num: '3',
      title: 'Connect Game Client',
      desc: 'Integrate Web3 wallet connections and contract interactions',
    },
    {
      num: '4',
      title: 'Handle Off-Chain Data',
      desc: 'Use off-chain indexing for complex queries and game state',
    },
  ]

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <Section className="relative overflow-hidden pt-20 md:pt-32">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative space-y-8 text-center">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold font-heading text-balance leading-tight">
              Bring Your Game Logic{' '}
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                On-Chain
              </span>
              .
            </h1>
            <p className="text-lg md:text-xl text-gray-400 text-balance max-w-2xl leading-relaxed mx-auto">
              Build blockchain-native games with PyVax. Write game contracts in Python, deploy to Avalanche, and let your players truly own their assets.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/playground">
              <Button size="lg" className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white">
                Start Building
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/docs">
              <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/5">
                View Docs
              </Button>
            </Link>
          </div>
        </div>
      </Section>

      {/* Game Patterns */}
      <Section className="border-t border-white/10">
        <div className="space-y-12">
          <div className="space-y-4">
            <SectionHeading className="text-center">Build with Game-Ready Patterns</SectionHeading>
            <SectionSubheading className="text-center mx-auto">
              Pre-built contract patterns for common game mechanics
            </SectionSubheading>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gamePatterns.map((pattern, i) => {
              const Icon = pattern.icon
              return (
                <div key={i} className="glass rounded-lg p-8 border border-white/10 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all group">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg text-white mb-2">{pattern.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-3">{pattern.desc}</p>
                  <p className="text-xs text-gray-500">Example: {pattern.example}</p>
                </div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* Integration Architecture */}
      <Section className="border-t border-white/10">
        <div className="space-y-12">
          <div className="space-y-4">
            <SectionHeading className="text-center">Game Server Integration</SectionHeading>
            <SectionSubheading className="text-center mx-auto">
              Connect your game server to on-chain contracts
            </SectionSubheading>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              {integrationSteps.map((step) => (
                <div key={step.num} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">{step.num}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{step.title}</h3>
                    <p className="text-sm text-gray-400">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Architecture Diagram */}
            <div className="glass rounded-lg p-8 border border-white/10 space-y-6">
              <div className="space-y-4">
                <div className="glass rounded p-4 border border-white/10 text-center">
                  <div className="text-xs font-semibold text-gray-300 uppercase">Game Server</div>
                  <div className="text-sm text-gray-400 mt-1">REST API / WebSocket</div>
                </div>

                <div className="flex justify-center">
                  <div className="text-2xl text-blue-400">↓</div>
                </div>

                <div className="glass rounded p-4 border border-white/10 text-center">
                  <div className="text-xs font-semibold text-gray-300 uppercase">PyVax Client SDK</div>
                  <div className="text-sm text-gray-400 mt-1">Transaction Builder</div>
                </div>

                <div className="flex justify-center">
                  <div className="text-2xl text-blue-400">↓</div>
                </div>

                <div className="glass rounded p-4 border border-blue-500/50 bg-blue-500/5 text-center">
                  <div className="text-xs font-semibold text-blue-300 uppercase">Smart Contracts</div>
                  <div className="text-sm text-gray-400 mt-1">Avalanche C-Chain</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Case Studies */}
      <Section className="border-t border-white/10">
        <div className="space-y-12">
          <div className="space-y-4">
            <SectionHeading className="text-center">Game Examples</SectionHeading>
            <SectionSubheading className="text-center mx-auto">
              Inspiration for your next Web3 game
            </SectionSubheading>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {caseStudies.map((study, i) => (
              <div key={i} className="glass rounded-lg p-6 border border-white/10 hover:border-blue-500/30 transition-colors group">
                <h3 className="font-semibold text-lg text-white mb-2">{study.title}</h3>
                <p className="text-gray-400 text-sm mb-4">{study.description}</p>
                <div className="flex flex-wrap gap-2">
                  {study.features.map((feature) => (
                    <span
                      key={feature}
                      className="inline-block px-2 py-1 rounded text-xs bg-white/5 border border-white/10 text-gray-300"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Key Features for Games */}
      <Section className="border-t border-white/10">
        <div className="space-y-12">
          <SectionHeading className="text-center">Why Avalanche for Games</SectionHeading>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: 'Lightning Fast',
                desc: 'Sub-second block times for responsive gameplay',
              },
              {
                icon: Coins,
                title: 'Low Cost',
                desc: 'Pennies per transaction instead of dollars',
              },
              {
                icon: Shield,
                title: 'EVM Compatible',
                desc: 'Full Solidity tool ecosystem with Python simplicity',
              },
              {
                icon: TrendingUp,
                title: 'Scalable',
                desc: '4,500+ transactions per second capacity',
              },
              {
                icon: Grid3x3,
                title: 'Subnets Ready',
                desc: 'Launch private game chains when you scale',
              },
              {
                icon: Users,
                title: 'Game-Focused',
                desc: 'Optimized for player experience and retention',
              },
            ].map((feature, i) => {
              const Icon = feature.icon
              return (
                <div key={i} className="glass rounded-lg p-6 border border-white/10">
                  <Icon className="w-8 h-8 text-blue-400 mb-3" />
                  <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-400">{feature.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* CTA Section */}
      <Section className="border-t border-white/10 text-center space-y-6">
        <SectionHeading>Ready to Build Your Web3 Game?</SectionHeading>
        <SectionSubheading className="mx-auto">
          Start with PyVax. Write contracts in Python. Deploy to Avalanche.
        </SectionSubheading>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link href="/playground">
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white">
              Launch Playground
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/docs">
            <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/5">
              Read Game Development Guide
            </Button>
          </Link>
        </div>
      </Section>

      <Footer />
    </main>
  )
}
