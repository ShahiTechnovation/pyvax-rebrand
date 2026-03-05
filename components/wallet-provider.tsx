'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

// ─── Chain Configuration ────────────────────────────────────────────────────
export interface Chain {
    id: number
    name: string
    symbol: string
    rpc: string
    explorer: string
    color: string
    isTestnet: boolean
    decimals: number
    blockExplorerApi?: string
}

export const SUPPORTED_CHAINS: Chain[] = [
    { id: 43113, name: 'Fuji Testnet', symbol: 'AVAX', rpc: 'https://api.avax-test.network/ext/bc/C/rpc', explorer: 'https://testnet.snowtrace.io', color: '#E84142', isTestnet: true, decimals: 18 },
    { id: 43114, name: 'Avalanche', symbol: 'AVAX', rpc: 'https://api.avax.network/ext/bc/C/rpc', explorer: 'https://snowtrace.io', color: '#E84142', isTestnet: false, decimals: 18 },
    { id: 11155111, name: 'Sepolia', symbol: 'ETH', rpc: 'https://rpc.sepolia.org', explorer: 'https://sepolia.etherscan.io', color: '#627EEA', isTestnet: true, decimals: 18 },
    { id: 137, name: 'Polygon', symbol: 'MATIC', rpc: 'https://polygon-rpc.com', explorer: 'https://polygonscan.com', color: '#8247E5', isTestnet: false, decimals: 18 },
    { id: 1, name: 'Ethereum', symbol: 'ETH', rpc: 'https://eth.llamarpc.com', explorer: 'https://etherscan.io', color: '#627EEA', isTestnet: false, decimals: 18 },
]

// ─── Wallet State ───────────────────────────────────────────────────────────
export type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface WalletState {
    status: WalletStatus
    address: string | null
    balance: string | null
    balanceRaw: bigint | null
    chain: Chain
    chainId: number | null
    isCorrectChain: boolean
    error: string | null
}

export interface DeployResult {
    success: boolean
    txHash?: string
    contractAddress?: string
    gasUsed?: string
    error?: string
    explorerUrl?: string
}

export interface WalletContextValue extends WalletState {
    // Actions
    connect: () => Promise<void>
    disconnect: () => void
    switchChain: (chain: Chain) => Promise<void>
    setTargetChain: (chain: Chain) => void

    // Transaction helpers
    deployContract: (bytecode: string, abi: any[]) => Promise<DeployResult>
    sendTransaction: (to: string, data: string, value?: string) => Promise<{ hash: string }>
    getGasPrice: () => Promise<string>

    // Utils
    formatBalance: (decimals?: number) => string
    shortAddress: () => string
    explorerLink: (type: 'address' | 'tx', hash: string) => string
    hasProvider: boolean
}

const WalletContext = createContext<WalletContextValue | null>(null)

