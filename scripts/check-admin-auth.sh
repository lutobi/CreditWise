#!/bin/bash
# Security Guard Script — Run before every deploy
# Ensures every admin API route uses the requireAdmin() auth guard.
# Exit code 1 = unprotected route found (BLOCK DEPLOY)

FAILED=0

echo "🔒 Scanning admin API routes for auth guards..."
echo ""

for f in $(find src/app/api/admin -name 'route.ts'); do
    if ! grep -q 'requireAdmin' "$f"; then
        echo "❌ MISSING AUTH: $f"
        FAILED=1
    else
        echo "✅ Protected: $f"
    fi
done

echo ""

if [ $FAILED -eq 1 ]; then
    echo "🚨 DEPLOY BLOCKED: Unprotected admin routes found!"
    echo "   Add 'requireAdmin()' from '@/lib/require-admin' to each route."
    exit 1
else
    echo "✅ All admin API routes are protected."
    exit 0
fi
