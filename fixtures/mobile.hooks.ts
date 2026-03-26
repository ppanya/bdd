/**
 * fixtures/mobile.hooks.ts — Mobile-specific Cucumber hooks
 *
 * Tagless — runs for every scenario when mobile platform is active.
 * Authentication is handled by Given steps via ensureAuthenticated().
 *
 * Anti-flakiness:
 *   Before — resetAccessibilityCache + 1s pause (lightweight tree rebuild)
 *            + route cache reset (prevents stale fast-path across scenarios)
 *            Falls back to app restart ONLY when cache reset fails.
 *   After  — keyboard dismiss only (no getPageSource — avoids hanging Appium)
 *
 * IMPORTANT: getPageSource() must NEVER be called in hooks.
 * It's the most expensive Appium command (full accessibility tree traversal)
 * and the most likely to hang after heavy DevTools navigation. Hooks are the
 * critical path between scenarios — any hang here blocks ALL remaining scenarios.
 */

import { Before, After } from '@cucumber/cucumber';
import type { AppWorld } from './index.ts';
import logger from '../support/logger.ts';

// ── Platform-aware app identifier ─────────────────────────────────────────────

/**
 * Returns the correct app identifier for the current platform.
 *   Android → appPackage (from APP_PACKAGE env or default)
 *   iOS     → bundleId   (from IOS_BUNDLE_ID env or default)
 */
function getAppId(): string {
  const platform = (driver.capabilities['platformName'] as string)?.toLowerCase();
  if (platform === 'ios') {
    return process.env['IOS_BUNDLE_ID'] ?? 'com.example.app';
  }
  return process.env['APP_PACKAGE'] ?? 'com.example.app';
}

// ── Lightweight cache reset + route cache — every mobile scenario ─────────────

Before(async function (this: AppWorld) {
  try {
    // Flush stale accessibility tree and give UiAutomator2 time to fully rebuild.
    // 1s pause (vs 300ms in waitForIdle) ensures the tree is stable after
    // heavy DevTools navigation from the previous scenario.
    // This does NOT use getPageSource — avoids the command that causes hangs.
    await driver.execute('mobile: resetAccessibilityCache', {});
    await driver.pause(1_000);
  } catch {
    // resetAccessibilityCache failed → session is dead or instrumentation crashed.
    // Fall back to app restart (ADB-level, bypasses UiAutomator2).
    const appId = getAppId();
    logger.warn('[Before] cache reset failed — restarting app');
    try {
      await driver.terminateApp(appId);
      await driver.pause(1_000);
      await driver.activateApp(appId);
      await driver.pause(3_000);
    } catch (err) {
      logger.warn('[Before] app restart failed', { error: (err as Error).message });
    }
  }
});

// ── Lightweight cleanup — every mobile scenario ───────────────────────────────

After(async function () {
  try {
    // Only dismiss keyboard — no getPageSource, no detectScreen.
    // DevTools cleanup + sub-screen nav is handled by each scenario's Given step
    // (navigateViaDevTools has its own guards: short-circuit, keyboard, cleanup).
    await driver.hideKeyboard().catch(() => {});
  } catch {
    // best effort — session might be dead
  }
});
