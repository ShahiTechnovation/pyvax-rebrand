import fs from 'fs'
import path from 'path'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { MDXComponents } from '@/components/mdx-components'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Github } from 'lucide-react'

// Ordered flat list of all doc pages for Prev/Next navigation
const PAGE_ORDER = [
    { slug: 'quickstart', title: 'Quickstart' },
    { slug: 'install', title: 'Installation' },
    { slug: 'playground', title: 'Playground Tour' },
    { slug: 'first-contract', title: 'First Contract' },
    { slug: 'cli', title: 'CLI Commands' },
    { slug: 'api', title: 'Python API' },
    { slug: 'contracts', title: 'Contract Syntax' },
    { slug: 'deployment', title: 'Deployment Guide' },
    { slug: 'agents/wallets', title: 'Agent Wallets' },
    { slug: 'agents/execution', title: 'Onchain Execution' },
    { slug: 'agents/memory', title: 'Agent Memory' },
    { slug: 'agents/systems', title: 'Multi-Agent Systems' },
    { slug: 'games/assets', title: 'ERC1155 Assets' },
    { slug: 'games/loot', title: 'Loot Systems' },
    { slug: 'games/leaderboards', title: 'Leaderboards' },
    { slug: 'games/economies', title: 'Game Economies' },
    { slug: 'advanced/rpc', title: 'Custom RPCs' },
    { slug: 'advanced/gas', title: 'Gas Optimization' },
    { slug: 'advanced/testing', title: 'Testing Suite' },
    { slug: 'advanced/debugging', title: 'Debugging' },
]

export async function generateStaticParams() {
    return PAGE_ORDER.map(({ slug }) => ({ slug: slug.split('/') }))
}

export default async function DocPage({ params }: { params: Promise<{ slug: string[] }> }) {
    const { slug } = await params
    const slugPath = slug.join('/')
    const contentDir = path.join(process.cwd(), 'content', 'docs')
    const filePath = path.join(contentDir, `${slugPath}.mdx`)

    if (!fs.existsSync(filePath)) {
        notFound()
    }

    const fileContent = fs.readFileSync(filePath, 'utf8')

    const currentIndex = PAGE_ORDER.findIndex(p => p.slug === slugPath)
    const prevPage = currentIndex > 0 ? PAGE_ORDER[currentIndex - 1] : null
    const nextPage = currentIndex < PAGE_ORDER.length - 1 ? PAGE_ORDER[currentIndex + 1] : null

    return (
        <div className="animate-in fade-in duration-500">
            {/* GitHub edit link top-right */}
            <div className="flex justify-end mb-6">
                <a
                    href={`https://github.com/ShahiTechnovation/pyvax-rebrand/edit/main/content/docs/${slugPath}.mdx`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#555] hover:text-[#909090] transition-colors"
                >
                    <Github className="w-3.5 h-3.5" />
                    Edit on GitHub
                </a>
            </div>

            {/* MDX Content */}
            <div className="max-w-4xl font-[family-name:var(--font-ibm-plex)]">
                <MDXRemote
                    source={fileContent}
                    components={MDXComponents}
                />
            </div>

            {/* Prev / Next Navigation */}
            <div className="mt-20 pt-8 border-t border-[#1F1F1F] grid grid-cols-1 sm:grid-cols-2 gap-4">
                {prevPage ? (
                    <Link
                        href={`/docs/${prevPage.slug}`}
                        className="group flex flex-col p-5 bg-[#0E0E0E] border border-[#1F1F1F] rounded-[10px] hover:border-[#E84142]/50 hover:bg-[#131313] transition-all"
                    >
                        <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#555] uppercase tracking-wider mb-2 flex items-center gap-1">
                            <ChevronLeft className="w-3 h-3" /> Previous
                        </span>
                        <span className="font-[family-name:var(--font-syne)] font-semibold text-[16px] text-[#F2F2F2] group-hover:text-[#E84142] transition-colors">
                            {prevPage.title}
                        </span>
                    </Link>
                ) : <div />}

                {nextPage ? (
                    <Link
                        href={`/docs/${nextPage.slug}`}
                        className="group flex flex-col p-5 bg-[#0E0E0E] border border-[#1F1F1F] rounded-[10px] hover:border-[#E84142]/50 hover:bg-[#131313] transition-all text-right sm:items-end"
                    >
                        <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#555] uppercase tracking-wider mb-2 flex items-center gap-1 justify-end">
                            Next <ChevronRight className="w-3 h-3" />
                        </span>
                        <span className="font-[family-name:var(--font-syne)] font-semibold text-[16px] text-[#F2F2F2] group-hover:text-[#E84142] transition-colors">
                            {nextPage.title}
                        </span>
                    </Link>
                ) : <div />}
            </div>
        </div>
    )
}
