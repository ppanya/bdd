/**
 * support/mobile/session-helper.ts — Shared authentication helper
 *
 * Replaces the @devtools Before hook. Called by Given steps that need
 * an authenticated session (wallet, profile, etc.).
 */

import { detectScreen, waitForKnownScreen } from './screen-detector.ts';
import { TIMEOUTS } from '../../screens/base.screen.ts';
import logger from '../logger.ts';

/**
 * Ensure the app is authenticated — inject test session via DevTools if needed.
 *
 * Recognizes sub-screens (history, settings, my-profile) as already authenticated.
 * Only injects when the app is on onboarding/login (unauthenticated screens).
 */
export async function ensureAuthenticated(): Promise<void> {
  const screen = await detectScreen();

  // Already authenticated — on home or any sub-screen
  if (screen === 'home' || screen === 'history' || screen === 'settings' || screen === 'my-profile')
    return;

  // Treat 'loading' as "authenticated, screen mid-refresh" — do NOT inject.
  // A truly unauthenticated fresh-start returns 'login' or 'onboarding', never 'loading'.
  if (screen === 'loading') return;

  try {
    const { DevToolsScreen } = await import('../../screens/devtools.screen.ts');
    const devTools = new DevToolsScreen();

    await devTools.open();
    await devTools.injectTestSession();
    await devTools.close();

    let next = await waitForKnownScreen(TIMEOUTS.nav);
    if (next === 'pdpa') {
      const { PdpaScreen } = await import('../../screens/pdpa.screen.ts');
      const pdpa = new PdpaScreen();
      await pdpa.acceptPdpa();
      next = await waitForKnownScreen(TIMEOUTS.nav);
    }
    if (next === 'pin') {
      const { PincodeScreen } = await import('../../screens/pincode.screen.ts');
      const pincode = new PincodeScreen();
      await pincode.setPin(process.env['TEST_PIN'] ?? '123456');
    }
  } catch (err) {
    logger.warn('[ensureAuthenticated] token injection failed', {
      error: (err as Error).message,
    });
    // Close DevTools if still open — prevents cascade failures
    try {
      const { DevToolsScreen: DT } = await import('../../screens/devtools.screen.ts');
      const dt = new DT();
      await dt.close();
    } catch {
      // ignore — best effort cleanup
    }
  }
}
