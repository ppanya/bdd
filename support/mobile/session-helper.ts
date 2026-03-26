/**
 * support/mobile/session-helper.ts — Session state management
 *
 * Provides helpers for ensuring the app is in a known state before a test step.
 * Implement ensureAuthenticated() and similar helpers based on your app's
 * authentication and navigation patterns.
 *
 * See: examples/kub-wallet/support/mobile/session-helper.ts for a full example.
 */

/**
 * Ensures the app is in an authenticated state before running a test.
 * Implement this based on your app's login flow.
 *
 * Common pattern:
 *   1. Call detectScreen() to check current state
 *   2. If on login screen → perform login steps
 *   3. If already authenticated → return immediately
 */
export async function ensureAuthenticated(): Promise<void> {
  // TODO: Implement authentication check and login flow for your app.
  throw new Error(
    'ensureAuthenticated() not implemented. ' +
    'Copy the pattern from examples/kub-wallet/support/mobile/session-helper.ts ' +
    'and adapt it for your app.'
  );
}
