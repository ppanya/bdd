#!/usr/bin/env bash
# scripts/lib/defaults.sh — shared defaults for all scripts
# Source this file: source "$(dirname "$0")/lib/defaults.sh"

# ── Load .env (Bun auto-loads for JS/TS, but shell scripts need this) ────────
DEFAULTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$DEFAULTS_DIR/../.." && pwd)"
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$PROJECT_ROOT/.env"
  set +a
fi

ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ANDROID_AVD="${ANDROID_AVD:-Pixel_7_API_34_arm64}"
APPIUM_PORT="${APPIUM_PORT:-4723}"
APK_DEFAULT="${ANDROID_APP_PATH:-apps/app-mock-release.apk}"
APP_PACKAGE_FALLBACK="com.example.app"
BOOT_TIMEOUT="${BOOT_TIMEOUT:-120}"
APPIUM_TIMEOUT="${APPIUM_TIMEOUT:-30}"
TALKBACK_SERVICE="com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService"

# ── iOS defaults ─────────────────────────────────────────────────────────────
# IOS_DEVICE_NAME and IOS_PLATFORM_VER have no hardcoded defaults — they must
# be set via .env or environment. The start-ios-all.sh script validates this.
IOS_APP_DEFAULT="${IOS_APP_PATH:-apps/Runner.app}"
IOS_BUNDLE_ID_FALLBACK="com.example.app"
