/**
 * support/mobile/screen-detector.ts — Screen detection utility
 *
 * Detects the current app screen by inspecting the accessibility source tree.
 * Each project should implement detection logic based on unique UI identifiers
 * from the app under test (e.g. resource-ids, content-desc, text strings).
 *
 * Usage in steps:
 *   const screen = await detectScreen();
 *   // Returns a screen name string, or 'unknown'
 *
 * See: examples/kub-wallet/support/mobile/screen-detector.ts for a full example.
 */

export type ScreenName = string;

/**
 * Detects the current screen by inspecting the page source.
 * Implement this based on your app's unique UI identifiers.
 *
 * @param source - Result of driver.getPageSource() (pass in to avoid double call)
 * @returns Detected screen name, or 'unknown'
 */
export function detectScreen(source: string): ScreenName {
  // TODO: Implement screen detection for your app.
  // Example:
  //   if (source.includes('your_unique_login_element')) return 'login';
  //   if (source.includes('your_unique_home_element')) return 'home';
  return 'unknown';
}
