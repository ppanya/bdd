/**
 * support/mobile/nav-helper.ts — Centralized DevTools navigation with guards
 *
 * Three guards prevent cascade flakiness:
 *   1. Short-circuit: Skip if already on target screen
 *   2. Keyboard guard: Dismiss keyboard before opening DevTools
 *   3. Cleanup guard: Close DevTools on failure (try/catch)
 */

import type { DevToolsRoute } from '../../screens/devtools.screen.ts';
import { safeGetPageSource } from './app-driver.ts';
import logger from '../logger.ts';

/**
 * Dismiss keyboard reliably across Flutter + TalkBack.
 * driver.back() is more reliable than hideKeyboard() on Flutter.
 */
export async function dismissKeyboard(): Promise<void> {
  try {
    const isShown = await driver.isKeyboardShown();
    if (isShown) {
      await driver.back();
      await driver.pause(300);
    }
  } catch {
    try {
      await driver.hideKeyboard();
    } catch {
      /* ignore — keyboard not open */
    }
  }
}

/**
 * Force-close DevTools if open — uses page source (full tree, not just visible area).
 * Fixes the root cause of cascade failures: isDisplayed() returns false when
 * DEV TOOLS header is scrolled out of view, but the panel is still open.
 */
export async function forceCloseDevTools(): Promise<void> {
  const source = await safeGetPageSource();
  if (source.includes('DEV TOOLS')) {
    await driver.back();
    await driver.pause(500);
  }
}

/**
 * Navigate to a screen via DevTools with all 3 guards.
 *
 * @param route       - DevToolsRoute to navigate to
 * @param screenCheck - Returns true if already on the target screen
 * @param waitForEl   - Waits for a key element on the target screen (confirms navigation)
 */
export async function navigateViaDevTools(
  route: DevToolsRoute,
  screenCheck: () => Promise<boolean>,
  waitForEl: () => Promise<void>,
): Promise<void> {
  // Guard 1: Short-circuit — skip if already on target screen
  const alreadyThere = await browser
    .waitUntil(screenCheck, { timeout: 3_000 })
    .catch(() => false);
  if (alreadyThere) return;

  // Guard 2: Keyboard — dismiss before opening DevTools
  await dismissKeyboard();

  const { DevToolsScreen } = await import('../../screens/devtools.screen.ts');
  const devTools = new DevToolsScreen();

  try {
    await devTools.open();
    await devTools.goTo(route);
    await waitForEl();
  } catch (err) {
    // Guard 3: Cleanup — close DevTools on failure to prevent cascade
    logger.warn(`[navigateViaDevTools] ${route} failed`, {
      error: (err as Error).message,
    });
    await forceCloseDevTools();
    throw err;
  }
}
