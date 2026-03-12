#!/usr/bin/env bash
# scripts/start-android-all.sh
# One-command setup: boot emulator → install APK → start Appium → stay alive
# Usage: bash scripts/start-android-all.sh [APK_PATH]
# Env:   ANDROID_HOME, ANDROID_AVD, APPIUM_PORT, APP_PACKAGE (auto-extracted if unset)
#        BOOT_TIMEOUT (default: 120s), APPIUM_TIMEOUT (default: 30s)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/defaults.sh"
source "$SCRIPT_DIR/lib/common.sh"

APK="${1:-$APK_DEFAULT}"
PID_DIR="${TMPDIR:-/tmp}"
EMULATOR_PID_FILE="$PID_DIR/.android-emulator.pid"
APPIUM_PID_FILE="$PID_DIR/.appium.pid"

ADB="$ANDROID_HOME/platform-tools/adb"
EMULATOR_BIN="$ANDROID_HOME/emulator/emulator"

# ── Input validation ──────────────────────────────────────────────────────────
require_cmd "$ADB"
require_cmd "$EMULATOR_BIN"

if [[ ! -f "$APK" ]]; then
  warn "APK not found at '$APK' — will skip install step"
  warn "Provide path as first arg or set ANDROID_APP_PATH env var"
fi

# ── Cleanup on Ctrl+C / kill ──────────────────────────────────────────────────
cleanup() {
  echo ""
  log "Shutting down..."
  if [[ -f "$APPIUM_PID_FILE" ]]; then
    local pid
    pid=$(cat "$APPIUM_PID_FILE")
    kill "$pid" 2>/dev/null && log "Appium (PID $pid) stopped" || true
    rm -f "$APPIUM_PID_FILE"
  fi
  if [[ -f "$EMULATOR_PID_FILE" ]]; then
    local pid
    pid=$(cat "$EMULATOR_PID_FILE")
    kill "$pid" 2>/dev/null && log "Emulator (PID $pid) stopped" || true
    rm -f "$EMULATOR_PID_FILE"
  fi
  ok "Cleanup done. Goodbye!"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── Step 1: Boot emulator ─────────────────────────────────────────────────────
boot_emulator_if_needed

# ── Step 2: Enable Flutter accessibility ──────────────────────────────────────
enable_talkback

# ── Step 3: Install APK ───────────────────────────────────────────────────────
if [[ -f "$APK" ]]; then
  log "Installing APK: $APK"
  "$ADB" install -r "$APK"
  ok "APK installed"
fi

# ── Step 4: Auto-extract APP_PACKAGE ──────────────────────────────────────────
if [[ -z "${APP_PACKAGE:-}" ]] && [[ -f "$APK" ]]; then
  log "Auto-extracting APP_PACKAGE from APK..."
  AAPT=$(ls "$ANDROID_HOME"/build-tools/*/aapt 2>/dev/null | sort -V | tail -1 || true)
  if [[ -n "$AAPT" ]] && [[ -x "$AAPT" ]]; then
    APP_PACKAGE=$("$AAPT" dump badging "$APK" 2>/dev/null \
      | grep "^package: name=" \
      | sed "s/^package: name='\\([^']*\\)'.*/\\1/")
    ok "Extracted APP_PACKAGE: $APP_PACKAGE"
  else
    warn "aapt not found — set APP_PACKAGE manually or install build-tools"
    APP_PACKAGE="$APP_PACKAGE_FALLBACK"
    warn "Falling back to default: $APP_PACKAGE"
  fi
fi
export APP_PACKAGE="${APP_PACKAGE:-$APP_PACKAGE_FALLBACK}"

# ── Step 5b: Clear app data ───────────────────────────────────────────────────
# `adb install -r` preserves user data — if the app was previously used past
# onboarding, the next session skips onboarding. Clear data so tests always
# start from a fresh state (onboarding screen).
# Uncomment to enable:
# log "Clearing app data for $APP_PACKAGE..."
# "$ADB" shell pm clear "$APP_PACKAGE" 2>/dev/null && ok "App data cleared" \
#   || warn "Could not clear app data (non-fatal — app may not be installed yet)"

# ── Step 5: Kill stale Appium, start fresh ────────────────────────────────────
if [[ -f "$APPIUM_PID_FILE" ]]; then
  OLD_PID=$(cat "$APPIUM_PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    log "Killing stale Appium from PID file (PID $OLD_PID)..."
    kill "$OLD_PID" 2>/dev/null || true
  fi
  rm -f "$APPIUM_PID_FILE"
fi
PORT_PID=$(lsof -ti tcp:"$APPIUM_PORT" 2>/dev/null || true)
if [[ -n "$PORT_PID" ]]; then
  log "Port $APPIUM_PORT in use by PID(s) $PORT_PID — killing..."
  echo "$PORT_PID" | xargs kill 2>/dev/null || true
  sleep 1
fi

log "Starting Appium on port $APPIUM_PORT..."
npx appium --port "$APPIUM_PORT" --allow-cors --log appium.log &
echo $! > "$APPIUM_PID_FILE"
log "Appium started (PID $(cat "$APPIUM_PID_FILE"))"

# ── Step 6: Wait for Appium ready ────────────────────────────────────────────
wait_for_appium

# ── Ready summary ─────────────────────────────────────────────────────────────
ABS_APK="$(cd "$(dirname "$APK")" 2>/dev/null && pwd)/$(basename "$APK")"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN} Android stack is ready!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  AVD:         ${ANDROID_AVD}"
echo -e "  APK:         ${APK}"
echo -e "  APP_PACKAGE: ${APP_PACKAGE}"
echo -e "  Appium:      http://127.0.0.1:${APPIUM_PORT}"
echo -e ""
echo -e "  Run tests:   bun run test:mobile:android"
echo -e "  Stop:        Ctrl+C"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE} Appium Inspector (macOS) — Connection Settings${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Remote Host:  127.0.0.1"
echo -e "  Remote Port:  ${APPIUM_PORT}"
echo -e "  Remote Path:  /"
echo -e ""
echo -e "${BLUE} Desired Capabilities (paste into Appium Inspector):${NC}"
cat <<EOF
{
  "platformName": "Android",
  "appium:automationName": "UiAutomator2",
  "appium:deviceName": "emulator-5554",
  "appium:avd": "${ANDROID_AVD}",
  "appium:app": "${ABS_APK}",
  "appium:appPackage": "${APP_PACKAGE}",
  "appium:noReset": true,
  "appium:newCommandTimeout": 300
}
EOF
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Keep alive (Ctrl+C triggers cleanup) ──────────────────────────────────────
if [[ -f "$EMULATOR_PID_FILE" ]]; then
  wait "$(cat "$EMULATOR_PID_FILE")" 2>/dev/null || true
else
  # Emulator was already running — just wait indefinitely
  while true; do sleep 60; done
fi
