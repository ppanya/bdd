import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
// @ts-expect-error — wdio-video-reporter types exist but package.json "exports" prevents resolution
import video from 'wdio-video-reporter';
import logger from './support/logger.ts';

// ── helpers ──────────────────────────────────────────────────────────────────

const isArm64 = process.arch === 'arm64';

// undefined when not explicitly set — defaults to web capability
const mobilePlatform = process.env['MOBILE_PLATFORM'];

// Named constants — one place to adjust all timeouts
const TIMEOUTS = {
  APPIUM_COMMAND: 300,   // seconds before Appium kills an idle session
  FLUTTER_IDLE: 2000,    // ms — Flutter idle wait; keeps AVD boot fast
  WAITFOR: 10_000,       // ms — WDIO default waitFor
  ADB: 10_000,           // ms — adb shell command timeout
  APP_RESTART: 3000,     // ms — Flutter re-init + Semantics bridge activation
} as const;

// Readable platform flags — avoids repeated `!mobilePlatform` checks inline
const platform = {
  isWeb: !mobilePlatform,
  isAndroid: mobilePlatform === 'android',
  isIos: mobilePlatform === 'ios',
} as const;

// When APP_READY=true (set by run-mobile-tests.sh), skip APK reinstall.
// The environment was pre-warmed by start-android.sh — no need to reinstall.
// When false/unset (CI or first run), do a full clean install.
const appReady = process.env['APP_READY'] === 'true';

// Package name for terminate/activate app (avoids reloadSession spawn errors).
// Auto-set by bun run android (start-android-all.sh). Override via APP_PACKAGE env.
const appPackage = process.env['APP_PACKAGE'] ?? 'com.example.app';

// Remote Selenium Grid for web tests in Docker / CI.
// Parsed once here to avoid redundant URL construction in the config spread below.
// Null when SELENIUM_REMOTE_URL is unset → WDIO launches local Chrome.
const seleniumRemoteUrl = process.env['SELENIUM_REMOTE_URL']
  ? new URL(process.env['SELENIUM_REMOTE_URL'])
  : null;

// Shared try/catch shape used in the `before` hook for non-fatal setup steps
async function safeRun(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    logger.warn(`[before] ${label} failed`, { error: (err as Error).message });
  }
}

// ── IPA → .app resolution ────────────────────────────────────────────────────
// If IOS_APP_PATH points to a .ipa file, extract the .app bundle from Payload/
// so Appium XCUITest can use it with the simulator.
function resolveIosApp(appPath: string): string {
  // Already a .app directory — use directly
  if (existsSync(appPath) && statSync(appPath).isDirectory()) return appPath;

  // Not a .ipa — return as-is
  if (!appPath.endsWith('.ipa')) return appPath;

  if (!existsSync(appPath)) {
    logger.warn(`IPA not found: ${appPath} — will pass path as-is to Appium`);
    return appPath;
  }

  const ipaDir = dirname(appPath);
  const ipaName = basename(appPath, '.ipa');
  const extractDir = join(ipaDir, '.ipa-extracted', ipaName);
  const payloadDir = join(extractDir, 'Payload');

  // Re-extract if cache is missing or IPA is newer
  const needsExtract =
    !existsSync(payloadDir) || statSync(appPath).mtimeMs > statSync(payloadDir).mtimeMs;

  if (needsExtract) {
    logger.info(`Extracting .app from IPA: ${appPath}`);
    mkdirSync(extractDir, { recursive: true });
    execFileSync('unzip', ['-qo', appPath, 'Payload/*.app/*', '-d', extractDir], {
      timeout: 60_000,
    });
  }

  // Find the .app bundle inside Payload/
  const entries = existsSync(payloadDir)
    ? readdirSync(payloadDir)
    : [];
  const appBundle = entries.find((e: string) => e.endsWith('.app'));
  if (!appBundle) {
    logger.warn('No .app found inside IPA Payload/ — passing original path');
    return appPath;
  }

  const resolved = join(payloadDir, appBundle);
  logger.info(`Resolved IPA → .app: ${resolved}`);
  return resolved;
}

// ── capabilities ─────────────────────────────────────────────────────────────

