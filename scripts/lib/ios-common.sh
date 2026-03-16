#!/usr/bin/env bash
# scripts/lib/ios-common.sh — shared shell functions for iOS scripts
# Source this file: source "$(dirname "$0")/lib/ios-common.sh"
# Requires: defaults.sh to be sourced first (for IOS_DEVICE_NAME, IOS_PLATFORM_VER, etc.)

# ── Colors (reuse from common.sh if already loaded) ──────────────────────────
GREEN="${GREEN:-\033[0;32m}"
YELLOW="${YELLOW:-\033[1;33m}"
BLUE="${BLUE:-\033[0;34m}"
RED="${RED:-\033[0;31m}"
NC="${NC:-\033[0m}"

# ── Logging ─────────────────────────────────────────────────────────────────
log_ios()  { echo -e "${BLUE}[ios]${NC} $*"; }
ok_ios()   { echo -e "${GREEN}[ios]${NC} $*"; }
warn_ios() { echo -e "${YELLOW}[ios]${NC} $*"; }
err_ios()  { echo -e "${RED}[ios]${NC} $*" >&2; }

# ── Simulator UDID resolution ───────────────────────────────────────────────

# get_simulator_udid <device_name> [platform_version]
# Resolves a simulator device name to its UDID.
# If platform_version is provided, narrows to that runtime.
# Prints the UDID to stdout; exits 1 if not found.
get_simulator_udid() {
  local device_name="$1"
  local platform_ver="${2:-}"

  # xcrun simctl list uses major.minor (e.g. "iOS 26.3") even if user specifies
  # patch version (e.g. "26.3.1"). Try exact match first, then strip patch.
  local udid=""

  _simctl_grep_udid() {
    local filter="$1" name="$2"
    # Exact device name match: "    iPhone 17 (" but NOT "    iPhone 17 Pro ("
    xcrun simctl list devices "$filter" 2>/dev/null \
      | grep -E "^[[:space:]]+${name} \(" \
      | head -1 \
      | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/'
  }

  if [[ -n "$platform_ver" ]]; then
    # Try "iOS 26.3.1" first, then "iOS 26.3" (strip patch)
    udid=$(_simctl_grep_udid "iOS ${platform_ver}" "$device_name")
    if [[ -z "$udid" ]]; then
      local major_minor="${platform_ver%.*}"
      # Only retry if we actually stripped something (e.g. 26.3.1 → 26.3)
      if [[ "$major_minor" != "$platform_ver" ]]; then
        udid=$(_simctl_grep_udid "iOS ${major_minor}" "$device_name")
      fi
    fi
  fi

  # Fallback: search all devices without runtime filter
  if [[ -z "$udid" ]]; then
    udid=$(xcrun simctl list devices 2>/dev/null \
      | grep -E "^[[:space:]]+${device_name} \(" \
      | head -1 \
      | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')
  fi

  if [[ -z "$udid" ]]; then
    err_ios "Simulator not found: '$device_name' (iOS ${platform_ver:-any})"
    err_ios "Available simulators:"
    xcrun simctl list devices available 2>/dev/null | grep -E "iPhone|iPad" | head -10 >&2
    exit 1
  fi

  echo "$udid"
}

# ── Boot simulator ──────────────────────────────────────────────────────────

# boot_simulator_if_needed <udid> [timeout]
# Boots the simulator if not already booted. Waits for SpringBoard.
boot_simulator_if_needed() {
  local udid="$1"
  local timeout="${2:-$BOOT_TIMEOUT}"

  # Check if already booted
  if xcrun simctl list devices 2>/dev/null | grep "$udid" | grep -q "Booted"; then
    ok_ios "Simulator already booted (UDID: ${udid:0:8}...)"
    return 0
  fi

  log_ios "Booting simulator (UDID: ${udid:0:8}...)..."
  # open -a Simulator may fail if Simulator.app is inside Xcode.app — use full path as fallback
  open -a Simulator 2>/dev/null \
    || open "$(xcode-select -p)/Applications/Simulator.app" 2>/dev/null \
    || true
  xcrun simctl boot "$udid" 2>/dev/null || true

  log_ios "Waiting for simulator to boot (up to ${timeout}s)..."
  local elapsed=0
  until xcrun simctl list devices 2>/dev/null | grep "$udid" | grep -q "Booted"; do
    sleep 3
    elapsed=$((elapsed + 3))
    if [[ $elapsed -ge $timeout ]]; then
      err_ios "Simulator boot timed out after ${timeout}s"
      exit 1
    fi
    echo -n "."
  done
  echo ""
  ok_ios "Simulator booted!"
}

# ── IPA extraction ──────────────────────────────────────────────────────────

# resolve_ios_app <path>
# If path is an .ipa, extracts the .app bundle from Payload/ and prints its path.
# If path is already an .app directory, prints it as-is.
# Extraction cache: <ipa_dir>/.ipa-extracted/<ipa_basename>/Payload/*.app
resolve_ios_app() {
  local input="$1"

  # Already an .app bundle — use directly
  if [[ -d "$input" ]]; then
    echo "$input"
    return 0
  fi

  # Not an .ipa file — return as-is (caller will handle missing file)
  if [[ "${input##*.}" != "ipa" ]]; then
    echo "$input"
    return 0
  fi

  if [[ ! -f "$input" ]]; then
    err_ios "IPA file not found: $input"
    return 1
  fi

  local ipa_dir ipa_name extract_dir app_path
  ipa_dir="$(cd "$(dirname "$input")" && pwd)"
  ipa_name="$(basename "$input" .ipa)"
  extract_dir="$ipa_dir/.ipa-extracted/$ipa_name"

  # Re-extract if IPA is newer than cache
  # NOTE: log to stderr (&2) — stdout is reserved for the resolved path
  if [[ -d "$extract_dir/Payload" ]] && [[ "$input" -ot "$extract_dir/Payload" ]]; then
    log_ios "Using cached extraction: $extract_dir" >&2
  else
    log_ios "Extracting .app from IPA: $input" >&2
    rm -rf "$extract_dir"
    mkdir -p "$extract_dir"
    unzip -qo "$input" "Payload/*.app/*" -d "$extract_dir"
  fi

  # Find the .app bundle inside Payload/
  app_path=$(find "$extract_dir/Payload" -maxdepth 1 -name "*.app" -type d | head -1)
  if [[ -z "$app_path" ]]; then
    err_ios "No .app bundle found inside IPA Payload/"
    return 1
  fi

  ok_ios "Resolved .app: $app_path" >&2
  echo "$app_path"
}

# ── Install app ─────────────────────────────────────────────────────────────

# install_app_to_simulator <udid> <app_path>
# Installs an .app bundle to the booted simulator.
install_app_to_simulator() {
  local udid="$1"
  local app_path="$2"

  if [[ ! -d "$app_path" ]]; then
    warn_ios "App bundle not found at '$app_path' — skipping install"
    return 1
  fi

  log_ios "Installing app: $app_path"
  xcrun simctl install "$udid" "$app_path"
  ok_ios "App installed"
}

# ── Bundle ID extraction ────────────────────────────────────────────────────

# extract_bundle_id <app_path>
# Extracts CFBundleIdentifier from the app's Info.plist. Prints to stdout.
extract_bundle_id() {
  local app_path="$1"
  local plist="$app_path/Info.plist"

  if [[ ! -f "$plist" ]]; then
    err_ios "Info.plist not found at '$plist'"
    return 1
  fi

  /usr/libexec/PlistBuddy -c "Print CFBundleIdentifier" "$plist" 2>/dev/null
}
