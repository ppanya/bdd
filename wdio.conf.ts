import { execSync, execFileSync } from 'node:child_process';
import LivingChecklistReporter from './reporters/living-checklist/index.ts';

// ── helpers ──────────────────────────────────────────────────────────────────

function getReleaseTag(): string {
  if (process.env['RELEASE_TAG']) return process.env['RELEASE_TAG'];
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'untagged';
  }
}

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
    require: ['./fixtures/index.ts', './steps/**/*.ts'],
    timeout: 60_000,
    // Auto-retry failed scenarios once — reduces flaky mobile test failures.
    // retry: 1,
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
    [
      LivingChecklistReporter,
      {
        outputDir: 'reports',
        releaseTag: getReleaseTag(),
      },
    ],
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
    const cap = Array.isArray(capabilities) ? capabilities[0] : capabilities;
    const platform = (cap as Record<string, unknown>)?.['platformName'] ?? 'web';
    console.log(`\n▶ WDIO run  platform=${platform}  release=${getReleaseTag()}\n`);
  },

  // Enable Android accessibility so Flutter builds its Semantics tree.
  // UIAutomator2 cannot see Flutter widgets without this — Flutter only
  // activates the accessibility/semantics bridge when a service is registered.
  // Skipped when APP_READY=true: start-android-all.sh already enabled accessibility
  // and installed the APK.
  // Uses execFileSync (no shell spawn) + terminate/activateApp (no reloadSession)
  // to avoid spawn errors and onboarding flakiness.
  async before(_capabilities, _specs) {
    if (mobilePlatform === 'android' && !appReady) {
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
        // Restart app without tearing down session — avoids spawn errors from reloadSession
        await driver.terminateApp(appPackage);
        await driver.activateApp(appPackage);
      } catch (err) {
        console.warn('[before] accessibility setup failed:', (err as Error).message);
      }
    }
  },
};
