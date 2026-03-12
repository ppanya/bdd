#!/bin/bash
# setup-m-series.sh — Bootstrap Appium + Flutter testing on Apple Silicon
# รัน: bash scripts/setup-m-series.sh

set -eu

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { printf "${GREEN}▶ %s${NC}\n" "$1"; }
warn()    { printf "${YELLOW}⚠ %s${NC}\n" "$1"; }
error()   { printf "${RED}✘ %s${NC}\n" "$1" >&2; exit 1; }
success() { printf "${GREEN}✔ %s${NC}\n" "$1"; }

# ── 1. Architecture check ─────────────────────────────────────────────────────
info "Checking architecture..."
if [ "$(uname -m)" != "arm64" ]; then
  error "This script requires Apple Silicon (arm64). Got: $(uname -m)"
fi
success "arm64 confirmed"

# ── 2. Homebrew ───────────────────────────────────────────────────────────────
# BUG FIX: sh sessions (unlike zsh/bash login shells) ไม่ source ~/.profile
# ดังนั้น /opt/homebrew/bin อาจไม่อยู่ใน PATH — ต้อง set ก่อนใช้ brew
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:${PATH}"

info "Checking Homebrew..."
if ! command -v brew >/dev/null 2>&1; then
  info "Installing Homebrew..."
  # NONINTERACTIVE=1 ข้ามการ prompt ยืนยันของ Homebrew installer
  NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi
success "Homebrew $(brew --version | head -1)"

# ── 3. Temurin JDK 17 (ARM64) ────────────────────────────────────────────────
info "Installing Temurin JDK 17 (ARM64)..."
if ! brew list --cask temurin@17 >/dev/null 2>&1; then
  brew install --cask temurin@17
else
  warn "temurin@17 already installed"
fi

JAVA_HOME="$(/usr/libexec/java_home -v 17 2>/dev/null || echo '/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home')"
export JAVA_HOME
success "Java: $(java -version 2>&1 | head -1)"

# ── 4. Android SDK ────────────────────────────────────────────────────────────
info "Setting up Android SDK..."

ANDROID_HOME="${HOME}/Library/Android/sdk"
CMDTOOLS="${ANDROID_HOME}/cmdline-tools/latest"
export ANDROID_HOME
export ANDROID_SDK_ROOT="$ANDROID_HOME"

# ติดตั้ง Homebrew cask ถ้ายังไม่มี (เป็น source ของ cmdline-tools binary)
if ! brew list --cask android-commandlinetools >/dev/null 2>&1; then
  info "Installing android-commandlinetools via Homebrew..."
  brew install --cask android-commandlinetools
fi

# COPY cmdline-tools จาก Homebrew Caskroom เข้า $ANDROID_HOME/cmdline-tools/latest/
#
# ทำไมต้อง copy ไม่ใช่ symlink หรือใช้จาก PATH:
# avdmanager เป็น shell script ที่ compute SDK root จาก "cd dirname; pwd -P"
# ถ้าอยู่ใน Caskroom → SDK root = Caskroom → ไม่เห็น system-images → "null"
# ถ้าอยู่ใน $ANDROID_HOME/cmdline-tools/latest/bin/ → SDK root = $ANDROID_HOME ✓
if [ ! -f "${CMDTOOLS}/bin/avdmanager" ]; then
  info "Copying cmdline-tools into SDK directory..."

  # หา avdmanager ด้วย 3 วิธีตามลำดับ:
  BREW_TOOLS=""

  # 1. ค้นใน Caskroom ของ android-commandlinetools โดยตรง
  BREW_TOOLS=$(find "$(brew --prefix)/Caskroom/android-commandlinetools" \
    -name "avdmanager" 2>/dev/null | head -1)

  # 2. ค้นทั้ง Caskroom (กรณี cask path เปลี่ยน/restructured)
  if [ -z "$BREW_TOOLS" ]; then
    warn "Not found in android-commandlinetools Caskroom — searching all Caskroom..."
    BREW_TOOLS=$(find "$(brew --prefix)/Caskroom" \
      -name "avdmanager" 2>/dev/null | head -1)
  fi

  # 3. ตาม symlink จาก PATH → resolve ไปยัง real file ใน Caskroom
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
      BREW_TOOLS="$_link"  # ไม่ใช่ symlink — ใช้ตรงๆ
    fi
  fi

  if [ -z "$BREW_TOOLS" ]; then
    error "Cannot find avdmanager anywhere. Try: brew reinstall android-commandlinetools"
  fi

  info "Found avdmanager at: $BREW_TOOLS"

  # avdmanager อยู่ใน bin/ → ขึ้นไป 2 ระดับเพื่อได้ cmdline-tools dir
  BREW_CMDTOOLS_DIR="$(dirname "$(dirname "$BREW_TOOLS")")"
  info "cmdline-tools source: $BREW_CMDTOOLS_DIR"

  mkdir -p "${ANDROID_HOME}/cmdline-tools"
  # ลบ partial destination ก่อน cp เพื่อป้องกัน cp วาง source ไว้ใน dest
  rm -rf "$CMDTOOLS"
  cp -rp "$BREW_CMDTOOLS_DIR" "$CMDTOOLS"
  success "cmdline-tools copied to $CMDTOOLS"
else
  warn "cmdline-tools already at $CMDTOOLS"
fi

export PATH="${CMDTOOLS}/bin:${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/emulator:${PATH}"
success "Android SDK: $ANDROID_HOME"

