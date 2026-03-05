'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Editor from '@monaco-editor/react'
import { get, set } from 'idb-keyval'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { WalletProvider, useWallet } from '@/components/wallet-provider'
import { WalletButton, ChainPicker, DeployButton } from '@/components/wallet-button'
import { ContractInteraction } from '@/components/contract-interaction'

// ─── Types ──────────────────────────────────────────────────────────────────
interface TerminalLine {
  text: string
  type: 'prompt' | 'success' | 'error' | 'warning' | 'info' | 'muted' | 'bytecode' | ''
}

interface CompileResult {
  success: boolean
  command: string
  contract?: string
  bytecode?: string
  abi?: any[]
  metadata?: any
  size_bytes?: number
  estimated_gas?: number
  stdout?: string
  error?: string
}

// ─── Default Contracts ──────────────────────────────────────────────────────
const DEFAULT_FILES: Record<string, string> = {
  'contracts/AgentVault.py': `"""AgentVault — Production vault for PyVax AgentWallets."""
from pyvax import Contract, action, agent_action, human_action


class AgentVault(Contract):
    """Production-ready vault for PyVax AgentWallets."""

    balances: dict = {}
    total_deposits: int = 0

    @action
    def deposit(self, amount: int):
        """Deposit AVAX into this vault."""
        self.require(amount > 0, "Amount must be positive")
        sender = self.msg_sender()
        self.balances[sender] = self.balances[sender] + amount
        self.total_deposits = self.total_deposits + amount
        self.emit("Deposit", sender, amount)

    @agent_action
    def autonomous_rebalance(self):
        """Rebalance logic for AgentWallet only."""
        pass

    @human_action
    def withdraw(self, amount: int):
        """Withdraw AVAX — only callable by human EOA."""
        sender = self.msg_sender()
        self.require(self.balances[sender] >= amount, "Insufficient balance")
        self.balances[sender] = self.balances[sender] - amount
        self.total_deposits = self.total_deposits - amount
        self.emit("Withdraw", sender, amount)

    @action
    def balance_of(self, user: str) -> int:
        """Get balance for a specific address."""
        return self.balances[user]

    @action
    def get_total_deposits(self) -> int:
        """Get total deposits across all users."""
        return self.total_deposits
`,
  'contracts/Token.py': `"""ERC20 — Standard fungible token contract."""
from pyvax import Contract, action


class ERC20(Contract):
    """ERC-20 compatible token contract."""

    total_supply: int = 0
    balances: dict = {}
    decimals_: int = 18

    @action
    def mint(self, to: str, amount: int):
        """Mint new tokens to an address."""
        self.require(amount > 0, "Amount must be positive")
        self.balances[to] = self.balances[to] + amount
        self.total_supply = self.total_supply + amount
        self.emit("Transfer", 0, to, amount)

    @action
    def transfer(self, to: str, amount: int):
        """Transfer tokens to an address."""
        sender = self.msg_sender()
        self.require(self.balances[sender] >= amount, "Insufficient balance")
        self.balances[sender] = self.balances[sender] - amount
        self.balances[to] = self.balances[to] + amount
        self.emit("Transfer", sender, to, amount)

    @action
    def balance_of(self, owner: str) -> int:
        """Get token balance for an address."""
        return self.balances[owner]

    @action
    def total_supply_of(self) -> int:
        """Get total token supply."""
        return self.total_supply
`,
  'contracts/Voting.py': `"""Voting — Decentralized voting contract."""
from pyvax import Contract, action


class Voting(Contract):
    """Simple on-chain voting contract."""

    votes: dict = {}
    voter_status: dict = {}
    total_votes: int = 0

    @action
    def vote(self, candidate_id: int):
        """Cast a vote for a candidate."""
        sender = self.msg_sender()
        self.require(self.voter_status[sender] == 0, "Already voted")
        self.voter_status[sender] = 1
        self.votes[candidate_id] = self.votes[candidate_id] + 1
        self.total_votes = self.total_votes + 1
        self.emit("VoteCast", sender, candidate_id)

    @action
    def get_votes(self, candidate_id: int) -> int:
        """Get vote count for a candidate."""
        return self.votes[candidate_id]

    @action
    def get_total_votes(self) -> int:
        """Get total votes cast."""
        return self.total_votes
`,
}

