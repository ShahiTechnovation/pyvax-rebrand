'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { get, set } from 'idb-keyval'

interface TerminalLine {
  text: string
  type: 'prompt' | 'success' | 'error' | 'warning' | 'info' | 'muted' | ''
}

// ─── Default Contracts ────────────────────────────────────────────────────────
const DEFAULT_VAULT_CONTRACT = `from pyvax import Contract, network, agent_action

class AgentVault(Contract):
    def __init__(self):
        self.network = network.AVALANCHE_FUJI
        self.owner = None

    @agent_action
    def deposit(self, amount: int):
        """Deposit tokens for agent operations"""
        self.balance[msg.sender] += amount

    @agent_action
    def execute_swap(self, token_in: str, token_out: str, amount: int):
        """Execute DEX swap via agent wallet"""
        # Call Uniswap-like router onchain
        pass
`

const DEFAULT_TOKEN_CONTRACT = `from pyvax import Contract, action\n\nclass Token(Contract):\n    pass`

const DEFAULT_FILES: Record<string, string> = {
  'AgentVault.py': DEFAULT_VAULT_CONTRACT,
  'Token.py': DEFAULT_TOKEN_CONTRACT,
  'runtime.py': `# PyVax Agent Runtime\n\ndef run():\n    print("Agent Vault Runtime Initialized")\n`,
  'config.py': `# PyVax Agent Config\n\nNETWORK = "AVALANCHE_FUJI"\n`
}

