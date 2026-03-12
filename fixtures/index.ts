/**
 * fixtures/index.ts — WDIO + Cucumber World
 *
 * แทน playwright-bdd fixtures ด้วย Cucumber World class
 * ทุก scenario จะได้ instance ใหม่ของ AppWorld โดยอัตโนมัติ
 *
 * Step files ใช้ `this` เพื่อเข้าถึง world:
 *   Given('step', async function(this: AppWorld) { this.lastResponse ... })
 */

import {
  setWorldConstructor,
  World,
  Before,
  After,
  BeforeStep,
  AfterStep,
  setDefaultTimeout,
} from '@cucumber/cucumber';
import type { IWorldOptions } from '@cucumber/cucumber';
import { TIMEOUTS } from '../screens/base.screen.ts';

// ── Screen detection helpers ──────────────────────────────────────────────────

type KnownScreen = 'onboarding' | 'login' | 'pdpa' | 'pin' | 'home';

/**
 * detectScreen — instant (ไม่มี timeout)
 * ใช้ getPageSource() ที่ return XML ทันที แทนการรอ element ที่มี retry loop
 * Return 'loading' ถ้า accessibility tree ยังไม่พร้อม (ไม่มี content)
 */
async function detectScreen(): Promise<KnownScreen | 'loading'> {
  try {
    const source = await driver.getPageSource();
    if (source.includes('i_already_have_account_button')) return 'onboarding';
    if (source.includes('login_submit_button')) return 'login';
    if (source.includes('Manage PDPA Consent')) return 'pdpa';
    if (source.includes('pin_1')) return 'pin'; // Set PIN or Confirm PIN screen
    if (source.includes('navigation_menu_home')) return 'home';
    return 'loading'; // app loading / Flutter Semantics ยังไม่พร้อม
  } catch {
    return 'loading';
  }
}

/**
 * waitForKnownScreen — timeout เดียว ไม่ซ้อน
 * ใช้ browser.waitUntil (เรียก detectScreen ทุก 500ms)
 * ถึง timeout เดี๋ยว waitUntil throw ชัดเจน
 */
async function waitForKnownScreen(timeout = 20_000): Promise<KnownScreen> {
  return browser.waitUntil(
    async () => {
      const s = await detectScreen();
      return s !== 'loading' ? s : false;
    },
    { timeout, interval: 500, timeoutMsg: `App not ready after ${timeout}ms` },
  ) as Promise<KnownScreen>;
}

// ── Module-level session state (ไม่ reset ระหว่าง scenario ของ session เดิม) ──
let navSessionLoggedIn = false;
let devToolsSessionLoggedIn = false;

// ── World type ────────────────────────────────────────────────────────────────

export class AppWorld extends World {
  /** Response ล่าสุดจาก API call — reset ทุก scenario */
  lastResponse: Response | null = null;

  /**
   * preferCode: ส่ง header `Prefer: code=XXX` ไปยัง Prism mock
   * เพื่อบังคับให้ return status code ที่ต้องการ
   * Set ด้วย step "Given ทดสอบ error case ด้วย status {int}"
   */
  preferCode: number | null = null;

  constructor(options: IWorldOptions) {
    super(options);
  }

  /** Reset world state — ใช้ใน Before hook */
  reset() {
    this.lastResponse = null;
    this.preferCode = null;
  }
}

setWorldConstructor(AppWorld);

// ── Hooks ─────────────────────────────────────────────────────────────────────

setDefaultTimeout(60_000);

Before(async function (this: AppWorld) {
  this.reset();
});

// ── Mobile: @login-screen — reach Login screen via DEV TOOLS "Login GO" ────────
// Defined BEFORE @mobile so it runs first — DEV TOOLS is pressed as the very
// first action of every login-screen scenario.
//
// open() waits up to TIMEOUTS.nav (15s) for devtool_button — enough for app to
// finish loading after the previous scenario's terminateApp+activateApp.
//
// goTo('Login') uses the Auth section "Login GO" shortcut — navigates to the
// login screen in one step, DEV TOOLS closes implicitly. No close() needed.
Before({ tags: '@login-screen' }, async function (this: AppWorld) {
  navSessionLoggedIn = false;
  devToolsSessionLoggedIn = false;

  const { DevToolsScreen } = await import('../screens/devtools.screen.ts');
  const devTools = new DevToolsScreen();

  try {
    await devTools.open();
    await devTools.goTo('Login');
  } catch (err) {
    console.warn('[Before @login-screen] DEV TOOLS navigation failed:', (err as Error).message);
  }

  await $(`android=new UiSelector().resourceId("login_submit_button")`).waitForDisplayed({
    timeout: TIMEOUTS.nav,
  });
});

// ── Mobile: bypass onboarding screen before each @mobile scenario ─────────────
// Runs AFTER @login-screen (defined later in file).
// For @login-screen scenarios: login_submit_button is already visible → fast path.
// For other @mobile scenarios: detect screen and bypass onboarding if needed.
Before({ tags: '@mobile' }, async function (this: AppWorld) {
  try {
    await $(`android=new UiSelector().resourceId("login_submit_button")`).waitForDisplayed({
      timeout: 3_000,
    });
    return; // ✅ already on login screen
  } catch {
    // not on login screen yet
  }

  const screen = await waitForKnownScreen(20_000);
  if (screen === 'onboarding') {
    const { OnboardingScreen } = await import('../screens/onboarding.screen.ts');
    const onboarding = new OnboardingScreen();
    await onboarding.tapLogin();
    await waitForKnownScreen(TIMEOUTS.element);
  }
});

