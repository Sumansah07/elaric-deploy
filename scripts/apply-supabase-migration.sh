#!/bin/bash

echo "🚀 Applying Supabase Persistence Migration"
echo "=========================================="
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env"
    exit 1
fi

echo "✅ .env file found"
echo ""

# Check if Supabase is initialized
if [ ! -d "supabase" ]; then
    echo "⚠️  Supabase not initialized!"
    echo "Run: supabase init"
    exit 1
fi

echo "✅ Supabase initialized"
echo ""

# Apply migrations
echo "📦 Applying migrations..."
echo ""

supabase migration up

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Update app/root.tsx to include SupabasePersistenceProvider"
    echo "2. Update store imports to use Supabase versions"
    echo "3. Test user isolation and data sync"
    echo ""
    echo "See SETUP_SUPABASE_PERSISTENCE.md for details"
else
    echo ""
    echo "❌ Migration failed!"
    echo "Check the error messages above"
    exit 1
fi
