#!/bin/bash

# Script to enable mock authentication for development

echo "🔧 Enabling mock authentication for development..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create one first."
    exit 1
fi

# Check if ENABLE_MOCK_AUTH already exists
if grep -q "ENABLE_MOCK_AUTH" .env; then
    # Update existing line
    sed -i 's/ENABLE_MOCK_AUTH=.*/ENABLE_MOCK_AUTH=true/' .env
    echo "✅ Updated ENABLE_MOCK_AUTH=true in .env"
else
    # Add new line
    echo "" >> .env
    echo "# Mock authentication for development" >> .env
    echo "ENABLE_MOCK_AUTH=true" >> .env
    echo "✅ Added ENABLE_MOCK_AUTH=true to .env"
fi

echo ""
echo "🚀 Mock authentication is now enabled!"
echo ""
echo "To use mock authentication:"
echo "1. Restart your development server (Ctrl+C then pnpm dev)"
echo "2. Visit /api/auth/signin"
echo "3. Select 'Mock Authentication'"
echo "4. Choose from one of the test users"
echo ""
echo "Mock users available:"
echo "- Skúli Arnarsson (skuli@example.com)"
echo "- Jane Parent (jane@example.com)" 
echo "- John Playground Expert (john@example.com)"
echo ""
echo "To disable mock auth, run: echo 'ENABLE_MOCK_AUTH=false' >> .env" 