const webCapability = {
  browserName: 'chrome',
  'goog:chromeOptions': {
    args: ['--headless', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'],
  },
};

// Record<string, unknown> so getCapabilities() can cast to WebdriverIO.Capabilities
// without the double `as unknown as` workaround needed for string-keyed appium: fields.
const androidCapability: Record<string, unknown> = {
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
  'appium:newCommandTimeout': TIMEOUTS.APPIUM_COMMAND,
  // Flutter rebuilds UI constantly — 10s default idle wait is excessive.
  // 2s is sufficient. Does NOT override waitForDisplayed() (10s timeout, independent).
  'appium:waitForIdleTimeout': TIMEOUTS.FLUTTER_IDLE,
};

const iosCapability = {
  platformName: 'iOS',
  'appium:deviceName': process.env['IOS_DEVICE_NAME'] ?? 'iPhone 15',
  'appium:automationName': 'XCUITest',
  'appium:app': resolveIosApp(process.env['IOS_APP_PATH'] ?? 'apps/Runner.app'),
  'appium:platformVersion': process.env['IOS_PLATFORM_VER'] ?? '17.0',
  'appium:noReset': appReady,
  // Prevent Appium from killing the session during long operations (simulator boot, slow steps)
  'appium:newCommandTimeout': TIMEOUTS.APPIUM_COMMAND,
};

function getCapabilities(): WebdriverIO.Capabilities[] {
  if (platform.isIos) return [iosCapability as WebdriverIO.Capabilities];
  if (platform.isAndroid) return [androidCapability as WebdriverIO.Capabilities];
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
      ...(platform.isWeb ? [] : ['./fixtures/mobile.hooks.ts']),
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
  reporters: (() => {
    const list: WebdriverIO.Config['reporters'] = [
      'spec',
      ['allure', { outputDir: process.env['ALLURE_RESULTS_DIR'] ?? 'allure-results', disableWebdriverStepsReporting: true, disableWebdriverScreenshotsReporting: false }],
    ];
    if (platform.isWeb) {
      list.push([video, { saveAllVideos: false, videoSlowdownMultiplier: 3, outputDir: 'reports/videos' }] as never);
    }
    return list;
  })(),

  // ── Connection overrides ───────────────────────────────────────────────────
  // Mobile → Appium (local); Web + SELENIUM_REMOTE_URL → remote Selenium Grid.
  // No overrides → WDIO launches Chrome locally (default).
  ...((platform.isAndroid || platform.isIos)
    ? {
        // Appium must be running before WDIO starts. Default port 4723.
        // Override with APPIUM_PORT env var (e.g. APPIUM_PORT=4724 bun run test:mobile:android)
        hostname: process.env['APPIUM_HOST'] ?? '127.0.0.1',
        port: parseInt(process.env['APPIUM_PORT'] ?? '4723', 10),
        path: '/',
      }
    : seleniumRemoteUrl
      ? {
          // Docker / CI: route web tests through remote Selenium Grid
          hostname: seleniumRemoteUrl.hostname,
          port: parseInt(seleniumRemoteUrl.port || '4444', 10),
          path: '/wd/hub',
          protocol: 'http' as const,
        }
      : {}),

  // ── Base URL (web suite) ───────────────────────────────────────────────────
  // browser.url('/login') resolves against this — required for relative URLs
  baseUrl: process.env['BASE_URL'] ?? 'https://the-internet.herokuapp.com',

  // ── Timeouts ───────────────────────────────────────────────────────────────
  waitforTimeout: TIMEOUTS.WAITFOR,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 3,

  // ── Hooks ──────────────────────────────────────────────────────────────────
  onPrepare(_config, capabilities) {
    // Shared run ID so the reporter can merge results from multiple spec-file workers
    process.env['WDIO_RUN_ID'] = randomUUID();

    const cap = Array.isArray(capabilities) ? capabilities[0] : capabilities;
    const platformName = (cap as Record<string, unknown>)?.['platformName'] ?? 'web';
    logger.info('WDIO run', { platform: platformName });
  },

  // Enable Android accessibility so Flutter builds its Semantics tree.
  // UIAutomator2 cannot see Flutter widgets without this — Flutter only
  // activates the accessibility/semantics bridge when a service is registered.
  // Skipped when APP_READY=true: start-android-all.sh already enabled accessibility
  // and installed the APK.
  // Uses execFileSync (no shell spawn) + terminate/activateApp (no reloadSession)
  // to avoid spawn errors and onboarding flakiness.
  async before(_capabilities, _specs) {
    if (platform.isAndroid) {
      // ── Accessibility setup (first run / CI only) ──────────────────────────
      // Enable TalkBack so Flutter builds its Semantics tree — UIAutomator2
      // cannot see Flutter widgets without it.
      // Skipped when APP_READY=true: start-android-all.sh already did this.
      if (!appReady) {
        const androidHome =
          process.env['ANDROID_HOME'] ?? `${process.env['HOME']}/Library/Android/sdk`;
        const adb = `${androidHome}/platform-tools/adb`;
        await safeRun('accessibility setup', async () => {
          execFileSync(
            adb,
            [
              'shell', 'settings', 'put', 'secure',
              'enabled_accessibility_services',
              'com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService',
            ],
            { stdio: 'ignore', timeout: TIMEOUTS.ADB },
          );
          execFileSync(adb, ['shell', 'settings', 'put', 'secure', 'accessibility_enabled', '1'], {
            stdio: 'ignore',
            timeout: TIMEOUTS.ADB,
          });
        });
      }

      // ── App state reset at WDIO session start ─────────────────────────────
      // Always restart the app at the beginning of a new WDIO session.
      // Previous run may have left the app on any sub-screen (Settings, History, etc.)
      // which would cause detectScreen() to return 'loading' and cascade failures.
      // Safe here because instrumentation is freshly initialized at session start.
      await safeRun('app restart', async () => {
        await driver.terminateApp(appPackage);
        await driver.pause(1000);
        await driver.activateApp(appPackage);
        await driver.pause(TIMEOUTS.APP_RESTART); // Flutter re-init + Semantics bridge activation
      });
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
