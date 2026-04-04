# PyVax v2 — Production Deployment Guide

## Architecture

```
User → pyvax.xyz/playground → Vercel (Next.js)
                                    ↓ POST /api/pyvax
                              Railway (FastAPI)
                                    ↓
                          avax_cli.api_wrapper
                                    ↓
                    ┌───────────────┴───────────────┐
                    │ compile (transpiler)          │ transform (transformer)
                    │ → bytecode + ABI             │ → Solidity source
                    └──────────────────────────────┘
```

## Environment Variables

### Railway
| Variable | Required | Description |
|----------|----------|-------------|
| `SNOWTRACE_API_KEY` | Optional | Snowtrace API key for contract verification |
| `CORS_ORIGINS` | Auto-set | Allowed frontend origins |

### Vercel
| Variable | Required | Description |
|----------|----------|-------------|
| `RAILWAY_BACKEND_URL` | Yes | Full URL: `https://pyvax-rebrand-production.up.railway.app/api/cli` |

## Deploy

```bash
# One-command deploy
chmod +x deploy.sh && ./deploy.sh

# Or manually:
git push origin main          # Triggers both Railway + Vercel
railway up                    # Railway only
vercel --prod                 # Vercel only
```

## Post-Deploy Testing

### 1. Backend Health
```bash
curl https://pyvax-rebrand-production.up.railway.app/api/cli
# → {"status":"ok","commands":["new","compile","test","deploy","transform",...]}
```

### 2. Transform API
```bash
curl -X POST https://pyvax-rebrand-production.up.railway.app/api/cli \
  -H 'Content-Type: application/json' \
  -d '{"command":"transform","source":"from pyvax import Contract, action, view_function\nclass Counter(Contract):\n    count: int = 0\n    @action\n    def increment(self):\n        self.count = self.count + 1\n    @view_function\n    def get_count(self) -> int:\n        return self.count"}'
# → {"success":true,"solidity":"// SPDX-License-Identifier: MIT\n...","abi":[...]}
```

### 3. Playground UI
1. Open `pyvax.xyz/playground`
2. Click ⚡ COMPILE → see compilation results
3. Wait for auto-transform → ✅ VERIFIED badge appears
4. Click ◈ SOLIDITY tab → view generated `.sol` source
5. Click 📋 COPY → paste into Remix/Snowtrace

## Files Modified

| File | Change |
|------|--------|
| `railway-backend/main.py` | Added `transform` command routing |
| `railway-backend/Dockerfile` | Upgraded to Python 3.13-slim |
| `railway-backend/requirements.txt` | Added `requests` |
| `railway.toml` | Added env vars |
| `app/api/pyvax/route.ts` | Added `transform` to commands |
| `app/playground/page.tsx` | Solidity tab + ✅ Verified badge |
| `deploy.sh` | One-command deploy |