export default function Playground() {
  const [editorReady, setEditorReady] = useState(false)
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  // Real State Integration
  const [files, setFiles] = useState<Record<string, string>>({})
  const [activeFile, setActiveFile] = useState('AgentVault.py')
  const [source, setSource] = useState(DEFAULT_VAULT_CONTRACT) // internal source sync
  const [isExecuting, setIsExecuting] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const [lines, setLines] = useState<TerminalLine[]>([
    { text: '$ pyvax ready.', type: 'info' }
  ])

  // Wallet
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Load from IndexedDB on mount
  useEffect(() => {
    get('pyvax-files').then((stored) => {
      if (stored && Object.keys(stored).length > 0) {
        setFiles(stored)
        const firstFile = Object.keys(stored)[0]
        setActiveFile(firstFile)
        setSource(stored[firstFile])
      } else {
        setFiles(DEFAULT_FILES)
        set('pyvax-files', DEFAULT_FILES)
        setActiveFile('AgentVault.py')
        setSource(DEFAULT_VAULT_CONTRACT)
      }
    })

    // Auto sync connected wallet if already authorized
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0])
        }
      }).catch(console.error)
    }
  }, [])

  // ─── Monaco Editor Setup ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    if ((window as any).__monacoLoaded) return;

    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.50.0/min/vs/loader.min.js'
    script.onload = () => {
      (window as any).__monacoLoaded = true;
      const req = (window as any).require
      req.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.50.0/min/vs' } })
      req(['vs/editor/editor.main'], (monaco: any) => {
        monacoRef.current = monaco

        // Define PyVax theme matching the screenshot closely
        monaco.editor.defineTheme('pyvax-dark', {
          base: 'vs-dark',
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
            { token: 'decorator', foreground: '8FAADC' },
            { token: 'class', foreground: '8FAADC', fontStyle: 'bold' }
          ],
          colors: {
            'editor.background': '#0E0F11',
            'editor.foreground': '#F2F2F2',
            'editor.lineHighlightBackground': '#1A1A1A50',
            'editor.selectionBackground': '#E8414233',
            'editorCursor.foreground': '#E84142',
            'editorLineNumber.foreground': '#333333',
            'editorLineNumber.activeForeground': '#666666',
            'editorIndentGuide.background': '#1A1A1A',
            'editorIndentGuide.activeBackground': '#333333',
          }
        })

        const container = document.getElementById('monaco-editor')
        if (!container) return

        const editor = monaco.editor.create(container, {
          value: '',
          language: 'python',
          theme: 'pyvax-dark',
          fontFamily: "'DM Mono', 'JetBrains Mono', 'Fira Code', monospace",
          fontSize: 13,
          lineHeight: 22,
          padding: { top: 16, bottom: 16 },
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          tabSize: 4,
          insertSpaces: true,
          automaticLayout: true,
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
        })

        editorRef.current = editor
        setEditorReady(true)

        // Handle typing -> autsave to state -> autsave to indexedDb
        editor.onDidChangeModelContent(() => {
          const val = editor.getValue()
          setSource(val)
          setFiles(prev => {
            // Only save if it's the currently active file being edited
            if (prev[activeFile] === val) return prev
            const next = { ...prev, [activeFile]: val }
            set('pyvax-files', next).catch(console.error)
            return next
          })
        })
      })
    }
    document.head.appendChild(script)

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose()
        editorRef.current = null
      }
    }
  }, [activeFile])

  // Sync editor value when active file or files load changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current && files[activeFile] !== undefined) {
      if (editorRef.current.getValue() !== files[activeFile]) {
        // Change language dynamically based on extension
        const isPy = activeFile.endsWith('.py')
        monacoRef.current.editor.setModelLanguage(editorRef.current.getModel(), isPy ? 'python' : 'plaintext')
        editorRef.current.setValue(files[activeFile])
        setSource(files[activeFile])
      }
    }
  }, [activeFile, files])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [lines])

  const termPrint = useCallback((text: string, type: TerminalLine['type'] = '') => {
    setLines(prev => [...prev, { text, type }])
  }, [])

  const callAPI = useCallback(async (command: string, sourceCode: string | null = null) => {
    const body: any = { command }
    if (sourceCode !== null) {
      body.source = sourceCode
      body.contract_name = activeFile.replace('.py', '')
    }

    const API_URL = process.env.NEXT_PUBLIC_PYVAX_API_URL || '/api/pyvax'
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`HTTP ${res.status}: ${text}`)
    }

    return res.json()
  }, [activeFile])

  const executeCommand = useCallback(async (rawCmd: string) => {
    if (isExecuting) return
    setIsExecuting(true)

    const cmd = rawCmd.trim()
    if (!cmd) { setIsExecuting(false); return }

    termPrint(`$ ${cmd}`, 'prompt')

    try {
      const src = editorRef.current?.getValue() || source
      const result = await callAPI(cmd, src)

      if (result.stdout) {
        result.stdout.split('\n').forEach((line: string) => {
          if (!line.trim()) return
          if (line.includes('✓') || line.includes('PASS') || line.includes('OK') || line.includes('successfully')) {
            termPrint(line, 'success')
          } else if (line.includes('✗') || line.includes('FAIL') || line.includes('Error') || line.includes('error')) {
            termPrint(line, 'error')
          } else if (line.includes('⚠') || line.includes('WARNING')) {
            termPrint(line, 'warning')
          } else {
            termPrint(line, '')
          }
        })
      }

      if (!result.success && result.error) {
        termPrint(`Error: ${result.error}`, 'error')
      }

      if (result.success && ['compile', 'deploy', 'test'].includes(result.command)) {
        setLastResult(result)
      }

      termPrint('', '')
    } catch (err: any) {
      termPrint(`Network error: ${err.message}`, 'error')
      termPrint('', '')
    } finally {
      setIsExecuting(false)
    }
  }, [isExecuting, source, termPrint, callAPI])

  // File explorer actions
  const createNewFile = () => {
    const name = prompt("Enter file name (e.g., NewContract.py):");
    if (!name?.trim()) return;

    let fileName = name.trim();
    if (!fileName.includes('.')) fileName += '.py';

    if (files[fileName]) {
      alert("File already exists!");
      return;
    }

    const defaultContent = fileName.endsWith('.py') ? `# ${fileName}\nfrom pyvax import Contract\n\n` : '';
    const newFiles = { ...files, [fileName]: defaultContent };

    setFiles(newFiles);
    set('pyvax-files', newFiles);
    setActiveFile(fileName);
  }

  const deleteFile = (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;

    const newFiles = { ...files };
    delete newFiles[fileName];

    setFiles(newFiles);
    set('pyvax-files', newFiles);

    if (activeFile === fileName) {
      const remaining = Object.keys(newFiles);
      if (remaining.length > 0) {
        setActiveFile(remaining[0]);
      } else {
        setActiveFile('');
        if (editorRef.current) editorRef.current.setValue('');
      }
    }
  }

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        setIsConnecting(true);
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } catch (err: any) {
        console.error("Wallet connection failed:", err);
      } finally {
        setIsConnecting(false);
      }
    } else {
      alert("No MetaMask or EVM wallet detected. Please install a wallet extension.");
    }
  }

  const disconnectWallet = () => {
    setWalletAddress(null);
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#0E0F11] font-[family-name:var(--font-dm-mono)] text-[#888888] selection:bg-[#E84142] selection:text-white overflow-hidden">

      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <header className="h-[48px] shrink-0 bg-[#0A0B0C] border-b border-[#1A1A1A] px-4 flex items-center justify-between z-10 text-[10px] tracking-widest font-bold">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-[family-name:var(--font-press-start)] text-[14px] text-[#E84142] hover:text-[#FF5555] transition-colors relative top-px">
            PYVAX
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-[#666] cursor-pointer hover:text-[#bbb] transition-colors">AVALANCHE FUJI ▼</span>

            {walletAddress ? (
              <span
                onClick={disconnectWallet}
                className="text-[#4CAF50] flex items-center gap-1.5 cursor-pointer hover:text-[#FF6B6B] transition-colors group"
                title="Click to disconnect"
              >
                <span className="w-1.5 h-1.5 bg-[#4CAF50] group-hover:bg-[#FF6B6B] rounded-full inline-block"></span>
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="text-[#E84142] flex items-center gap-1.5 hover:text-[#FF5555] cursor-pointer"
              >
                {isConnecting ? 'CONNECTING...' : 'CONNECT WALLET'}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-[14px]">
          <button className="text-[#666] hover:text-[#E84142] transition-colors">⚙</button>
          <button className="text-[#e2b95b] hover:text-[#FFD700] transition-colors">☀</button>
        </div>
      </header>

      {/* ─── MAIN CONTENT LAYOUT ────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ─── LEFT SIDEBAR ─────────────────────────────────────────────── */}
        <aside className="w-[220px] shrink-0 bg-[#0A0B0C] border-r border-[#1A1A1A] flex flex-col pt-4">
          <div className="px-4 mb-4 flex-1 overflow-y-auto">
            <div className="text-[10px] font-bold text-[#E84142] tracking-widest flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 text-xs">📁 WORKSPACE</span>
              <button onClick={createNewFile} className="hover:text-white" title="New File">+</button>
            </div>

            <div className="flex flex-col gap-1 text-[11px]">
              {Object.keys(files).length === 0 && (
                <div className="text-[#555] italic px-2">No files. Create one!</div>
              )}
              {Object.keys(files).map((fileName) => (
                <div
                  key={fileName}
                  className={`group flex items-center justify-between px-2 py-1.5 cursor-pointer ${activeFile === fileName ? 'bg-[#1A1A1A] text-[#F2F2F2]' : 'text-[#888] hover:text-[#ccc]'}`}
                  onClick={() => setActiveFile(fileName)}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-xs">{fileName.endsWith('.py') ? '📄' : '📝'}</span>
                    <span className="truncate">{fileName}</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => deleteFile(e, fileName)}
                      className="text-[#555] hover:text-[#E84142]"
                      title="Delete File"
                    >
                      ×
                    </button>
                    {activeFile === fileName && <span className="w-1.5 h-1.5 bg-[#4CAF50] rounded-full"></span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ─── CENTER EDITOR AREA ──────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0E0F11]">
          {/* Editor Header / Tabs */}
          <div className="h-[40px] shrink-0 border-b border-[#1A1A1A] flex items-end px-4 gap-2">
            <div className="bg-[#E84142] text-white text-[10px] tracking-widest font-bold px-4 py-1.5 rounded-t-lg flex items-center gap-2 cursor-pointer shadow-[0_-2px_10px_rgba(232,65,66,0.2)]">
              {activeFile ? activeFile.toUpperCase() : 'NO FILE'} <span className="text-[8px]">▾</span>
            </div>
            <div
              onClick={() => executeCommand('pyvax compile')}
              className={`text-[#666] text-[10px] tracking-widest font-bold px-4 py-1.5 cursor-pointer ${isExecuting ? 'opacity-50' : 'hover:text-[#ccc]'} transition-colors flex items-center gap-2`}>
              COMPILE <span className="text-[8px]">▸</span>
            </div>
            <div
              onClick={() => executeCommand('pyvax deploy --dry-run')}
              className={`text-[#666] text-[10px] tracking-widest font-bold px-4 py-1.5 cursor-pointer ${isExecuting ? 'opacity-50' : 'hover:text-[#ccc]'} transition-colors flex items-center gap-2`}>
              DEPLOY <span className="text-[8px]">▸</span>
            </div>
            <div
              onClick={() => executeCommand('pyvax test')}
              className={`text-[#666] text-[10px] tracking-widest font-bold px-4 py-1.5 cursor-pointer ${isExecuting ? 'opacity-50' : 'hover:text-[#ccc]'} transition-colors flex items-center gap-2`}>
              TEST <span className="text-[8px]">▸</span>
            </div>
          </div>

          {/* Code Editor */}
          <div className="flex-1 relative">
            {!activeFile && (
              <div className="absolute inset-0 z-10 flex items-center justify-center text-[#555] bg-[#0E0F11]">
                Select or create a file to start coding.
              </div>
            )}
            <div id="monaco-editor" className="absolute inset-0" />
            {isExecuting && (
              <div className="absolute inset-0 bg-[#090909]/70 backdrop-blur-[2px] flex items-center justify-center z-10">
                <div className="flex items-center gap-3 px-5 py-3 bg-[#111] border border-[#222] rounded-lg shadow-2xl">
                  <div className="w-4 h-4 border-2 border-[#333] border-t-[#E84142] rounded-full animate-spin" />
                  <span className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#ccc]">
                    Executing...
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Editor Status Bar */}
          <div className="h-[24px] shrink-0 border-t border-[#1A1A1A] bg-[#0A0B0C] flex items-center px-4 justify-between text-[10px] font-bold text-[#444]">
            <div className="flex gap-4">
              <span>Python 3.11</span>
              <span>Linting: pylint</span>
              <span className="text-[#4CAF50]">{files[activeFile] !== undefined ? 'Saved to Local Storage' : ''}</span>
            </div>
            <div>
              {activeFile || 'Ready'}
            </div>
          </div>

          {/* ─── BOTTOM TERMINAL PANEL ───────────────────────────────────── */}
          <div className="h-[200px] shrink-0 border-t border-[#1A1A1A] bg-[#0A0B0C] flex flex-col relative z-20">
            {/* Terminal Tabs */}
            <div className="flex items-center px-4 h-[30px] border-b border-[#1A1A1A] gap-4 text-[10px] font-bold tracking-widest">
              <div className="text-[#E84142] flex items-center gap-1.5 cursor-pointer border-b-2 border-[#E84142] h-full">
                OUTPUT <span className="text-[8px]">▾</span>
              </div>
              <div className="text-[#555] cursor-pointer hover:text-[#888] h-full flex items-center">LOGS</div>
              <div className="text-[#555] cursor-pointer hover:text-[#888] h-full flex items-center">DEBUG</div>
            </div>

            {/* Terminal Content */}
            <div
              ref={terminalRef}
              className="flex-1 overflow-y-auto p-4 text-[11px] leading-relaxed">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className={`whitespace-pre-wrap break-all ${line.type === 'prompt' ? 'text-[#E84142]' :
                    line.type === 'success' ? 'text-[#4CAF50]' :
                      line.type === 'error' ? 'text-[#FF6B6B]' :
                        line.type === 'warning' ? 'text-[#FFA500]' :
                          line.type === 'info' ? 'text-[#63B3ED]' :
                            line.type === 'muted' ? 'text-[#444]' :
                              'text-[#C0C0C0]'
                    }`}
                >
                  {line.text || '\u00A0'}
                </div>
              ))}
              {isExecuting && <div className="text-[#F2F2F2] animate-pulse">_</div>}
            </div>
          </div>
        </main>

        {/* ─── RIGHT DEPLOY PANEL ──────────────────────────────────────── */}
        <aside className="w-[320px] lg:w-[380px] shrink-0 bg-[#0E0F11] border-l border-[#1A1A1A] flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="text-[10px] font-bold text-[#F2F2F2] tracking-widest flex items-center gap-2">
              {lastResult?.success ? 'COMPILED' : 'READY'}
              {lastResult?.success && <><span className="text-[#4CAF50]">✓</span> <span className="text-[#555] normal-case">(Just now)</span></>}
            </div>
            <div
              onClick={() => lastResult ? setLastResult(null) : null}
              className="text-[10px] font-bold text-[#E84142] tracking-widest cursor-pointer hover:text-[#FF5555]">
              [REFRESH ⟳]
            </div>
          </div>

          {/* Stats Grid */}
          <div className="border border-[#1A1A1A] rounded bg-[#0A0B0C] mb-8">
            <div className="grid grid-cols-2 border-b border-[#1A1A1A]">
              <div className="p-3 border-r border-[#1A1A1A]">
                <div className="text-[9px] text-[#555] tracking-widest mb-1.5">NAME</div>
                <div className="text-[11px] text-[#F2F2F2] font-bold truncate p-1">
                  {lastResult?.contract || (activeFile ? activeFile.replace('.py', '') : '-')}
                </div>
              </div>
              <div className="p-3">
                <div className="text-[9px] text-[#555] tracking-widest mb-1.5">SIZE</div>
                <div className="text-[11px] text-[#F2F2F2] font-bold">{lastResult?.size_bytes ? (lastResult.size_bytes / 1024).toFixed(1) + 'kb' : '0kb'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 border-b border-[#1A1A1A]">
              <div className="p-3 border-r border-[#1A1A1A]">
                <div className="text-[9px] text-[#555] tracking-widest mb-1.5">NETWORK</div>
                <div className="text-[11px] text-[#F2F2F2] font-bold flex items-center gap-1.5">
                  Fuji Testnet <span className="w-1.5 h-1.5 bg-[#4CAF50] rounded-full inline-block"></span>
                </div>
              </div>
              <div className="p-3">
                <div className="text-[9px] text-[#555] tracking-widest mb-1.5">ADDRESS</div>
                <div className="text-[11px] text-[#F2F2F2] font-bold font-mono">0x4a2f3a...c1d2</div>
              </div>
            </div>
            <div className="grid grid-cols-2">
              <div className="p-3 border-r border-[#1A1A1A]">
                <div className="text-[9px] text-[#555] tracking-widest mb-1.5">CREATOR</div>
                <div className="text-[11px] text-[#F2F2F2] font-bold font-mono truncate p-1">
                  {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '0xYourAgent...'}
                </div>
              </div>
              <div className="p-3">
                <div className="text-[9px] text-[#555] tracking-widest mb-1.5">CREATED</div>
                <div className="text-[11px] text-[#F2F2F2] font-bold">{lastResult?.success ? 'Just now' : '-'}</div>
              </div>
            </div>
          </div>

          {/* Contract Selector */}
          <div className="border border-[#1A1A1A] rounded p-3 flex items-center justify-between mb-8 cursor-pointer hover:border-[#333] transition-colors bg-[#0A0B0C]">
            <div className="text-[10px] text-[#555] font-bold tracking-widest flex items-center gap-2">
              <span>▾</span> CONTRACT:
            </div>
            <div className="text-[11px] text-[#F2F2F2] font-bold flex items-center gap-2 truncate p-1">
              {lastResult?.contract || (activeFile ? activeFile.replace('.py', '') : '')} <span>▾</span>
            </div>
          </div>

          {/* Inputs Section */}
          <div className="mb-8">
            <div className="text-[10px] text-[#555] font-bold tracking-widest mb-4">
              INPUTS:
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-[#F2F2F2] font-bold">amount</div>
                <div className="text-[11px] text-[#555] font-mono">[uint256]</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-[#F2F2F2] font-bold">token_in</div>
                <div className="text-[11px] text-[#555] font-mono">[0xUniswap...]</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-[#F2F2F2] font-bold">token_out</div>
                <div className="text-[11px] text-[#555] font-mono">[0xAVAX...]</div>
              </div>
            </div>
          </div>

          {/* Deploy Button */}
          <div className="mt-auto">
            {walletAddress ? (
              <button
                onClick={() => executeCommand('pyvax deploy --dry-run')}
                disabled={isExecuting || !lastResult?.success}
                className={`w-full bg-[#E84142] ${(!lastResult?.success || isExecuting) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#FF5555]'} text-white text-[10px] font-bold tracking-widest py-4 rounded-lg flex items-center justify-center gap-2 transition-all transform ${(!lastResult?.success || isExecuting) ? '' : 'active:scale-[0.98]'} shadow-[0_0_20px_rgba(232,65,66,0.15)]`}>
                DEPLOY <span className="text-[12px] font-normal">→</span>
              </button>
            ) : (
              <button
                onClick={connectWallet}
                className="w-full bg-[#202225] hover:bg-[#333] border border-[#303338] text-white text-[10px] font-bold tracking-widest py-4 rounded-lg flex items-center justify-center gap-2 transition-all">
                CONNECT WALLET TO DEPLOY
              </button>
            )}

            <div className="text-center mt-3 text-[10px] text-[#555] tracking-widest font-bold flex items-center justify-center gap-1.5">
              EST GAS: {lastResult?.estimated_gas?.toLocaleString() || lastResult?.metadata?.gas_estimate?.toLocaleString() || '69,234'} <span className="w-1.5 h-1.5 bg-[#4CAF50] rounded-full inline-block"></span>
            </div>
          </div>

        </aside >
      </div>
    </div>
  )
}
