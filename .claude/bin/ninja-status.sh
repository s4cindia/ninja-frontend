#!/bin/bash
# .claude/bin/ninja-status.sh
# On-demand context detection for Ninja Platform frontend
# Usage: npm run status  OR  git ninja-status  OR  bash .claude/bin/ninja-status.sh
set -euo pipefail

echo "🥷 Ninja Frontend Status"
echo "────────────────────────"

# 1. Repository and branch info
REPO=$(basename "$(git remote get-url origin 2>/dev/null)" .git 2>/dev/null || echo "unknown")
BRANCH=$(git branch --show-current 2>/dev/null || true)
if [ -z "$BRANCH" ]; then
    BRANCH="detached"
fi
echo "📦 Repo: $REPO"
echo "📍 Branch: $BRANCH"
echo "   Last: $(git log -1 --oneline 2>/dev/null || echo 'no commits')"

# 2. Check if dev server is running
if lsof -ti:5173 >/dev/null 2>&1; then
    echo "✅ Dev server: Running (port 5173)"
else
    echo "💡 Dev server: Not running → npm run dev"
fi

# 3. Check if backend is reachable
API_URL="${VITE_API_URL:-http://localhost:3000}"
if curl -s --max-time 2 "$API_URL/health" >/dev/null 2>&1; then
    echo "✅ Backend API: Connected ($API_URL)"
else
    echo "⚠️  Backend API: Not reachable ($API_URL)"
fi

# 4. Detect work context from changed files
#    Cascade: uncommitted → staged → last commit → modified files
#    Only fall back if previous command produced no output (not just on failure)
#    Use || true to prevent set -e from exiting on git command failures
echo ""
changed=$(git diff --name-only HEAD 2>/dev/null || true)
if [ -z "$changed" ]; then
    changed=$(git diff --cached --name-only 2>/dev/null || true)
fi
if [ -z "$changed" ]; then
    changed=$(git diff --name-only HEAD~1 2>/dev/null || true)
fi
if [ -z "$changed" ]; then
    changed=$(git ls-files -m 2>/dev/null || true)
fi

if [ -z "$changed" ]; then
    echo "💡 No recent changes detected. Docs: docs/INDEX.md"
else
    # Match context and only reference docs/dirs that actually exist
    if echo "$changed" | grep -q "components/pdf/\|pdf"; then
        echo "💡 PDF UI context"
        [ -f "docs/COMPONENTS.md" ] && echo "   📄 docs/COMPONENTS.md (reuse strategy)"
        [ -d "src/components/epub/" ] && echo "   📄 Reference: src/components/epub/"
    elif echo "$changed" | grep -q "components/epub/\|epub"; then
        echo "💡 EPUB UI context"
        [ -f "docs/COMPONENTS.md" ] && echo "   📄 docs/COMPONENTS.md"
    elif echo "$changed" | grep -q "components/acr/\|acr\|vpat"; then
        echo "💡 ACR/VPAT UI context"
        [ -f "docs/DATA-FETCHING.md" ] && echo "   📄 docs/DATA-FETCHING.md"
    elif echo "$changed" | grep -q "components/comparison/\|comparison"; then
        echo "💡 Visual comparison context"
        [ -f "docs/COMPONENTS.md" ] && echo "   📄 docs/COMPONENTS.md"
    elif echo "$changed" | grep -q "hooks/\|services/api/"; then
        echo "💡 Data fetching context"
        [ -f "docs/DATA-FETCHING.md" ] && echo "   📄 docs/DATA-FETCHING.md"
    elif echo "$changed" | grep -q "test\|spec\|__tests__"; then
        echo "💡 Testing context"
        [ -f "docs/TESTING.md" ] && echo "   📄 docs/TESTING.md"
    elif echo "$changed" | grep -q "components/ui/"; then
        echo "💡 UI primitives context"
        [ -f "docs/COMPONENTS.md" ] && echo "   📄 docs/COMPONENTS.md"
    elif echo "$changed" | grep -q ".github/\|vite.config\|tailwind.config"; then
        echo "💡 Build/config context"
    fi
fi

# 5. Sprint branch detection (POSIX-compliant, no grep -P)
if echo "$BRANCH" | grep -q "^feature/sprint-"; then
    SPRINT=$(echo "$BRANCH" | grep -o 'sprint-[0-9][0-9]*' || echo "")
    if [ -n "$SPRINT" ]; then
        echo "🏃 Active sprint branch: $SPRINT"
    fi
fi

# 6. Uncommitted changes count
DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "$DIRTY" -gt 0 ]; then
    echo "📝 Uncommitted changes: $DIRTY file(s)"
fi

echo "────────────────────────"
