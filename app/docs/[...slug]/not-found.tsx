import Link from 'next/link'

export default function DocNotFound() {
    return (
        <div className="flex flex-col items-start py-20">
            <div className="font-[family-name:var(--font-dm-mono)] text-[#E84142] text-[12px] mb-4 uppercase tracking-widest">
                404 · Page Not Found
            </div>
            <h1 className="font-[family-name:var(--font-syne)] font-bold text-[36px] text-[#F2F2F2] mb-6">
                This doc doesn&apos;t exist yet.
            </h1>
            <p className="font-[family-name:var(--font-ibm-plex)] text-[16px] text-[#909090] mb-10 max-w-xl">
                The page you&apos;re looking for hasn&apos;t been written into the PyVax documentation registry. Head back to the quickstart to find what you need.
            </p>
            <Link
                href="/docs/quickstart"
                className="flex items-center gap-2 h-[44px] px-6 bg-[#E84142] hover:bg-[#FF5555] text-white font-[family-name:var(--font-dm-mono)] text-[13px] font-bold rounded-[8px] transition-colors"
            >
                → Back to Quickstart
            </Link>
        </div>
    )
}
