#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# PyVax v1.0.0 — End-to-End Demo Script
# ─────────────────────────────────────────────────────────
# Run: bash demo.sh
set -e

echo "╔══════════════════════════════════════════════════════╗"
echo "║  🔥 PyVax v1.0.0 — End-to-End Demo                 ║"
echo "║  Python → EVM → Avalanche                           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 0: Install
echo -e "${CYAN}[Step 0]${NC} Installing PyVax CLI..."
pip install -e . --quiet 2>/dev/null || pip install -e .
echo -e "${GREEN}✓ PyVax installed${NC}"
echo ""

# Step 1: Show version
echo -e "${CYAN}[Step 1]${NC} Version check..."
pyvax version
echo ""

# Step 2: Scaffold new project
echo -e "${CYAN}[Step 2]${NC} Scaffolding demo project..."
rm -rf demo_project
pyvax new demo_project --template ERC20 --chain fuji
echo ""

# Step 3: Show project structure
echo -e "${CYAN}[Step 3]${NC} Project structure:"
find demo_project -type f | head -20
echo ""

# Step 4: Compile contract
echo -e "${CYAN}[Step 4]${NC} Compiling ERC20 contract (optimizer level 3)..."
cd demo_project
pyvax compile --optimizer=3
echo ""

# Step 5: Show build artifacts
echo -e "${CYAN}[Step 5]${NC} Build artifacts:"
find build -type f
echo ""

# Step 6: Run doctor
echo -e "${CYAN}[Step 6]${NC} Running environment diagnostic..."
pyvax doctor || true
echo ""

# Step 7: Show config
echo -e "${CYAN}[Step 7]${NC} Active configuration:"
pyvax config
echo ""

# Step 8: Test compilation
echo -e "${CYAN}[Step 8]${NC} Running compilation tests..."
pyvax test
echo ""

# Cleanup
cd ..

echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ Demo complete!                                   ║"
echo "║                                                      ║"
echo "║  Next: Set PRIVATE_KEY in .env, then:                ║"
echo "║    pyvax deploy ERC20 --chain fuji                   ║"
echo "║    pyvax call ERC20 totalSupply --view               ║"
echo "╚══════════════════════════════════════════════════════╝"
