import type { Options } from '@wdio/types';
import { execSync } from 'node:child_process';
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
  'appium:app': process.env['ANDROID_APP_PATH'] ?? 'apps/app-debug.apk',
  'appium:avd': isArm64 ? 'Pixel_7_API_34_arm64' : 'Pixel_7_API_34',
  'appium:avdArgs': isArm64 ? ['-no-snapshot-load'] : [],
};

const iosCapability = {
  platformName: 'iOS',
  'appium:deviceName': 'iPhone 15',
  'appium:automationName': 'XCUITest',
  'appium:app': process.env['IOS_APP_PATH'] ?? 'apps/Runner.app',
  'appium:platformVersion': '17.0',
};

function getCapabilities() {
  if (mobilePlatform === 'ios') return [iosCapability];
  if (mobilePlatform === 'android') return [androidCapability];
  return [webCapability];
}

// ── WDIO config ───────────────────────────────────────────────────────────────

export const config: Options.Testrunner = {
  runner: 'local',

  // Default: all features. Override per suite via --suite flag.
  specs: ['./features/**/*.feature'],

  suites: {
    web: ['./features/ui/**/*.feature'],
    api: ['./features/api/**/*.feature'],
    mobile: ['./features/mobile/**/*.feature'],
  },

  // Run one at a time — scenarios may depend on shared state
  maxInstances: 1,

  capabilities: getCapabilities(),

  // ── TypeScript via ts-node ──────────────────────────────────────────────────
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
      './steps/**/*.ts',
    ],
    timeout: 60_000,
    // Filter scenarios by tag — e.g. TAGS='not @manual' bun run test
    tagExpression: process.env['TAGS'],
  },

  // ── Services ───────────────────────────────────────────────────────────────
  // Appium only for mobile suites — not started for web/api runs
  services: (mobilePlatform === 'android' || mobilePlatform === 'ios')
    ? [
        ['appium', {
          command: 'appium',
          args: {
            relaxedSecurity: true,
            log: './appium.log',
          },
        }],
      ]
    : [],

  // ── Reporters ──────────────────────────────────────────────────────────────
  reporters: [
    'spec',
    ['allure', {
      outputDir: 'allure-results',
      disableWebdriverStepsReporting: true,
      disableWebdriverScreenshotsReporting: false,
    }],
    [LivingChecklistReporter, {
      outputDir: 'reports',
      releaseTag: getReleaseTag(),
    }],
  ],

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
};
