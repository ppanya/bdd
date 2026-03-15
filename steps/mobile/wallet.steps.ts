import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../../fixtures/index.ts';
import { WalletScreen } from '../../screens/wallet.screen.ts';
import { TIMEOUTS } from '../../screens/base.screen.ts';
import { ensureAuthenticated } from '../../support/mobile/session-helper.ts';
import { safeGetPageSource } from '../../support/mobile/app-driver.ts';
import { navigateViaDevTools } from '../../support/mobile/nav-helper.ts';

const wallet = new WalletScreen();

// ── Given ─────────────────────────────────────────────────────────────────────

Given('I am on the Wallet screen via DEV TOOLS', async function (this: AppWorld) {
  await ensureAuthenticated();

  await navigateViaDevTools(
    'Wallet',
    () => wallet.isOnWalletScreen(),
    async () => {
      await wallet.waitForElement(wallet.walletName, TIMEOUTS.nav);
    },
  );
});

// ── Then ───────────────────────────────────────────────────────────────────────

Then('I see the Wallet screen', async function (this: AppWorld) {
  await expect(wallet.walletName).toBeDisplayed();
});

Then('the Crypto tab is active', async function (this: AppWorld) {
  await expect(wallet.cryptoTab).toBeDisplayed();
});

Then('the Token sub-tab is visible', async function (this: AppWorld) {
  await expect(wallet.tokenTab).toBeDisplayed();
});

Then('the NFTs sub-tab is visible', async function (this: AppWorld) {
  await expect(wallet.nftsTab).toBeDisplayed();
});

Then('the Point sub-tab is visible', async function (this: AppWorld) {
  await expect(wallet.pointTab).toBeDisplayed();
});

Then('the Transfer button is visible', async function (this: AppWorld) {
  await expect(wallet.transferButton).toBeDisplayed();
});

Then('the Receive button is visible', async function (this: AppWorld) {
  await expect(wallet.receiveButton).toBeDisplayed();
});

Then('the History button is visible', async function (this: AppWorld) {
  await expect(wallet.historyButton).toBeDisplayed();
});

// ── When ───────────────────────────────────────────────────────────────────────

When('I tap the History button', async function (this: AppWorld) {
  await wallet.resetCache();
  const el = await wallet.waitForElement(wallet.historyButton);
  await wallet.tap(el);
  await wallet.waitForIdle();

  // Wait for navigation to Crypto History screen
  await browser.waitUntil(
    async () => (await safeGetPageSource()).includes('Crypto History'),
    { timeout: TIMEOUTS.nav, interval: 500, timeoutMsg: 'History navigation failed' },
  );
});

// ── Then (History screen) ─────────────────────────────────────────────────────

Then('I see the Crypto History screen', async function (this: AppWorld) {
  await browser.waitUntil(
    async () => (await safeGetPageSource()).includes('Crypto History'),
    {
      timeout: TIMEOUTS.nav,
      interval: 500,
      timeoutMsg: 'Crypto History screen not detected after timeout',
    },
  );
});
