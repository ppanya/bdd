/**
 * support/env.config.ts — Centralized environment configuration
 *
 * Single source of truth for all env vars used across wdio.conf.ts,
 * base-api.ts, and scripts. Import this instead of reading process.env directly.
 *
 * Usage:
 *   import { env } from '../support/env.config.ts';
 *   console.log(env.apiBaseUrl);
 */

export const env = {
  // ── Web ───────────────────────────────────────────────────────────────────
  /** Base URL for web tests. browser.url('/path') resolves against this. */
  baseUrl: process.env['BASE_URL'] ?? 'https://the-internet.herokuapp.com',

  // ── API ───────────────────────────────────────────────────────────────────
  /** Base URL for API tests. Used by BaseAPI. Default points to Prism mock. */
  apiBaseUrl: process.env['API_BASE_URL'] ?? 'http://localhost:4010',

  // ── Mobile ────────────────────────────────────────────────────────────────
  /** Target platform: 'android' | 'ios' | undefined (defaults to web) */
  mobilePlatform: process.env['MOBILE_PLATFORM'] as 'android' | 'ios' | undefined,

  /** Appium server port */
  appiumPort: parseInt(process.env['APPIUM_PORT'] ?? '4723', 10),

  /** Android app package name */
  appPackage: process.env['APP_PACKAGE'] ?? 'com.bbt.bitkubnext.mock',

  /**
   * When true, skip APK reinstall + accessibility setup (pre-warmed by start-android-all.sh).
   * When false (CI / first run), do full clean install.
   */
  appReady: process.env['APP_READY'] === 'true',

  /** Path to Android APK */
  androidAppPath: process.env['ANDROID_APP_PATH'] ?? 'apps/app-mock-release.apk',

  /** Path to iOS .app bundle */
  iosAppPath: process.env['IOS_APP_PATH'] ?? 'apps/Runner.app',

  // ── Timeouts ──────────────────────────────────────────────────────────────
  /** WDIO waitfor default (ms) */
  waitforTimeout: parseInt(process.env['WAITFOR_TIMEOUT'] ?? '10000', 10),

  /** Log level for Winston logger */
  logLevel: process.env['LOG_LEVEL'] ?? 'info',

  // ── Test credentials ──────────────────────────────────────────────────────
  testEmail: process.env['TEST_EMAIL'] ?? 'test@example.com',
  testPassword: process.env['TEST_PASSWORD'] ?? 'P@ssw0rd123',
} as const;
