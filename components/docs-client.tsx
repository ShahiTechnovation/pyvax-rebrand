'use client'
import React from 'react'
import { Check, Copy } from 'lucide-react'

export function CodeBlock({ children, lang }: { children: string; lang?: string }) {
    const [copied, setCopied] = React.useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(children)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="relative group bg-[#090909] border border-[#1F1F1F] rounded-[12px] my-6 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-[#131313] border-b border-[#1F1F1F]">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#E84142]/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-[#333]"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-[#333]"></div>
                    </div>
                    {lang && (
                        <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#555] ml-2 uppercase tracking-wider">
                            {lang}
                        </span>
                    )}
                </div>
                <button
                    onClick={handleCopy}
                    className="text-[#555] hover:text-[#F2F2F2] transition-colors p-1 rounded"
                    aria-label="Copy to clipboard"
                >
                    {copied
                        ? <Check className="w-3.5 h-3.5 text-[#4CAF50]" />
                        : <Copy className="w-3.5 h-3.5" />
                    }
                </button>
            </div>
            <div className="p-5 overflow-x-auto">
                <pre className="font-[family-name:var(--font-dm-mono)] text-[13px] leading-[1.75] text-[#C0C0C0] m-0 whitespace-pre">
                    <code>{children}</code>
                </pre>
            </div>
        </div>
    )
}

export function Callout({ children, title }: { children: React.ReactNode; title?: string }) {
    return (
        <div className="bg-[#131313] border-l-4 border-[#E84142] p-6 rounded-r-[8px] my-6 shadow-lg">
            {title && (
                <strong className="text-[#F2F2F2] block mb-3 font-[family-name:var(--font-syne)] text-[16px]">
                    {title}
                </strong>
            )}
            <div className="font-[family-name:var(--font-ibm-plex)] text-[15px] text-[#C0C0C0] leading-[1.6]">
                {children}
            </div>
        </div>
    )
}
