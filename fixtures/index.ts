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
    // Fix FM-1: Recognize sub-screens as "authenticated" (app is alive, DevTools available).
    // These screens appear when a previous run/scenario navigated away from Home
    // but the app wasn't reset. Treating them as 'home' lets Before hooks skip re-login.
    if (source.includes('Crypto History')) return 'home';
    if (source.includes('Application Setting')) return 'home';
    if (source.includes('Profile Information')) return 'home';
    if (source.includes('profile_view_profile_button')) return 'home';
    if (source.includes('Crypto Wallet')) return 'home';
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

// ── Session state removed (Fix FM-4) ────────────────────────────────────────
// Module-level flags (navSessionLoggedIn, devToolsSessionLoggedIn) created a
// mismatch between flag state and actual app state across consecutive WDIO runs.
// Now using detectScreen() as the single source of truth for app state.

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
  const loginSubmitBtn = $(`android=new UiSelector().resourceId("login_submit_button")`);

  // Fast path: already on Login screen (After hook is no-op — app stays on Login between scenarios)
  // Skip DevTools navigation entirely to avoid flaky swipe/session issues.
  const alreadyOnLogin = await loginSubmitBtn.isDisplayed().catch(() => false);

  if (!alreadyOnLogin) {
    // Need to navigate to Login via DevTools
    const { DevToolsScreen } = await import('../screens/devtools.screen.ts');
    const devTools = new DevToolsScreen();
    try {
      await devTools.open();
      await devTools.goTo('Login');
    } catch (err) {
      console.warn('[Before @login-screen] DEV TOOLS navigation failed:', (err as Error).message);
    }
    // Confirm login_submit_button visible — throws if navigation failed (correct: fail fast)
    await loginSubmitBtn.waitForDisplayed({ timeout: TIMEOUTS.nav });
  }

  // Ensure Phone view — goTo('Login') may reuse existing screen without resetting view.
  // switch_to_phone_button appears only in Email view → tap it to go back to Phone view.
  const switchToPhone = $(`android=new UiSelector().resourceId("switch_to_phone_button")`);
  if (await switchToPhone.isDisplayed().catch(() => false)) {
    await switchToPhone.click();
    await $(`android=new UiSelector().resourceId("login_phone_input")`).waitForDisplayed({
      timeout: TIMEOUTS.element,
    });
  }

  // Dismiss keyboard — @phone-enable types via addValue() which leaves keyboard open.
  // With TalkBack active, an open keyboard restricts accessibility exploration to
  // the focused area, hiding switch_to_email_button from waitForDisplayed().
  // hideKeyboard() is a no-op if keyboard is already dismissed (safe to always call).
  await driver.hideKeyboard().catch(() => {});

  // Clear phone input — previous scenario may have filled it (e.g. @phone-enable).
  // clearValue() on the Flutter container View fails silently; use the inner EditText
  // selector (by text) to clear when there is content, then fall back to setting empty
  // value to flush Flutter's TextEditingController.
  const phoneInputView = $(`android=new UiSelector().resourceId("login_phone_input")`);
  if (await phoneInputView.isDisplayed().catch(() => false)) {
    // Try inner EditText first (has content when typed via keyboard)
    const phoneEditText = $(`//android.widget.EditText[ancestor::*[@resource-id="login_phone_input"]]`);
    const hasEditText = await phoneEditText.isExisting().catch(() => false);
    if (hasEditText) {
      await phoneEditText.clearValue().catch(() => {});
    } else {
      await phoneInputView.clearValue().catch(() => {});
    }
  }

  // After keyboard dismissal + clear, reset accessibility cache so Flutter's
  // freshly-rebuilt semantic tree is visible to the next waitForDisplayed call.
  await driver.execute('mobile: resetAccessibilityCache', {}).catch(() => {});
});

