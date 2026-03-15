import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../../fixtures/index.ts';
import { LoginScreen } from '../../screens/login.screen.ts';
import { PdpaScreen } from '../../screens/pdpa.screen.ts';
import { HomeScreen } from '../../screens/home.screen.ts';
import { PincodeScreen } from '../../screens/pincode.screen.ts';
import { TIMEOUTS } from '../../screens/base.screen.ts';
import { navigateViaDevTools, dismissKeyboard } from '../../support/mobile/nav-helper.ts';
import { safeGetPageSource } from '../../support/mobile/app-driver.ts';

const login = new LoginScreen();
const pdpa = new PdpaScreen();
const home = new HomeScreen();
const pincode = new PincodeScreen();

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Detect which login view is active: 'phone' or 'email'.
 * Uses getPageSource for instant detection without element waits.
 */
async function detectLoginView(): Promise<'phone' | 'email'> {
  const source = await safeGetPageSource();
  return source.includes('login_email_input') ? 'email' : 'phone';
}

/**
 * Navigate to Login screen via DevTools with all guards.
 * Uses navigateViaDevTools for keyboard + cleanup protection.
 */
async function navigateToLogin(): Promise<void> {
  await navigateViaDevTools(
    'Login',
    async () => {
      const source = await safeGetPageSource();
      return source.includes('login_submit_button');
    },
    async () => {
      await login.waitForElement(login.loginButton, TIMEOUTS.nav);
    },
  );
}

/**
 * Ensure Phone login view is active.
 * Navigates via DevTools, then switches from email→phone if needed.
 */
async function ensurePhoneLoginScreen(): Promise<void> {
  await navigateToLogin();
  const view = await detectLoginView();
  if (view === 'email') {
    await login.switchToPhoneLogin();
    await login.waitForIdle();
  }
  await login.waitForElement(login.phoneInput, TIMEOUTS.nav);
}

/**
 * Ensure Email login view is active.
 * Navigates via DevTools, then switches from phone→email if needed.
 * Clears fields for a clean state regardless of which view we landed on.
 */
async function ensureEmailLoginScreen(): Promise<void> {
  await navigateToLogin();
  const view = await detectLoginView();
  if (view === 'phone') {
    await login.switchToEmailLogin();
  } else {
    // Already on email — clear fields for clean state
    await login.emailInput.clearValue().catch(() => {});
    await login.passwordInput.clearValue().catch(() => {});
    await dismissKeyboard();
  }
  await login.waitForElement(login.emailInput, TIMEOUTS.nav);
}

// ── Given ─────────────────────────────────────────────────────────────────────

Given('I am on the Phone login screen', async function (this: AppWorld) {
  await ensurePhoneLoginScreen();
});

Given('I am on the Email login screen', async function (this: AppWorld) {
  await ensureEmailLoginScreen();
});

// ── When ──────────────────────────────────────────────────────────────────────

When('I enter phone number {string}', async function (this: AppWorld, phone: string) {
  await login.fillPhone(phone);
});

When('I enter email {string}', async function (this: AppWorld, email: string) {
  await login.fillEmail(email);
});

When('I enter password {string}', async function (this: AppWorld, password: string) {
  await login.fillPassword(password);
});

When('I tap the Log in button', async function (this: AppWorld) {
  await login.tapLogin();
});

When('I accept PDPA', async function (this: AppWorld) {
  await pdpa.acceptPdpa();
});

/**
 * Conditional PDPA step — accepts if the PDPA screen appears, skips if already past it.
 * Use for flows where PDPA is not guaranteed (e.g. returning user whose consent was
 * already recorded). The mock APK may or may not show PDPA depending on session state.
 */
When('I accept PDPA if prompted', async function (this: AppWorld) {
  const onPdpa = await pdpa.isOnPdpaScreen();
  if (onPdpa) {
    await pdpa.acceptPdpa();
  }
});

When('I tap the Forgot Password link', async function (this: AppWorld) {
  const el = await login.waitForElement(login.forgotPasswordButton);
  await login.tap(el);
  await login.waitForIdle();
});

When('I tap the Register link', async function (this: AppWorld) {
  const el = await login.waitForElement(login.registerButton);
  await login.tap(el);
  await login.waitForIdle();
});

When('I inject a test session via DEV TOOLS', async function (this: AppWorld) {
  const { DevToolsScreen } = await import('../../screens/devtools.screen.ts');
  const devTools = new DevToolsScreen();
  await devTools.open();
  await devTools.injectTestSession();
  await devTools.close();
  await devTools.waitForIdle();
});

When('I clear the session via DEV TOOLS', async function (this: AppWorld) {
  const { DevToolsScreen } = await import('../../screens/devtools.screen.ts');
  const devTools = new DevToolsScreen();
  await devTools.open();
  await devTools.clearSession();
  // clearSession navigates away automatically — no close() needed
});

// ── Then ──────────────────────────────────────────────────────────────────────

Then('the Log in button should be disabled', async function (this: AppWorld) {
  await expect(login.loginButton).toHaveAttribute('clickable', 'false');
});

Then('the Log in button should be enabled', async function (this: AppWorld) {
  await expect(login.loginButton).toHaveAttribute('clickable', 'true');
});

Then('I see the PDPA Consent screen', async function (this: AppWorld) {
  await expect(pdpa.title).toBeDisplayed();
});

Then('I see the Home screen', async function (this: AppWorld) {
  await expect(home.homeTab).toBeDisplayed();
});

Then('I see the Set PIN screen', async function (this: AppWorld) {
  await expect(pincode.setPinTitle).toBeDisplayed();
});

When('I set PIN {string}', async function (this: AppWorld, pin: string) {
  await pincode.setPin(pin);
});

Then('I leave the Login screen', async function (this: AppWorld) {
  await browser.waitUntil(async () => !(await login.loginButton.isDisplayed().catch(() => false)), {
    timeout: TIMEOUTS.nav,
    timeoutMsg: 'Still on Login screen — navigation did not occur',
  });
});

Then('I am back on the Login screen', async function (this: AppWorld) {
  await login.waitForElement(login.loginButton, TIMEOUTS.nav);
});
