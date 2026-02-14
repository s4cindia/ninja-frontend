#!/bin/bash
# ============================================================================
# Branch Protection
# ============================================================================
# Prevents Claude from:
#   1. Committing or pushing directly to main/master
#   2. Editing files while on main/master
# Forces use of feature branches BEFORE any work begins.
# ============================================================================

INPUT=$(cat)

# Check for jq dependency
if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required for branch protection but not found" >&2
  exit 1
fi

# Get current branch
BRANCH=$(git branch --show-current 2>/dev/null)

# If not in a git repo or can't determine branch, allow
if [ -z "$BRANCH" ]; then
  exit 0
fi

# Determine what type of tool use triggered this hook
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# --- Check 1b: Block pushes targeting main/master (runs for ALL branches to catch bypasses) ---
if echo "$COMMAND" | grep -q "^git push"; then
  if echo "$COMMAND" | grep -qE '(:|[[:space:]]|refs/heads/|/)(main|master)([[:space:]]|$)'; then
    cat >&2 <<EOF

🚫 Direct pushes to 'main' or 'master' are not allowed.

Detected push target in command: $COMMAND

Please create a feature branch first:
  git checkout -b feat/your-feature-name
  git checkout -b fix/your-bug-description

Or if you have uncommitted changes:
  git stash
  git checkout -b feat/your-feature-name
  git stash pop

EOF
    exit 2
  fi
fi

# Only protect main/master for the remaining checks (commit/edit blocking when ON protected branch)
if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ]; then
  exit 0
fi

# --- Check 1: Block git commit/push on main ---
if echo "$COMMAND" | grep -qE "^git (commit|push)"; then
  cat >&2 <<EOF

🚫 Direct commits/pushes to '$BRANCH' are not allowed.

Please create a feature branch first:
  git checkout -b feat/your-feature-name
  git checkout -b fix/your-bug-description

Or if you have uncommitted changes:
  git stash
  git checkout -b feat/your-feature-name
  git stash pop

EOF
  exit 2
fi

# --- Check 2: Block file edits on main ---
if echo "$TOOL_NAME" | grep -qiE "^(Edit|MultiEdit|Write)$"; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // "unknown"')
  cat >&2 <<EOF

🚫 Cannot edit files while on '$BRANCH' branch.

You're trying to edit: $FILE_PATH

Create a feature branch first:
  git checkout -b feat/your-feature-name
  git checkout -b fix/your-bug-description

EOF
  exit 2
fi

exit 0