// ── Mobile: @navigation — login once per session ──────────────────────────────
Before({ tags: '@navigation' }, async function (this: AppWorld) {
  if (navSessionLoggedIn) return;

  const { LoginScreen } = await import('../screens/login.screen.ts');
  const { PdpaScreen } = await import('../screens/pdpa.screen.ts');
  const login = new LoginScreen();
  const pdpa = new PdpaScreen();

  const screen = await detectScreen();
  if (screen === 'home') {
    navSessionLoggedIn = true;
    return;
  }
  if (screen === 'login') {
    await login.switchToEmailLogin();
    await login.fillEmail(process.env['TEST_EMAIL'] ?? 'test@example.com');
    await login.fillPassword(process.env['TEST_PASSWORD'] ?? 'P@ssw0rd123');
    await login.tapLogin();
    let next = await waitForKnownScreen(15_000);
    if (next === 'pdpa') {
      await pdpa.acceptPdpa();
      next = await waitForKnownScreen(TIMEOUTS.nav);
    }
    if (next === 'pin') {
      const { PincodeScreen } = await import('../screens/pincode.screen.ts');
      const pincode = new PincodeScreen();
      await pincode.setPin(process.env['TEST_PIN'] ?? '123456');
    }
    navSessionLoggedIn = true;
  }
});

// ── Mobile: @devtools — login once per session via DEV TOOLS token injection ───
Before({ tags: '@devtools' }, async function (this: AppWorld) {
  if (devToolsSessionLoggedIn) return;

  const screen = await detectScreen();
  if (screen === 'home') {
    devToolsSessionLoggedIn = true;
    return;
  }

  try {
    const { DevToolsScreen } = await import('../screens/devtools.screen.ts');
    const devTools = new DevToolsScreen();

    await devTools.open();
    await devTools.injectTestSession();
    await devTools.close();

    let next = await waitForKnownScreen(TIMEOUTS.nav);
    if (next === 'pdpa') {
      const { PdpaScreen } = await import('../screens/pdpa.screen.ts');
      const pdpa = new PdpaScreen();
      await pdpa.acceptPdpa();
      next = await waitForKnownScreen(TIMEOUTS.nav);
    }
    if (next === 'pin') {
      const { PincodeScreen } = await import('../screens/pincode.screen.ts');
      const pincode = new PincodeScreen();
      await pincode.setPin(process.env['TEST_PIN'] ?? '123456');
    }

    devToolsSessionLoggedIn = true;
  } catch (err) {
    console.warn('[Before @devtools] token injection failed:', (err as Error).message);
  }
});

// ── Step progress logger ───────────────────────────────────────────────────────
// BeforeStep: พิมพ์ชื่อ step พร้อม ⏳ (ไม่ขึ้นบรรทัดใหม่)
// AfterStep:  ใช้ \r overwrite บรรทัดเดิม → แสดงผลบรรทัดเดียวต่อ step + duration
BeforeStep(function ({ pickleStep }) {
  process.stdout.write(`    ⏳ ${pickleStep.text}`);
});

AfterStep(function ({ pickleStep, result }) {
  const icon =
    result?.status === 'PASSED'
      ? '✅'
      : result?.status === 'FAILED'
        ? '❌'
        : result?.status === 'SKIPPED'
          ? '⏭️'
          : '❓';
  const secs = ((result?.duration?.seconds ?? 0) + (result?.duration?.nanos ?? 0) / 1e9).toFixed(1);
  process.stdout.write(`\r    ${icon} ${pickleStep.text} (${secs}s)\n`);
});

// ── Mobile: reset app state after each @mobile scenario ──────────────────────
// terminateApp + activateApp ระหว่าง scenario เพื่อป้องกัน test pollution
// (state เหลือค้างจาก scenario ก่อนหน้าที่อาจทำให้ scenario ถัดไป fail)
// Skip ถ้า session ถูกปิดไปแล้ว (เช่น app crash)
After({ tags: '@mobile' }, async function (this: AppWorld) {
  const pkg = process.env['APP_PACKAGE'] ?? 'com.bbt.bitkubnext.mock';
  const sessionId: string | undefined =
    typeof browser !== 'undefined' ? browser.sessionId : undefined;
  if (!sessionId) return;
  try {
    await driver.terminateApp(pkg);
    await driver.activateApp(pkg);
  } catch (err) {
    // session dead or app crashed — safe to ignore, next scenario will handle it
    console.warn('[After @mobile] app reset skipped:', (err as Error).message);
  }
});

After(async function (this: AppWorld, scenario) {
  // ถ่าย screenshot เมื่อ test fail — ตรวจสอบว่า session ยังมีชีวิตอยู่ก่อน
  if (scenario.result?.status === 'FAILED') {
    const sessionId: string | undefined =
      typeof browser !== 'undefined' ? browser.sessionId : undefined;
    if (sessionId) {
      try {
        const screenshot = await browser.takeScreenshot();
        void this.attach(screenshot, 'image/png');
      } catch (err) {
        // session อาจถูกปิดไปก่อน (เช่น app crash, AVD timeout) — ไม่ต้อง throw
        console.warn('[After hook] screenshot skipped:', (err as Error).message);
      }
    }
  }
});
