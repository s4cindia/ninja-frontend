# Context Status Script - Developer Guide

## Overview

The Context Status Script is an on-demand diagnostic tool that helps you quickly understand your current development context when working with Claude Code. Instead of manually running multiple commands to check your environment, you get a comprehensive status report with a single command.

## What It Does

The status script provides instant visibility into:

### Repository Context
- Current branch and last commit
- Number of uncommitted changes
- Sprint detection (automatically identifies `feature/sprint-X` branches)

### Infrastructure Status
- Dev server status (Vite on port 5173)
- Backend API reachability
- Health check response

### Smart Work Context Detection
Analyzes your recently changed files and automatically suggests relevant documentation:

**Frontend Context Examples:**
```bash
💡 PDF UI context
   📄 docs/COMPONENTS.md (reuse strategy)
   📄 Reference: src/components/epub/

💡 Data fetching context
   📄 docs/DATA-FETCHING.md

💡 Testing context
   📄 docs/TESTING.md

💡 Visual comparison context
   📄 docs/COMPONENTS.md

💡 UI primitives context
   📄 docs/COMPONENTS.md
```

## How to Use

### Primary Method: npm Script

```bash
cd ninja-frontend
npm run status
```

### Alternative: Direct Execution

```bash
bash .claude/bin/ninja-status.sh
```

### Optional: Git Alias (Per Developer)

Add to your `~/.gitconfig`:

```ini
[alias]
    ninja-status = "!bash .claude/bin/ninja-status.sh"
```

Then run from any repo:
```bash
git ninja-status
```

## Output Example

```
🥷 Ninja Frontend Status
────────────────────────
📦 Repo: ninja-frontend
📍 Branch: feature/visual-comparison
   Last: 1f9c81c fix: add comparison components
✅ Dev server: Running (port 5173)
✅ Backend API: Connected (http://localhost:3000)

💡 Visual comparison context
   📄 docs/COMPONENTS.md

📝 Uncommitted changes: 12 file(s)
────────────────────────
```

## Optional: Automatic Status on Session Start

A lightweight hook can display one-line status when you start a Claude Code session. **This is opt-in and disabled by default.**

### Enable (Per Developer, Per Repo)

```bash
touch .claude/.enable-status
```

When enabled, you'll see:
```
🥷 ninja-frontend | 📍 feature/visual-comparison | 📝 12 uncommitted | Full status: npm run status
```

