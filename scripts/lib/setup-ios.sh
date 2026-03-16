#!/usr/bin/env bash
# scripts/lib/setup-ios.sh — Xcode, iOS runtime, simulator, Appium XCUITest driver
# Called by: scripts/setup.sh
# Not meant to run standalone. Requires setup-common.sh to be sourced first.

setup_ios() {
  section "iOS"

  # ── Xcode.app check ─────────────────────────────────────────────────────
  info "Checking Xcode..."

  XCODE_PATH=$(xcode-select -p 2>/dev/null || true)

  if [[ -z "$XCODE_PATH" ]]; then
    error "Xcode not found. Install from App Store:
   1. Open App Store → search 'Xcode' → Install
   2. After install: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   3. Re-run this script"
  fi

  # CLI Tools only — no simulator support
  if [[ "$XCODE_PATH" == "/Library/Developer/CommandLineTools" ]]; then
    if [[ -d "/Applications/Xcode.app" ]]; then
      warn "Xcode.app found but not selected — switching..."
      sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
      XCODE_PATH="/Applications/Xcode.app/Contents/Developer"
    else
      error "Only Command Line Tools installed — need full Xcode for simulators.
   1. Open App Store → search 'Xcode' → Install
   2. After install: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   3. Re-run this script"
    fi
  fi

  XCODE_VER=$(xcodebuild -version 2>/dev/null | head -1 || echo "unknown")
  success "Xcode: $XCODE_VER"

  # ── Accept Xcode license ─────────────────────────────────────────────────
  info "Checking Xcode license..."
  if ! xcodebuild -checkFirstLaunchStatus 2>/dev/null; then
    warn "Accepting Xcode license (may require sudo)..."
    sudo xcodebuild -license accept 2>/dev/null || warn "Could not auto-accept — run 'sudo xcodebuild -license' manually"
    sudo xcodebuild -runFirstLaunch 2>/dev/null || true
  fi
  success "Xcode license accepted"

  # ── iOS Simulator Runtime ────────────────────────────────────────────────
  info "Checking iOS Simulator runtimes..."

  INSTALLED_RUNTIMES=$(xcrun simctl list runtimes 2>/dev/null | grep -i "ios" || true)

  if [[ -z "$INSTALLED_RUNTIMES" ]]; then
    info "No iOS runtime found — downloading latest..."
    echo ""
    echo -e "${YELLOW}This will download the iOS Simulator runtime (~5-8 GB).${NC}"
    echo -e "${YELLOW}Press Ctrl+C to cancel, or wait to continue...${NC}"
    sleep 3
    xcodebuild -downloadPlatform iOS
    INSTALLED_RUNTIMES=$(xcrun simctl list runtimes 2>/dev/null | grep -i "ios" || true)
  fi

  if [[ -z "$INSTALLED_RUNTIMES" ]]; then
    error "No iOS runtime available after download. Check Xcode → Settings → Platforms."
  fi

  echo "$INSTALLED_RUNTIMES"
  echo ""

  LATEST_VER=$(echo "$INSTALLED_RUNTIMES" | tail -1 | sed -E 's/.*iOS ([0-9]+\.[0-9]+).*/\1/')
  success "Latest iOS runtime: $LATEST_VER"

  # ── Device type selection ────────────────────────────────────────────────
  info "Available device types:"

  DEVICE_TYPES=$(xcrun simctl list devicetypes 2>/dev/null | grep -i "iphone" || true)
  echo "$DEVICE_TYPES" | head -15
  TOTAL=$(echo "$DEVICE_TYPES" | wc -l | tr -d ' ')
  if [[ "$TOTAL" -gt 15 ]]; then
    echo "  ... and $((TOTAL - 15)) more"
  fi
  echo ""

  if [[ -n "${IOS_DEVICE_NAME:-}" ]]; then
    DEVICE_NAME="$IOS_DEVICE_NAME"
    info "Using IOS_DEVICE_NAME from env: $DEVICE_NAME"
  else
    DEFAULT_DEVICE="iPhone 16"
    if echo "$DEVICE_TYPES" | grep -q "$DEFAULT_DEVICE"; then
      DEVICE_NAME="$DEFAULT_DEVICE"
    else
      DEVICE_NAME=$(echo "$DEVICE_TYPES" | grep -i "iphone" | tail -1 | sed -E 's/^[[:space:]]*//' | sed -E 's/ \(.*//')
    fi
    echo -e "Default device: ${BLUE}${DEVICE_NAME}${NC}"
    read -r -p "Enter device name (or press Enter for default): " USER_DEVICE
    if [[ -n "$USER_DEVICE" ]]; then
      DEVICE_NAME="$USER_DEVICE"
    fi
  fi

  IOS_VER="${IOS_PLATFORM_VER:-$LATEST_VER}"
  success "Selected: $DEVICE_NAME (iOS $IOS_VER)"

  # ── Create simulator ────────────────────────────────────────────────────
  info "Checking for existing simulator..."

  EXISTING=$(xcrun simctl list devices 2>/dev/null | grep "$DEVICE_NAME" | head -1 || true)

  if [[ -n "$EXISTING" ]]; then
    UDID=$(echo "$EXISTING" | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')
    warn "Simulator '$DEVICE_NAME' already exists (UDID: $UDID)"
  else
    info "Creating simulator: $DEVICE_NAME (iOS $IOS_VER)..."

    DEVICE_TYPE_ID=$(xcrun simctl list devicetypes 2>/dev/null \
      | grep "$DEVICE_NAME" \
      | head -1 \
      | sed -E 's/.*\(([^)]+)\).*/\1/')

    if [[ -z "$DEVICE_TYPE_ID" ]]; then
      error "Device type '$DEVICE_NAME' not found."
    fi

    RUNTIME_ID=$(xcrun simctl list runtimes 2>/dev/null \
      | grep -i "ios $IOS_VER" \
      | head -1 \
      | sed -E 's/.*\(([^)]+)\)[^)]*$/\1/')

    if [[ -z "$RUNTIME_ID" ]]; then
      error "iOS runtime $IOS_VER not found."
    fi

    UDID=$(xcrun simctl create "$DEVICE_NAME" "$DEVICE_TYPE_ID" "$RUNTIME_ID")
    success "Simulator created: $DEVICE_NAME (UDID: $UDID)"
  fi

  # ── Appium XCUITest driver ─────────────────────────────────────────────
  info "Checking Appium XCUITest driver..."
  APPIUM="./node_modules/.bin/appium"
  if [[ -x "$APPIUM" ]]; then
    # Strip ANSI codes and check for "[installed" to avoid matching "[not installed]"
    if "$APPIUM" driver list 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep "xcuitest" | grep -q "\[installed"; then
      success "XCUITest driver already installed"
    else
      info "Installing XCUITest driver..."
      "$APPIUM" driver install xcuitest@10 || warn "Install failed — run: bunx appium driver install xcuitest@10"
    fi
  else
    warn "Appium not found — run 'bun install' first"
  fi

  # ── WebDriverAgent build fix (ARM64) ────────────────────────────────────
  WDA_PATH=$(find ~/.appium -name "WebDriverAgent.xcodeproj" 2>/dev/null | head -1)
  if [ -n "$WDA_PATH" ]; then
    info "Configuring WebDriverAgent for ARM64..."
    WDA_DIR="$(dirname "$WDA_PATH")"
    defaults write "${WDA_DIR}/WebDriverAgent.xcodeproj/project.pbxproj" \
      VALID_ARCHS arm64 2>/dev/null || warn "Could not set WDA arch (may need manual Xcode config)"
    success "WebDriverAgent configured"
  else
    warn "WebDriverAgent not found — will be built on first iOS test run"
  fi

  # ── Save values for summary ────────────────────────────────────────────
  _IOS_DEVICE_NAME="$DEVICE_NAME"
  _IOS_PLATFORM_VER="$IOS_VER"

  success "iOS setup complete"
}
