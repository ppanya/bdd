#!/usr/bin/env bash
# scripts/setup-drivers.sh — Install Appium drivers into Appium's driver registry
#
# WHY THIS EXISTS:
# Even though appium-uiautomator2-driver and appium-xcuitest-driver are npm
# devDependencies, Appium 3.x requires them to also be registered in its
# internal driver manifest. Running `appium driver install` performs that
# registration. Without it, `appium driver list` will not show the drivers
# and Appium will refuse to create sessions.
#
# Run once after `bun install` or when upgrading Appium driver versions.
# Usage: bun run setup:drivers
set -euo pipefail

APPIUM="./node_modules/.bin/appium"

if [[ ! -x "$APPIUM" ]]; then
  echo "ERROR: Appium not found at $APPIUM — run 'bun install' first" >&2
  exit 1
fi

install_driver() {
  local name="$1"
  local version="$2"

  echo "Installing Appium driver: ${name}@${version}..."
  if "$APPIUM" driver list 2>/dev/null | grep -q "$name"; then
    echo "  ✓ ${name} already installed — skipping"
  else
    if "$APPIUM" driver install "${name}@${version}"; then
      echo "  ✓ ${name}@${version} installed"
    else
      echo "  ✗ Failed to install ${name}@${version}" >&2
      exit 1
    fi
  fi
}

install_driver "uiautomator2" "7"
install_driver "xcuitest" "10"

echo ""
echo "Done. Verify with: ./node_modules/.bin/appium driver list"