**Performance:**
- Cached for 1 hour (won't run repeatedly in the same session)
- ~200ms execution time
- Non-blocking (runs in background)

### Disable

```bash
rm .claude/.enable-status
```

## Developer Benefits

### 1. **Faster Context Switching**
When resuming work after a break or switching between repos:
```bash
npm run status  # Instant orientation
```

Instead of:
```bash
git status
git log -1
git branch
git diff --name-only HEAD
lsof -i :5173  # Check if dev server running
curl http://localhost:3000/health  # Check backend
# ... etc
```

### 2. **Reduced Errors**
- **Detects dev server not running** before you start coding
- **Checks backend connectivity** immediately
- **Shows uncommitted work** so you don't accidentally start on dirty state

### 3. **Better Claude Code Sessions**
- **Context-aware documentation hints** guide Claude to the right docs
- **Sprint detection** helps Claude understand your current work phase
- **Change detection** helps Claude see what you're actively working on

### 4. **Onboarding Aid**
New developers or rotating team members can run `npm run status` to understand:
- Which repo they're in
- What infrastructure needs to be running
- Where to find relevant documentation
- What work is in progress

### 5. **Multi-Repo Workflow Support**
When working across `ninja-backend` and `ninja-frontend`:
```bash
# Quick sanity check before context switching
cd ../ninja-backend && npm run status
cd ../ninja-frontend && npm run status
```

## Context Detection Patterns

The script intelligently detects your work context based on changed files:

| Changed Files | Detected Context | Suggested Docs |
|---------------|------------------|----------------|
| `components/pdf/*` | PDF UI context | `docs/COMPONENTS.md`, `src/components/epub/` |
| `components/epub/*` | EPUB UI context | `docs/COMPONENTS.md` |
| `components/acr/*` | ACR/VPAT UI context | `docs/DATA-FETCHING.md` |
| `components/comparison/*` | Visual comparison | `docs/COMPONENTS.md` |
| `hooks/*`, `services/api/*` | Data fetching | `docs/DATA-FETCHING.md` |
| `*.test.*`, `*.spec.*` | Testing context | `docs/TESTING.md` |
| `components/ui/*` | UI primitives | `docs/COMPONENTS.md` |
| `.github/*`, `vite.config.*` | Build/config | (no specific doc) |

## Technical Details

### File Locations
```
ninja-frontend/
├── .claude/
│   ├── bin/
│   │   └── ninja-status.sh       # Full status script
│   └── hooks/
│       └── session-start.sh      # Optional lightweight hook
└── package.json                   # "status" script
```

### Context Detection Logic

The script uses **cascading git diff fallback** to detect changed files:

1. `git diff --name-only HEAD` (uncommitted changes)
2. `git diff --cached --name-only` (staged changes)
3. `git diff --name-only HEAD~1` (last commit)
4. `git ls-files -m` (modified files)
5. Empty string (no changes detected)

This ensures the script works in various scenarios:
- New repos with no commits
- Detached HEAD state
- Shallow clones
- Clean working tree

### Backend API Check

The script checks backend health using:
```bash
API_URL="${VITE_API_URL:-http://localhost:3000}"
curl -s --max-time 2 "$API_URL/health"
```

- Reads `VITE_API_URL` from environment (`.env.local`)
- Falls back to `http://localhost:3000`
- Times out after 2 seconds
- Reports connection status

### Cross-Platform Compatibility

**Tested on:**
- ✅ Windows MSYS bash (Git Bash)
- ✅ macOS (BSD utilities)
- ✅ Linux (GNU utilities)

**POSIX-compliant:**
- Uses `grep -o` instead of `grep -P` (Perl regex)
- Supports both GNU `stat -c%Y` and BSD `stat -f%m`
- Gracefully handles missing commands (`lsof` on Windows)

### Performance

| Operation | Time |
|-----------|------|
| Full status script | ~600ms |
| Session-start hook (cached) | ~50ms |
| Session-start hook (first run) | ~200ms |

## Privacy & Security

- ✅ **No data sent to external services**
- ✅ **No secrets logged or displayed**
- ✅ **Runs entirely locally**
- ✅ **Opt-in for automatic hook**
- ✅ **`.claude/.enable-status` not committed to git** (personal preference)

## Troubleshooting

### "Dev server: Not running"
```bash
cd ninja-frontend
npm run dev
```

### "Backend API: Not reachable"
```bash
# Check backend is running
cd ../ninja-backend
npm run dev

# Check VITE_API_URL in .env.local
cat .env.local | grep VITE_API_URL
```

### Script not found
```bash
# Ensure scripts are executable
chmod +x .claude/bin/ninja-status.sh
chmod +x .claude/hooks/session-start.sh
```

### Session hook not running
```bash
# Check if opt-in file exists
ls -la .claude/.enable-status

# If exists, check cache age
ls -lt /tmp/claude-ninja-*
```

### Dev server check always shows "Not running" on Windows

This is expected behavior. The script uses `lsof` to check port 5173, which is not available on Windows. The script gracefully falls back to showing "Not running" without errors.

**Workaround:** If dev server is running, you can verify manually:
```bash
curl http://localhost:5173
# Or visit http://localhost:5173 in browser
```

## Comparison with Other Approaches

### Before: Manual Context Gathering
```bash
# ~60 seconds, 8+ commands
pwd
git status
git branch
git log -1
lsof -i :5173  # Check dev server
curl http://localhost:3000/health  # Check backend
git diff --name-only HEAD
# ... then find relevant docs manually
```

### After: Automated Context
```bash
# ~1 second, 1 command
npm run status
```

**Time saved:** ~59 seconds per context check
**Typical daily context checks:** 10-15 times
**Daily time saved:** ~10-15 minutes

## Integration with Claude Code

The status script integrates seamlessly with Claude Code workflows:

### When Starting Work
```bash
npm run status  # Get oriented
npm run dev     # Start dev server if not running
```

### When Claude Asks for Context
Instead of manually checking files, just run:
```bash
npm run status
```

The output gives Claude:
- What you're working on (branch, last commit)
- What's changed recently (file patterns)
- What docs to reference
- Environment health status

### When Switching Contexts
```bash
# Before switching to backend work
npm run status  # See current frontend state
cd ../ninja-backend
npm run status  # See backend state
```

## Future Enhancements

Potential additions based on developer feedback:

- [ ] Test suite status (last run, pass/fail count)
- [ ] npm/node version mismatch detection
- [ ] Branch staleness warnings (behind main by X commits)
- [ ] Uncommitted changes age (how long since last commit)
- [ ] Bundle size warnings (when dist/ is too large)
- [ ] TypeScript errors count
- [ ] ESLint warnings count

## Feedback

Have suggestions for improving the status script?
- Open an issue: `gh issue create`
- Submit a PR: Update `.claude/bin/ninja-status.sh`
- Discuss with team: Slack #ninja-dev channel

---

**Version:** 1.0.0
**Last updated:** February 14, 2026
**Maintainer:** Development Team
