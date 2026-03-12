#!/usr/bin/env bash
# scripts/lib/defaults.sh — shared defaults for all Android scripts
# Source this file: source "$(dirname "$0")/lib/defaults.sh"

ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ANDROID_AVD="${ANDROID_AVD:-Pixel_7_API_34_arm64}"
APPIUM_PORT="${APPIUM_PORT:-4723}"
APK_DEFAULT="${ANDROID_APP_PATH:-apps/app-mock-release.apk}"
APP_PACKAGE_FALLBACK="com.bbt.bitkubnext.mock"
BOOT_TIMEOUT="${BOOT_TIMEOUT:-120}"
APPIUM_TIMEOUT="${APPIUM_TIMEOUT:-30}"
TALKBACK_SERVICE="com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService"
