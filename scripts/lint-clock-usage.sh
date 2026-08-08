#!/usr/bin/env bash
#
# Lint script to detect forbidden clock usage in business code.
# See doc/conventions/backend/application-clock.md and
# doc/conventions/frontend/application-clock.md.
#
# Usage: ./scripts/lint-clock-usage.sh
# Exit code 0 = clean, 1 = violations found
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

violations=0

echo "🕐 Checking for forbidden clock usage patterns..."
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# BACKEND (PHP) - Check for direct now() / Carbon::now() in business paths
# ─────────────────────────────────────────────────────────────────────────────

echo "📦 Backend (PHP)..."

# We search only in business paths (Actions, Services, Controllers)
# Infrastructure paths are naturally excluded.

BACKEND_FORBIDDEN_PATTERNS=(
    'Carbon::now()'
    'now()'
    "new DateTimeImmutable('now')"
    "new DateTime('now')"
)

# Note: We search only in business paths (Actions, Services, Controllers)
# which already excludes infrastructure paths like migrations, seeders,
# tests, middleware, etc. No need for --exclude-dir.

for forbidden in "${BACKEND_FORBIDDEN_PATTERNS[@]}"; do
    # Search in Actions, Services, Controllers (business paths)
    result=$(grep -rn --include="*.php" "$forbidden" \
        "$ROOT_DIR/code/api/app/Actions" \
        "$ROOT_DIR/code/api/app/Services" \
        "$ROOT_DIR/code/api/app/Http/Controllers" \
        2>/dev/null || true)
    
    if [[ -n "$result" ]]; then
        echo -e "${RED}❌ Found forbidden pattern: $forbidden${NC}"
        echo "$result" | while read -r line; do
            echo "   $line"
        done
        violations=$((violations + 1))
    fi
done

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# FRONTEND (TypeScript) - Check for Date.now() / new Date() in business paths
# ─────────────────────────────────────────────────────────────────────────────

echo "🌐 Frontend (TypeScript)..."

# Allowed paths:
#   - lib/timezone.ts, lib/datetime.ts (these ARE the centralized resolvers)
#   - __tests__/ (test files)
#   - stores/clock.store.ts (the clock store itself)
FRONTEND_ALLOWED_FILES=(
    "timezone.ts"
    "datetime.ts"
    "clock.store.ts"
    "clock-api.ts"
)

FRONTEND_FORBIDDEN_PATTERNS=(
    'Date.now()'
    'new Date()'
)

for forbidden in "${FRONTEND_FORBIDDEN_PATTERNS[@]}"; do
    # Search in src/ excluding allowed files and tests
    result=$(grep -rn --include="*.ts" --include="*.tsx" "$forbidden" \
        "$ROOT_DIR/code/webapp/src" \
        2>/dev/null | grep -v "__tests__" | grep -v "\.test\." | grep -v "\.spec\." || true)
    
    # Filter out allowed files
    filtered=""
    while IFS= read -r line; do
        skip=false
        for allowed in "${FRONTEND_ALLOWED_FILES[@]}"; do
            if [[ "$line" == *"$allowed"* ]]; then
                skip=true
                break
            fi
        done
        if [[ "$skip" == false && -n "$line" ]]; then
            filtered="$filtered$line"$'\n'
        fi
    done <<< "$result"
    
    if [[ -n "${filtered// }" ]]; then
        echo -e "${YELLOW}⚠️  Found pattern that may need review: $forbidden${NC}"
        while IFS= read -r line; do
            if [[ -n "$line" ]]; then
                echo "   $line"
            fi
        done <<< "$filtered"
        echo "   → If this is for display/formatting, it's OK. If for business logic, use ApplicationClock."
    fi
done

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────

if [[ $violations -gt 0 ]]; then
    echo -e "${RED}❌ Found $violations violation(s). See doc/conventions for guidelines.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ No forbidden clock usage patterns found in business code.${NC}"
    exit 0
fi
