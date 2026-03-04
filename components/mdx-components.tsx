import { CodeBlock, Callout } from '@/components/docs-client'

// This file is intentionally NOT 'use client' — it's imported by Server Components.
// All interactive sub-components (CodeBlock, Callout) are individually marked 'use client'.

export const MDXComponents = {
    h1: (props: any) => (
        <h1
            className="font-[family-name:var(--font-syne)] font-bold text-[40px] md:text-[52px] text-[#F2F2F2] mb-12 leading-tight"
            {...props}
        />
    ),
    h2: (props: any) => (
        <h2
            className="font-[family-name:var(--font-syne)] font-bold text-[26px] md:text-[32px] text-[#E8E8E8] mt-16 mb-8 pb-4 border-b border-[#1F1F1F]"
            {...props}
        />
    ),
    h3: (props: any) => (
        <h3
            className="font-[family-name:var(--font-syne)] font-semibold text-[20px] text-[#F2F2F2] mt-10 mb-4"
            {...props}
        />
    ),
    p: (props: any) => (
        <p
            className="font-[family-name:var(--font-ibm-plex)] text-[16px] text-[#C0C0C0] leading-[1.75] mb-6"
            {...props}
        />
    ),
    ul: (props: any) => (
        <ul
            className="list-disc list-outside ml-6 font-[family-name:var(--font-ibm-plex)] text-[16px] text-[#C0C0C0] space-y-2 mb-6"
            {...props}
        />
    ),
    ol: (props: any) => (
        <ol
            className="list-decimal list-outside ml-6 font-[family-name:var(--font-ibm-plex)] text-[16px] text-[#C0C0C0] space-y-2 mb-6"
            {...props}
        />
    ),
    li: (props: any) => <li className="pl-2 leading-[1.75]" {...props} />,
    a: (props: any) => (
        <a
            className="text-[#E84142] hover:text-[#FF5555] underline-offset-4 hover:underline transition-colors"
            {...props}
        />
    ),
    strong: (props: any) => <strong className="font-semibold text-[#F2F2F2]" {...props} />,
    em: (props: any) => <em className="italic text-[#909090]" {...props} />,
    blockquote: (props: any) => (
        <blockquote
            className="border-l-4 border-[#1F1F1F] pl-6 italic text-[#909090] my-6"
            {...props}
        />
    ),
    hr: () => <hr className="border-[#1F1F1F] my-12" />,

    // Tables
    table: (props: any) => (
        <div className="overflow-x-auto border border-[#1F1F1F] rounded-[8px] my-8 shadow-lg">
            <table className="w-full text-left border-collapse min-w-[560px]" {...props} />
        </div>
    ),
    thead: (props: any) => <thead className="bg-[#131313] border-b border-[#1F1F1F]" {...props} />,
    tbody: (props: any) => <tbody {...props} />,
    tr: (props: any) => (
        <tr
            className="border-b border-[#1F1F1F] last:border-0 hover:bg-[#181818] transition-colors even:bg-[#0E0E0E] odd:bg-[#0A0A0A]"
            {...props}
        />
    ),
    th: (props: any) => (
        <th
            className="p-4 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#909090] tracking-wider uppercase font-semibold"
            {...props}
        />
    ),
    td: (props: any) => (
        <td
            className="p-4 font-[family-name:var(--font-ibm-plex)] text-[14px] text-[#C0C0C0]"
            {...props}
        />
    ),

    // Inline code — short snippets within paragraph text
    code: (props: any) => {
        // When rendered inside a <pre>, MDX passes the code as a child — skip styling here
        // so the pre handler can handle the full block.
        return (
            <code
                className="font-[family-name:var(--font-dm-mono)] text-[13px] bg-[#1A1A1A] border border-[#2A2A2A] text-[#E84142] px-1.5 py-0.5 rounded"
                {...props}
            />
        )
    },

    // Fenced code blocks — delegate to interactive CodeBlock client component
    pre: (props: any) => {
        const codeChild = props.children
        const codeString: string =
            typeof codeChild?.props?.children === 'string'
                ? codeChild.props.children
                : String(codeChild?.props?.children ?? '')

        // Extract language from className like "language-python"
        const className: string = codeChild?.props?.className ?? ''
        const lang = className.replace('language-', '') || undefined

        return <CodeBlock lang={lang}>{codeString}</CodeBlock>
    },

    // Custom MDX components available inside .mdx files
    Callout,
}
