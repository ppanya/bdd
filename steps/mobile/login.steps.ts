import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../../fixtures/index.ts';
import { LoginScreen } from '../../screens/login.screen.ts';
import { PdpaScreen } from '../../screens/pdpa.screen.ts';
import { HomeScreen } from '../../screens/home.screen.ts';
import { PincodeScreen } from '../../screens/pincode.screen.ts';
import { TIMEOUTS } from '../../screens/base.screen.ts';

const login = new LoginScreen();
const pdpa = new PdpaScreen();
const home = new HomeScreen();
const pincode = new PincodeScreen();

// ── Given ─────────────────────────────────────────────────────────────────────

Given('I am on the Phone login screen', async function (this: AppWorld) {
  // @login-screen Before hook already navigated to login screen
  await login.waitForElement(login.phoneInput, TIMEOUTS.nav);
});

Given('I am on the Email login screen', async function (this: AppWorld) {
  // @login-screen Before hook already navigated to login screen
  await login.waitForElement(login.switchToEmailButton, TIMEOUTS.nav);
  await login.switchToEmailLogin();
  await login.waitForElement(login.emailInput);
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
  await login.waitForElement(login.loginButton);
  const clickable = await login.isLoginButtonClickable();
  if (clickable) {
    throw new Error('Expected Log in button to be disabled but it was enabled');
  }
});

Then('the Log in button should be enabled', async function (this: AppWorld) {
  await login.waitForElement(login.loginButton);
  // Use waitUntil polling — Flutter updates clickable attribute asynchronously
  await browser.waitUntil(() => login.isLoginButtonClickable(), {
    timeout: TIMEOUTS.element,
    timeoutMsg: 'Expected Log in button to be enabled but it remained disabled',
  });
});

Then('I see the PDPA Consent screen', async function (this: AppWorld) {
  const onPdpa = await pdpa.isOnPdpaScreen();
  if (!onPdpa) {
    throw new Error('Expected PDPA Consent screen but it was not found');
  }
});

Then('I see the Home screen', async function (this: AppWorld) {
  const onHome = await home.isOnHomeScreen();
  if (!onHome) {
    throw new Error('Expected Home screen but it was not found');
  }
});

Then('I see the Set PIN screen', async function (this: AppWorld) {
  const onPin = await pincode.isOnSetPinScreen();
  if (!onPin) {
    throw new Error('Expected Set PIN screen but it was not found');
  }
});

When('I set PIN {string}', async function (this: AppWorld, pin: string) {
  await pincode.setPin(pin);
});

Then('I leave the Login screen', async function (this: AppWorld) {
  // Verify login_submit_button disappears — navigation occurred successfully
  await browser.waitUntil(
    async () => !(await login.loginButton.isDisplayed().catch(() => false)),
    { timeout: TIMEOUTS.nav, timeoutMsg: 'Still on Login screen — navigation did not occur' },
  );
});

Then('I am back on the Login screen', async function (this: AppWorld) {
  await login.waitForElement(login.loginButton, TIMEOUTS.nav);
});
