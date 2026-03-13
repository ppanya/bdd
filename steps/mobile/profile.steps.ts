import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../../fixtures/index.ts';
import { ProfileMenuScreen } from '../../screens/profile-menu.screen.ts';
import { SettingsScreen } from '../../screens/settings.screen.ts';
import { MyProfileScreen } from '../../screens/my-profile.screen.ts';
import { DevToolsScreen } from '../../screens/devtools.screen.ts';
import { TIMEOUTS } from '../../screens/base.screen.ts';

const profileMenu = new ProfileMenuScreen();
const settings = new SettingsScreen();
const myProfile = new MyProfileScreen();

// ── Given ─────────────────────────────────────────────────────────────────────

Given('I am on the Profile Menu screen via DEV TOOLS', async function (this: AppWorld) {
  // Skip DevTools navigation if already on the Profile Menu screen (e.g. previous
  // scenario left us here). Avoids 16+ scroll swipes that degrade UiAutomator2.
  // waitUntil (5s) handles transient accessibility tree refresh — same pattern as
  // the Wallet Background step.
  const alreadyOnProfile = await browser
    .waitUntil(() => profileMenu.isOnProfileMenuScreen(), { timeout: 5_000, interval: 500 })
    .catch(() => false);
  if (alreadyOnProfile) return;

  const devTools = new DevToolsScreen();
  await devTools.open();
  await devTools.goTo('Menu');
  await profileMenu.waitForElement(profileMenu.viewProfileButton);
});

// ── Then ───────────────────────────────────────────────────────────────────────

Then('I see the Profile Menu screen', async function (this: AppWorld) {
  await expect(profileMenu.viewProfileButton).toBeDisplayed();
});

Then('the View Profile button is visible', async function (this: AppWorld) {
  await expect(profileMenu.viewProfileButton).toBeDisplayed();
});

Then('the Manage Wallet menu item is visible', async function (this: AppWorld) {
  await expect(profileMenu.manageWallet).toBeDisplayed();
});

Then('the Bank Account menu item is visible', async function (this: AppWorld) {
  await expect(profileMenu.bankAccount).toBeDisplayed();
});

Then('the Security menu item is visible', async function (this: AppWorld) {
  await expect(profileMenu.security).toBeDisplayed();
});

Then('I see the Application Setting screen', async function (this: AppWorld) {
  // Flutter navigation animation is async — waitForElement polls until the
  // Settings screen title appears (up to TIMEOUTS.nav) before asserting.
  await settings.waitForElement(settings.title, TIMEOUTS.nav);
  await expect(settings.title).toBeDisplayed();
});

Then('I see the Profile Information screen', async function (this: AppWorld) {
  await expect(myProfile.title).toBeDisplayed();
});

// ── When ───────────────────────────────────────────────────────────────────────

When('I tap on Appearances menu item', async function (this: AppWorld) {
  const el = await profileMenu.waitForElement(profileMenu.appearances);
  await profileMenu.tap(el);
  await profileMenu.waitForIdle();
});

When('I tap the View Profile button', async function (this: AppWorld) {
  const el = await profileMenu.waitForElement(profileMenu.viewProfileButton);
  await profileMenu.tap(el);
  await profileMenu.waitForIdle();
});
