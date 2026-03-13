/**
 * DevToolsScreen — DEV TOOLS panel (test environment only)
 *
 * Floating side tab visible on every app screen.
 *
 * Key capabilities:
 *   - Session Injection : inject / clear auth tokens without going through login flow
 *   - Navigation shortcuts : push directly to any screen (PDPA, Pincode, Transfer…)
 *   - Device settings : theme, language
 *
 * Opening quirk
 *   devtool_button has clickable=false — Flutter semantic node has no accessibility
 *   click handler.  The underlying GestureDetector only responds to raw touch events.
 *   With TalkBack active, mobile: doubleClickGesture at the visual position is the
 *   only reliable trigger.  The element's accessibility bounds [0,0][1080,2337]
 *   (full screen) are wrong — coordinates must be calculated from screen dimensions.
 */

import { BaseScreen, TIMEOUTS } from './base.screen.ts';

/**
 * All screens reachable via DEV TOOLS shortcuts.
 * Verified by full scroll inspection of the DEV TOOLS panel (57 buttons total).
 *
 * GO   = replaces current stack (navigates to the screen directly)
 * PUSH = pushes onto the navigation stack
 */
export type DevToolsRoute =
  // ── Onboarding ────────────────────────────────────────────────
  | 'Onboarding' // GO

  // ── Main tabs ─────────────────────────────────────────────────
  | 'Home' // GO
  | 'Wallet' // GO
  | 'DApp' // GO
  | 'Scanner' // PUSH

  // ── Auth ──────────────────────────────────────────────────────
  | 'Login' // GO
  | 'Signup' // GO

  // ── Guard ─────────────────────────────────────────────────────
  | 'Account Status' // GO

  // ── Wallet ────────────────────────────────────────────────────
  | 'History' // GO
  | 'Point Detail' // PUSH
  | 'Point Expiration' // PUSH
  | 'Wrapable Token' // GO
  | 'Wrapable Token Review' // PUSH

  // ── Token ─────────────────────────────────────────────────────
  | 'Token Transfer' // PUSH
  | 'Token Transfer Review' // PUSH
  | 'Token Transfer Summary' // PUSH
  | 'Token Detail' // PUSH

  // ── NFTs ──────────────────────────────────────────────────────
  | 'NFT Collection' // GO
  | 'NFT Image 1' // GO
  | 'NFT Image 2' // GO
  | 'NFT Video' // GO
  | 'Receive Point' // PUSH
  | 'Receive Token' // PUSH
  | 'Receive NFT' // PUSH
  | 'Receive E-Money' // PUSH
  | 'Import Token' // PUSH
  | 'Import NFT' // PUSH

  // ── Home ──────────────────────────────────────────────────────
  | 'Shortcut' // GO

  // ── Profile ───────────────────────────────────────────────────
  | 'Menu' // GO
  | 'My Profile' // GO
  | 'Settings' // GO
  | 'Theme' // GO
  | 'Language' // GO
  | 'Privacy' // GO

  // ── Withdrawal Settings ───────────────────────────────────────
  | 'Withdrawal Settings' // GO
  | '+ Kub Wallet' // GO
  | '+ External Wallet' // GO
  | 'Select Token' // PUSH
  | 'Wallet Info' // GO
  | 'Edit Wallet Info' // GO

  // ── Pincode ───────────────────────────────────────────────────
  | 'Set PIN' // PUSH
  | 'Verify PIN' // PUSH

  // ── Consent ───────────────────────────────────────────────────
  | 'TOS' // PUSH
  | 'PDPA' // PUSH

  // ── THBK ──────────────────────────────────────────────────────
  | 'Suitability Assessment' // PUSH
  | 'Top Up' // PUSH
  | 'Transfer to Bank Account' // PUSH
  | 'Transfer to Bank Account Confirm' // PUSH
  | 'Transfer to Kub Wallet' // PUSH
  | 'Transfer to Join Wallet' // PUSH
  | 'Transfer to Programmable Payment' // PUSH
  | 'Transfer to Programmable Payment Review' // PUSH
  | 'Transfer to Programmable Payment Confirm' // PUSH

  // ── Bank Account ──────────────────────────────────────────────
  | 'Bank Account' // PUSH
  | 'Add Bank Account' // PUSH

  // ── Redemption ────────────────────────────────────────────────
  | 'Promotion Code' // PUSH
  | 'Qr code' // PUSH
  | 'Barcode' // PUSH
  | 'Redemption Detail' // PUSH

  // ── Webview ───────────────────────────────────────────────────
  | 'Google (with SDK)'; // PUSH

