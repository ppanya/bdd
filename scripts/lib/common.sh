#!/usr/bin/env bash
# scripts/lib/common.sh — shared shell functions for Android scripts
# Source this file: source "$(dirname "$0")/lib/common.sh"
# Requires: defaults.sh to be sourced first (for ANDROID_HOME, ANDROID_AVD, etc.)

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# ── Logging ───────────────────────────────────────────────────────────────────
log()  { echo -e "${BLUE}[android]${NC} $*"; }
ok()   { echo -e "${GREEN}[android]${NC} $*"; }
warn() { echo -e "${YELLOW}[android]${NC} $*"; }
err()  { echo -e "${RED}[android]${NC} $*" >&2; }

# ── Validation ────────────────────────────────────────────────────────────────

# require_cmd <cmd> — exit with error if command not found
require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" &>/dev/null && [[ ! -x "$cmd" ]]; then
    err "Required command not found: $cmd"
    err "Install it and try again."
    exit 1
  fi
}

# ── Emulator ──────────────────────────────────────────────────────────────────

# boot_emulator_if_needed — check if emulator running, boot if not
# Writes PID to $EMULATOR_PID_FILE if set
# Uses: ANDROID_HOME, ANDROID_AVD, ADB, EMULATOR_BIN, BOOT_TIMEOUT
boot_emulator_if_needed() {
  local adb="${ADB:-$ANDROID_HOME/platform-tools/adb}"
  local emulator_bin="${EMULATOR_BIN:-$ANDROID_HOME/emulator/emulator}"

  if "$adb" devices 2>/dev/null | grep -q "emulator"; then
    ok "Emulator already running — skipping boot"
    return 0
  fi

  log "Booting AVD: ${ANDROID_AVD}"
  "$emulator_bin" -avd "$ANDROID_AVD" -no-snapshot-load -no-audio &
  local pid=$!
  if [[ -n "${EMULATOR_PID_FILE:-}" ]]; then
    echo "$pid" > "$EMULATOR_PID_FILE"
  fi
  log "Emulator started (PID $pid)"

  log "Waiting for emulator to boot (up to ${BOOT_TIMEOUT}s)..."
  local elapsed=0
  until "$adb" shell getprop sys.boot_completed 2>/dev/null | grep -q "1"; do
    sleep 3
    elapsed=$((elapsed + 3))
    if [[ $elapsed -ge $BOOT_TIMEOUT ]]; then
      err "Emulator boot timed out after ${BOOT_TIMEOUT}s"
      exit 1
    fi
    echo -n "."
  done
  echo ""
  ok "Emulator booted!"
}

# ── TalkBack ──────────────────────────────────────────────────────────────────

# enable_talkback — enable Flutter accessibility / TalkBack
# Uses: ADB, TALKBACK_SERVICE
enable_talkback() {
  local adb="${ADB:-$ANDROID_HOME/platform-tools/adb}"
  log "Enabling TalkBack (Flutter accessibility)..."
  "$adb" shell settings put secure enabled_accessibility_services \
    "$TALKBACK_SERVICE" 2>/dev/null || warn "Could not enable TalkBack (non-fatal)"
  "$adb" shell settings put secure accessibility_enabled 1 2>/dev/null || true
  ok "TalkBack ON"
}

# disable_talkback — disable TalkBack for interactive/manual use
# Uses: ADB
disable_talkback() {
  local adb="${ADB:-$ANDROID_HOME/platform-tools/adb}"
  log "Disabling TalkBack..."
  "$adb" shell settings put secure enabled_accessibility_services "com.android.talkback/"
  "$adb" shell settings put secure accessibility_enabled 0
  ok "TalkBack OFF"
}

# ── Appium ────────────────────────────────────────────────────────────────────

# wait_for_appium — poll Appium /status endpoint until ready
# Uses: APPIUM_PORT, APPIUM_TIMEOUT
wait_for_appium() {
  log "Waiting for Appium to be ready (up to ${APPIUM_TIMEOUT}s)..."
  require_cmd curl
  local elapsed=0
  until curl -sf "http://127.0.0.1:${APPIUM_PORT}/status" >/dev/null 2>&1; do
    sleep 2
    elapsed=$((elapsed + 2))
    if [[ $elapsed -ge $APPIUM_TIMEOUT ]]; then
      err "Appium did not start within ${APPIUM_TIMEOUT}s"
      exit 1
    fi
    echo -n "."
  done
  echo ""
  ok "Appium is ready!"
}
