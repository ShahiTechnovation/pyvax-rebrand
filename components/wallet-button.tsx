'use client'

import { useState, useRef, useEffect } from 'react'
import { useWallet, SUPPORTED_CHAINS, type Chain } from './wallet-provider'

// ─── Wallet Connect Button ──────────────────────────────────────────────────
export function WalletButton() {
    const wallet = useWallet()
    const [showDropdown, setShowDropdown] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    if (wallet.status === 'connected' && wallet.address) {
        return (
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#1C1C1F] hover:border-[#27272A] transition-all group"
                >
                    {/* Connection indicator */}
                    <span className={`w-1.5 h-1.5 rounded-full transition-colors ${wallet.isCorrectChain ? 'bg-[#22C55E]' : 'bg-[#F59E0B] animate-pulse'
                        }`} />

                    {/* Address */}
                    <span className="text-[10px] tracking-wider font-bold text-[#A1A1AA] group-hover:text-[#E4E4E7] transition-colors">
                        {wallet.shortAddress()}
                    </span>

                    {/* Balance */}
                    {wallet.balance && (
                        <span className="text-[10px] text-[#52525B] font-mono">
                            {wallet.formatBalance(3)} {wallet.chain.symbol}
                        </span>
                    )}

                    <span className="text-[8px] text-[#3F3F46]">▾</span>
                </button>

                {/* Dropdown */}
                {showDropdown && (
                    <div className="absolute right-0 top-full mt-1.5 w-[280px] bg-[#0C0C0E] border border-[#1C1C1F] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] z-50 overflow-hidden">

                        {/* Account section */}
                        <div className="p-3 border-b border-[#1C1C1F]">
                            <div className="text-[8px] text-[#3F3F46] tracking-widest font-bold mb-2">ACCOUNT</div>
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E84142] to-[#FF6B6B] flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                                    {wallet.address?.slice(2, 4).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[11px] text-[#E4E4E7] font-bold font-mono truncate">
                                        {wallet.address}
                                    </div>
                                    <div className="text-[10px] text-[#52525B] mt-0.5">
                                        {wallet.formatBalance(4)} {wallet.chain.symbol}
                                    </div>
                                </div>
                            </div>

                            {/* Copy address */}
                            <div className="flex gap-2 mt-2.5">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(wallet.address!)
                                        setShowDropdown(false)
                                    }}
                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-[#18181B] text-[9px] text-[#71717A] tracking-wider font-bold hover:text-[#E4E4E7] hover:bg-[#27272A] transition-colors"
                                >
                                    📋 COPY
                                </button>
                                <a
                                    href={wallet.explorerLink('address', wallet.address!)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-[#18181B] text-[9px] text-[#71717A] tracking-wider font-bold hover:text-[#E4E4E7] hover:bg-[#27272A] transition-colors"
                                >
                                    🔗 EXPLORER
                                </a>
                            </div>
                        </div>

                        {/* Chain status */}
                        {!wallet.isCorrectChain && wallet.chainId && (
                            <div className="px-3 py-2 bg-[#F59E0B08] border-b border-[#1C1C1F]">
                                <div className="flex items-center gap-2 text-[10px] text-[#F59E0B]">
                                    <span>⚠</span>
                                    <span className="font-bold">Wrong network.</span>
                                    <button
                                        onClick={() => { wallet.switchChain(wallet.chain); setShowDropdown(false) }}
                                        className="ml-auto text-[9px] font-bold bg-[#F59E0B] text-black px-2 py-0.5 rounded hover:bg-[#FBBF24] transition-colors"
                                    >
                                        SWITCH
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Network section */}
                        <div className="p-3 border-b border-[#1C1C1F]">
                            <div className="text-[8px] text-[#3F3F46] tracking-widest font-bold mb-2">NETWORK</div>
                            <div className="space-y-0.5">
                                {SUPPORTED_CHAINS.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => { wallet.switchChain(c); setShowDropdown(false) }}
                                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-all ${wallet.chain.id === c.id
                                                ? 'bg-[#18181B] text-[#E4E4E7]'
                                                : 'text-[#71717A] hover:text-[#A1A1AA] hover:bg-[#0F0F11]'
                                            }`}
                                    >
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                                        <span className="text-[10px] font-bold tracking-wider flex-1">{c.name}</span>
                                        {c.isTestnet && (
                                            <span className="text-[7px] tracking-widest font-bold bg-[#27272A] text-[#52525B] px-1.5 py-0.5 rounded">TEST</span>
                                        )}
                                        {wallet.chainId === c.id && (
                                            <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Disconnect */}
                        <div className="p-2">
                            <button
                                onClick={() => { wallet.disconnect(); setShowDropdown(false) }}
                                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] tracking-widest font-bold text-[#EF4444] hover:bg-[#EF444410] transition-colors"
                            >
                                ⏻ DISCONNECT
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // ─── Disconnected / Connecting state ──────────────────────────────────────
    return (
        <button
            onClick={wallet.connect}
            disabled={wallet.status === 'connecting'}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] tracking-wider font-bold transition-all ${wallet.status === 'connecting'
                    ? 'bg-[#18181B] text-[#52525B] cursor-wait'
                    : wallet.status === 'error'
                        ? 'bg-[#EF444415] text-[#EF4444] border border-[#EF444430]'
                        : 'bg-[#E8414215] text-[#E84142] border border-[#E8414230] hover:bg-[#E8414225] hover:border-[#E8414250] hover:shadow-[0_0_12px_rgba(232,65,66,0.15)]'
                }`}
        >
            {wallet.status === 'connecting' ? (
                <>
                    <div className="w-3 h-3 border border-[#52525B] border-t-[#A1A1AA] rounded-full animate-spin" />
                    CONNECTING...
                </>
            ) : wallet.status === 'error' ? (
                <>
                    <span className="w-1.5 h-1.5 bg-[#EF4444] rounded-full" />
                    {wallet.error || 'ERROR'}
                </>
            ) : !wallet.hasProvider ? (
                <>
                    <span className="w-1.5 h-1.5 bg-[#F59E0B] rounded-full" />
                    INSTALL WALLET
                </>
            ) : (
                <>
                    <span className="w-1.5 h-1.5 bg-[#E84142] rounded-full animate-pulse" />
                    CONNECT WALLET
                </>
            )}
        </button>
    )
}

// ─── Chain Picker ───────────────────────────────────────────────────────────
export function ChainPicker() {
    const wallet = useWallet()
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 text-[10px] tracking-wider font-bold px-2 py-1.5 rounded-lg border border-[#1C1C1F] hover:border-[#27272A] transition-all"
            >
                <span className="w-2 h-2 rounded-full" style={{ background: wallet.chain.color }} />
                <span className="text-[#A1A1AA]">{wallet.chain.name.toUpperCase()}</span>
                {!wallet.isCorrectChain && wallet.status === 'connected' && (
                    <span className="w-1.5 h-1.5 bg-[#F59E0B] rounded-full animate-pulse" />
                )}
                <span className="text-[#3F3F46]">▾</span>
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-1.5 bg-[#0C0C0E] border border-[#1C1C1F] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] py-1.5 z-50 min-w-[220px]">
                    <div className="px-3 py-1 text-[8px] text-[#3F3F46] tracking-widest font-bold">SELECT NETWORK</div>
                    {SUPPORTED_CHAINS.map(c => (
                        <button
                            key={c.id}
                            onClick={() => {
                                wallet.switchChain(c)
                                setOpen(false)
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-all ${wallet.chain.id === c.id
                                    ? 'bg-[#18181B] text-[#E4E4E7]'
                                    : 'text-[#71717A] hover:bg-[#0F0F11] hover:text-[#A1A1AA]'
                                }`}
                        >
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                            <span className="text-[10px] font-bold tracking-wider flex-1">{c.name}</span>
                            {c.isTestnet && (
                                <span className="text-[7px] tracking-widest font-bold bg-[#27272A] text-[#52525B] px-1.5 py-0.5 rounded">TEST</span>
                            )}
                            {wallet.chain.id === c.id && <span className="text-[#E84142] text-[10px]">✓</span>}
                            {wallet.chainId === c.id && wallet.chain.id !== c.id && (
                                <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full" title="Currently connected" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Deploy Button ──────────────────────────────────────────────────────────
export function DeployButton({ bytecode, abi, onResult, disabled }: {
    bytecode?: string
    abi?: any[]
    onResult?: (result: any) => void
    disabled?: boolean
}) {
    const wallet = useWallet()
    const [deploying, setDeploying] = useState(false)

    const handleDeploy = async () => {
        if (!bytecode || !abi) return
        setDeploying(true)

        try {
            // If wrong chain, prompt switch first
            if (!wallet.isCorrectChain) {
                await wallet.switchChain(wallet.chain)
                // Wait a tick for chain to update
                await new Promise(r => setTimeout(r, 1000))
            }

            const result = await wallet.deployContract(bytecode, abi)
            onResult?.(result)
        } catch (err: any) {
            onResult?.({ success: false, error: err.message })
        } finally {
            setDeploying(false)
        }
    }

    if (wallet.status !== 'connected') {
        return (
            <button
                onClick={wallet.connect}
                className="w-full py-3 rounded-lg bg-[#18181B] border border-[#27272A] text-[#A1A1AA] text-[10px] font-bold tracking-widest hover:border-[#E84142] hover:text-[#E84142] transition-all flex items-center justify-center gap-2"
            >
                <span className="w-1.5 h-1.5 bg-[#E84142] rounded-full animate-pulse" />
                CONNECT WALLET TO DEPLOY
            </button>
        )
    }

    return (
        <div className="space-y-2">
            {/* Wrong chain warning */}
            {!wallet.isCorrectChain && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F59E0B08] border border-[#F59E0B20] text-[10px] text-[#F59E0B]">
                    <span>⚠</span>
                    <span>Switch to <strong>{wallet.chain.name}</strong></span>
                    <button
                        onClick={() => wallet.switchChain(wallet.chain)}
                        className="ml-auto text-[9px] font-bold bg-[#F59E0B] text-black px-2 py-0.5 rounded hover:bg-[#FBBF24] transition-colors"
                    >
                        SWITCH
                    </button>
                </div>
            )}

            <button
                onClick={handleDeploy}
                disabled={disabled || deploying || !bytecode}
                className={`w-full py-3 rounded-lg text-[10px] font-bold tracking-widest transition-all flex items-center justify-center gap-2 ${deploying
                        ? 'bg-[#E84142] text-white animate-pulse cursor-wait'
                        : !disabled && bytecode
                            ? 'bg-gradient-to-r from-[#E84142] to-[#D42F30] text-white hover:shadow-[0_0_24px_rgba(232,65,66,0.25)] active:scale-[0.98]'
                            : 'bg-[#18181B] text-[#3F3F46] cursor-not-allowed'
                    }`}
            >
                {deploying ? (
                    <>
                        <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                        DEPLOYING TO {wallet.chain.name.toUpperCase()}...
                    </>
                ) : (
                    <>DEPLOY TO {wallet.chain.name.toUpperCase()} →</>
                )}
            </button>
        </div>
    )
}
