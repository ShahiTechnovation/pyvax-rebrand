'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Section, SectionHeading, SectionSubheading } from '@/components/section'
import { Github, Twitter, MessageCircle, ArrowRight } from 'lucide-react'

export default function About() {
  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <Section className="relative overflow-hidden pt-20 md:pt-32">
        <div className="space-y-8 text-center">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold font-heading text-balance leading-tight">
              About{' '}
              <span className="bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
                PyVax
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 text-balance max-w-2xl leading-relaxed mx-auto">
              PyVax started as a hackathon project to solve a simple problem: Python developers deserved an easier path into Web3.
            </p>
          </div>
        </div>
      </Section>

      {/* Mission Section */}
      <Section className="border-t border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <SectionHeading>Our Mission</SectionHeading>
            <div className="space-y-4 text-gray-400">
              <p>
                We believe that blockchain technology shouldn't be gatekept by Solidity developers. Millions of Python developers have the skills to build amazing applications on-chain—they just need the right tools.
              </p>
              <p>
                PyVax removes the barrier to entry. By letting Python developers use familiar syntax and patterns, we're opening Web3 to an entirely new generation of builders.
              </p>
              <p>
                Our goal is simple: make it as easy to write a smart contract as it is to write any other Python program.
              </p>
            </div>
          </div>

          <div className="glass rounded-lg p-8 border border-white/10 space-y-4">
            <h3 className="font-semibold text-white">By the Numbers</h3>
            <div className="space-y-3">
              {[
                { stat: '10K+', desc: 'Users in beta' },
                { stat: '500K+', desc: 'Contracts compiled' },
                { stat: '2B+', desc: 'AVAX deployed' },
                { stat: '1000+', desc: 'Game contracts' },
              ].map((item) => (
                <div key={item.stat} className="flex justify-between items-center pb-3 border-b border-white/10">
                  <span className="text-gray-400">{item.desc}</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
                    {item.stat}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Timeline */}
      <Section className="border-t border-white/10">
        <div className="space-y-12">
          <div className="space-y-4">
            <SectionHeading className="text-center">Our Journey</SectionHeading>
            <SectionSubheading className="text-center mx-auto">
              From hackathon project to production platform
            </SectionSubheading>
          </div>

          <div className="space-y-6 max-w-3xl mx-auto">
            {[
              { date: 'Q4 2023', title: 'Hackathon Winner', desc: 'PyVax wins Avalanche Hackathon in Santa Clara' },
              { date: 'Q1 2024', title: 'Beta Launch', desc: 'Released CLI and Playground for beta testing' },
              { date: 'Q2 2024', title: '10K Users', desc: 'Reached 10,000 active developers on platform' },
              { date: 'Q3 2024', title: 'Mainnet Ready', desc: 'Full production support for Avalanche mainnet' },
              { date: 'Q4 2024', title: 'Game Tools', desc: 'Specialized contracts and docs for game developers' },
              { date: 'Q1 2025', title: 'AI Assistant', desc: 'AI-powered contract generation (coming soon)' },
            ].map((milestone, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="w-32 flex-shrink-0">
                  <div className="text-sm font-semibold text-blue-400">{milestone.date}</div>
                </div>
                <div className="flex-1 glass rounded-lg p-6 border border-white/10">
                  <h3 className="font-semibold text-white text-lg mb-2">{milestone.title}</h3>
                  <p className="text-gray-400 text-sm">{milestone.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Team Section */}
      <Section className="border-t border-white/10">
        <div className="space-y-12">
          <div className="space-y-4">
            <SectionHeading className="text-center">Built by Developers, for Developers</SectionHeading>
            <SectionSubheading className="text-center mx-auto">
              Meet the team behind PyVax
            </SectionSubheading>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Alex Chen', role: 'Founder & Core Dev', title: 'Former Polygon Dev' },
              { name: 'Sam Rodriguez', role: 'Lead Compiler', title: 'Ex-Rust Team Member' },
              { name: 'Maria Garcia', role: 'Documentation', title: 'Technical Writer' },
              { name: 'James Wilson', role: 'Community Lead', title: 'Developer Advocate' },
            ].map((member) => (
              <div key={member.name} className="glass rounded-lg p-6 border border-white/10 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-pink-500 mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-1">{member.name}</h3>
                <p className="text-sm text-gray-400 mb-1">{member.role}</p>
                <p className="text-xs text-gray-500">{member.title}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Values Section */}
      <Section className="border-t border-white/10">
        <div className="space-y-12">
          <SectionHeading className="text-center">Our Values</SectionHeading>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                title: 'Accessibility',
                desc: 'We believe Web3 should be accessible to all developers, not just Solidity experts.',
              },
              {
                title: 'Quality',
                desc: 'We ship tools that are production-ready, secure, and delightful to use.',
              },
              {
                title: 'Community',
                desc: 'We build with our users, not for them. Community feedback shapes our roadmap.',
              },
            ].map((value, i) => (
              <div key={i} className="glass rounded-lg p-6 border border-white/10 text-center">
                <h3 className="font-semibold text-lg text-white mb-2">{value.title}</h3>
                <p className="text-gray-400 text-sm">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Roadmap */}
      <Section className="border-t border-white/10">
        <div className="space-y-12">
          <div className="space-y-4">
            <SectionHeading className="text-center">Roadmap 2025</SectionHeading>
            <SectionSubheading className="text-center mx-auto">
              What's coming next for PyVax
            </SectionSubheading>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              { quarter: 'Q1 2025', items: ['AI Contract Generation', 'Team Workspaces', 'Advanced Debugging'] },
              { quarter: 'Q2 2025', items: ['Testnet Faucet Integration', 'Multi-Chain Support', 'Mobile IDE'] },
              { quarter: 'Q3 2025', items: ['Native Subnets', 'Custom Compilers', 'Plugin System'] },
              { quarter: 'Q4 2025', items: ['Web3 Security Audits', 'Enterprise Features', 'SDK v1.0'] },
            ].map((roadmap) => (
              <div key={roadmap.quarter} className="glass rounded-lg p-6 border border-blue-500/30 bg-blue-500/5">
                <h3 className="font-semibold text-blue-300 mb-4">{roadmap.quarter}</h3>
                <ul className="space-y-2">
                  {roadmap.items.map((item) => (
                    <li key={item} className="text-sm text-gray-300 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Contact Section */}
      <Section className="border-t border-white/10">
        <div className="space-y-12 text-center">
          <div className="space-y-4">
            <SectionHeading>Get in Touch</SectionHeading>
            <SectionSubheading className="mx-auto">
              Questions? Ideas? We'd love to hear from you.
            </SectionSubheading>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#twitter" className="inline-flex items-center gap-2 px-6 py-3 glass rounded-lg border border-white/10 hover:border-white/20 transition-colors">
              <Twitter className="w-5 h-5" />
              Twitter / X
            </a>
            <a href="#discord" className="inline-flex items-center gap-2 px-6 py-3 glass rounded-lg border border-white/10 hover:border-white/20 transition-colors">
              <MessageCircle className="w-5 h-5" />
              Discord
            </a>
            <a href="#github" className="inline-flex items-center gap-2 px-6 py-3 glass rounded-lg border border-white/10 hover:border-white/20 transition-colors">
              <Github className="w-5 h-5" />
              GitHub
            </a>
          </div>
        </div>
      </Section>

      {/* CTA Section */}
      <Section className="border-t border-white/10 text-center space-y-6">
        <SectionHeading>Join Us on This Journey</SectionHeading>
        <SectionSubheading className="mx-auto">
          Help us build the future of Web3 development.
        </SectionSubheading>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link href="/playground">
            <Button size="lg" className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white">
              Start Building
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/">
            <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/5">
              Back to Home
            </Button>
          </Link>
        </div>
      </Section>

      <Footer />
    </main>
  )
}