// ─── Monaco Theme ───────────────────────────────────────────────────────────
const PYVAX_THEME = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [
    { token: 'comment', foreground: '4b5563', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'E84142' },
    { token: 'string', foreground: '7EC8A4' },
    { token: 'number', foreground: 'f78c6c' },
    { token: 'type', foreground: '8FAADC' },
    { token: 'delimiter', foreground: '89ddff' },
    { token: 'function', foreground: '8FAADC' },
    { token: 'variable', foreground: 'F2F2F2' },
    { token: 'decorator', foreground: 'C792EA' },
    { token: 'class', foreground: 'FFCB6B', fontStyle: 'bold' },
  ],
  colors: {
    'editor.background': '#09090B',
    'editor.foreground': '#E4E4E7',
    'editor.lineHighlightBackground': '#18181B',
    'editor.selectionBackground': '#E8414233',
    'editorCursor.foreground': '#E84142',
    'editorLineNumber.foreground': '#27272A',
    'editorLineNumber.activeForeground': '#52525B',
    'editorIndentGuide.background': '#18181B',
    'editorIndentGuide.activeBackground': '#27272A',
    'editorWidget.background': '#09090B',
    'editorWidget.border': '#27272A',
    'editorSuggestWidget.background': '#09090B',
    'editorSuggestWidget.border': '#27272A',
    'editorSuggestWidget.selectedBackground': '#E8414222',
  },
}

// ─── Helper ─────────────────────────────────────────────────────────────────
function contractName(file: string): string {
  return file.split('/').pop()?.replace('.py', '') || 'Contract'
}

// ─── Page Wrapper (provides wallet context) ─────────────────────────────────
export default function PlaygroundPage() {
  return (
    <WalletProvider>
      <PlaygroundInner />
    </WalletProvider>
  )
}

