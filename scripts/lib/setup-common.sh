#!/usr/bin/env bash
# scripts/lib/setup-common.sh — shared dependency setup (Homebrew, JDK, Bun, Node, bun install)
# Called by: scripts/setup.sh
# Not meant to run standalone.

# ── 1. Architecture check ───────────────────────────────────────────────────
setup_arch_check() {
  info "Checking architecture..."
  if [ "$(uname -m)" != "arm64" ]; then
    error "This script requires Apple Silicon (arm64). Got: $(uname -m)"
  fi
  success "arm64 confirmed"
}

# ── 2. Homebrew ─────────────────────────────────────────────────────────────
setup_homebrew() {
  # BUG FIX: sh sessions (unlike zsh/bash login shells) don't source ~/.profile
  # so /opt/homebrew/bin may not be in PATH
  export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:${PATH}"

  info "Checking Homebrew..."
  if ! command -v brew >/dev/null 2>&1; then
    info "Installing Homebrew..."
    NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
  success "Homebrew $(brew --version | head -1)"
}

# ── 3. Temurin JDK 17 ──────────────────────────────────────────────────────
setup_jdk() {
  info "Installing Temurin JDK 17 (ARM64)..."
  if ! brew list --cask temurin@17 >/dev/null 2>&1; then
    brew install --cask temurin@17
  else
    warn "temurin@17 already installed"
  fi

  JAVA_HOME="$(/usr/libexec/java_home -v 17 2>/dev/null || echo '/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home')"
  export JAVA_HOME
  success "Java: $(java -version 2>&1 | head -1)"
}

# ── 4. Xcode CLI Tools ─────────────────────────────────────────────────────
setup_xcode_cli() {
  info "Checking Xcode CLI tools..."
  if ! xcode-select -p >/dev/null 2>&1; then
    info "Installing Xcode CLI tools..."
    xcode-select --install || true
    warn "Please complete Xcode CLI tools installation and re-run this script"
    exit 0
  fi
  success "Xcode CLI: $(xcode-select -p)"
}

# ── 5. Bun ──────────────────────────────────────────────────────────────────
setup_bun() {
  info "Checking Bun..."
  if ! command -v bun >/dev/null 2>&1; then
    brew install bun
  fi
  success "Bun: $(bun --version)"
}

# ── 6. Node via nvm (required by Appium driver management) ─────────────────
setup_node() {
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
}

# ── 7. Project dependencies ────────────────────────────────────────────────
setup_deps() {
  info "Installing project dependencies..."
  bun install
  success "Dependencies installed"
}

# ── 8. Shell profile env vars ──────────────────────────────────────────────
setup_shell_profile() {
  info "Writing env vars to shell profile..."

  DEFAULT_SHELL="$(basename "${SHELL:-/bin/zsh}")"
  case "$DEFAULT_SHELL" in
    zsh)  PROFILE="${HOME}/.zshrc" ;;
    bash) PROFILE="${HOME}/.bashrc" ;;
    *)    PROFILE="${HOME}/.profile" ;;
  esac

  MARKER="# >> bdd-framework setup"

  if ! grep -q "$MARKER" "$PROFILE" 2>/dev/null; then
    cat >> "$PROFILE" << 'EOF'

# >> bdd-framework setup
export JAVA_HOME="$(/usr/libexec/java_home -v 17 2>/dev/null || echo '/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home')"
export ANDROID_HOME="${HOME}/Library/Android/sdk"
export PATH="${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/emulator:${ANDROID_HOME}/platform-tools:${PATH}"
export PATH="/opt/homebrew/bin:${PATH}"
EOF
    success "Env vars written to $PROFILE"
  else
    warn "Env vars already in $PROFILE (skipped)"
  fi
}

# ── Run all common setup ───────────────────────────────────────────────────
setup_common() {
  setup_arch_check
  setup_homebrew
  setup_jdk
  setup_xcode_cli
  setup_bun
  setup_node
  setup_deps
}
