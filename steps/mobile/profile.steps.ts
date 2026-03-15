import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../../fixtures/index.ts';
import { ProfileMenuScreen } from '../../screens/profile-menu.screen.ts';
import { SettingsScreen } from '../../screens/settings.screen.ts';
import { MyProfileScreen } from '../../screens/my-profile.screen.ts';
import { TIMEOUTS } from '../../screens/base.screen.ts';
import { ensureAuthenticated } from '../../support/mobile/session-helper.ts';
import { navigateViaDevTools } from '../../support/mobile/nav-helper.ts';

const profileMenu = new ProfileMenuScreen();
const settings = new SettingsScreen();
const myProfile = new MyProfileScreen();

// ── Given ─────────────────────────────────────────────────────────────────────

Given('I am on the Profile Menu screen via DEV TOOLS', async function (this: AppWorld) {
  await ensureAuthenticated();

  await navigateViaDevTools(
    'Menu',
    () => profileMenu.isOnProfileMenuScreen(),
    async () => {
      await profileMenu.waitForElement(profileMenu.viewProfileButton);
    },
  );
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

Then('I see the Appearances screen', async function (this: AppWorld) {
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
