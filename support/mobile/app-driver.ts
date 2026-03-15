/**
 * support/mobile/app-driver.ts — Safe wrappers for flaky Appium driver commands
 *
 * UiAutomator2 can hang on getPageSource() after resetAccessibilityCache because
 * the accessibility tree is mid-rebuild. These wrappers use Promise.race to bound
 * the hang time, preventing the test runner from blocking indefinitely.
 *
 * Usage:
 *   import { safeGetPageSource } from '../support/mobile/app-driver.ts';
 *   const source = await safeGetPageSource();   // returns '' on timeout
 */

/** Timeout for getPageSource(). Normal response is <500ms; 8s allows slow rebuilds. */
const GET_SOURCE_TIMEOUT_MS = 8_000;

/**
 * Timeout-protected getPageSource().
 *
 * Handles two failure modes that bare getPageSource() cannot:
 *   - Hang: UiAutomator2 mid-rebuild after resetAccessibilityCache → times out at 8s
 *   - Error: Session dead or instrumentation crashed → returns fallback immediately
 *
 * The underlying driver promise is kept alive as a "fire and forget" so the socket
 * is properly closed when UiAutomator2 eventually responds. Its rejection is handled
 * via .catch() to prevent UnhandledPromiseRejection warnings.
 *
 * @param fallback - value to return on timeout or error (default: empty string)
 */
export async function safeGetPageSource(fallback = ''): Promise<string> {
  // Keep the driver promise to avoid UnhandledPromiseRejection if it rejects later.
  const sourcePromise = driver.getPageSource().catch(() => fallback);
  const timeoutPromise = new Promise<string>((resolve) =>
    setTimeout(() => resolve(fallback), GET_SOURCE_TIMEOUT_MS),
  );
  return Promise.race([sourcePromise, timeoutPromise]);
}