export class DevToolsScreen extends BaseScreen {
  // 6 reset swipes × ~47% screen/swipe = ~2.82 screens of upward scroll.
  // Ensures we reach the top even if DevTools was scrolled deep by a previous session
  // (e.g. Auth section at 2x, Profile section at 3-3.5x from previous goTo calls).
  // 4 reset swipes was insufficient when DevTools was >2 screens deep (History not found
  // on fallback navigation in @wallet-history scenario). Restored to 6 (was 8 original).
  // With 150ms pause between swipes, 6+14=20 total is safe (OOM risk is from rapid swipes
  // without pause; the 150ms gap gives UiAutomator2 instrumentation time to process).
  private static readonly RESET_SWIPES = 6;
  private static readonly SEARCH_SWIPES = 14;

  // Fix FM-3: Route cache — skip reset swipes when the target route is already visible.
  // Reduces total W3C pointer actions from ~432 to ~250 across 3 consecutive runs.
  private static lastRoute: string | null = null;

  // ── Session Injection elements ────────────────────────────────────────────────

  // DEV TOOLS elements have NO resource-id (Flutter Semantics does not expose them).
  // Best available strategies:
  //   Session buttons → exact accessibility id (~) — Flutter exports these as simple IDs
  //   Nav buttons     → descriptionContains — content-desc is compound "emoji\nLabel\nGO|PUSH"
  //   EditText fields → xpath by class index — no id, no content-desc, no hint exposed

  get selectTestTokenButton() {
    return $(`~Select Test Token`);
  }

  /** First EditText in Session Injection section = Access Token field */
  get accessTokenInput() {
    return $(`(//android.widget.EditText)[1]`);
  }

  /** Second EditText in Session Injection section = Refresh Token field */
  get refreshTokenInput() {
    return $(`(//android.widget.EditText)[2]`);
  }

  get injectSessionButton() {
    return $(`~Inject Session`);
  }

  get clearSessionButton() {
    return $(`~Clear Session`);
  }

  // ── Open / Close ──────────────────────────────────────────────────────────────

  /**
   * Open the DEV TOOLS panel.
   *
   * Uses mobile: doubleClickGesture because:
   *   1. clickable=false — .click() via accessibility action is a no-op
   *   2. Flutter GestureDetector responds to raw touch at the visual position
   *
   * Position: right edge of screen (~97% width, ~78% height).
   * Verified on Pixel 7 API 34 (1080×2337): x=1050, y=1825.
   */
  async open(): Promise<void> {
    // Reset accessibility cache before waiting for devtool_button.
    // This is a targeted reset — only called when we actually need to open DevTools.
    // It prevents stale UiAutomator2 cache from hiding devtool_button when the
    // Wallet screen has been showing for a while (periodic crypto-data refresh can
    // temporarily invalidate the cache without triggering a getPageSource failure).
    await driver.execute('mobile: resetAccessibilityCache', {}).catch(() => {});

    // Wait for devtool_button before attempting the gesture.
    // IMPORTANT: this wait is not just a readiness check — it ensures Flutter's
    // GestureDetector is fully registered before the raw touch event is sent.
    // Removing or softening this wait causes the doubleClickGesture to arrive before
    // Flutter's semantic tree is built, making it silently miss the button.
    //
    // Callers that need to avoid DevTools (e.g. already on the target screen) should
    // use isOnXxxScreen() + early-return BEFORE calling open(), not by bypassing this wait.
    await this.byResourceId('devtool_button').waitForDisplayed({
      timeout: 30_000, // 30s — allows for slow wallet-screen crypto-data loading
    });

    const { width, height } = await driver.getWindowSize();

    // devtool_button has clickable=false; needs raw touch via doubleClickGesture.
    // Visual position: right edge ~97% width, ~78% height.
    // Verified on Pixel 7 API 34 (1080×2337): x=1050, y=1825.
    await driver.execute('mobile: doubleClickGesture', {
      x: Math.round(width * 0.97),
      y: Math.round(height * 0.78),
    });

    await this.waitForIdle();

    // Confirm DEV TOOLS header is shown — use descriptionContains for safety
    await $(`android=new UiSelector().descriptionContains("DEV TOOLS")`).waitForDisplayed({
      timeout: TIMEOUTS.nav,
    });

  }

  /**
   * Close DEV TOOLS by pressing Android BACK.
   * Safe to call even if DEV TOOLS already closed (e.g. after goTo/pushTo navigation).
   */
  async close(): Promise<void> {
    if (!(await this.isOpen())) return; // already closed — nothing to do
    await driver.execute('mobile: pressKey', { keycode: 4 }); // Android BACK
    await this.waitForIdle();
  }

