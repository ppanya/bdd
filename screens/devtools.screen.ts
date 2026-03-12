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
    // Wait for the app to be in a stable state (past splash/loading screens)
    await this.byResourceId('devtool_button').waitForDisplayed({
      timeout: TIMEOUTS.nav, // use nav timeout — app may still be loading
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
  async injectTestSession(): Promise<void> {
    await this.scrollToView('Select Test Token');
    await this.selectTestTokenButton.waitForDisplayed({ timeout: TIMEOUTS.element });
    await this.selectTestTokenButton.click();
    await this.waitForIdle();

    // After token is selected, tap Inject Session to apply it
    await this.scrollToView('Inject Session');
    await this.injectSessionButton.waitForDisplayed({ timeout: TIMEOUTS.element });
    await this.injectSessionButton.click();
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
    await this.injectSessionButton.click();
    await this.waitForIdle();
  }

  /**
   * Clear the current auth session.
   *
   * Taps "Clear Session" — app will navigate back to the login screen.
   * Much faster than pm clear: no app restart, no onboarding to skip.
   */
  /**
   * Clear the current auth session.
   *
   * After tapping, the app navigates away from DEV TOOLS automatically
   * (to login or onboarding). Do NOT call close() after this.
   */
  async clearSession(): Promise<void> {
    await this.scrollToView('Clear Session');
    await this.clearSessionButton.waitForDisplayed({ timeout: TIMEOUTS.element });
    await this.clearSessionButton.click();
    await this.waitForIdle();
    // App navigates away from DEV TOOLS — no close() needed
  }

  // ── Navigation shortcuts ──────────────────────────────────────────────────────

  /**
   * Tap a PUSH shortcut to navigate directly to a screen.
   *
   * @example await devTools.pushTo('PDPA')
   */
  async pushTo(route: DevToolsRoute): Promise<void> {
    await this.scrollToView(route);
    const btn = $(`android=new UiSelector().descriptionContains("${route}")`);
    await btn.waitForDisplayed({ timeout: TIMEOUTS.element });
    await btn.click();
    await this.waitForIdle();
  }

  /**
   * Tap a GO shortcut to navigate to a wallet/account screen.
   *
   * @example await devTools.goTo('Wallet Info')
   */
  async goTo(route: DevToolsRoute): Promise<void> {
    await this.scrollToView(route);
    const btn = $(`android=new UiSelector().descriptionContains("${route}")`);
    await btn.waitForDisplayed({ timeout: TIMEOUTS.element });
    await btn.click();
    await this.waitForIdle();
  }

  // ── Device Settings ───────────────────────────────────────────────────────────

  async setTheme(theme: 'Light' | 'Dark' | 'System'): Promise<void> {
    await this.scrollToView(theme);
    await $(`~${theme}`).waitForDisplayed({ timeout: TIMEOUTS.element });
    await $(`~${theme}`).click();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  /**
   * Scroll inside DEV TOOLS until the target element is in view.
   *
   * Strategy:
   *   1. Skip scroll if element is already visible
   *   2. Swipe down 4× to reset position to top (W3C touch action — reliable regardless
   *      of which scrollable UiAutomator2 picks as instance(0))
   *   3. Try UiScrollable.scrollIntoView() on instance(0) first, then instance(1) as
   *      fallback — DEV TOOLS is a Flutter overlay so the underlying app page may also
   *      have a scrollable view in the accessibility tree; instance index varies per screen
   *   4. Throw if still not found — fail fast, don't silently miss
   */
  private async scrollToView(contentDesc: string): Promise<void> {
    const el = $(`android=new UiSelector().descriptionContains("${contentDesc}")`);
    if (await el.isDisplayed().catch(() => false)) return;

    // Normalize to top: finger sweeps downward (y 900→1800) scrolls content toward top.
    // 4 swipes × ~900 px = enough to reach top from any scroll depth in the 57-item list.
    for (let i = 0; i < 4; i++) {
      await this.swipe(540, 900, 540, 1800);
      await driver.pause(120);
      if (await el.isDisplayed().catch(() => false)) return;
    }

    // Search downward using UiScrollable. Try instance(0) first, then instance(1)
    // because DEV TOOLS overlay may not always be the first scrollable container.
    for (let instance = 0; instance <= 1; instance++) {
      try {
        await $(
          `android=new UiScrollable(new UiSelector().scrollable(true).instance(${instance}))` +
            `.setMaxSearchSwipes(20)` +
            `.scrollIntoView(new UiSelector().descriptionContains("${contentDesc}"))`,
        ).waitForExist({ timeout: TIMEOUTS.element });
        return; // found
      } catch {
        // This scrollable instance didn't contain the element — try next
      }
    }

    throw new Error(`DevTools: "${contentDesc}" not found after scrolling`);
  }
}