# ── 5. SDK packages + ARM64 emulator image ────────────────────────────────────
info "Accepting Android SDK licenses..."
yes | "${CMDTOOLS}/bin/sdkmanager" --licenses 2>/dev/null || true

info "Installing SDK packages and ARM64 emulator image (Android 34)..."
# BUG FIX: pipe `yes` เพื่อ handle license prompts ที่อาจปรากฏระหว่าง install
# ใช้ sdkmanager จาก $ANDROID_HOME — derive SDK root จาก path เองโดยไม่ต้อง --sdk_root
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

# ── 6. Create AVD ─────────────────────────────────────────────────────────────
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

# ── 7. Xcode CLI Tools ────────────────────────────────────────────────────────
info "Checking Xcode CLI tools..."
if ! xcode-select -p >/dev/null 2>&1; then
  info "Installing Xcode CLI tools..."
  # BUG FIX: xcode-select --install คืนค่า non-zero ทันทีแล้วเปิด dialog
  # ต้อง || true ไม่งั้น set -e จะ exit ก่อนถึง warn
  xcode-select --install || true
  warn "Please complete Xcode CLI tools installation and re-run this script"
  exit 0
fi
success "Xcode CLI: $(xcode-select -p)"

# ── 8. Bun ────────────────────────────────────────────────────────────────────
info "Checking Bun..."
if ! command -v bun >/dev/null 2>&1; then
  # BUG FIX: oven-sh/bun/bun เป็น old tap — bun อยู่ใน homebrew/core แล้ว
  brew install bun
fi
success "Bun: $(bun --version)"

# ── 9. Node via nvm (required by Appium driver management) ───────────────────
# Appium 2.x hardcode เรียก `npm` CLI ภายใน — ไม่มีทางเลี่ยง
# ~/.bun/bin/node เป็น shim ที่ไม่มี npm → ต้อง source nvm ให้ nvm's node/npm
# อยู่หน้า PATH ก่อน Bun's shim
info "Loading Node via nvm (npm required by Appium internals)..."
NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"
if [ ! -s "${NVM_DIR}/nvm.sh" ]; then
  error "nvm not found at ${NVM_DIR}. Please install nvm first: https://github.com/nvm-sh/nvm"
fi
# shellcheck disable=SC1091
source "${NVM_DIR}/nvm.sh"
nvm use default 2>/dev/null || nvm use --lts 2>/dev/null || true
if ! command -v npm >/dev/null 2>&1; then
  info "No Node version active — installing LTS via nvm..."
  nvm install --lts
  nvm alias default lts/*
  nvm use default
fi
success "Node: $(node --version) | npm: $(npm --version)"

# ── 10. Appium (local via bun install) ───────────────────────────────────────
# Appium และ drivers ถูก manage ผ่าน node_modules (local) ไม่ใช่ global
# bun install จะดึง appium version ที่กำหนดใน package.json มาให้อัตโนมัติ
# ส่วน driver + plugin จะถูก setup ผ่าน `bun run setup:drivers` ซึ่งรันหลัง bun install
info "Installing project dependencies (appium included)..."
bun install
success "Dependencies installed"

info "Installing Appium drivers and plugins (local)..."
bun run setup:drivers

# ── 11. WebDriverAgent build fix (ARM64) ─────────────────────────────────────
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

# ── 12. Env vars → shell profile ──────────────────────────────────────────────
# BUG FIX: macOS default shell คือ zsh (Catalina+) ซึ่งไม่ source ~/.profile
# ตรวจ $SHELL และเขียนไปยัง file ที่ถูกต้อง
info "Writing env vars to shell profile..."

DEFAULT_SHELL="$(basename "${SHELL:-/bin/zsh}")"
case "$DEFAULT_SHELL" in
  zsh)  PROFILE="${HOME}/.zshrc" ;;
  bash) PROFILE="${HOME}/.bashrc" ;;
  *)    PROFILE="${HOME}/.profile" ;;
esac

MARKER="# >> bdd-framework setup-m-series"

if ! grep -q "$MARKER" "$PROFILE" 2>/dev/null; then
  cat >> "$PROFILE" << 'EOF'

# >> bdd-framework setup-m-series
export JAVA_HOME="$(/usr/libexec/java_home -v 17 2>/dev/null || echo '/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home')"
export ANDROID_HOME="${HOME}/Library/Android/sdk"
export PATH="${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/emulator:${ANDROID_HOME}/platform-tools:${PATH}"
export PATH="/opt/homebrew/bin:${PATH}"
EOF
  success "Env vars written to $PROFILE"
else
  warn "Env vars already in $PROFILE (skipped)"
fi

# ── 13. Verification ──────────────────────────────────────────────────────────
echo ""
info "Verification:"
printf "  java:    %s\n" "$(java -version 2>&1 | head -1)"
printf "  adb:     %s\n" "$(adb --version 2>/dev/null | head -1 || echo 'not found')"
printf "  appium:  %s\n" "$(appium --version 2>/dev/null || echo 'not found')"
printf "  bun:     %s\n" "$(bun --version 2>/dev/null || echo 'not found')"
echo ""
success "Setup complete! Run: . $PROFILE"
echo ""
echo "Next steps:"
echo "  1. source $PROFILE"
echo "  2. bun run inspect:android   # inspect elements + run Appium server"
echo "     bun run test:mobile:android   # run tests"