// ─── Main IDE Component ─────────────────────────────────────────────────────
function PlaygroundInner() {
  const wallet = useWallet()

  // State
  const [files, setFiles] = useState<Record<string, string>>({})
  const [activeFile, setActiveFile] = useState('contracts/AgentVault.py')
  const [isExecuting, setIsExecuting] = useState(false)
  const [lastResult, setLastResult] = useState<CompileResult | null>(null)
  const [lines, setLines] = useState<TerminalLine[]>([
    { text: '░ PyVax IDE v1.0.0 — Python to EVM Transpiler', type: 'info' },
    { text: '░ Type commands or use toolbar buttons', type: 'muted' },
    { text: '', type: '' },
  ])
  const [cmdInput, setCmdInput] = useState('')
  const [activeTab, setActiveTab] = useState<'output' | 'bytecode' | 'abi'>('output')
  const [optimizerLevel, setOptimizerLevel] = useState(1)
  const [showNewFileMenu, setShowNewFileMenu] = useState(false)
  const [deployedContracts, setDeployedContracts] = useState<{ address: string; name: string; chain: string; txHash: string }[]>([])
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null)
  const [rightPanelTab, setRightPanelTab] = useState<'deploy' | 'interact'>('deploy')

  // Refs
  const terminalRef = useRef<HTMLDivElement>(null)
  const editorSourceRef = useRef('')

  // ─── IndexedDB Load ─────────────────────────────────────────────────────
  useEffect(() => {
    get('pyvax-files-v2').then((stored) => {
      if (stored && Object.keys(stored).length > 0) {
        setFiles(stored)
        const first = Object.keys(stored)[0]
        setActiveFile(first)
      } else {
        setFiles(DEFAULT_FILES)
        set('pyvax-files-v2', DEFAULT_FILES)
      }
    })
    // Load deployed contracts history
    get('pyvax-deployed').then((stored) => {
      if (stored && stored.length > 0) setDeployedContracts(stored)
    })
  }, [])

  // Terminal auto-scroll
  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight
  }, [lines])

  // ─── Terminal ───────────────────────────────────────────────────────────
  const termPrint = useCallback((text: string, type: TerminalLine['type'] = '') => {
    setLines(prev => [...prev, { text, type }])
  }, [])

  const termClear = useCallback(() => {
    setLines([{ text: '░ Terminal cleared', type: 'muted' }, { text: '', type: '' }])
  }, [])

  // ─── API Call ───────────────────────────────────────────────────────────
  const callAPI = useCallback(async (command: string, sourceCode?: string) => {
    const body: any = { command }
    if (sourceCode !== undefined) {
      body.source = sourceCode
      body.contract_name = contractName(activeFile)
    }

    const res = await fetch('/api/pyvax', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`HTTP ${res.status}: ${text}`)
    }

    return res.json() as Promise<CompileResult>
  }, [activeFile])

  // ─── Execute Command ────────────────────────────────────────────────────
  const executeCommand = useCallback(async (rawCmd: string) => {
    if (isExecuting) return
    setIsExecuting(true)

    const cmd = rawCmd.trim()
    if (!cmd) { setIsExecuting(false); return }

    if (cmd === 'clear') { termClear(); setIsExecuting(false); return }

    termPrint(`$ ${cmd}`, 'prompt')

    try {
      const src = editorSourceRef.current || files[activeFile] || ''
      const result = await callAPI(cmd, src)

      if (result.stdout) {
        result.stdout.split('\n').forEach((line: string) => {
          if (!line.trim()) return
          if (line.includes('✓') || line.includes('PASS') || line.includes('OK') || line.includes('successfully') || line.includes('compiled')) {
            termPrint(line, 'success')
          } else if (line.includes('✗') || line.includes('FAIL') || line.includes('Error') || line.includes('error')) {
            termPrint(line, 'error')
          } else if (line.includes('⚠') || line.includes('WARNING') || line.includes('Dry run')) {
            termPrint(line, 'warning')
          } else if (line.includes('0x') || line.includes('Bytecode')) {
            termPrint(line, 'bytecode')
          } else {
            termPrint(line, '')
          }
        })
      }

      if (!result.success && result.error) {
        termPrint(`✗ Error: ${result.error}`, 'error')
      }

      if (result.success && ['compile', 'deploy', 'test'].includes(result.command)) {
        setLastResult(result)

        if (result.command === 'compile' && result.bytecode) {
          const name = contractName(activeFile)
          setFiles(prev => {
            const next = {
              ...prev,
              [`build/${name}.json`]: JSON.stringify({
                contractName: name,
                abi: result.abi,
                bytecode: result.bytecode,
                metadata: result.metadata,
              }, null, 2),
            }
            set('pyvax-files-v2', next).catch(console.error)
            return next
          })
          termPrint(`  → Artifact saved: build/${name}.json`, 'success')
        }
      }

      termPrint('', '')
    } catch (err: any) {
      termPrint(`✗ Network error: ${err.message}`, 'error')
      termPrint('', '')
    } finally {
      setIsExecuting(false)
    }
  }, [isExecuting, files, activeFile, termPrint, termClear, callAPI])

  // ─── Quick Actions ──────────────────────────────────────────────────────
  const doCompile = () => executeCommand(`pyvax compile --optimizer=${optimizerLevel}`)
  const doTest = () => executeCommand('pyvax test')

  // ─── Real Wallet Deploy ─────────────────────────────────────────────────
  const handleDeploy = useCallback(async (result: any) => {
    if (result.success) {
      termPrint(`✓ Contract deployed!`, 'success')
      termPrint(`  Tx: ${result.txHash}`, 'bytecode')
      if (result.contractAddress) {
        termPrint(`  Address: ${result.contractAddress}`, 'success')
        setDeployedAddress(result.contractAddress)
        setRightPanelTab('interact')  // Auto-switch to interact tab
      }
      if (result.explorerUrl) {
        termPrint(`  Explorer: ${result.explorerUrl}`, 'info')
      }
      if (result.gasUsed) {
        termPrint(`  Gas used: ${parseInt(result.gasUsed, 16).toLocaleString()}`, 'muted')
      }
      termPrint('', '')

      // Save to deployment history
      const entry = {
        address: result.contractAddress || '',
        name: contractName(activeFile),
        chain: wallet.chain.name,
        txHash: result.txHash || '',
      }
      setDeployedContracts(prev => {
        const next = [entry, ...prev].slice(0, 20) // keep last 20
        set('pyvax-deployed', next).catch(console.error)
        return next
      })
    } else {
      termPrint(`✗ Deploy failed: ${result.error}`, 'error')
      termPrint('', '')
    }
  }, [termPrint, activeFile, wallet.chain.name])

  // ─── File Management ────────────────────────────────────────────────────
  const createFile = (name: string, content: string) => {
    const newFiles = { ...files, [name]: content }
    setFiles(newFiles)
    set('pyvax-files-v2', newFiles)
    setActiveFile(name)
    setShowNewFileMenu(false)
  }

  const deleteFile = (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation()
    if (fileName.startsWith('build/')) { /* no confirm */ }
    else if (!confirm(`Delete ${fileName}?`)) return

    const newFiles = { ...files }
    delete newFiles[fileName]
    setFiles(newFiles)
    set('pyvax-files-v2', newFiles)
    if (activeFile === fileName) {
      setActiveFile(Object.keys(newFiles)[0] || '')
    }
  }

  // ─── Organized file tree ────────────────────────────────────────────────
  const contractFiles = Object.keys(files).filter(f => f.startsWith('contracts/'))
  const buildFiles = Object.keys(files).filter(f => f.startsWith('build/'))

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen w-full bg-[#09090B] font-[family-name:var(--font-dm-mono)] text-[#A1A1AA] selection:bg-[#E84142] selection:text-white overflow-hidden">

      {/* ─── HEADER BAR ─────────────────────────────────────────────────── */}
      <header className="h-[44px] shrink-0 bg-[#09090B] border-b border-[#1C1C1F] px-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-[family-name:var(--font-press-start)] text-[12px] text-[#E84142] hover:text-[#FF6666] transition-colors">
            PYVAX
          </Link>
          <span className="text-[9px] text-[#3F3F46] tracking-widest font-bold">IDE</span>

          {/* Chain Picker from wallet adapter */}
          <ChainPicker />
        </div>

        <div className="flex items-center gap-3">
          {/* Optimizer Level */}
          <div className="flex items-center gap-1.5 text-[9px] tracking-wider font-bold">
            <span className="text-[#3F3F46]">OPT</span>
            {[0, 1, 2, 3].map(level => (
              <button
                key={level}
                onClick={() => setOptimizerLevel(level)}
                className={`w-5 h-5 rounded text-[9px] transition-all ${optimizerLevel === level
                  ? 'bg-[#E84142] text-white shadow-[0_0_8px_rgba(232,65,66,0.3)]'
                  : 'bg-[#18181B] text-[#52525B] hover:text-[#A1A1AA]'}`}
              >{level}</button>
            ))}
          </div>

          <div className="w-px h-5 bg-[#1C1C1F]" />

          {/* Wallet Button from wallet adapter */}
          <WalletButton />
        </div>
      </header>

      {/* ─── TOOLBAR ────────────────────────────────────────────────────── */}
      <div className="h-[36px] shrink-0 bg-[#0C0C0E] border-b border-[#1C1C1F] px-3 flex items-center gap-1">
        <ToolBtn icon="⚡" label="COMPILE" accent onClick={doCompile} disabled={isExecuting} />
        <ToolBtn icon="🧪" label="TEST" onClick={doTest} disabled={isExecuting} />
        <div className="w-px h-4 bg-[#1C1C1F] mx-1" />
        <ToolBtn icon="📋" label="ABI" onClick={() => setActiveTab('abi')} disabled={!lastResult?.abi} />
        <ToolBtn icon="⬡" label="BYTECODE" onClick={() => setActiveTab('bytecode')} disabled={!lastResult?.bytecode} />
        <div className="flex-1" />
        {isExecuting && (
          <div className="flex items-center gap-2 text-[10px] text-[#E84142] tracking-wider font-bold animate-pulse">
            <div className="w-3 h-3 border border-[#27272A] border-t-[#E84142] rounded-full animate-spin" />
            TRANSPILING...
          </div>
        )}
        {lastResult?.success && !isExecuting && (
          <div className="flex items-center gap-2 text-[10px] text-[#22C55E] tracking-wider font-bold">
            <span>✓</span>
            {lastResult.size_bytes && <span className="text-[#52525B]">{lastResult.size_bytes}B</span>}
            {lastResult.metadata?.gas_estimate && <span className="text-[#52525B]">{lastResult.metadata.gas_estimate.toLocaleString()} gas</span>}
          </div>
        )}
      </div>

      {/* ─── MAIN CONTENT ───────────────────────────────────────────────── */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">

        {/* ─── LEFT: FILE EXPLORER ───────────────────────────────────────── */}
        <ResizablePanel defaultSize={15} minSize={10} maxSize={25} collapsible collapsedSize={0}>
          <div className="h-full bg-[#09090B] border-r border-[#1C1C1F] flex flex-col overflow-hidden">
            <div className="px-3 py-2.5 flex items-center justify-between">
              <span className="text-[9px] font-bold tracking-widest text-[#52525B]">EXPLORER</span>
              <div className="relative">
                <button
                  onClick={() => setShowNewFileMenu(!showNewFileMenu)}
                  className="text-[12px] text-[#52525B] hover:text-[#E84142] transition-colors w-5 h-5 flex items-center justify-center rounded hover:bg-[#18181B]"
                  title="New File"
                >+</button>
                {showNewFileMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-[#0C0C0E] border border-[#1C1C1F] rounded-lg shadow-2xl py-1 z-50 min-w-[180px]">
                    {[
                      { label: '📄 Empty Contract', name: 'contracts/NewContract.py', content: `from pyvax import Contract, action\n\n\nclass NewContract(Contract):\n    pass\n` },
                      { label: '🪙 ERC-20 Token', name: 'contracts/MyToken.py', content: DEFAULT_FILES['contracts/Token.py'] },
                      { label: '🗳️ Voting', name: 'contracts/MyVoting.py', content: DEFAULT_FILES['contracts/Voting.py'] },
                      { label: '🏦 Vault', name: 'contracts/MyVault.py', content: DEFAULT_FILES['contracts/AgentVault.py'] },
                    ].map(tmpl => (
                      <button
                        key={tmpl.label}
                        onClick={() => {
                          const name = prompt('File name:', tmpl.name) || tmpl.name
                          createFile(name, tmpl.content)
                        }}
                        className="w-full text-left px-3 py-1.5 text-[10px] text-[#A1A1AA] hover:bg-[#18181B] transition-colors"
                      >{tmpl.label}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-1">
              {contractFiles.length > 0 && (
                <FileGroup label="contracts" files={contractFiles} activeFile={activeFile} onSelect={setActiveFile} onDelete={deleteFile} />
              )}
              {buildFiles.length > 0 && (
                <FileGroup label="build" files={buildFiles} activeFile={activeFile} onSelect={setActiveFile} onDelete={deleteFile} isBuild />
              )}
            </div>

            {/* Deployed contracts */}
            {deployedContracts.length > 0 && (
              <div className="border-t border-[#1C1C1F] px-3 py-2 max-h-[120px] overflow-y-auto">
                <div className="text-[8px] font-bold tracking-widest text-[#3F3F46] mb-1.5">DEPLOYED</div>
                {deployedContracts.slice(0, 5).map((d, i) => (
                  <a
                    key={i}
                    href={`${wallet.chain.explorer}/address/${d.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 py-0.5 text-[9px] text-[#52525B] hover:text-[#E84142] transition-colors group"
                  >
                    <span className="w-1 h-1 bg-[#22C55E] rounded-full shrink-0" />
                    <span className="truncate group-hover:underline">{d.name}</span>
                    <span className="text-[#3F3F46] ml-auto">{d.chain}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle className="w-[1px] bg-[#1C1C1F] hover:bg-[#E84142] transition-colors data-[resize-handle-active]:bg-[#E84142]" />

        {/* ─── CENTER: EDITOR + TERMINAL ─────────────────────────────────── */}
        <ResizablePanel defaultSize={55} minSize={30}>
          <ResizablePanelGroup direction="vertical">

            {/* Editor */}
            <ResizablePanel defaultSize={65} minSize={25}>
              <div className="h-full flex flex-col bg-[#09090B]">
                <div className="h-[32px] shrink-0 border-b border-[#1C1C1F] flex items-end px-2 gap-0.5">
                  <div className="bg-[#E84142] text-white text-[9px] tracking-widest font-bold px-3 py-1 rounded-t flex items-center gap-1.5 cursor-default shadow-[0_-1px_6px_rgba(232,65,66,0.15)]">
                    <span className="text-[7px]">●</span>
                    {activeFile ? activeFile.split('/').pop()?.toUpperCase() : 'NO FILE'}
                  </div>
                </div>

                <div className="flex-1 relative">
                  {!activeFile && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center text-[#3F3F46] bg-[#09090B]">
                      Select or create a file to start coding.
                    </div>
                  )}
                  <Editor
                    height="100%"
                    language={activeFile.endsWith('.json') ? 'json' : 'python'}
                    value={files[activeFile] ?? ''}
                    theme="pyvax-dark"
                    onChange={(val) => {
                      const v = val ?? ''
                      editorSourceRef.current = v
                      setFiles(prev => {
                        if (prev[activeFile] === v) return prev
                        const next = { ...prev, [activeFile]: v }
                        set('pyvax-files-v2', next).catch(console.error)
                        return next
                      })
                    }}
                    onMount={(_editor, monaco) => {
                      monaco.editor.defineTheme('pyvax-dark', PYVAX_THEME)
                      monaco.editor.setTheme('pyvax-dark')
                    }}
                    options={{
                      fontFamily: "'DM Mono', 'JetBrains Mono', 'Fira Code', monospace",
                      fontSize: 13,
                      lineHeight: 22,
                      padding: { top: 16, bottom: 16 },
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      wordWrap: 'off',
                      tabSize: 4,
                      insertSpaces: true,
                      renderLineHighlight: 'line',
                      cursorBlinking: 'smooth',
                      scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                      suggestOnTriggerCharacters: true,
                      quickSuggestions: true,
                      readOnly: activeFile.startsWith('build/'),
                    }}
                  />
                </div>

                {/* Status bar */}
                <div className="h-[22px] shrink-0 border-t border-[#1C1C1F] bg-[#0C0C0E] flex items-center px-3 justify-between text-[9px] font-bold text-[#3F3F46] tracking-wider">
                  <div className="flex gap-3">
                    <span>Python 3.11</span>
                    <span>PyVax v1.0.0</span>
                    <span className="text-[#22C55E]">● Saved</span>
                  </div>
                  <span>{activeFile || 'Ready'}</span>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle className="h-[1px] bg-[#1C1C1F] hover:bg-[#E84142] transition-colors data-[resize-handle-active]:bg-[#E84142]" />

            {/* Terminal */}
            <ResizablePanel defaultSize={35} minSize={15}>
              <div className="h-full flex flex-col bg-[#09090B]">
                <div className="h-[28px] shrink-0 flex items-center px-3 border-b border-[#1C1C1F] gap-3">
                  {(['output', 'bytecode', 'abi'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`text-[9px] tracking-widest font-bold h-full flex items-center transition-colors ${activeTab === tab ? 'text-[#E84142] border-b border-[#E84142]' : 'text-[#3F3F46] hover:text-[#71717A]'}`}
                    >
                      {tab.toUpperCase()}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <button onClick={termClear} className="text-[9px] text-[#3F3F46] hover:text-[#A1A1AA] transition-colors tracking-wider font-bold">CLEAR</button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                  {activeTab === 'output' && (
                    <>
                      <div ref={terminalRef} className="flex-1 overflow-y-auto px-3 py-2 text-[11px] leading-[1.7]">
                        {lines.map((line, i) => (
                          <div
                            key={i}
                            className={`whitespace-pre-wrap break-all ${line.type === 'prompt' ? 'text-[#E84142] font-bold' :
                              line.type === 'success' ? 'text-[#22C55E]' :
                                line.type === 'error' ? 'text-[#EF4444]' :
                                  line.type === 'warning' ? 'text-[#F59E0B]' :
                                    line.type === 'info' ? 'text-[#60A5FA]' :
                                      line.type === 'muted' ? 'text-[#3F3F46]' :
                                        line.type === 'bytecode' ? 'text-[#A78BFA] font-mono' :
                                          'text-[#D4D4D8]'
                              }`}
                          >
                            {line.text || '\u00A0'}
                          </div>
                        ))}
                        {isExecuting && <div className="text-[#E84142] animate-pulse">█</div>}
                      </div>
                      <div className="shrink-0 h-[30px] border-t border-[#1C1C1F] flex items-center px-3 gap-2">
                        <span className="text-[10px] text-[#E84142] font-bold">$</span>
                        <input
                          value={cmdInput}
                          onChange={e => setCmdInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && cmdInput.trim()) {
                              executeCommand(cmdInput)
                              setCmdInput('')
                            }
                          }}
                          placeholder="pyvax compile --optimizer=3"
                          className="flex-1 bg-transparent text-[11px] text-[#D4D4D8] placeholder-[#27272A] outline-none font-[family-name:var(--font-dm-mono)]"
                          disabled={isExecuting}
                        />
                      </div>
                    </>
                  )}

                  {activeTab === 'bytecode' && (
                    <div className="flex-1 overflow-y-auto px-3 py-2">
                      {lastResult?.bytecode ? (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] text-[#3F3F46] tracking-widest font-bold">BYTECODE • {lastResult.size_bytes} BYTES</span>
                            <button
                              onClick={() => { navigator.clipboard.writeText(lastResult.bytecode || '') }}
                              className="text-[9px] text-[#52525B] hover:text-[#E84142] tracking-wider font-bold transition-colors"
                            >📋 COPY</button>
                          </div>
                          <div className="text-[10px] font-mono text-[#A78BFA] break-all leading-[1.8] select-all bg-[#0C0C0E] border border-[#1C1C1F] rounded-lg p-3">
                            {lastResult.bytecode}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[#3F3F46] text-[11px] mt-4 text-center">Compile a contract to view bytecode.</div>
                      )}
                    </div>
                  )}

                  {activeTab === 'abi' && (
                    <div className="flex-1 overflow-y-auto px-3 py-2">
                      {lastResult?.abi ? (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] text-[#3F3F46] tracking-widest font-bold">ABI • {lastResult.abi.length} ITEMS</span>
                            <button
                              onClick={() => { navigator.clipboard.writeText(JSON.stringify(lastResult.abi, null, 2)) }}
                              className="text-[9px] text-[#52525B] hover:text-[#E84142] tracking-wider font-bold transition-colors"
                            >📋 COPY</button>
                          </div>
                          <pre className="text-[10px] font-mono text-[#60A5FA] leading-[1.6] bg-[#0C0C0E] border border-[#1C1C1F] rounded-lg p-3">
                            {JSON.stringify(lastResult.abi, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <div className="text-[#3F3F46] text-[11px] mt-4 text-center">Compile a contract to view ABI.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle className="w-[1px] bg-[#1C1C1F] hover:bg-[#E84142] transition-colors data-[resize-handle-active]:bg-[#E84142]" />

        {/* ─── RIGHT: DEPLOY + INTERACT PANEL ───────────────────────────── */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={45}>
          <div className="h-full bg-[#09090B] border-l border-[#1C1C1F] flex flex-col overflow-hidden">

            {/* Panel tab switcher */}
            <div className="h-[36px] shrink-0 flex items-center px-3 gap-0.5 border-b border-[#1C1C1F]">
              {(['deploy', 'interact'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setRightPanelTab(tab)}
                  className={`text-[9px] tracking-widest font-bold px-2.5 py-1 rounded transition-all ${rightPanelTab === tab
                      ? tab === 'interact'
                        ? 'bg-[#60A5FA15] text-[#60A5FA]'
                        : 'bg-[#E8414215] text-[#E84142]'
                      : 'text-[#3F3F46] hover:text-[#71717A]'
                    }`}
                >
                  {tab === 'deploy' ? '🚀 DEPLOY' : '📖 INTERACT'}
                  {tab === 'interact' && deployedAddress && (
                    <span className="ml-1 w-1.5 h-1.5 bg-[#22C55E] rounded-full inline-block" />
                  )}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={() => { setLastResult(null); setDeployedAddress(null) }}
                className="text-[9px] font-bold tracking-widest text-[#3F3F46] hover:text-[#E84142] transition-colors"
              >⟳</button>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto">

              {/* ── DEPLOY TAB ───────────────────────────────────────── */}
              {rightPanelTab === 'deploy' && (
                <div className="flex flex-col h-full">
                  {/* Contract info grid */}
                  <div className="mx-4 mt-4 border border-[#1C1C1F] rounded-lg overflow-hidden">
                    <div className="grid grid-cols-2 border-b border-[#1C1C1F]">
                      <InfoCell label="CONTRACT" value={lastResult?.contract || contractName(activeFile)} />
                      <InfoCell label="SIZE" value={lastResult?.size_bytes ? `${(lastResult.size_bytes / 1024).toFixed(1)}kb` : '—'} />
                    </div>
                    <div className="grid grid-cols-2 border-b border-[#1C1C1F]">
                      <InfoCell label="NETWORK" value={wallet.chain.name} color={wallet.chain.color} />
                      <InfoCell label="CHAIN ID" value={String(wallet.chain.id)} />
                    </div>
                    <div className="grid grid-cols-2">
                      <InfoCell label="OPTIMIZER" value={`Level ${optimizerLevel}`} />
                      <InfoCell label="FUNCTIONS" value={lastResult?.metadata?.functions?.length?.toString() || '—'} />
                    </div>
                  </div>

                  {/* Wallet info panel */}
                  {wallet.status === 'connected' && (
                    <div className="mx-4 mt-3 bg-[#0C0C0E] border border-[#1C1C1F] rounded-lg p-3">
                      <div className="text-[8px] tracking-widest text-[#3F3F46] font-bold mb-1.5">WALLET</div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#E84142] to-[#FF6B6B] flex items-center justify-center text-[8px] text-white font-bold shrink-0">
                          {wallet.address?.slice(2, 4).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-[#E4E4E7] font-bold font-mono truncate">{wallet.shortAddress()}</div>
                          <div className="text-[9px] text-[#52525B]">{wallet.formatBalance(4)} {wallet.chain.symbol}</div>
                        </div>
                        <span className={`ml-auto w-1.5 h-1.5 rounded-full ${wallet.isCorrectChain ? 'bg-[#22C55E]' : 'bg-[#F59E0B] animate-pulse'}`} />
                      </div>
                    </div>
                  )}

                  {/* Gas Info */}
                  {lastResult?.metadata?.gas_estimate && (
                    <div className="mx-4 mt-3 bg-[#0C0C0E] border border-[#1C1C1F] rounded-lg p-3">
                      <div className="text-[8px] tracking-widest text-[#3F3F46] font-bold mb-1.5">GAS ESTIMATE</div>
                      <div className="text-[16px] text-[#22C55E] font-bold font-mono">
                        {lastResult.metadata.gas_estimate.toLocaleString()}
                      </div>
                      <div className="text-[9px] text-[#52525B] mt-0.5">
                        {lastResult.metadata.optimizer_level > 0 ? `Optimized (L${lastResult.metadata.optimizer_level})` : 'Unoptimized'}
                        {lastResult.metadata.bytecode_size_before_opt > (lastResult.size_bytes || 0) && (
                          <span className="text-[#22C55E] ml-1">
                            -{(((lastResult.metadata.bytecode_size_before_opt - (lastResult.size_bytes || 0)) / lastResult.metadata.bytecode_size_before_opt) * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Deployed address */}
                  {deployedAddress && (
                    <div className="mx-4 mt-3 bg-[#22C55E08] border border-[#22C55E20] rounded-lg p-3">
                      <div className="text-[8px] tracking-widest text-[#22C55E] font-bold mb-1">DEPLOYED AT</div>
                      <div className="text-[10px] text-[#22C55E] font-mono break-all">{deployedAddress}</div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(deployedAddress)}
                          className="text-[8px] text-[#52525B] hover:text-[#22C55E] transition-colors tracking-wider font-bold"
                        >📋 COPY</button>
                        <a
                          href={`${wallet.chain.explorer}/address/${deployedAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[8px] text-[#52525B] hover:text-[#22C55E] transition-colors tracking-wider font-bold"
                        >🔗 EXPLORER</a>
                        <button
                          onClick={() => setRightPanelTab('interact')}
                          className="text-[8px] text-[#60A5FA] hover:text-[#93C5FD] transition-colors tracking-wider font-bold ml-auto"
                        >📖 INTERACT →</button>
                      </div>
                    </div>
                  )}

                  {/* Deploy button */}
                  <div className="mt-auto p-4 border-t border-[#1C1C1F]">
                    <DeployButton
                      bytecode={lastResult?.bytecode}
                      abi={lastResult?.abi}
                      onResult={handleDeploy}
                      disabled={isExecuting || !lastResult?.success}
                    />

                    <div className="text-center mt-2 text-[9px] text-[#3F3F46] tracking-wider font-bold flex items-center justify-center gap-1.5">
                      EST GAS: {lastResult?.estimated_gas?.toLocaleString() || lastResult?.metadata?.gas_estimate?.toLocaleString() || '—'}
                      {lastResult?.success && <span className="w-1 h-1 bg-[#22C55E] rounded-full" />}
                    </div>

                    <div className="text-center mt-1.5">
                      <a href={wallet.chain.explorer} target="_blank" rel="noopener noreferrer"
                        className="text-[8px] text-[#52525B] hover:text-[#E84142] transition-colors tracking-wider">
                        View on {wallet.chain.explorer.includes('snowtrace') ? 'Snowtrace' : 'Explorer'} →
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* ── INTERACT TAB ─────────────────────────────────────── */}
              {rightPanelTab === 'interact' && (
                <div className="h-full">
                  {/* Manual address input if not deployed from here */}
                  {!deployedAddress && lastResult?.abi && (
                    <div className="px-4 py-3 border-b border-[#1C1C1F]">
                      <div className="text-[8px] tracking-widest text-[#3F3F46] font-bold mb-1.5">CONTRACT ADDRESS</div>
                      <input
                        type="text"
                        placeholder="0x... (paste deployed address)"
                        onChange={e => setDeployedAddress(e.target.value || null)}
                        className="w-full px-2.5 py-1.5 rounded bg-[#0C0C0E] border border-[#1C1C1F] text-[10px] text-[#E4E4E7] font-mono placeholder-[#27272A] outline-none focus:border-[#27272A] transition-colors"
                      />
                    </div>
                  )}
                  <ContractInteraction
                    address={deployedAddress}
                    abi={lastResult?.abi || []}
                    bytecode={lastResult?.bytecode}
                    contractName={lastResult?.contract || contractName(activeFile)}
                    onTerminalPrint={termPrint}
                  />
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ToolBtn({ icon, label, onClick, disabled, accent }: {
  icon: string; label: string; onClick: () => void; disabled?: boolean; accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] tracking-wider font-bold transition-all ${disabled ? 'opacity-30 cursor-not-allowed' :
        accent ? 'bg-[#E84142] text-white hover:bg-[#D42F30] shadow-[0_0_8px_rgba(232,65,66,0.2)]' :
          'text-[#71717A] hover:text-[#E4E4E7] hover:bg-[#18181B]'
        }`}
    >
      <span className="text-[11px]">{icon}</span>
      {label}
    </button>
  )
}

function InfoCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-2.5 border-r border-[#1C1C1F] last:border-r-0">
      <div className="text-[8px] text-[#3F3F46] tracking-widest font-bold mb-1">{label}</div>
      <div className="text-[11px] text-[#E4E4E7] font-bold truncate flex items-center gap-1.5">
        {color && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />}
        {value}
      </div>
    </div>
  )
}

function FileGroup({ label, files, activeFile, onSelect, onDelete, isBuild }: {
  label: string; files: string[]; activeFile: string;
  onSelect: (f: string) => void; onDelete: (e: React.MouseEvent, f: string) => void;
  isBuild?: boolean
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left flex items-center gap-1 px-2 py-1 text-[9px] tracking-widest font-bold text-[#52525B] hover:text-[#A1A1AA] transition-colors"
      >
        <span className="text-[8px]">{open ? '▾' : '▸'}</span>
        <span>{isBuild ? '📦' : '📂'}</span>
        {label.toUpperCase()}
        <span className="text-[#3F3F46] ml-auto text-[8px]">{files.length}</span>
      </button>
      {open && files.map(f => (
        <div
          key={f}
          onClick={() => onSelect(f)}
          className={`group flex items-center justify-between px-2 py-1 ml-3 cursor-pointer rounded text-[10px] transition-colors ${activeFile === f ? 'bg-[#18181B] text-[#E4E4E7]' : 'text-[#71717A] hover:text-[#A1A1AA] hover:bg-[#0C0C0E]'
            }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[9px]">{f.endsWith('.json') ? '📋' : '🐍'}</span>
            <span className="truncate">{f.split('/').pop()}</span>
          </div>
          <button
            onClick={(e) => onDelete(e, f)}
            className="text-[#3F3F46] hover:text-[#EF4444] opacity-0 group-hover:opacity-100 transition-all text-[10px]"
          >×</button>
        </div>
      ))}
    </div>
  )
}
