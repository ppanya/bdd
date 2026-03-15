import { BaseScreen, TIMEOUTS } from './base.screen.ts';
import { safeGetPageSource } from '../support/mobile/app-driver.ts';

/**
 * ProfileMenuScreen — หน้า Profile Menu (bottom nav Profile tab)
 *
 * Elements ยืนยันจาก wdio-mcp live inspection (2026-03-12, app v3.0.0 build 19):
 *   View Profile button: resource-id "profile_view_profile_button"
 *   Menu items: resource-id pattern "app_menu_*" — reliable, doesn't change with locale
 *
 * Sections:
 *   Account and Wallet: manage_wallet, identity_verification, account_connection
 *   General: bank_account, withdrawal_address, appearances, languages
 *   Privacy and Security: update_consent, security
 */
export class ProfileMenuScreen extends BaseScreen {
  // ── Header ────────────────────────────────────────────────────────────────────

  /** "View Profile" button — navigates to Profile Information screen */
  get viewProfileButton() {
    return this.byResourceId('profile_view_profile_button');
  }

  // ── Account and Wallet ────────────────────────────────────────────────────────

  get manageWallet() {
    return this.byResourceId('app_menu_manage_wallet');
  }

  get identityVerification() {
    return this.byResourceId('app_menu_identity_verification');
  }

  get accountConnection() {
    return this.byResourceId('app_menu_account_connection');
  }

  // ── General ───────────────────────────────────────────────────────────────────

  get bankAccount() {
    return this.byResourceId('app_menu_bank_account');
  }

  get withdrawalAddress() {
    return this.byResourceId('app_menu_withdrawal_address');
  }

  get appearances() {
    return this.byResourceId('app_menu_appearances');
  }

  get languages() {
    return this.byResourceId('app_menu_languages');
  }

  // ── Privacy and Security ──────────────────────────────────────────────────────

  get updateConsent() {
    return this.byResourceId('app_menu_update_consent');
  }

  get security() {
    return this.byResourceId('app_menu_security');
  }

  // ── Screen detection ──────────────────────────────────────────────────────────

  async isOnProfileMenuScreen(): Promise<boolean> {
    try {
      // Use getPageSource() — same strategy as detectScreen() / isOnWalletScreen().
      // Not affected by UiAutomator2 "displayed" reporting degradation after heavy usage.
      const source = await safeGetPageSource();
      return source.includes('profile_view_profile_button');
    } catch {
      return false;
    }
  }
}
