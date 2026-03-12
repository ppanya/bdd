import { BaseScreen, TIMEOUTS } from './base.screen.ts';

/**
 * PincodeScreen — Set PIN + Confirm PIN screens
 *
 * Appears in the login flow for users who have not yet set a PIN.
 * Flow: Set PIN (enter 6 digits) → auto-transitions → Confirm PIN (re-enter same 6 digits)
 *
 * Elements verified from live APK inspection (Pixel 7 API 34, 2026-03-12):
 *   Digit keys  : pin_0 – pin_9 (resource-id)
 *   Backspace   : second android.widget.ImageView — no resource-id, no accessibilityId
 *   Set PIN title     : accessibilityId "Set PIN"     (android.view.View)
 *   Confirm PIN title : accessibilityId "Confirm PIN" (android.view.View)
 */
export class PincodeScreen extends BaseScreen {
  // ── Title indicators ──────────────────────────────────────────────────────────

  get setPinTitle() {
    return this.byId('Set PIN');
  }

  get confirmPinTitle() {
    return this.byId('Confirm PIN');
  }

  // ── Digit keys ────────────────────────────────────────────────────────────────

  get key0() { return this.byResourceId('pin_0'); }
  get key1() { return this.byResourceId('pin_1'); }
  get key2() { return this.byResourceId('pin_2'); }
  get key3() { return this.byResourceId('pin_3'); }
  get key4() { return this.byResourceId('pin_4'); }
  get key5() { return this.byResourceId('pin_5'); }
  get key6() { return this.byResourceId('pin_6'); }
  get key7() { return this.byResourceId('pin_7'); }
  get key8() { return this.byResourceId('pin_8'); }
  get key9() { return this.byResourceId('pin_9'); }

  /** Backspace — no resource-id; second ImageView on screen */
  get backspaceKey() {
    return $(`(//android.widget.ImageView)[2]`);
  }

  // ── Screen detection ──────────────────────────────────────────────────────────

  async isOnSetPinScreen(): Promise<boolean> {
    try {
      await this.waitForIdle();
      await this.waitForElement(this.setPinTitle, TIMEOUTS.nav);
      return true;
    } catch {
      return false;
    }
  }

  async isOnConfirmPinScreen(): Promise<boolean> {
    try {
      await this.waitForIdle();
      await this.waitForElement(this.confirmPinTitle, TIMEOUTS.nav);
      return true;
    } catch {
      return false;
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────────

  /** Tap a single digit key */
  async tapDigit(digit: string): Promise<void> {
    const keyMap: Record<string, ChainablePromiseElement> = {
      '0': this.key0, '1': this.key1, '2': this.key2,
      '3': this.key3, '4': this.key4, '5': this.key5,
      '6': this.key6, '7': this.key7, '8': this.key8,
      '9': this.key9,
    };
    const key = keyMap[digit];
    if (!key) throw new Error(`Invalid PIN digit: "${digit}"`);
    const el = await this.waitForElement(key);
    await this.tap(el);
  }

  /** Enter a multi-digit PIN one key at a time */
  async enterPin(pin: string): Promise<void> {
    for (const digit of pin) {
      await this.tapDigit(digit);
    }
  }

  /**
   * Complete the full Set PIN flow:
   *   1. Wait for Set PIN screen
   *   2. Enter PIN (app auto-transitions to Confirm PIN after 6th digit)
   *   3. Wait for Confirm PIN screen
   *   4. Re-enter same PIN
   */
  async setPin(pin: string): Promise<void> {
    await this.waitForElement(this.setPinTitle, TIMEOUTS.nav);
    await this.enterPin(pin);
    await this.waitForElement(this.confirmPinTitle, TIMEOUTS.nav);
    await this.enterPin(pin);
    await this.waitForIdle();
  }
}
