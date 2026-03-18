# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅ Active |
| < 1.0   | ❌ EOL    |

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

### Responsible Disclosure

1. **Email**: Send a detailed report to **security@pyvax.xyz**
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if any)
3. **Response time**: We aim to acknowledge within **48 hours** and provide a fix timeline within **7 days**.

### Scope

The following areas are in scope for security reports:

| Area | Priority |
|------|----------|
| Private key handling & wallet encryption | 🔴 Critical |
| Transaction signing & broadcasting | 🔴 Critical |
| Python → EVM transpiler sandbox escape | 🟠 High |
| Agent tool execution & sandbox bypass | 🟠 High |
| RPC/API input validation | 🟡 Medium |
| Dependency vulnerabilities | 🟡 Medium |
| Configuration & secret handling | 🟡 Medium |

### Out of Scope

- Bugs in upstream dependencies (web3.py, eth-account) — report directly to those projects
- Social engineering attacks
- Denial of service via resource exhaustion (known limitation)
- Issues in the Next.js frontend (separate scope)

## Security Measures

PyVax implements the following security measures:

- **AST Sandbox**: The transpiler validates Python source before compilation, blocking dangerous imports and builtins
- **Wallet Encryption**: Private keys are encrypted with PBKDF2-SHA256 + Fernet (AES-128)
- **Transaction Simulation**: All state-changing transactions are simulated via `eth_call` before signing
- **Nonce Gap Detection**: Wallet warns on pending vs confirmed nonce mismatches
- **Gas Limit Caps**: Configurable maximum gas per transaction (default 500k)
- **Path Traversal Defense**: Agent filesystem tools validate paths stay within workspace
- **SSRF Protection**: Agent HTTP tools block requests to private/loopback IP ranges
- **Domain Allowlist**: Only whitelisted domains are accessible via agent HTTP tools
- **Wallet Policy Enforcement**: Per-tx and daily spending limits with contract allowlists
- **Git Arg Injection Defense**: Commit messages are sanitized to prevent flag injection

## Safe Harbor

We support safe harbor for security researchers who:

- Make a good faith effort to avoid privacy violations, data destruction, and service disruption
- Only interact with accounts you own or with explicit permission
- Report vulnerabilities promptly and do not exploit them beyond proof-of-concept
- Do not publicly disclose vulnerabilities before a fix is available

We will not pursue legal action against researchers who follow this policy.

## PGP Key

*A PGP key for encrypted vulnerability reports will be published here in a future release.*
