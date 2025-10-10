#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         MCP Server Environment Diagnostic Tool             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo "📋 Node.js Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Node Version:    $(node --version)"
echo "NPM Version:     $(npm --version)"
echo "NPX Version:     $(npx --version)"
echo "Node Location:   $(which node)"
echo ""

echo "🔍 Checking for Node v18 conflicts..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f /usr/bin/node ]; then
    echo "⚠️  WARNING: System Node found at /usr/bin/node"
    echo "   Version: $(/usr/bin/node --version)"
    echo "   This may cause conflicts with MCP servers!"
else
    echo "✅ No system Node conflicts detected"
fi
echo ""

echo "📦 NVM Installations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -d ~/.nvm/versions/node ]; then
    ls -1 ~/.nvm/versions/node/ | sed 's/^/   /'
else
    echo "   NVM not found or no versions installed"
fi
echo ""

echo "🔗 All Node Binaries in PATH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
which -a node | sed 's/^/   /'
echo ""

echo "🚀 MCP Server Processes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
MCP_COUNT=$(ps aux | grep -E "mcp|npx.*@" | grep -v grep | wc -l)
if [ $MCP_COUNT -gt 0 ]; then
    echo "✅ Found $MCP_COUNT MCP-related process(es) running"
    ps aux | grep -E "mcp|npx.*@" | grep -v grep | awk '{print "   PID " $2 ": " substr($0, index($0,$11))}'
else
    echo "⚠️  No MCP server processes detected"
fi
echo ""

echo "🧪 Test MCP Server Launch"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing @modelcontextprotocol/sdk availability..."
if npm view @modelcontextprotocol/sdk version &>/dev/null; then
    SDK_VERSION=$(npm view @modelcontextprotocol/sdk version)
    echo "✅ MCP SDK available: v$SDK_VERSION"
else
    echo "⚠️  MCP SDK not found in npm registry"
fi
echo ""

echo "💡 Recommendations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f /usr/bin/node ]; then
    echo "   1. Remove system Node: sudo apt remove --purge nodejs nodejs-doc"
fi
echo "   1. Restart Windsurf to pick up the new Node version"
echo "   2. Check MCP settings in Windsurf (Cmd/Ctrl+Shift+P > 'MCP')"
echo "   3. Verify MCP servers are configured to use 'npx' or full node path"
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Diagnostic Complete                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
