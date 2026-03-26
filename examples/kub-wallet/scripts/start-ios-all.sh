#!/usr/bin/env bash
# scripts/start-ios-all.sh
# One-command setup: boot simulator → install app → start Appium → stay alive
# Usage: bash scripts/start-ios-all.sh [APP_PATH]
# Env:   IOS_DEVICE_NAME (required), IOS_PLATFORM_VER (required),
#        IOS_APP_PATH, IOS_BUNDLE_ID, APPIUM_PORT, BOOT_TIMEOUT, APPIUM_TIMEOUT

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/defaults.sh"
source "$SCRIPT_DIR/lib/common.sh"        # for require_cmd, wait_for_appium
source "$SCRIPT_DIR/lib/ios-common.sh"

APP="${1:-$IOS_APP_DEFAULT}"
PID_DIR="${TMPDIR:-/tmp}"
APPIUM_PID_FILE="$PID_DIR/.appium.pid"

# ── Input validation ──────────────────────────────────────────────────────────
require_cmd xcrun

if [[ -z "${IOS_DEVICE_NAME:-}" ]]; then
  err_ios "IOS_DEVICE_NAME is required. Set it in .env or export it."
  err_ios "Example: IOS_DEVICE_NAME='iPhone 15'"
  err_ios "Available simulators:"
  xcrun simctl list devices available 2>/dev/null | grep -E "iPhone|iPad" | head -10 >&2
  exit 1
fi

if [[ -z "${IOS_PLATFORM_VER:-}" ]]; then
  err_ios "IOS_PLATFORM_VER is required. Set it in .env or export it."
  err_ios "Example: IOS_PLATFORM_VER='17.0'"
  exit 1
fi

# ── Cleanup on Ctrl+C / kill ──────────────────────────────────────────────────
# Only kill Appium — leave the simulator running (user may want it)
cleanup() {
  echo ""
  log_ios "Shutting down..."
  if [[ -f "$APPIUM_PID_FILE" ]]; then
    local pid
    pid=$(cat "$APPIUM_PID_FILE")
    kill "$pid" 2>/dev/null && log_ios "Appium (PID $pid) stopped" || true
    rm -f "$APPIUM_PID_FILE"
  fi
  ok_ios "Cleanup done. Goodbye!"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── Step 1: Resolve simulator UDID and boot ──────────────────────────────────
UDID=$(get_simulator_udid "$IOS_DEVICE_NAME" "$IOS_PLATFORM_VER")
ok_ios "Resolved UDID: $UDID"

boot_simulator_if_needed "$UDID"

# ── Step 2: Resolve .ipa → .app (if needed) and install ──────────────────────
if [[ -f "$APP" ]] || [[ -d "$APP" ]]; then
  APP=$(resolve_ios_app "$APP")
  install_app_to_simulator "$UDID" "$APP"
else
  warn_ios "App not found at '$APP' — will skip install step"
  warn_ios "Provide .ipa or .app path as first arg or set IOS_APP_PATH env var"
fi

# ── Step 3: Extract bundle ID (if not set) ───────────────────────────────────
if [[ -z "${IOS_BUNDLE_ID:-}" ]] && [[ -d "$APP" ]]; then
  log_ios "Auto-extracting bundle ID from app..."
  EXTRACTED_ID=$(extract_bundle_id "$APP" || true)
  if [[ -n "$EXTRACTED_ID" ]]; then
    IOS_BUNDLE_ID="$EXTRACTED_ID"
    ok_ios "Extracted bundle ID: $IOS_BUNDLE_ID"
  else
    IOS_BUNDLE_ID="$IOS_BUNDLE_ID_FALLBACK"
    warn_ios "Could not extract bundle ID — falling back to: $IOS_BUNDLE_ID"
  fi
fi
export IOS_BUNDLE_ID="${IOS_BUNDLE_ID:-$IOS_BUNDLE_ID_FALLBACK}"

# ── Step 4: Kill stale Appium, start fresh ───────────────────────────────────
if [[ -f "$APPIUM_PID_FILE" ]]; then
  OLD_PID=$(cat "$APPIUM_PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    log_ios "Killing stale Appium from PID file (PID $OLD_PID)..."
    kill "$OLD_PID" 2>/dev/null || true
  fi
  rm -f "$APPIUM_PID_FILE"
fi
PORT_PID=$(lsof -ti tcp:"$APPIUM_PORT" 2>/dev/null || true)
if [[ -n "$PORT_PID" ]]; then
  log_ios "Port $APPIUM_PORT in use by PID(s) $PORT_PID — killing..."
  echo "$PORT_PID" | xargs kill 2>/dev/null || true
  sleep 1
fi

log_ios "Starting Appium on port $APPIUM_PORT..."
npx appium --port "$APPIUM_PORT" --allow-cors --log appium.log &
echo $! > "$APPIUM_PID_FILE"
log_ios "Appium started (PID $(cat "$APPIUM_PID_FILE"))"

# ── Step 5: Wait for Appium ready ────────────────────────────────────────────
wait_for_appium

# ── Ready summary ────────────────────────────────────────────────────────────
ABS_APP="$(cd "$(dirname "$APP")" 2>/dev/null && pwd)/$(basename "$APP")"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN} iOS stack is ready!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Simulator:   ${IOS_DEVICE_NAME} (iOS ${IOS_PLATFORM_VER})"
echo -e "  UDID:        ${UDID}"
echo -e "  App:         ${APP}"
echo -e "  Bundle ID:   ${IOS_BUNDLE_ID}"
echo -e "  Appium:      http://127.0.0.1:${APPIUM_PORT}"
echo -e ""
echo -e "  Run tests:   bun run test:mobile:ios"
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
  "platformName": "iOS",
  "appium:automationName": "XCUITest",
  "appium:deviceName": "${IOS_DEVICE_NAME}",
  "appium:platformVersion": "${IOS_PLATFORM_VER}",
  "appium:app": "${ABS_APP}",
  "appium:bundleId": "${IOS_BUNDLE_ID}",
  "appium:noReset": true,
  "appium:newCommandTimeout": 300
}
EOF
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Keep alive (Ctrl+C triggers cleanup) ──────────────────────────────────────
while true; do sleep 60; done