// ─── Provider ───────────────────────────────────────────────────────────────
export function WalletProvider({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<WalletStatus>('disconnected')
    const [address, setAddress] = useState<string | null>(null)
    const [balance, setBalance] = useState<string | null>(null)
    const [balanceRaw, setBalanceRaw] = useState<bigint | null>(null)
    const [chain, setChain] = useState<Chain>(SUPPORTED_CHAINS[0])
    const [chainId, setChainId] = useState<number | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [hasProvider, setHasProvider] = useState(false)

    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)

    // ─── Provider Detection ─────────────────────────────────────────────────
    useEffect(() => {
        const check = () => {
            const has = typeof window !== 'undefined' && !!(window as any).ethereum
            setHasProvider(has)
            return has
        }

        if (check()) {
            // Auto-reconnect if previously connected
            const eth = (window as any).ethereum
            eth.request({ method: 'eth_accounts' })
                .then((accounts: string[]) => {
                    if (accounts.length > 0) {
                        setAddress(accounts[0])
                        setStatus('connected')
                        fetchChainId()
                    }
                })
                .catch(() => { })
        }

        // Some wallets inject ethereum async
        window.addEventListener('ethereum#initialized', () => check())
        return () => window.removeEventListener('ethereum#initialized', () => check())
    }, [])

    // ─── Event Listeners ────────────────────────────────────────────────────
    useEffect(() => {
        if (!hasProvider) return
        const eth = (window as any).ethereum

        const handleAccountsChanged = (accounts: string[]) => {
            if (accounts.length === 0) {
                setAddress(null)
                setBalance(null)
                setBalanceRaw(null)
                setStatus('disconnected')
            } else {
                setAddress(accounts[0])
                setStatus('connected')
            }
        }

        const handleChainChanged = (hexChainId: string) => {
            const newChainId = parseInt(hexChainId, 16)
            setChainId(newChainId)
        }

        const handleDisconnect = () => {
            setAddress(null)
            setBalance(null)
            setBalanceRaw(null)
            setStatus('disconnected')
            setChainId(null)
        }

        eth.on('accountsChanged', handleAccountsChanged)
        eth.on('chainChanged', handleChainChanged)
        eth.on('disconnect', handleDisconnect)

        return () => {
            eth.removeListener('accountsChanged', handleAccountsChanged)
            eth.removeListener('chainChanged', handleChainChanged)
            eth.removeListener('disconnect', handleDisconnect)
        }
    }, [hasProvider])

    // ─── Fetch Chain ID ─────────────────────────────────────────────────────
    const fetchChainId = useCallback(async () => {
        if (!hasProvider) return
        try {
            const hexId = await (window as any).ethereum.request({ method: 'eth_chainId' })
            setChainId(parseInt(hexId, 16))
        } catch { }
    }, [hasProvider])

    // ─── Fetch Balance ──────────────────────────────────────────────────────
    const fetchBalance = useCallback(async () => {
        if (!hasProvider || !address) return
        try {
            const hexBalance = await (window as any).ethereum.request({
                method: 'eth_getBalance',
                params: [address, 'latest'],
            })
            const wei = BigInt(hexBalance)
            setBalanceRaw(wei)
            const eth = Number(wei) / 1e18
            setBalance(eth.toFixed(4))
        } catch {
            setBalance(null)
            setBalanceRaw(null)
        }
    }, [hasProvider, address])

    // Auto-refresh balance
    useEffect(() => {
        fetchBalance()
        if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
        if (address) {
            refreshTimerRef.current = setInterval(fetchBalance, 15000) // every 15s
        }
        return () => {
            if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
        }
    }, [address, chainId, fetchBalance])

    // ─── Correct chain check ───────────────────────────────────────────────
    const isCorrectChain = chainId === chain.id

    // ─── Connect ────────────────────────────────────────────────────────────
    const connect = useCallback(async () => {
        if (!hasProvider) {
            setError('No wallet detected. Please install MetaMask or another EVM-compatible wallet.')
            setStatus('error')
            return
        }

        setStatus('connecting')
        setError(null)

        try {
            const accounts = await (window as any).ethereum.request({
                method: 'eth_requestAccounts',
            })

            if (accounts.length > 0) {
                setAddress(accounts[0])
                setStatus('connected')
                await fetchChainId()
            } else {
                setStatus('disconnected')
            }
        } catch (err: any) {
            if (err.code === 4001) {
                // User rejected
                setError('Connection rejected by user')
            } else {
                setError(err.message || 'Failed to connect wallet')
            }
            setStatus('error')
            // Reset to disconnected after showing error
            setTimeout(() => setStatus('disconnected'), 3000)
        }
    }, [hasProvider, fetchChainId])

    // ─── Disconnect ─────────────────────────────────────────────────────────
    const disconnect = useCallback(() => {
        setAddress(null)
        setBalance(null)
        setBalanceRaw(null)
        setStatus('disconnected')
        setChainId(null)
        setError(null)
    }, [])

    // ─── Switch Chain ───────────────────────────────────────────────────────
    const switchChain = useCallback(async (targetChain: Chain) => {
        setChain(targetChain)

        if (!hasProvider || !address) return

        const hexChainId = '0x' + targetChain.id.toString(16)

        try {
            await (window as any).ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: hexChainId }],
            })
        } catch (switchError: any) {
            // Chain not added to wallet — try adding it
            if (switchError.code === 4902) {
                try {
                    await (window as any).ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: hexChainId,
                            chainName: targetChain.name,
                            nativeCurrency: {
                                name: targetChain.symbol,
                                symbol: targetChain.symbol,
                                decimals: targetChain.decimals,
                            },
                            rpcUrls: [targetChain.rpc],
                            blockExplorerUrls: [targetChain.explorer],
                        }],
                    })
                } catch (addError: any) {
                    setError(`Failed to add ${targetChain.name}: ${addError.message}`)
                }
            } else if (switchError.code !== 4001) {
                setError(`Failed to switch to ${targetChain.name}: ${switchError.message}`)
            }
        }
    }, [hasProvider, address])

    // Set target chain without switching wallet
    const setTargetChain = useCallback((c: Chain) => {
        setChain(c)
    }, [])

    // ─── Deploy Contract ────────────────────────────────────────────────────
    const deployContract = useCallback(async (bytecode: string, abi: any[]): Promise<DeployResult> => {
        if (!hasProvider || !address) {
            return { success: false, error: 'Wallet not connected' }
        }

        if (!isCorrectChain) {
            return { success: false, error: `Please switch to ${chain.name} (Chain ID: ${chain.id})` }
        }

        try {
            // Ensure bytecode starts with 0x
            const data = bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`

            // Estimate gas first
            let gasEstimate: string
            try {
                gasEstimate = await (window as any).ethereum.request({
                    method: 'eth_estimateGas',
                    params: [{ from: address, data }],
                })
            } catch {
                // Fallback gas estimate based on bytecode size
                const fallbackGas = 21000 + ((data.length - 2) / 2) * 200 + 32000
                gasEstimate = '0x' + Math.ceil(fallbackGas * 1.3).toString(16) // 30% buffer
            }

            // Get gas price
            const gasPrice = await (window as any).ethereum.request({
                method: 'eth_gasPrice',
            })

            // Send the deployment transaction
            const txHash = await (window as any).ethereum.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: address,
                    data,
                    gas: gasEstimate,
                    gasPrice,
                }],
            })

            // Wait for receipt (poll)
            const receipt = await waitForReceipt(txHash)

            return {
                success: true,
                txHash,
                contractAddress: receipt?.contractAddress || undefined,
                gasUsed: receipt?.gasUsed || undefined,
                explorerUrl: `${chain.explorer}/tx/${txHash}`,
            }
        } catch (err: any) {
            if (err.code === 4001) {
                return { success: false, error: 'Transaction rejected by user' }
            }
            return { success: false, error: err.message || 'Deployment failed' }
        }
    }, [hasProvider, address, isCorrectChain, chain])

    // ─── Wait for receipt ───────────────────────────────────────────────────
    const waitForReceipt = async (txHash: string, maxAttempts = 60): Promise<any> => {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const receipt = await (window as any).ethereum.request({
                    method: 'eth_getTransactionReceipt',
                    params: [txHash],
                })
                if (receipt) return receipt
            } catch { }
            await new Promise(r => setTimeout(r, 2000)) // poll every 2s
        }
        return null
    }

    // ─── Send Transaction ──────────────────────────────────────────────────
    const sendTransaction = useCallback(async (to: string, data: string, value?: string) => {
        if (!hasProvider || !address) throw new Error('Wallet not connected')

        const params: any = { from: address, to, data }
        if (value) params.value = value

        const hash = await (window as any).ethereum.request({
            method: 'eth_sendTransaction',
            params: [params],
        })
        return { hash }
    }, [hasProvider, address])

    // ─── Get Gas Price ──────────────────────────────────────────────────────
    const getGasPrice = useCallback(async () => {
        if (!hasProvider) return '0'
        const hex = await (window as any).ethereum.request({ method: 'eth_gasPrice' })
        const gwei = Number(BigInt(hex)) / 1e9
        return gwei.toFixed(2)
    }, [hasProvider])

    // ─── Utils ──────────────────────────────────────────────────────────────
    const formatBalance = useCallback((decimals = 4): string => {
        if (!balance) return '0.0000'
        return Number(balance).toFixed(decimals)
    }, [balance])

    const shortAddress = useCallback((): string => {
        if (!address) return ''
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }, [address])

    const explorerLink = useCallback((type: 'address' | 'tx', hash: string): string => {
        return `${chain.explorer}/${type}/${hash}`
    }, [chain])

    // ─── Context Value ──────────────────────────────────────────────────────
    const value: WalletContextValue = {
        status,
        address,
        balance,
        balanceRaw,
        chain,
        chainId,
        isCorrectChain,
        error,
        hasProvider,
        connect,
        disconnect,
        switchChain,
        setTargetChain,
        deployContract,
        sendTransaction,
        getGasPrice,
        formatBalance,
        shortAddress,
        explorerLink,
    }

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    )
}

// ─── Hook ───────────────────────────────────────────────────────────────────
export function useWallet(): WalletContextValue {
    const ctx = useContext(WalletContext)
    if (!ctx) throw new Error('useWallet must be used within a WalletProvider')
    return ctx
}