  /** Returns true if the DEV TOOLS header is currently visible. */
  async isOpen(): Promise<boolean> {
    try {
      return await $(`android=new UiSelector().descriptionContains("DEV TOOLS")`).isDisplayed();
    } catch {
      return false;
    }
  }

  // ── Session Injection ─────────────────────────────────────────────────────────

  /**
   * Pick a preset test token and inject the session in one action.
   *
   * Flow: Select Test Token → (token picker) → auto-fills fields → Inject Session
   *
   * After this call the app treats the user as logged in.
   * Caller should wait for the expected post-login screen (home or PDPA).
   */
  /**
   * Pick a preset test token and inject the session in one action.
   *
   * Flow: Select Test Token → bottom sheet appears → select token → Inject Session
   *
   * @param tokenLabel - descriptionContains text for the token to select.
   *                     Defaults to 'Fon user' (first preset in the bottom sheet).
   *                     Pass e.g. 'Test user 2' to choose a different account.
   *
   * After this call the app treats the user as logged in.
   * Caller should wait for the expected post-login screen (home or PDPA).
   */
  async injectTestSession(tokenLabel = 'Fon user'): Promise<void> {
    await this.scrollToView('Select Test Token');
    await this.selectTestTokenButton.waitForDisplayed({ timeout: TIMEOUTS.element });
    await this.tap(this.selectTestTokenButton);
    await this.waitForIdle();

    // "Select Test Token" opens a bottom sheet modal with token options.
    // Must select one token before scrolling to "Inject Session".
    // Verified 2026-03-13: bottom sheet has "Fon user" and "Test user 2" buttons.
    const tokenBtn = $(`android=new UiSelector().descriptionContains("${tokenLabel}")`);
    await tokenBtn.waitForDisplayed({ timeout: TIMEOUTS.element });
    await tokenBtn.click();
    await this.waitForIdle();

    // After token is selected, tap Inject Session to apply it
    await this.scrollToView('Inject Session');
    await this.injectSessionButton.waitForDisplayed({ timeout: TIMEOUTS.element });
    await this.tap(this.injectSessionButton);
    await this.waitForIdle();
  }

  /**
   * Inject session using raw access + refresh tokens.
   *
   * @param accessToken  - JWT access token
   * @param refreshToken - JWT refresh token (optional)
   */
  async injectRawSession(accessToken: string, refreshToken?: string): Promise<void> {
    await this.scrollToView('Paste access token here');
    await this.setText(this.accessTokenInput, accessToken);

    if (refreshToken) {
      await this.scrollToView('Paste refresh token here');
      await this.setText(this.refreshTokenInput, refreshToken);
    }

    await this.scrollToView('Inject Session');
    await this.injectSessionButton.waitForDisplayed({ timeout: TIMEOUTS.element });
    await this.tap(this.injectSessionButton);
    await this.waitForIdle();
  }

  /**
   * Clear the current auth session.
   *
   * After tapping, the app navigates away from DEV TOOLS automatically
   * (to login or onboarding). Do NOT call close() after this.
   */
  async clearSession(): Promise<void> {
    await this.scrollToView('Clear Session');
    await this.clearSessionButton.waitForDisplayed({ timeout: TIMEOUTS.element });
    await this.tap(this.clearSessionButton);
    await this.waitForIdle();
    // App navigates away from DEV TOOLS — no close() needed
  }

  // ── Navigation shortcuts ──────────────────────────────────────────────────────

  /**
   * Tap a PUSH shortcut to navigate directly to a screen.
   *
   * Uses XPath with content-desc 'PUSH' constraint to match only the actual route button,
   * NOT the Navigator Launchpad compound header view (which also contains route names
   * in its content-desc but is rendered at the top and would be matched by descriptionContains).
   *
   * @example await devTools.pushTo('PDPA')
   */
  async pushTo(route: DevToolsRoute): Promise<void> {
    const btn = $(`//android.view.View[contains(@content-desc,'${route}') and contains(@content-desc,'PUSH')]`);

    // Fast path: if same route as last call, element might already be visible — skip scroll reset
    if (DevToolsScreen.lastRoute === route && await btn.isDisplayed().catch(() => false)) {
      await this.tapRoute(btn);
      await this.waitForIdle();
      DevToolsScreen.lastRoute = route;
      return;
    }

    await this.scrollToViewByEl(btn, route);
    await btn.waitForDisplayed({ timeout: TIMEOUTS.element });
    await this.tapRoute(btn);
    await this.waitForIdle();
    DevToolsScreen.lastRoute = route;
  }

