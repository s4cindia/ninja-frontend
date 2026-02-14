#!/bin/bash
# ============================================================================
# Command Audit Log
# ============================================================================
# Logs every bash command Claude executes to .claude/audit-log.jsonl
# Useful for debugging, compliance, and understanding what Claude did.
#
# Each entry is a JSON line with timestamp, command, and description.
# ============================================================================

INPUT=$(cat)

# Check for jq dependency
if ! command -v jq >/dev/null 2>&1; then
  echo "Warning: jq not found - audit logging skipped" >&2
  exit 0
fi

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
DESCRIPTION=$(echo "$INPUT" | jq -r '.tool_input.description // "No description"')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Skip if no command
if [ -z "$COMMAND" ] || [ "$COMMAND" = "null" ]; then
  exit 0
fi

# Sanitize secrets from command
REDACTED_COMMAND="$COMMAND"
# Redact bearer tokens
REDACTED_COMMAND=$(echo "$REDACTED_COMMAND" | sed -E 's/(bearer[[:space:]]+)[^[:space:]]+/\1[REDACTED]/gi')
# Redact API keys
REDACTED_COMMAND=$(echo "$REDACTED_COMMAND" | sed -E 's/(api[_-]?key[[:space:]]*[:=][[:space:]]*)[^[:space:]]+/\1[REDACTED]/gi')
# Redact passwords
REDACTED_COMMAND=$(echo "$REDACTED_COMMAND" | sed -E 's/(--password[=[:space:]]+|-p[[:space:]]+)[^[:space:]]+/\1[REDACTED]/gi')
# Redact private keys
REDACTED_COMMAND=$(echo "$REDACTED_COMMAND" | sed -E 's/(-----BEGIN[[:space:]]+(RSA[[:space:]]+)?PRIVATE[[:space:]]+KEY-----).*/\1[REDACTED]/gi')

# Ensure log directory exists
mkdir -p .claude

# Append as JSON line (JSONL format for easy parsing)
jq -n \
  --arg ts "$TIMESTAMP" \
  --arg cmd "$REDACTED_COMMAND" \
  --arg desc "$DESCRIPTION" \
  --arg sid "$SESSION_ID" \
  '{timestamp: $ts, session_id: $sid, command: $cmd, description: $desc}' \
  >> .claude/audit-log.jsonl

exit 0
