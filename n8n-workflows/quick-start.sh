#!/bin/bash

# Elaric AI - n8n Quick Start Script
# This script automates the n8n setup process

set -e  # Exit on error

echo "🚀 Elaric AI - n8n Quick Start Setup"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm found: $(npm --version)${NC}"
echo ""

# Install n8n globally
echo "📦 Installing n8n..."
if ! command -v n8n &> /dev/null; then
    npm install n8n -g
    echo -e "${GREEN}✅ n8n installed successfully${NC}"
else
    echo -e "${YELLOW}⚠️  n8n already installed${NC}"
fi

echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    cat > .env << 'EOF'
# n8n Configuration
N8N_WEBHOOK_URL=http://localhost:5678/webhook/generate-mockup
N8N_HOST=localhost
N8N_PORT=5678

# Gemini AI (Get your key from: https://makersuite.google.com/app/apikey)
GEMINI_API_KEY=your-gemini-api-key-here

# Supabase (Get from: Supabase Dashboard > Settings > API)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Environment
NODE_ENV=development
EOF
    echo -e "${GREEN}✅ Created .env file${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env file with your actual API keys${NC}"
    echo ""
fi

# Check if workflow file exists
if [ ! -f "n8n-workflows/elaric-ai-mockup-generator.json" ]; then
    echo -e "${RED}❌ Workflow file not found at: n8n-workflows/elaric-ai-mockup-generator.json${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Workflow file found${NC}"
echo ""

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✅ Environment variables loaded${NC}"
fi

echo ""
echo "===================================="
echo "🎉 Setup Complete!"
echo "===================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Edit .env file with your API keys:"
echo "   - GEMINI_API_KEY (from https://makersuite.google.com/app/apikey)"
echo "   - VITE_SUPABASE_URL (from Supabase Dashboard)"
echo "   - SUPABASE_SERVICE_ROLE_KEY (from Supabase Dashboard)"
echo ""
echo "2. Start n8n:"
echo "   ${GREEN}n8n${NC}"
echo ""
echo "3. Open n8n editor:"
echo "   ${GREEN}http://localhost:5678${NC}"
echo ""
echo "4. Import workflow:"
echo "   - Click 'Workflows' > 'Add Workflow' > 'Import from File'"
echo "   - Select: n8n-workflows/elaric-ai-mockup-generator.json"
echo ""
echo "5. Activate workflow:"
echo "   - Toggle switch in top right to 'Active'"
echo ""
echo "6. Test webhook:"
echo "   ${GREEN}curl -X POST http://localhost:5678/webhook/generate-mockup \\
     -H 'Content-Type: application/json' \\
     -d '{\"prompt\": \"Create a food delivery home screen\"}'${NC}"
echo ""
echo "7. Start Remix app (in another terminal):"
echo "   ${GREEN}npm run dev${NC}"
echo ""
echo "📚 Full documentation: N8N_SETUP_GUIDE.md"
echo ""
echo "Need help? Check troubleshooting section in the guide."
echo ""

# Ask if user wants to start n8n now
read -p "Start n8n now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 Starting n8n..."
    echo "Press Ctrl+C to stop"
    echo ""
    n8n
fi
