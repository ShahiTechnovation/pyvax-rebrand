'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useWallet } from './wallet-provider'

// ─── ABI Helpers (pure JS — no ethers dependency) ───────────────────────────
// We encode/decode ABI data manually to avoid ethers.js bundle size.
// For a production IDE you'd use ethers.Interface but this keeps it lean.

function padLeft(hex: string, bytes: number): string {
    return hex.padStart(bytes * 2, '0')
}

function functionSelector(name: string, inputTypes: string[]): string {
    // keccak256 of function signature → first 4 bytes
    // We compute this via the Web Crypto API
    const sig = `${name}(${inputTypes.join(',')})`
    return keccak256Sync(sig).slice(0, 10) // 0x + 8 hex chars
}

// Minimal keccak256 for function selectors (synchronous, no deps)
// We'll use a tiny implementation
function keccak256Sync(input: string): string {
    // Fallback: compute via the ABI encoding we already have from compile
    // For now we pre-compute selectors from the ABI items that have them
    return '0x00000000'
}

// ─── Better approach: use built-in TextEncoder + manual ABI encode ──────────
function encodeUint256(value: string | number | bigint): string {
    const bn = BigInt(value)
    const hex = bn.toString(16)
    return padLeft(hex, 32)
}

function encodeAddress(addr: string): string {
    const clean = addr.toLowerCase().replace('0x', '')
    return padLeft(clean, 32)
}

function encodeBool(val: boolean | string): string {
    const b = val === true || val === 'true' || val === '1'
    return padLeft(b ? '1' : '0', 32)
}

function encodeString(str: string): string {
    // Dynamic type: offset (32 bytes) + length (32 bytes) + data (padded to 32)
    const encoder = new TextEncoder()
    const bytes = encoder.encode(str)
    const len = encodeUint256(bytes.length)
    const hexData = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
    const paddedData = hexData.padEnd(Math.ceil(hexData.length / 64) * 64, '0')
    return len + paddedData
}

function encodeBytes(hex: string): string {
    const clean = hex.replace('0x', '')
    const len = encodeUint256(clean.length / 2)
    const paddedData = clean.padEnd(Math.ceil(clean.length / 64) * 64, '0')
    return len + paddedData
}

function encodeParam(type: string, value: string): string {
    if (type.startsWith('uint') || type.startsWith('int')) {
        return encodeUint256(value)
    }
    if (type === 'address') {
        return encodeAddress(value)
    }
    if (type === 'bool') {
        return encodeBool(value)
    }
    if (type === 'string') {
        return encodeString(value)
    }
    if (type.startsWith('bytes')) {
        return encodeBytes(value)
    }
    // fallback: treat as uint256
    return encodeUint256(value)
}

function isDynamic(type: string): boolean {
    return type === 'string' || type === 'bytes' || type.endsWith('[]')
}

function encodeCallData(selector: string, types: string[], values: string[]): string {
    // Handle dynamic types with proper offset encoding
    const hasDynamic = types.some(isDynamic)

    if (!hasDynamic) {
        // All static — just concatenate
        const encoded = values.map((v, i) => encodeParam(types[i], v)).join('')
        return selector + encoded
    }

    // With dynamic types we need offset/data encoding
    let headParts: string[] = []
    let tailParts: string[] = []
    let currentOffset = types.length * 32

    for (let i = 0; i < types.length; i++) {
        if (isDynamic(types[i])) {
            headParts.push(encodeUint256(currentOffset))
            const encoded = encodeParam(types[i], values[i])
            tailParts.push(encoded)
            currentOffset += encoded.length / 2
        } else {
            headParts.push(encodeParam(types[i], values[i]))
        }
    }

    return selector + headParts.join('') + tailParts.join('')
}

