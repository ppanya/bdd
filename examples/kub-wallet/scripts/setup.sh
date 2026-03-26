#!/usr/bin/env bash
# scripts/setup.sh — Unified setup for BDD testing environment
#
# Usage:
#   bash scripts/setup.sh              # interactive — prompt for platform
#   bash scripts/setup.sh --android    # Android only
#   bash scripts/setup.sh --ios        # iOS only
#   bash scripts/setup.sh --all        # both platforms

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Colors & logging ─────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { printf "${GREEN}▶ %s${NC}\n" "$1"; }
warn()    { printf "${YELLOW}⚠ %s${NC}\n" "$1"; }
error()   { printf "${RED}✘ %s${NC}\n" "$1" >&2; exit 1; }
success() { printf "${GREEN}✔ %s${NC}\n" "$1"; }
section() { echo ""; echo -e "${BLUE}━━━ $1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# ── Source modules ───────────────────────────────────────────────────────────
source "$SCRIPT_DIR/lib/setup-common.sh"
source "$SCRIPT_DIR/lib/setup-android.sh"
source "$SCRIPT_DIR/lib/setup-ios.sh"

# ── Parse arguments ──────────────────────────────────────────────────────────
DO_ANDROID=false
DO_IOS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --android) DO_ANDROID=true; shift ;;
    --ios)     DO_IOS=true; shift ;;
    --all)     DO_ANDROID=true; DO_IOS=true; shift ;;
    *)         error "Unknown flag: $1. Usage: setup.sh [--android] [--ios] [--all]" ;;
  esac
done

# ── Interactive prompt (if no flags) ─────────────────────────────────────────
if [[ "$DO_ANDROID" == false && "$DO_IOS" == false ]]; then
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN} BDD Framework — Environment Setup${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "  Select platforms to set up:"
  echo ""
  echo "    1) Android only    (SDK, AVD, UiAutomator2)"
  echo "    2) iOS only        (Xcode, runtime, simulator, XCUITest)"
  echo "    3) Both            (everything)"
  echo ""
  read -r -p "  Enter choice [1/2/3]: " CHOICE
  case "$CHOICE" in
    1) DO_ANDROID=true ;;
    2) DO_IOS=true ;;
    3) DO_ANDROID=true; DO_IOS=true ;;
    *) error "Invalid choice: $CHOICE" ;;
  esac
fi

# ── Common dependencies ──────────────────────────────────────────────────────
section "Common Dependencies"
setup_common

# ── Platform-specific setup ──────────────────────────────────────────────────
if [[ "$DO_ANDROID" == true ]]; then
  setup_android
fi

if [[ "$DO_IOS" == true ]]; then
  setup_ios
fi

# ── Shell profile ────────────────────────────────────────────────────────────
if [[ "$DO_ANDROID" == true ]]; then
  section "Shell Profile"
  setup_shell_profile
fi

# ── Appium driver verification ───────────────────────────────────────────────
section "Verification"
APPIUM="./node_modules/.bin/appium"
if [[ -x "$APPIUM" ]]; then
  info "Installed Appium drivers:"
  "$APPIUM" driver list 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E "\[installed" || true
fi

echo ""
printf "  java:    %s\n" "$(java -version 2>&1 | head -1)"
printf "  node:    %s\n" "$(node --version 2>/dev/null || echo 'not found')"
printf "  bun:     %s\n" "$(bun --version 2>/dev/null || echo 'not found')"
if [[ "$DO_ANDROID" == true ]]; then
  printf "  adb:     %s\n" "$(adb --version 2>/dev/null | head -1 || echo 'not found')"
fi
if [[ "$DO_IOS" == true ]]; then
  printf "  xcode:   %s\n" "$(xcodebuild -version 2>/dev/null | head -1 || echo 'not found')"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN} Setup Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [[ "$DO_IOS" == true && -n "${_IOS_DEVICE_NAME:-}" ]]; then
  echo ""
  echo -e "${BLUE}Add to your .env:${NC}"
  echo ""
  echo "  IOS_DEVICE_NAME=\"${_IOS_DEVICE_NAME}\""
  echo "  IOS_PLATFORM_VER=\"${_IOS_PLATFORM_VER}\""
  echo "  IOS_APP_PATH=apps/Runner.ipa"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
if [[ "$DO_ANDROID" == true ]]; then
  echo "  bun run android              # boot emulator + install APK + start Appium"
  echo "  bun run test:mobile:android  # run Android tests"
fi
if [[ "$DO_IOS" == true ]]; then
  echo "  bun run ios                  # boot simulator + install app + start Appium"
  echo "  bun run test:mobile:ios      # run iOS tests"
fi
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
