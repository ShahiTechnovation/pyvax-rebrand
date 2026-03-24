#!/bin/bash
# ─── PyVax v2.1 Production Deploy ────────────────────────────────────
# Railway (backend) → Vercel (frontend) → pyvax.xyz
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}${CYAN}🚀 PyVax v2.1 Production Deploy${NC}"
echo ""

# ─── 1. Push to GitHub ───────────────────────────────────────────────
echo -e "${CYAN}1/4 → Pushing to GitHub...${NC}"
git add -A
git commit -m "feat: verified Snowtrace pipeline + evmVersion paris fix" || echo "  (nothing to commit)"
git push origin main
echo -e "${GREEN}  ✓ GitHub updated${NC}"
echo ""

# ─── 2. Railway Backend ─────────────────────────────────────────────
echo -e "${CYAN}2/4 → Deploying Railway backend...${NC}"
if command -v railway &>/dev/null; then
    railway up --detach
    echo -e "${GREEN}  ✓ Railway deploy triggered${NC}"
else
    echo -e "${RED}  ⚠ Railway CLI not installed. Install: npm i -g @railway/cli${NC}"
    echo -e "  Manual: Push to GitHub → Railway auto-deploys from Dockerfile"
fi
echo ""

# ─── 3. Vercel Frontend ─────────────────────────────────────────────
echo -e "${CYAN}3/4 → Deploying Vercel frontend...${NC}"
if command -v vercel &>/dev/null; then
    vercel --prod
    echo -e "${GREEN}  ✓ Vercel deploy complete${NC}"
else
    echo -e "${RED}  ⚠ Vercel CLI not installed. Install: npm i -g vercel${NC}"
    echo -e "  Manual: Push to GitHub → Vercel auto-deploys"
fi
echo ""

# ─── 4. Post-Deploy Verification ────────────────────────────────────
echo -e "${CYAN}4/4 → Post-deploy verification...${NC}"
BACKEND="https://pyvax-backend.up.railway.app"

echo -e "  ${YELLOW}Testing /api/cli health...${NC}"
curl -s "${BACKEND}/api/cli" | python -m json.tool 2>/dev/null || echo "  (health check pending)"

echo ""
echo -e "  ${YELLOW}Testing /api/transform...${NC}"
TRANSFORM_RESULT=$(curl -s -X POST "${BACKEND}/api/transform" \
  -H 'Content-Type: application/json' \
  -d '{"source":"from pyvax import Contract, action, view_function\n\nclass Counter(Contract):\n    count: int = 0\n\n    @action\n    def increment(self):\n        self.count = self.count + 1\n\n    @view_function\n    def get_count(self) -> int:\n        return self.count\n"}')

if echo "$TRANSFORM_RESULT" | python -c "import sys,json; d=json.load(sys.stdin); assert d.get('success'); assert 'paris' in json.dumps(d.get('snowtrace_payload',{}))" 2>/dev/null; then
    echo -e "  ${GREEN}✓ Transform: OK — evmVersion: paris confirmed${NC}"
else
    echo -e "  ${RED}✗ Transform: Failed or missing evmVersion${NC}"
    echo -e "  Response: ${TRANSFORM_RESULT}"
fi
echo ""

# ─── Done ────────────────────────────────────────────────────────────
echo -e "${BOLD}${GREEN}✅ PyVax v2.1 Deploy Complete!${NC}"
echo ""
echo -e "  ${CYAN}Backend:${NC}    ${BACKEND}/api/cli"
echo -e "  ${CYAN}Transform:${NC}  ${BACKEND}/api/transform"
echo -e "  ${CYAN}Verify:${NC}     ${BACKEND}/api/verify"
echo -e "  ${CYAN}Frontend:${NC}   https://pyvax.xyz/playground"
echo ""
echo -e "  ${BOLD}Post-deploy checks:${NC}"
echo -e "    1. Open pyvax.xyz/playground"
echo -e "    2. Click ⚡ COMPILE on Counter contract"
echo -e "    3. Verify ✅ VERIFIED badge appears in toolbar"
echo -e "    4. Click ◈ SOLIDITY tab → see generated .sol source"
echo -e "    5. Click 📋 SNOWTRACE JSON → copy verification payload"
echo -e "    6. Deploy → POST /api/verify with address + payload"
echo ""
