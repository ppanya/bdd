import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../../fixtures/index.ts';
import { WalletScreen } from '../../screens/wallet.screen.ts';
import { HistoryScreen } from '../../screens/history.screen.ts';
import { DevToolsScreen } from '../../screens/devtools.screen.ts';
import { TIMEOUTS } from '../../screens/base.screen.ts';

const wallet = new WalletScreen();
const history = new HistoryScreen();

// ── Given ─────────────────────────────────────────────────────────────────────

Given('I am on the Wallet screen via DEV TOOLS', async function (this: AppWorld) {
  // Skip DevTools navigation if already on the Wallet screen (e.g. previous scenario
  // left us here). This avoids 16+ scroll swipes per scenario that degrade UiAutomator2.
  // Use waitUntil (5s) — Wallet screen may be mid-refresh (partial accessibility tree)
  // right after a prior scenario. waitUntil gives it time to stabilise before we decide
  // to open DevTools, preventing a spurious 30s devtool_button timeout.
  const alreadyOnWallet = await browser
    .waitUntil(() => wallet.isOnWalletScreen(), { timeout: 5_000, interval: 500 })
    .catch(() => false);
  if (alreadyOnWallet) return;

  const devTools = new DevToolsScreen();
  await devTools.open();
  await devTools.goTo('Wallet');
  // Use nav timeout (15s) — Wallet screen may need extra time to render the
  // Crypto Wallet label after DevTools navigation and token data loading.
  await wallet.waitForElement(wallet.walletName, TIMEOUTS.nav);
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
  // Reset accessibility cache before getting element coordinates.
  // Without this, el.getLocation() may return stale values from a partial
  // accessibility tree (Wallet screen mid-refresh), causing clickGesture to miss
  // the History button and silently fail to navigate.
  await driver.execute('mobile: resetAccessibilityCache', {}).catch(() => {});
  const el = await wallet.waitForElement(wallet.historyButton);
  await wallet.tap(el);
  await wallet.waitForIdle();

  // Fallback: History button tap (ImageView, screen-push navigation) is unreliable
  // under TalkBack + UiAutomator2 — raw touch events on screen-push buttons don't
  // trigger Flutter's GestureDetector, unlike modal-triggering buttons (Transfer).
  // If page source doesn't contain 'Crypto History' within 3s, use DevTools instead.
  // DevTools 'History GO' is the only confirmed-working navigation method (FM-3 fix).
  const navigated = await browser
    .waitUntil(
      async () => (await driver.getPageSource().catch(() => '')).includes('Crypto History'),
      { timeout: 3_000, interval: 500 },
    )
    .catch(() => false);

  if (!navigated) {
    const devTools = new DevToolsScreen();
    await devTools.open();
    await devTools.goTo('History');
  }
});

// ── Then (History screen) ─────────────────────────────────────────────────────

Then('I see the Crypto History screen', async function (this: AppWorld) {
  // Use getPageSource() for screen detection — same strategy as detectScreen().
  // waitForDisplayed / ~accessibilityId is unreliable for the History screen title:
  // the node appears in the XML dump but UiAutomator2's accessibility API does not
  // always report it as "displayed" during the initial render after navigation.
  await browser.waitUntil(
    async () => (await driver.getPageSource().catch(() => '')).includes('Crypto History'),
    { timeout: TIMEOUTS.nav, interval: 500, timeoutMsg: 'Crypto History screen not detected after 15s' },
  );
});
