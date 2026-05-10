#!/usr/bin/env bash
# run_sessions.sh

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSIONS_DIR="$SCRIPT_DIR/sessions"
RETRY_WAIT=3600
LOG_FILE="$SCRIPT_DIR/run_sessions.log"

mkdir -p "$SESSIONS_DIR"

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg"
  echo "$msg" >> "$LOG_FILE"
}

SESSION_FILES=()
while IFS= read -r line; do
  SESSION_FILES+=("$line")
done < <(find "$SCRIPT_DIR" -maxdepth 1 -name 'SESSION_*.md' | sort)

if [[ ${#SESSION_FILES[@]} -eq 0 ]]; then
  log "No SESSION_*.md files found in $SCRIPT_DIR — nothing to do."
  exit 0
fi

log "Found ${#SESSION_FILES[@]} session file(s) to process."

for SESSION_FILE in "${SESSION_FILES[@]}"; do
  SESSION_NAME="$(basename "$SESSION_FILE")"
  log "--- Starting: $SESSION_NAME ---"

  attempt=1

  while true; do
    log "Attempt $attempt for $SESSION_NAME"

    TMPOUT="$(mktemp)"
    TMPERR="$(mktemp)"

    set +e

    claude --dangerously-skip-permissions \
           -p "$(cat "$SESSION_FILE")" \
           > "$TMPOUT" 2> "$TMPERR"

    EXIT_CODE=$?

    set -e

    STDOUT="$(cat "$TMPOUT")"
    STDERR="$(cat "$TMPERR")"

    rm -f "$TMPOUT" "$TMPERR"

    if [[ -n "$STDOUT" ]]; then
      log "OUTPUT (last 20 lines):"
      echo "$STDOUT" | tail -20 | tee -a "$LOG_FILE"
    fi

    if [[ -n "$STDERR" ]]; then
      log "STDERR:"
      echo "$STDERR" | tee -a "$LOG_FILE"
    fi

    COMBINED="$STDOUT $STDERR"

    if echo "$COMBINED" | grep -qiE \
      'rate.?limit|too many requests|overloaded|529|quota|try again later|usage limit|hit your limit|resets'; then

      log "Rate limit detected on attempt $attempt. Waiting ${RETRY_WAIT}s before retry..."

      sleep "$RETRY_WAIT"

      attempt=$((attempt + 1))

      continue
    fi

    if [[ $EXIT_CODE -ne 0 ]]; then
      log "ERROR: claude exited with code $EXIT_CODE on $SESSION_NAME. Stopping."
      exit $EXIT_CODE
    fi

    mv "$SESSION_FILE" "$SESSIONS_DIR/$SESSION_NAME"

    log "SUCCESS: $SESSION_NAME completed and moved to sessions/."

    break
  done
done

log "All sessions completed."