  /**
   * Tap a GO shortcut to navigate to a wallet/account screen.
   *
   * Uses XPath with content-desc 'GO' constraint to match only the actual route button.
   *
   * @example await devTools.goTo('Wallet Info')
   */
  async goTo(route: DevToolsRoute): Promise<void> {
    const btn = $(`//android.view.View[contains(@content-desc,'${route}') and contains(@content-desc,'GO')]`);

    // Fast path: if same route as last call, element might already be visible — skip scroll reset
    if (DevToolsScreen.lastRoute === route && await btn.isDisplayed().catch(() => false)) {
      await this.tapRoute(btn);
      await this.waitForIdle();
      DevToolsScreen.lastRoute = route;
      return;
    }

    await this.scrollToViewByEl(btn, route);
    await btn.waitForDisplayed({ timeout: TIMEOUTS.element });
    await this.tapRoute(btn);
    await this.waitForIdle();
    DevToolsScreen.lastRoute = route;
  }

  // ── Device Settings ───────────────────────────────────────────────────────────

  async setTheme(theme: 'Light' | 'Dark' | 'System'): Promise<void> {
    await this.scrollToView(theme);
    await $(`~${theme}`).waitForDisplayed({ timeout: TIMEOUTS.element });
    await this.tap($(`~${theme}`));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  /**
   * Scroll DevTools until the given element (by any selector) is in viewport.
   * Core scroll logic shared by scrollToView and the XPath-based goTo/pushTo.
   */
  private async scrollToViewByEl(el: ChainablePromiseElement, label: string): Promise<void> {
    // Flush stale UiAutomator2 accessibility tree before scroll detection.
    // After multiple DevTools sessions + TalkBack interactions, el.isDisplayed() can
    // return false for visible elements due to a partially-rebuilt semantic tree.
    // resetAccessibilityCache forces a fresh sync before we start scanning.
    await driver.execute('mobile: resetAccessibilityCache', {}).catch(() => {});

    if (await el.isDisplayed().catch(() => false)) return;

    // Reset to top: finger sweeps downward (y 900→1800) scrolls content toward top.
    for (let i = 0; i < DevToolsScreen.RESET_SWIPES; i++) {
      await this.swipe(540, 900, 540, 1800);
      // 150ms pause between swipes: lets UiAutomator2 instrumentation process touch events
      // before the next one arrives. Without pause, rapid swipes queue up and OOM-crash
      // the instrumentation process (socket hang up on subsequent Appium sessions).
      await browser.pause(150);
      // Flutter AccessibilityBridge updates post-frame (~16-600ms). waitUntil polls
      // every 100ms up to 800ms; .catch continues loop if not found yet.
      await browser.waitUntil(() => el.isDisplayed().catch(() => false), {
        timeout: 800, interval: 100,
      }).catch(() => {});
      if (await el.isDisplayed().catch(() => false)) return;
    }

    // Search downward: finger sweeps upward (y 1600→500) scrolls DevTools content down.
    for (let i = 0; i < DevToolsScreen.SEARCH_SWIPES; i++) {
      if (await el.isDisplayed().catch(() => false)) return;
      await this.swipe(540, 1600, 540, 500);
      await browser.pause(150);
      await browser.waitUntil(() => el.isDisplayed().catch(() => false), {
        timeout: 800, interval: 100,
      }).catch(() => {});
    }

    throw new Error(`DevTools: "${label}" not found after scrolling`);
  }

  /**
   * Tap a DevTools route button — delegates to BaseScreen.tap().
   * tap() handles clickable=false Flutter GestureDetectors via platform gesture.
   */
  private async tapRoute(btn: ChainablePromiseElement): Promise<void> {
    await this.tap(btn);  // tap() handles clickable=false via platform gesture
  }

  /**
   * Scroll inside DEV TOOLS until the target element is in view.
   *
   * Strategy:
   *   1. Skip scroll if element is already visible
   *   2. Swipe DOWN 4× (finger y=900→1800) to reset position to top of DevTools
   *   3. Swipe UP 20× (finger y=1600→500) checking isDisplayed after each swipe
   *   4. Throw if still not found — fail fast, don't silently miss
   *
   * Why NOT UiScrollable:
   *   UiScrollable.scrollIntoView with setMaxSearchSwipes(20) crashes the UiAutomator2
   *   instrumentation process when the element is not found after max swipes. This caused
   *   a cascade failure killing all subsequent tests in the suite. W3C swipe actions are
   *   safe — they never interact with the Android accessibility/instrumentation layer
   *   directly, so no crash risk regardless of how many times they are called.
   */
  private async scrollToView(contentDesc: string): Promise<void> {
    const el = $(`android=new UiSelector().descriptionContains("${contentDesc}")`);
    await this.scrollToViewByEl(el, contentDesc);
  }
}
