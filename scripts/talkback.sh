#!/usr/bin/env bash
# Toggle TalkBack on/off. Boots emulator first if not running.
# Usage: bash scripts/talkback.sh on|off
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/defaults.sh"
source "$SCRIPT_DIR/lib/common.sh"

MODE="${1:-}"

# ── Input validation ──────────────────────────────────────────────────────────
if [[ "$MODE" != "on" && "$MODE" != "off" ]]; then
  err "Invalid mode: '${MODE}'"
  echo "Usage: bash scripts/talkback.sh on|off" >&2
  echo "  on  — enable TalkBack (required for Flutter accessibility / automated tests)" >&2
  echo "  off — disable TalkBack (interactive/manual use)" >&2
  exit 1
fi

ADB="$ANDROID_HOME/platform-tools/adb"
EMULATOR_BIN="$ANDROID_HOME/emulator/emulator"

require_cmd "$ADB"

# ── Boot emulator if not running ──────────────────────────────────────────────
boot_emulator_if_needed

# ── Toggle TalkBack ────────────────────────────────────────────────────────────
if [[ "$MODE" == "on" ]]; then
  enable_talkback
  ok "Test mode: TalkBack ON ✓"
else
  disable_talkback
  ok "Interactive mode: TalkBack OFF ✓"
fi