// Decode return values (simplified — handles common types)
function decodeReturnValue(type: string, hexData: string): string {
    const clean = hexData.replace('0x', '')
    if (!clean || clean === '0' || clean.length === 0) return '0'

    if (type.startsWith('uint') || type.startsWith('int')) {
        try {
            const bn = BigInt('0x' + clean.slice(0, 64))
            return bn.toString()
        } catch {
            return '0'
        }
    }
    if (type === 'bool') {
        return BigInt('0x' + clean.slice(0, 64)) ? 'true' : 'false'
    }
    if (type === 'address') {
        return '0x' + clean.slice(24, 64)
    }
    if (type === 'string') {
        try {
            const offset = Number(BigInt('0x' + clean.slice(0, 64)))
            const lenHex = clean.slice(offset * 2, offset * 2 + 64)
            const len = Number(BigInt('0x' + lenHex))
            const dataHex = clean.slice(offset * 2 + 64, offset * 2 + 64 + len * 2)
            const bytes = new Uint8Array(dataHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
            return new TextDecoder().decode(bytes)
        } catch {
            return hexData
        }
    }
    return hexData
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface ABIFunction {
    name: string
    type: 'function' | 'event' | 'constructor' | 'fallback' | 'receive'
    inputs: { name: string; type: string; indexed?: boolean }[]
    outputs: { name: string; type: string }[]
    stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable'
}

interface TxRecord {
    id: string
    type: 'call' | 'write'
    functionName: string
    inputs: Record<string, string>
    result?: string
    txHash?: string
    error?: string
    gasUsed?: string
    timestamp: number
    status: 'pending' | 'success' | 'error'
}

interface ContractInteractionProps {
    address: string | null
    abi: any[]
    bytecode?: string
    contractName: string
    onTerminalPrint?: (text: string, type: 'prompt' | 'success' | 'error' | 'warning' | 'info' | 'muted' | 'bytecode' | '') => void
}

// ─── Main Component ─────────────────────────────────────────────────────────
export function ContractInteraction({
    address,
    abi,
    bytecode,
    contractName,
    onTerminalPrint,
}: ContractInteractionProps) {
    const wallet = useWallet()
    const [txHistory, setTxHistory] = useState<TxRecord[]>([])
    const [activeSection, setActiveSection] = useState<'functions' | 'state' | 'history'>('functions')
    const [functionSelectors, setFunctionSelectors] = useState<Record<string, string>>({})

    // Parse ABI into read/write functions
    const functions = (abi || []).filter((item: any) => item.type === 'function') as ABIFunction[]
    const readFunctions = functions.filter(f => f.stateMutability === 'view' || f.stateMutability === 'pure')
    const writeFunctions = functions.filter(f => f.stateMutability !== 'view' && f.stateMutability !== 'pure')
    const events = (abi || []).filter((item: any) => item.type === 'event')

    // Compute function selectors on mount
    useEffect(() => {
        if (!abi || abi.length === 0) return

        // Use the Web Crypto API to compute keccak256 of function signatures
        // Since Web Crypto doesn't have keccak, we'll use a simple approach:
        // compute selector = first 4 bytes of sha256 (close enough for display)
        // In production, use a proper keccak256 library
        const selectors: Record<string, string> = {}
        functions.forEach(fn => {
            const sig = `${fn.name}(${fn.inputs.map(i => i.type).join(',')})`
            // Simple hash for display — the actual blockchain encoding happens server-side
            selectors[fn.name] = sig
        })
        setFunctionSelectors(selectors)
    }, [abi])

    // ─── Execute read (eth_call) ──────────────────────────────────────────
    const executeRead = useCallback(async (fn: ABIFunction, inputValues: Record<string, string>): Promise<string> => {
        if (!address) throw new Error('No contract address. Deploy first.')

        // Use the API route to encode and call
        const res = await fetch('/api/pyvax', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                command: 'call',
                contract_address: address,
                function_name: fn.name,
                function_inputs: fn.inputs.map((inp, i) => ({
                    name: inp.name,
                    type: inp.type,
                    value: inputValues[inp.name] || inputValues[String(i)] || '',
                })),
                chain_rpc: wallet.chain.rpc,
            }),
        })

        // If API doesn't support 'call' yet, do it client-side via eth_call
        if (!res.ok || res.status === 404) {
            return await clientSideCall(fn, inputValues)
        }

        const result = await res.json()
        if (result.success) return result.result || result.stdout || 'OK'
        throw new Error(result.error || 'Call failed')
    }, [address, wallet.chain.rpc])

    // Client-side eth_call via MetaMask
    const clientSideCall = useCallback(async (fn: ABIFunction, inputValues: Record<string, string>): Promise<string> => {
        if (!address) throw new Error('No contract address')
        if (!wallet.hasProvider) throw new Error('No wallet detected')

        // Build the function selector manually
        // selector = keccak256("functionName(type1,type2)")[:4]
        // We'll use a workaround: compute via the deployed contract
        const inputTypes = fn.inputs.map(i => i.type)
        const values = fn.inputs.map((inp, i) => inputValues[inp.name] || inputValues[String(i)] || '0')

        // For the selector, we need keccak256. Use a JS implementation.
        const sig = `${fn.name}(${inputTypes.join(',')})`
        const sigBytes = new TextEncoder().encode(sig)

        // Use crypto.subtle for SHA-256 as a stand-in display hash
        // In reality, the EVM uses keccak256 — we'll compute it properly
        const selector = await computeSelector(sig)
        const calldata = encodeCallData(selector, inputTypes, values)

        const result = await (window as any).ethereum.request({
            method: 'eth_call',
            params: [{
                to: address,
                data: calldata,
            }, 'latest'],
        })

        // Decode the result
        if (fn.outputs.length > 0) {
            return decodeReturnValue(fn.outputs[0].type, result)
        }

        return result || '0x'
    }, [address, wallet.hasProvider])

    // ─── Execute write (eth_sendTransaction) ──────────────────────────────
    const executeWrite = useCallback(async (fn: ABIFunction, inputValues: Record<string, string>): Promise<{ txHash: string; gasUsed?: string }> => {
        if (!address) throw new Error('No contract address. Deploy first.')
        if (!wallet.hasProvider || wallet.status !== 'connected') throw new Error('Connect wallet first')
        if (!wallet.isCorrectChain) throw new Error(`Switch to ${wallet.chain.name} first`)

        const inputTypes = fn.inputs.map(i => i.type)
        const values = fn.inputs.map((inp, i) => inputValues[inp.name] || inputValues[String(i)] || '0')

        const selector = await computeSelector(`${fn.name}(${inputTypes.join(',')})`)
        const calldata = encodeCallData(selector, inputTypes, values)

        // Estimate gas
        let gasEstimate: string
        try {
            gasEstimate = await (window as any).ethereum.request({
                method: 'eth_estimateGas',
                params: [{ from: wallet.address, to: address, data: calldata }],
            })
        } catch {
            gasEstimate = '0x' + (100000).toString(16)
        }

        // Send transaction
        const txHash = await (window as any).ethereum.request({
            method: 'eth_sendTransaction',
            params: [{
                from: wallet.address,
                to: address,
                data: calldata,
                gas: gasEstimate,
            }],
        })

        // Wait for receipt
        let gasUsed: string | undefined
        for (let i = 0; i < 60; i++) {
            try {
                const receipt = await (window as any).ethereum.request({
                    method: 'eth_getTransactionReceipt',
                    params: [txHash],
                })
                if (receipt) {
                    gasUsed = receipt.gasUsed ? parseInt(receipt.gasUsed, 16).toString() : undefined
                    break
                }
            } catch { }
            await new Promise(r => setTimeout(r, 2000))
        }

        return { txHash, gasUsed }
    }, [address, wallet])

    // ─── Compute function selector (keccak256) ────────────────────────────
    // We use a minimal keccak256 implementation via dynamic import
    const selectorCache = useRef<Record<string, string>>({})

    const computeSelector = useCallback(async (signature: string): Promise<string> => {
        if (selectorCache.current[signature]) return selectorCache.current[signature]

        // Use the tiny keccak implementation embedded below
        const hash = keccak256Hex(signature)
        const selector = '0x' + hash.slice(0, 8)
        selectorCache.current[signature] = selector
        return selector
    }, [])

    // Add to TX history
    const addTx = useCallback((record: TxRecord) => {
        setTxHistory(prev => [record, ...prev].slice(0, 50))
    }, [])

    // ─── Render ─────────────────────────────────────────────────────────────
    if (!abi || abi.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-[#3F3F46] px-6 text-center">
                <div className="text-[24px] mb-2 opacity-50">📋</div>
                <div className="text-[11px] font-bold tracking-wider mb-1">NO ABI LOADED</div>
                <div className="text-[10px] text-[#27272A]">Compile a contract to interact with it</div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">

            {/* Contract Header */}
            {address && (
                <div className="px-4 py-2.5 border-b border-[#1C1C1F] bg-[#0C0C0E]">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#22C55E] rounded-full" />
                        <span className="text-[10px] text-[#E4E4E7] font-mono font-bold truncate">{address}</span>
                        <button
                            onClick={() => navigator.clipboard.writeText(address)}
                            className="text-[9px] text-[#52525B] hover:text-[#E84142] transition-colors shrink-0"
                            title="Copy address"
                        >📋</button>
                        <a
                            href={`${wallet.chain.explorer}/address/${address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] text-[#52525B] hover:text-[#E84142] transition-colors shrink-0"
                            title="View on explorer"
                        >🔗</a>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] text-[#3F3F46] tracking-widest font-bold">{contractName}</span>
                        <span className="text-[8px] text-[#22C55E] bg-[#22C55E10] px-1.5 py-0.5 rounded font-bold tracking-wider">DEPLOYED</span>
                    </div>
                </div>
            )}

            {/* Section tabs */}
            <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[#1C1C1F]">
                {(['functions', 'state', 'history'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveSection(tab)}
                        className={`text-[9px] tracking-widest font-bold px-2 py-1 rounded transition-colors ${activeSection === tab
                            ? 'bg-[#E8414215] text-[#E84142]'
                            : 'text-[#3F3F46] hover:text-[#71717A]'
                            }`}
                    >
                        {tab === 'functions' ? '📖 INTERACT' : tab === 'state' ? '📊 STATE' : '📜 TX LOG'}
                        {tab === 'history' && txHistory.length > 0 && (
                            <span className="ml-1 text-[8px] bg-[#27272A] text-[#71717A] px-1 rounded">{txHistory.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">

                {/* ─── FUNCTIONS TAB ─────────────────────────────────────────── */}
                {activeSection === 'functions' && (
                    <div className="px-3 py-2 space-y-1">
                        {/* Read functions */}
                        {readFunctions.length > 0 && (
                            <div className="mb-3">
                                <div className="text-[8px] tracking-widest font-bold text-[#60A5FA] mb-1.5 px-1 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-[#60A5FA] rounded-full" />
                                    READ ({readFunctions.length})
                                </div>
                                {readFunctions.map((fn, i) => (
                                    <FunctionCard
                                        key={`read-${i}`}
                                        fn={fn}
                                        type="read"
                                        onExecute={async (inputs) => {
                                            const id = `${Date.now()}-${fn.name}`
                                            addTx({ id, type: 'call', functionName: fn.name, inputs, timestamp: Date.now(), status: 'pending' })
                                            try {
                                                const result = await (address ? clientSideCall(fn, inputs) : Promise.reject(new Error('Deploy first')))
                                                addTx({ id, type: 'call', functionName: fn.name, inputs, result, timestamp: Date.now(), status: 'success' })
                                                onTerminalPrint?.(`📖 ${fn.name}() → ${result}`, 'success')
                                                return result
                                            } catch (err: any) {
                                                addTx({ id, type: 'call', functionName: fn.name, inputs, error: err.message, timestamp: Date.now(), status: 'error' })
                                                onTerminalPrint?.(`✗ ${fn.name}(): ${err.message}`, 'error')
                                                throw err
                                            }
                                        }}
                                        disabled={!address}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Write functions */}
                        {writeFunctions.length > 0 && (
                            <div>
                                <div className="text-[8px] tracking-widest font-bold text-[#F59E0B] mb-1.5 px-1 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-[#F59E0B] rounded-full" />
                                    WRITE ({writeFunctions.length})
                                </div>
                                {writeFunctions.map((fn, i) => (
                                    <FunctionCard
                                        key={`write-${i}`}
                                        fn={fn}
                                        type="write"
                                        onExecute={async (inputs) => {
                                            const id = `${Date.now()}-${fn.name}`
                                            addTx({ id, type: 'write', functionName: fn.name, inputs, timestamp: Date.now(), status: 'pending' })
                                            try {
                                                const { txHash, gasUsed } = await executeWrite(fn, inputs)
                                                addTx({ id, type: 'write', functionName: fn.name, inputs, txHash, gasUsed, timestamp: Date.now(), status: 'success' })
                                                onTerminalPrint?.(`✓ ${fn.name}() → tx: ${txHash.slice(0, 14)}...`, 'success')
                                                if (gasUsed) onTerminalPrint?.(`  Gas used: ${parseInt(gasUsed).toLocaleString()}`, 'muted')
                                                return txHash
                                            } catch (err: any) {
                                                const msg = err.code === 4001 ? 'Transaction rejected by user' : err.message
                                                addTx({ id, type: 'write', functionName: fn.name, inputs, error: msg, timestamp: Date.now(), status: 'error' })
                                                onTerminalPrint?.(`✗ ${fn.name}(): ${msg}`, 'error')
                                                throw err
                                            }
                                        }}
                                        disabled={!address || wallet.status !== 'connected'}
                                        walletNeeded={wallet.status !== 'connected'}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Events */}
                        {events.length > 0 && (
                            <div className="mt-4">
                                <div className="text-[8px] tracking-widest font-bold text-[#A78BFA] mb-1.5 px-1 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-[#A78BFA] rounded-full" />
                                    EVENTS ({events.length})
                                </div>
                                {events.map((ev: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-[#0C0C0E] border border-[#1C1C1F] rounded mb-1">
                                        <span className="text-[10px] text-[#A78BFA]">⚡</span>
                                        <span className="text-[10px] text-[#E4E4E7] font-bold">{ev.name}</span>
                                        <span className="text-[9px] text-[#52525B] ml-auto font-mono">
                                            ({ev.inputs?.map((i: any) => i.type).join(', ')})
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {functions.length === 0 && (
                            <div className="text-center text-[#3F3F46] text-[11px] mt-8">
                                No callable functions found in ABI.
                            </div>
                        )}
                    </div>
                )}

                {/* ─── STATE TAB ─────────────────────────────────────────────── */}
                {activeSection === 'state' && (
                    <div className="px-3 py-2">
                        <div className="text-[8px] tracking-widest font-bold text-[#3F3F46] mb-2">CONTRACT STATE</div>
                        {address ? (
                            <div className="space-y-2">
                                {readFunctions
                                    .filter(fn => fn.inputs.length === 0)
                                    .map((fn, i) => (
                                        <StateReader key={i} fn={fn} address={address} wallet={wallet} />
                                    ))
                                }
                                {readFunctions.filter(fn => fn.inputs.length === 0).length === 0 && (
                                    <div className="text-[10px] text-[#3F3F46] text-center mt-4">
                                        No zero-argument read functions to auto-display.
                                        <br />Use the Interact tab to call functions with parameters.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-[10px] text-[#3F3F46] text-center mt-4">Deploy the contract to view its state.</div>
                        )}
                    </div>
                )}

                {/* ─── HISTORY TAB ───────────────────────────────────────────── */}
                {activeSection === 'history' && (
                    <div className="px-3 py-2">
                        {txHistory.length > 0 ? (
                            <div className="space-y-1.5">
                                {txHistory.map((tx) => (
                                    <div key={tx.id} className="bg-[#0C0C0E] border border-[#1C1C1F] rounded-lg p-2.5">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`w-1.5 h-1.5 rounded-full ${tx.status === 'success' ? 'bg-[#22C55E]' :
                                                tx.status === 'error' ? 'bg-[#EF4444]' :
                                                    'bg-[#F59E0B] animate-pulse'
                                                }`} />
                                            <span className="text-[10px] text-[#E4E4E7] font-bold">{tx.functionName}()</span>
                                            <span className={`text-[8px] tracking-wider font-bold ml-auto ${tx.type === 'call' ? 'text-[#60A5FA]' : 'text-[#F59E0B]'
                                                }`}>
                                                {tx.type === 'call' ? 'READ' : 'WRITE'}
                                            </span>
                                        </div>
                                        {tx.txHash && (
                                            <a
                                                href={`${wallet.chain.explorer}/tx/${tx.txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[9px] text-[#A78BFA] hover:text-[#C4B5FD] font-mono truncate block transition-colors"
                                            >
                                                {tx.txHash}
                                            </a>
                                        )}
                                        {tx.result && (
                                            <div className="text-[9px] text-[#22C55E] font-mono mt-1 break-all">→ {tx.result}</div>
                                        )}
                                        {tx.error && (
                                            <div className="text-[9px] text-[#EF4444] mt-1 break-all">✗ {tx.error}</div>
                                        )}
                                        {tx.gasUsed && (
                                            <div className="text-[8px] text-[#52525B] mt-1">Gas: {parseInt(tx.gasUsed).toLocaleString()}</div>
                                        )}
                                        <div className="text-[8px] text-[#27272A] mt-1">{new Date(tx.timestamp).toLocaleTimeString()}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[10px] text-[#3F3F46] text-center mt-4">No transactions yet.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Function Card (Accordion item with inputs) ─────────────────────────────
function FunctionCard({ fn, type, onExecute, disabled, walletNeeded }: {
    fn: ABIFunction
    type: 'read' | 'write'
    onExecute: (inputs: Record<string, string>) => Promise<string>
    disabled?: boolean
    walletNeeded?: boolean
}) {
    const [expanded, setExpanded] = useState(false)
    const [inputs, setInputs] = useState<Record<string, string>>({})
    const [result, setResult] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const isRead = type === 'read'
    const color = isRead ? '#60A5FA' : '#F59E0B'

    const handleExecute = async () => {
        setLoading(true)
        setResult(null)
        setError(null)
        try {
            const res = await onExecute(inputs)
            setResult(res)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mb-1 rounded-lg border border-[#1C1C1F] overflow-hidden transition-all">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-all hover:bg-[#0C0C0E] ${expanded ? 'bg-[#0C0C0E]' : ''
                    }`}
            >
                <span className="text-[8px] text-[#3F3F46]">{expanded ? '▾' : '▸'}</span>
                <span className="text-[10px] font-bold text-[#E4E4E7]">{fn.name}</span>
                <span className="text-[9px] text-[#52525B] font-mono">
                    ({fn.inputs.map(i => i.type).join(', ')})
                </span>
                {fn.outputs.length > 0 && (
                    <span className="text-[9px] font-mono ml-auto" style={{ color }}>
                        → {fn.outputs.map(o => o.type).join(', ')}
                    </span>
                )}
                <span className={`text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded ${isRead ? 'bg-[#60A5FA15] text-[#60A5FA]' : 'bg-[#F59E0B15] text-[#F59E0B]'
                    }`}>
                    {isRead ? 'VIEW' : fn.stateMutability === 'payable' ? 'PAY' : 'WRITE'}
                </span>
            </button>

            {/* Expanded form */}
            {expanded && (
                <div className="px-3 pb-3 border-t border-[#1C1C1F] pt-2.5 bg-[#0A0A0C]">
                    {/* Inputs */}
                    {fn.inputs.map((input, i) => (
                        <div key={i} className="mb-2">
                            <label className="text-[9px] text-[#52525B] font-bold tracking-wider mb-1 block">
                                {input.name || `arg${i}`}
                                <span className="text-[#3F3F46] ml-1 font-mono font-normal">({input.type})</span>
                            </label>
                            <input
                                type={input.type.includes('int') ? 'text' : 'text'}
                                value={inputs[input.name || String(i)] || ''}
                                onChange={e => setInputs({ ...inputs, [input.name || String(i)]: e.target.value })}
                                placeholder={getPlaceholder(input.type)}
                                className="w-full px-2.5 py-1.5 rounded bg-[#09090B] border border-[#1C1C1F] text-[10px] text-[#E4E4E7] font-mono placeholder-[#27272A] outline-none focus:border-[#27272A] transition-colors"
                            />
                        </div>
                    ))}

                    {/* Execute button */}
                    <div className="flex items-center gap-2 mt-2">
                        {walletNeeded ? (
                            <div className="text-[9px] text-[#F59E0B] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-[#F59E0B] rounded-full animate-pulse" />
                                Connect wallet for write operations
                            </div>
                        ) : (
                            <button
                                onClick={handleExecute}
                                disabled={disabled || loading}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[9px] font-bold tracking-wider transition-all ${disabled || loading
                                    ? 'bg-[#18181B] text-[#3F3F46] cursor-not-allowed'
                                    : isRead
                                        ? 'bg-[#60A5FA15] text-[#60A5FA] hover:bg-[#60A5FA25] border border-[#60A5FA30]'
                                        : 'bg-[#F59E0B15] text-[#F59E0B] hover:bg-[#F59E0B25] border border-[#F59E0B30]'
                                    }`}
                            >
                                {loading ? (
                                    <><div className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" /> CALLING...</>
                                ) : isRead ? (
                                    <>📖 CALL</>
                                ) : (
                                    <>✍️ WRITE</>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Result */}
                    {result !== null && (
                        <div className="mt-2 px-2.5 py-2 rounded bg-[#22C55E08] border border-[#22C55E20]">
                            <div className="text-[8px] text-[#22C55E] tracking-widest font-bold mb-1">RESULT</div>
                            <div className="text-[10px] text-[#22C55E] font-mono break-all">{result}</div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mt-2 px-2.5 py-2 rounded bg-[#EF444408] border border-[#EF444420]">
                            <div className="text-[8px] text-[#EF4444] tracking-widest font-bold mb-1">ERROR</div>
                            <div className="text-[10px] text-[#EF4444] break-all">{error}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── State Reader (auto-calls view functions with 0 args) ───────────────────
function StateReader({ fn, address, wallet }: { fn: ABIFunction; address: string; wallet: any }) {
    const [value, setValue] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const refresh = useCallback(async () => {
        setLoading(true)
        try {
            const sig = `${fn.name}(${fn.inputs.map(i => i.type).join(',')})`
            const selector = '0x' + keccak256Hex(sig).slice(0, 8)

            const result = await (window as any).ethereum.request({
                method: 'eth_call',
                params: [{ to: address, data: selector }, 'latest'],
            })

            if (fn.outputs.length > 0) {
                setValue(decodeReturnValue(fn.outputs[0].type, result))
            } else {
                setValue(result)
            }
        } catch (err: any) {
            setValue(`Error: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }, [fn, address])

    useEffect(() => {
        if (address && wallet.hasProvider) refresh()
    }, [address, wallet.hasProvider, refresh])

    // Auto-refresh every 10 seconds
    useEffect(() => {
        if (!address || !wallet.hasProvider) return
        const timer = setInterval(refresh, 10000)
        return () => clearInterval(timer)
    }, [address, wallet.hasProvider, refresh])

    return (
        <div className="flex items-center justify-between px-2.5 py-2 bg-[#0C0C0E] border border-[#1C1C1F] rounded">
            <div>
                <div className="text-[10px] text-[#E4E4E7] font-bold">{fn.name}()</div>
                {fn.outputs.length > 0 && (
                    <div className="text-[8px] text-[#3F3F46] font-mono">→ {fn.outputs[0].type}</div>
                )}
            </div>
            <div className="flex items-center gap-2">
                {loading ? (
                    <div className="w-3 h-3 border border-[#27272A] border-t-[#60A5FA] rounded-full animate-spin" />
                ) : (
                    <span className="text-[11px] text-[#60A5FA] font-mono font-bold">
                        {value !== null ? value : '—'}
                    </span>
                )}
                <button onClick={refresh} className="text-[9px] text-[#3F3F46] hover:text-[#60A5FA] transition-colors">⟳</button>
            </div>
        </div>
    )
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function getPlaceholder(type: string): string {
    if (type === 'address') return '0x742d35Cc6634C0532925a3b844Bc9e7595f...'
    if (type.includes('uint')) return '0'
    if (type.includes('int')) return '0'
    if (type === 'bool') return 'true or false'
    if (type === 'string') return 'Enter text...'
    if (type.startsWith('bytes')) return '0x...'
    return 'Enter value...'
}

// ─── Minimal Keccak-256 (pure JS, no dependencies) ──────────────────────────
// This is a compact keccak256 implementation for computing function selectors.
// Based on the NIST SHA-3 / Keccak specification.

const KECCAK_ROUND_CONSTANTS = [
    0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
    0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
    0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
    0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
    0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
    0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
]

const KECCAK_ROTATION_OFFSETS = [
    [0, 36, 3, 41, 18], [1, 44, 10, 45, 2], [62, 6, 43, 15, 61],
    [28, 55, 25, 21, 56], [27, 20, 39, 8, 14],
]

function keccak256Hex(input: string): string {
    const bytes = new TextEncoder().encode(input)
    const hash = keccakHash(bytes, 256)
    return Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('')
}

function keccakHash(message: Uint8Array, outputBits: number): Uint8Array {
    const rate = 1600 - outputBits * 2
    const rateBytes = rate / 8
    const blockSize = rateBytes

    // Pad message: append 0x01, pad with zeros, set last byte |= 0x80
    const padLen = blockSize - (message.length % blockSize)
    const padded = new Uint8Array(message.length + padLen)
    padded.set(message)
    padded[message.length] = 0x01
    padded[padded.length - 1] |= 0x80

    // State: 5x5 matrix of 64-bit words = 25 lanes
    const state = new Array<bigint>(25).fill(0n)

    // Absorb
    for (let offset = 0; offset < padded.length; offset += blockSize) {
        for (let i = 0; i < blockSize / 8; i++) {
            let lane = 0n
            for (let j = 0; j < 8; j++) {
                lane |= BigInt(padded[offset + i * 8 + j]) << BigInt(j * 8)
            }
            state[i] ^= lane
        }
        keccakF1600(state)
    }

    // Squeeze
    const output = new Uint8Array(outputBits / 8)
    for (let i = 0; i < output.length / 8; i++) {
        const lane = state[i]
        for (let j = 0; j < 8 && i * 8 + j < output.length; j++) {
            output[i * 8 + j] = Number((lane >> BigInt(j * 8)) & 0xFFn)
        }
    }

    return output
}

function keccakF1600(state: bigint[]) {
    const mask64 = (1n << 64n) - 1n

    for (let round = 0; round < 24; round++) {
        // θ step
        const C = new Array<bigint>(5).fill(0n)
        for (let x = 0; x < 5; x++) {
            C[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20]
        }
        const D = new Array<bigint>(5).fill(0n)
        for (let x = 0; x < 5; x++) {
            D[x] = C[(x + 4) % 5] ^ (((C[(x + 1) % 5] << 1n) | (C[(x + 1) % 5] >> 63n)) & mask64)
        }
        for (let x = 0; x < 5; x++) {
            for (let y = 0; y < 5; y++) {
                state[x + y * 5] = (state[x + y * 5] ^ D[x]) & mask64
            }
        }

        // ρ and π steps
        const B = new Array<bigint>(25).fill(0n)
        for (let x = 0; x < 5; x++) {
            for (let y = 0; y < 5; y++) {
                const r = KECCAK_ROTATION_OFFSETS[y][x]
                const rotated = r === 0 ? state[x + y * 5] : (((state[x + y * 5] << BigInt(r)) | (state[x + y * 5] >> BigInt(64 - r))) & mask64)
                B[y + ((2 * x + 3 * y) % 5) * 5] = rotated
            }
        }

        // χ step
        for (let x = 0; x < 5; x++) {
            for (let y = 0; y < 5; y++) {
                state[x + y * 5] = (B[x + y * 5] ^ ((~B[(x + 1) % 5 + y * 5] & mask64) & B[(x + 2) % 5 + y * 5])) & mask64
            }
        }

        // ι step
        state[0] = (state[0] ^ KECCAK_ROUND_CONSTANTS[round]) & mask64
    }
}
