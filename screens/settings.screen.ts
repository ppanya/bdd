import { BaseScreen, TIMEOUTS } from './base.screen.ts';

/**
 * SettingsScreen — หน้า Appearances (theme settings)
 *
 * Elements ยืนยันจาก wdio-mcp live inspection (2026-03-13, app v3.0.0 build 19):
 *   Title: "Appearances" — accessibilityId (NOT "Application Setting" — that title does not exist)
 *   Radio buttons: resource-ids app_radio_theme_style_system/dark/light
 *   Navigated to via: Profile Menu → Appearances menu row
 */
export class SettingsScreen extends BaseScreen {
  // ── Screen title ──────────────────────────────────────────────────────────────

  get title() {
    // Verified 2026-03-13: screen title is "Appearances", not "Application Setting"
    return this.byId('Appearances');
  }

  // ── Settings rows ─────────────────────────────────────────────────────────────

  /**
   * Appearances row — shows current theme as compound content-desc "Appearances\nSystem"
   * Use byDesc("Appearances") for partial match regardless of current theme value
   */
  get appearances() {
    return this.byDesc('Appearances');
  }

  /**
   * Languages row — shows current language as compound content-desc "Languages\nEnglish"
   * Use byDesc("Languages") for partial match regardless of current language value
   */
  get languages() {
    return this.byDesc('Languages');
  }

  // ── Screen detection ──────────────────────────────────────────────────────────

  async isOnSettingsScreen(): Promise<boolean> {
    try {
      await this.waitForIdle();
      await this.waitForElement(this.title, TIMEOUTS.nav);
      return true;
    } catch {
      return false;
    }
  }
}
