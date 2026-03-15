import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
// @ts-expect-error — wdio-video-reporter types exist but package.json "exports" prevents resolution
import video from 'wdio-video-reporter';
import logger from './support/logger.ts';

// ── helpers ──────────────────────────────────────────────────────────────────

const isArm64 = process.arch === 'arm64';

// undefined when not explicitly set — defaults to web capability
const mobilePlatform = process.env['MOBILE_PLATFORM'];

// When APP_READY=true (set by run-mobile-tests.sh), skip APK reinstall.
// The environment was pre-warmed by start-android.sh — no need to reinstall.
// When false/unset (CI or first run), do a full clean install.
const appReady = process.env['APP_READY'] === 'true';

// Package name for terminate/activate app (avoids reloadSession spawn errors).
// Auto-set by bun run android (start-android-all.sh). Override via APP_PACKAGE env.
const appPackage = process.env['APP_PACKAGE'] ?? 'com.bbt.bitkubnext.mock';

// ── capabilities ─────────────────────────────────────────────────────────────

const webCapability = {
  browserName: 'chrome',
  'goog:chromeOptions': {
    args: ['--headless', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'],
  },
};

const androidCapability = {
  platformName: 'Android',
  'appium:deviceName': 'emulator-5554',
  'appium:automationName': 'UiAutomator2',
  'appium:app': process.env['ANDROID_APP_PATH'] ?? 'apps/app-mock-release.apk',
  'appium:avd': isArm64 ? 'Pixel_7_API_34_arm64' : 'Pixel_7_API_34',
  'appium:avdArgs': isArm64 ? ['-no-snapshot-load'] : [],
  // When APP_READY=true (pre-warmed by start-android.sh), skip reinstall for speed.
  // When false (default/CI), full clean install ensures a fresh state.
  'appium:noReset': appReady,
  'appium:dontStopAppOnReset': appReady,
  // Prevent Appium from killing the session during long operations (AVD boot, slow steps)
  'appium:newCommandTimeout': 300,
  'appium:waitForIdleTimeout': 2000,
  // Flutter rebuilds UI constantly — 10s default idle wait is excessive.
  // 2s is sufficient. Does NOT override waitForDisplayed() (10s timeout, independent).
};

const iosCapability = {
  platformName: 'iOS',
  'appium:deviceName': 'iPhone 15',
  'appium:automationName': 'XCUITest',
  'appium:app': process.env['IOS_APP_PATH'] ?? 'apps/Runner.app',
  'appium:platformVersion': '17.0',
  // Prevent Appium from killing the session during long operations (simulator boot, slow steps)
  'appium:newCommandTimeout': 300,
};

function getCapabilities(): WebdriverIO.Capabilities[] {
  if (mobilePlatform === 'ios') return [iosCapability as WebdriverIO.Capabilities];
  if (mobilePlatform === 'android')
    return [androidCapability as unknown as WebdriverIO.Capabilities];
  return [webCapability];
}

// ── WDIO config ───────────────────────────────────────────────────────────────

export const config: WebdriverIO.Config = {
  runner: 'local',

  // Suppress protocol-level verbose logs (getPageSource, findElement calls).
  // Use 'info' or 'debug' when debugging test failures.
  logLevel: 'warn',

  // Default: all features. Override per suite via --suite flag.
  specs: ['./features/**/*.feature'],

  suites: {
    web: ['./features/web/**/*.feature'],
    api: ['./features/api/**/*.feature'],
    mobile: ['./features/mobile/**/*.feature'],
  },

  // Run one at a time — scenarios may depend on shared state
  maxInstances: 1,

  capabilities: getCapabilities(),

  // ── TypeScript ──────────────────────────────────────────────────────────────
  // autoCompileOpts is a WDIO runtime option removed from @wdio/types in v9,
  // but still respected by the testrunner for ts-node ESM support.
  // @ts-expect-error
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      project: './tsconfig.json',
      transpileOnly: true,
      esm: true,
    },
  },

  // ── Framework ──────────────────────────────────────────────────────────────
  framework: '@wdio/cucumber-framework',
  cucumberOpts: {
    require: [
      './fixtures/index.ts',
      ...(mobilePlatform ? ['./fixtures/mobile.hooks.ts'] : []),
      './steps/**/*.ts',
    ],
    timeout: 60_000,
    // Auto-retry failed scenarios once — reduces flaky mobile test failures
    // from transient UiAutomator2 instrumentation issues (FM-3).
    retry: 1,
    // Filter scenarios by tag — e.g. TAGS='@phone-enable' bun run test:mobile:android
    tagExpression: process.env['TAGS'],
    // Filter by scenario name (substring match) — e.g. SCENARIO_NAME="ปุ่ม Log in ถูก enable" bun run test
    name: process.env['SCENARIO_NAME'] ? [process.env['SCENARIO_NAME']] : undefined,
  },

  // ── Services ───────────────────────────────────────────────────────────────
  // NOTE: @wdio/appium-service is NOT used here.
  // Appium 3.x writes all logs to stderr — the service treats any stderr output
  // as a fatal error and fails in onPrepare. Start Appium manually before running:
  //   ./node_modules/.bin/appium --port 4723 --log appium.log
  // or use:  bun run start:android  (boots emulator + starts Appium + installs APK)
  services: [],

  // ── Reporters ──────────────────────────────────────────────────────────────
  // Video reporter disabled for mobile — rapid Appium screenshots cause
  // "socket hang up" crashes (wdio-video-reporter takes screenshots via
  // the same WebDriver session, overwhelming the Appium connection).
  reporters: [
    'spec',
    [
      'allure',
      {
        outputDir: 'allure-results',
        disableWebdriverStepsReporting: true,
        disableWebdriverScreenshotsReporting: false,
      },
    ],
    ...(!mobilePlatform
      ? ([
          [
            video,
            {
              saveAllVideos: false, // only save videos for failed tests
              videoSlowdownMultiplier: 3, // 3x slower playback for review
              outputDir: 'reports/videos',
            },
          ],
        ] as WebdriverIO.Config['reporters'])
      : []),
  ],

  // ── Appium connection (mobile suites) ─────────────────────────────────────
  // Appium must be running before WDIO starts. Default port 4723.
  // Override with APPIUM_PORT env var (e.g. APPIUM_PORT=4724 bun run test:mobile:android)
  ...(mobilePlatform
    ? {
        hostname: '127.0.0.1',
        port: parseInt(process.env['APPIUM_PORT'] ?? '4723', 10),
        path: '/',
      }
    : {}),

  // ── Base URL (web suite) ───────────────────────────────────────────────────
  // browser.url('/login') resolves against this — required for relative URLs
  baseUrl: process.env['BASE_URL'] ?? 'https://the-internet.herokuapp.com',

  // ── Timeouts ───────────────────────────────────────────────────────────────
  waitforTimeout: 10_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 3,

  // ── Hooks ──────────────────────────────────────────────────────────────────
  onPrepare(_config, capabilities) {
    // Shared run ID so the reporter can merge results from multiple spec-file workers
    process.env['WDIO_RUN_ID'] = randomUUID();

    const cap = Array.isArray(capabilities) ? capabilities[0] : capabilities;
    const platform = (cap as Record<string, unknown>)?.['platformName'] ?? 'web';
    logger.info('WDIO run', { platform });
  },

  // Enable Android accessibility so Flutter builds its Semantics tree.
  // UIAutomator2 cannot see Flutter widgets without this — Flutter only
  // activates the accessibility/semantics bridge when a service is registered.
  // Skipped when APP_READY=true: start-android-all.sh already enabled accessibility
  // and installed the APK.
  // Uses execFileSync (no shell spawn) + terminate/activateApp (no reloadSession)
  // to avoid spawn errors and onboarding flakiness.
  async before(_capabilities, _specs) {
    if (mobilePlatform === 'android') {
      // ── Accessibility setup (first run / CI only) ──────────────────────────
      if (!appReady) {
        const androidHome =
          process.env['ANDROID_HOME'] ?? `${process.env['HOME']}/Library/Android/sdk`;
        const adb = `${androidHome}/platform-tools/adb`;
        try {
          execFileSync(
            adb,
            [
              'shell',
              'settings',
              'put',
              'secure',
              'enabled_accessibility_services',
              'com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService',
            ],
            { stdio: 'ignore', timeout: 10_000 },
          );
          execFileSync(adb, ['shell', 'settings', 'put', 'secure', 'accessibility_enabled', '1'], {
            stdio: 'ignore',
            timeout: 10_000,
          });
        } catch (err) {
          logger.warn('[before] accessibility setup failed', { error: (err as Error).message });
        }
      }

      // ── Fix FM-1: App state reset at WDIO session start ───────────────────
      // Always restart the app at the beginning of a new WDIO session.
      // Previous run may have left the app on any sub-screen (Settings, History, etc.)
      // which would cause detectScreen() to return 'loading' and cascade failures.
      // Safe here because instrumentation is freshly initialized at session start.
      try {
        await driver.terminateApp(appPackage);
        await driver.pause(1000);
        await driver.activateApp(appPackage);
        await driver.pause(3000); // Flutter re-init + Semantics bridge activation
      } catch (err) {
        logger.warn('[before] app restart failed', { error: (err as Error).message });
      }
    }
  },

  // Capture screenshot on failure — Allure reporter auto-attaches when
  // disableWebdriverScreenshotsReporting is false.
  async afterTest(_test, _context, result) {
    if (result.error) {
      try {
        await driver.takeScreenshot();
      } catch {
        // Session may be closed (app crash, Appium timeout) — screenshot skipped.
        // Cucumber After hook in fixtures/index.ts provides a second attempt.
      }
    }
  },
};
