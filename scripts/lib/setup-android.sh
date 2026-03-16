#!/usr/bin/env bash
# scripts/lib/setup-android.sh — Android SDK, emulator image, AVD, Appium driver
# Called by: scripts/setup.sh
# Not meant to run standalone. Requires setup-common.sh to be sourced first.

setup_android() {
  section "Android"

  # ── Android SDK ──────────────────────────────────────────────────────────
  info "Setting up Android SDK..."

  ANDROID_HOME="${HOME}/Library/Android/sdk"
  CMDTOOLS="${ANDROID_HOME}/cmdline-tools/latest"
  export ANDROID_HOME
  export ANDROID_SDK_ROOT="$ANDROID_HOME"

  if ! brew list --cask android-commandlinetools >/dev/null 2>&1; then
    info "Installing android-commandlinetools via Homebrew..."
    brew install --cask android-commandlinetools
  fi

  # Copy cmdline-tools into SDK directory (avdmanager needs this path structure)
  if [ ! -f "${CMDTOOLS}/bin/avdmanager" ]; then
    info "Copying cmdline-tools into SDK directory..."

    BREW_TOOLS=""
    BREW_TOOLS=$(find "$(brew --prefix)/Caskroom/android-commandlinetools" \
      -name "avdmanager" 2>/dev/null | head -1)

    if [ -z "$BREW_TOOLS" ]; then
      warn "Not found in android-commandlinetools Caskroom — searching all Caskroom..."
      BREW_TOOLS=$(find "$(brew --prefix)/Caskroom" \
        -name "avdmanager" 2>/dev/null | head -1)
    fi

    if [ -z "$BREW_TOOLS" ] && command -v avdmanager >/dev/null 2>&1; then
      warn "Not found in Caskroom — resolving via PATH symlink..."
      _link="$(command -v avdmanager)"
      _target="$(readlink "$_link" 2>/dev/null || true)"
      if [ -n "$_target" ]; then
        case "$_target" in
          /*) BREW_TOOLS="$_target" ;;
          *)  BREW_TOOLS="$(dirname "$_link")/$_target" ;;
        esac
      else
        BREW_TOOLS="$_link"
      fi
    fi

    if [ -z "$BREW_TOOLS" ]; then
      error "Cannot find avdmanager anywhere. Try: brew reinstall android-commandlinetools"
    fi

    BREW_CMDTOOLS_DIR="$(dirname "$(dirname "$BREW_TOOLS")")"
    mkdir -p "${ANDROID_HOME}/cmdline-tools"
    rm -rf "$CMDTOOLS"
    cp -rp "$BREW_CMDTOOLS_DIR" "$CMDTOOLS"
    success "cmdline-tools copied to $CMDTOOLS"
  else
    warn "cmdline-tools already at $CMDTOOLS"
  fi

  export PATH="${CMDTOOLS}/bin:${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/emulator:${PATH}"
  success "Android SDK: $ANDROID_HOME"

  # ── SDK packages + ARM64 emulator image ──────────────────────────────────
  info "Accepting Android SDK licenses..."
  yes | "${CMDTOOLS}/bin/sdkmanager" --licenses 2>/dev/null || true

  info "Installing SDK packages and ARM64 emulator image (Android 34)..."
  yes | "${CMDTOOLS}/bin/sdkmanager" \
    "system-images;android-34;google_apis;arm64-v8a" \
    "platforms;android-34" \
    "build-tools;34.0.0" \
    "emulator" \
    "platform-tools"

  SYSIMG="${ANDROID_HOME}/system-images/android-34/google_apis/arm64-v8a"
  if [ ! -d "$SYSIMG" ]; then
    error "System image not found at $SYSIMG — sdkmanager install may have failed"
  fi
  success "SDK packages installed"

  # ── Create AVD ───────────────────────────────────────────────────────────
  info "Creating AVD: Pixel_7_API_34_arm64..."
  if "${CMDTOOLS}/bin/avdmanager" list avd 2>/dev/null | grep -q "Pixel_7_API_34_arm64"; then
    warn "AVD Pixel_7_API_34_arm64 already exists"
  else
    echo "no" | "${CMDTOOLS}/bin/avdmanager" create avd \
      -n "Pixel_7_API_34_arm64" \
      -k "system-images;android-34;google_apis;arm64-v8a" \
      -d "pixel_7" \
      --force
    success "AVD created: Pixel_7_API_34_arm64"
  fi

  # ── Appium UiAutomator2 driver ──────────────────────────────────────────
  info "Checking Appium UiAutomator2 driver..."
  APPIUM="./node_modules/.bin/appium"
  if [[ -x "$APPIUM" ]]; then
    # Strip ANSI codes and check for "[installed" to avoid matching "[not installed]"
    if "$APPIUM" driver list 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep "uiautomator2" | grep -q "\[installed"; then
      success "UiAutomator2 driver already installed"
    else
      info "Installing UiAutomator2 driver..."
      "$APPIUM" driver install uiautomator2@7 || warn "Install failed — run: bunx appium driver install uiautomator2@7"
    fi
  else
    warn "Appium not found — run 'bun install' first"
  fi

  success "Android setup complete"
}
