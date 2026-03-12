#!/usr/bin/env bash
# run-mobile-tests.sh — Run WDIO mobile tests (Appium must already be running)
#
# Usage:
#   bash scripts/run-mobile-tests.sh android
#   bash scripts/run-mobile-tests.sh android --spec features/mobile/login.feature
#   bash scripts/run-mobile-tests.sh android --feature login
#   bash scripts/run-mobile-tests.sh android --feature navigation
#   bash scripts/run-mobile-tests.sh android --scenario "กรอก email และ password ที่ถูกต้อง"
#   bash scripts/run-mobile-tests.sh android --tags @smoke
#   bash scripts/run-mobile-tests.sh android --tags "@login and not @wip"
#   TAGS='@smoke' bash scripts/run-mobile-tests.sh android
#   APP_READY=false bash scripts/run-mobile-tests.sh android  # force full reinstall
#   bash scripts/run-mobile-tests.sh android --dry-run       # print WDIO command without running
set -euo pipefail

PLATFORM="${1:-android}"
shift || true

APPIUM_PORT="${APPIUM_PORT:-4723}"
WDIO_ARGS=()
EXTRA_TAGS=""
SCENARIO_NAME=""
HAS_SPEC=false
DRY_RUN=false

# ── Parse arguments ───────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --tags)
      EXTRA_TAGS="$2"
      shift 2
      ;;
    --spec)
      WDIO_ARGS+=("--spec" "$2")
      HAS_SPEC=true
      shift 2
      ;;
    --feature)
      # Accept name without path/extension: "login" → features/mobile/login.feature
      FEATURE_NAME="${2%.feature}"
      FEATURE_PATH="features/mobile/${FEATURE_NAME}.feature"
      if [ ! -f "$FEATURE_PATH" ]; then
        echo "❌ Feature file not found: $FEATURE_PATH"
        AVAILABLE=$(ls features/mobile/*.feature 2>/dev/null | xargs -n1 basename | sed 's/.feature//' | tr '\n' ', ' | sed 's/, $//')
        echo "   Available: ${AVAILABLE:-none}"
        exit 1
      fi
      WDIO_ARGS+=("--spec" "$FEATURE_PATH")
      HAS_SPEC=true
      shift 2
      ;;
    --scenario)
      SCENARIO_NAME="$2"
      shift 2
      ;;
    *)
      WDIO_ARGS+=("$1")
      shift
      ;;
  esac
done

# ── Pre-flight checks ─────────────────────────────────────────────────────────
if ! command -v adb &>/dev/null; then
  echo "❌ 'adb' not found. Install Android SDK platform-tools:"
  echo "   brew install --cask android-platform-tools  OR  set ANDROID_HOME"
  exit 1
fi

if ! command -v curl &>/dev/null; then
  echo "❌ 'curl' not found. Install it: brew install curl"
  exit 1
fi

if ! adb devices 2>/dev/null | grep -q "emulator"; then
  echo "❌ No Android emulator connected."
  echo "   Run first:  bun run android"
  exit 1
fi

if ! curl -sf "http://127.0.0.1:${APPIUM_PORT}/status" > /dev/null 2>&1; then
  echo "❌ Appium not running on port $APPIUM_PORT."
  echo "   Run first:  bun run android"
  exit 1
fi

echo "✓ Emulator connected, Appium ready — launching tests..."

# ── Build tag expression: merge TAGS env var + --tags arg ─────────────────────
FINAL_TAGS="${TAGS:-}"
if [ -n "$EXTRA_TAGS" ]; then
  if [ -n "$FINAL_TAGS" ]; then
    FINAL_TAGS="($FINAL_TAGS) and ($EXTRA_TAGS)"
  else
    FINAL_TAGS="$EXTRA_TAGS"
  fi
fi

# ── Default to mobile suite unless --spec/--feature was provided ──────────────
if [ "$HAS_SPEC" = false ]; then
  WDIO_ARGS=("--suite" "mobile" ${WDIO_ARGS[@]+"${WDIO_ARGS[@]}"})
fi

# ── Add --scenario filter (maps to cucumberOpts.name regex) ───────────────────
if [ -n "$SCENARIO_NAME" ]; then
  WDIO_ARGS+=("--cucumberOpts.name" "$SCENARIO_NAME")
fi

# ── Run WDIO ──────────────────────────────────────────────────────────────────
CMD="MOBILE_PLATFORM=$PLATFORM APPIUM_PORT=$APPIUM_PORT APP_READY=${APP_READY:-true} TAGS=$FINAL_TAGS bunx wdio run wdio.conf.ts ${WDIO_ARGS[*]+"${WDIO_ARGS[*]}"}"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "🔍 Dry run — would execute:"
  echo "   $CMD"
  exit 0
fi

MOBILE_PLATFORM="$PLATFORM" \
APPIUM_PORT="$APPIUM_PORT" \
APP_READY="${APP_READY:-true}" \
TAGS="$FINAL_TAGS" \
  bunx wdio run wdio.conf.ts ${WDIO_ARGS[@]+"${WDIO_ARGS[@]}"}
