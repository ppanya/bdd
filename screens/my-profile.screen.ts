import { BaseScreen, TIMEOUTS } from './base.screen.ts';

/**
 * MyProfileScreen — หน้า Profile Information
 *
 * Elements ยืนยันจาก wdio-mcp live inspection (2026-03-12, app v3.0.0 build 19):
 *   Title: "Profile Information" — accessibilityId
 *   Masking toggle: "Masking Personal Info" — accessibilityId (android.view.View)
 *   Phone Number section: label "Phone Number", value row is ImageView (click to edit)
 *   Email section: label "Email", value row is ImageView (click to edit)
 *   No resource-ids — use byId / byDesc
 */
export class MyProfileScreen extends BaseScreen {
  // ── Screen title ──────────────────────────────────────────────────────────────

  get title() {
    return this.byId('Profile Information');
  }

  // ── Masking toggle ────────────────────────────────────────────────────────────

  /** Toggle that masks personal info (phone/email partially hidden) */
  get maskingPersonalInfoToggle() {
    return this.byId('Masking Personal Info');
  }

  // ── Phone Number ──────────────────────────────────────────────────────────────

  get phoneNumberLabel() {
    return this.byId('Phone Number');
  }

  /**
   * Phone number value row (ImageView) — tap to navigate to phone number change flow
   * content-desc shows masked value e.g. "+66 **** 9665"
   */
  get phoneNumberRow() {
    return this.byDesc('+66');
  }

  // ── Email ─────────────────────────────────────────────────────────────────────

  get emailLabel() {
    return this.byId('Email');
  }

  /**
   * Email value row (ImageView) — tap to navigate to email change flow
   * content-desc shows masked value e.g. "fon****@****.com"
   */
  get emailRow() {
    return this.byDesc('@');
  }

  // ── Screen detection ──────────────────────────────────────────────────────────

  async isOnMyProfileScreen(): Promise<boolean> {
    try {
      await this.waitForIdle();
      await this.waitForElement(this.title, TIMEOUTS.nav);
      return true;
    } catch {
      return false;
    }
  }
}