// ── Mobile: ensure app is alive before each @mobile scenario ──────────────────
// Runs AFTER @login-screen (defined later in file).
//
// OLD behaviour (removed): waited up to 20s for onboarding → tapped "I already have
// an account" → navigated to Login.  This caused a *double* DevTools round-trip for
// @profile-screen / @wallet-screen tests whose Given step opens DevTools anyway:
//   Before hook  → onboarding tap → Login screen
//   Given step   → devTools.open() → goTo('Menu'/'Wallet')   ← redundant extra trip
//
// NEW behaviour: just wait for devtool_button to be visible (app is alive and usable).
// DevTools is accessible from every screen (onboarding, login, home, …) so each test's
// Given step can open it directly without pre-navigation.
// @login-screen tests are unaffected: their own Before hook (defined above) already
// navigated to Login before this hook runs, so devtool_button is already visible.
Before({ tags: '@mobile' }, async function (this: AppWorld) {
  // Fix FM-7: Health check — verify Appium session is responsive before proceeding.
  // Catches UiAutomator2 crashes early instead of cryptic timeout errors later.
  // NOTE: Do NOT add a long devtool_button wait here — 20s of Appium polling degrades
  // UiAutomator2 after several scenarios, causing cascade failures. The readiness wait
  // lives inside DevToolsScreen.open() and is only paid when DevTools is actually needed.
  try {
    await driver.getPageSource();
  } catch {
    throw new Error('Appium session not responsive — likely UiAutomator2 crash');
  }
});

// ── Mobile: @navigation — login once per session ──────────────────────────────
Before({ tags: '@navigation' }, async function (this: AppWorld) {
  // Fix FM-4: Use detectScreen() as ground truth instead of module-level flag.
  // detectScreen() now recognizes sub-screens as 'home' (Fix FM-1/4), so this
  // correctly skips login when the app is already authenticated on any screen.
  const screen = await detectScreen();
  if (screen === 'home') return; // already authenticated — skip login

  if (screen === 'login') {
    const { LoginScreen } = await import('../screens/login.screen.ts');
    const { PdpaScreen } = await import('../screens/pdpa.screen.ts');
    const login = new LoginScreen();
    const pdpa = new PdpaScreen();

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
  }
});

// ── Mobile: @devtools — login once per session via DEV TOOLS token injection ───
Before({ tags: '@devtools' }, async function (this: AppWorld) {
  // Fix FM-4: Use detectScreen() as ground truth instead of module-level flag.
  const screen = await detectScreen();
  if (screen === 'home') return; // already authenticated — skip injection

  // Treat 'loading' as "authenticated, screen mid-refresh" — do NOT inject.
  // Rationale: a truly unauthenticated fresh-start returns 'login' or 'onboarding',
  // never 'loading'. 'loading' here means the accessibility tree is partially rebuilt
  // (e.g. Wallet screen refreshing crypto prices) — we're authenticated.
  // Attempting injection during 'loading' wastes 30s in DevToolsScreen.open() and
  // further degrades UiAutomator2 (FM-3).
  if (screen === 'loading') return;

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
  } catch (err) {
    console.warn('[Before @devtools] token injection failed:', (err as Error).message);
    // Close DevTools if still open — prevents cascade failures in subsequent scenarios
    try {
      const { DevToolsScreen: DT } = await import('../screens/devtools.screen.ts');
      const dt = new DT();
      await dt.close();
    } catch {
      // ignore — best effort cleanup
    }
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

// ── Fix FM-2: Back-navigation cleanup for sub-screen scenarios ───────────────
// Scenarios that navigate to sub-screens (History, Settings, My Profile) must
// press BACK to return to a known screen. Without this, the next scenario's
// Before hook encounters an unrecognized screen and may fail.
After({ tags: '@wallet-history or @profile-settings or @profile-my-profile' },
  async function () {
    try {
      await driver.execute('mobile: pressKey', { keycode: 4 }); // Android BACK
      await driver.pause(500);
      // Re-activate app in case BACK press minimized it (Android BACK on a root bottom-nav
      // destination may send the app to background). activateApp is a no-op if already
      // in foreground, but brings it back if backgrounded — critical for scenario retries.
      const pkg = process.env['APP_PACKAGE'] ?? 'com.bbt.bitkubnext.mock';
      await driver.activateApp(pkg).catch(() => {});
      await driver.pause(500);
    } catch (err) {
      console.warn('[After sub-screen cleanup] BACK press failed:', (err as Error).message);
    }
  },
);

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
