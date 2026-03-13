import { BaseScreen, TIMEOUTS } from './base.screen.ts';

/**
 * WalletScreen — หน้า Wallet (bottom nav tab)
 *
 * Elements ยืนยันจาก wdio-mcp live inspection (2026-03-12, app v3.0.0 build 19):
 *   Top tabs: Crypto / Crypto (Classic) / THBK — content-desc "Name\nTab N of 3"
 *   Wallet name: "Crypto Wallet" — accessibilityId
 *   Network filter: "All Network" — accessibilityId (ImageView)
 *   Sub-tabs: Token / NFTs / Point — accessibilityId (content-desc only)
 *   Est. Total Value: accessibilityId
 *   Quick actions: Transfer / Receive / History — accessibilityId (ImageView)
 *   Token rows: compound content-desc "Name\nSYMBOL\n***\n฿***" — byDesc(Name\nSYMBOL)
 *   Bottom nav: navigation_menu_* resource-ids (shared with HomeScreen)
 */
export class WalletScreen extends BaseScreen {
  // ── Top wallet type tabs ──────────────────────────────────────────────────────

  get cryptoTab() {
    return this.byDesc('Crypto\nTab 1 of 3');
  }

  get cryptoClassicTab() {
    return this.byDesc('Crypto (Classic)\nTab 2 of 3');
  }

  get thbkTab() {
    return this.byDesc('THBK\nTab 3 of 3');
  }

  // ── Wallet selector ───────────────────────────────────────────────────────────

  get walletName() {
    return this.byId('Crypto Wallet');
  }

  get networkFilter() {
    return this.byId('All Network');
  }

  // ── Asset sub-tabs ────────────────────────────────────────────────────────────

  get tokenTab() {
    return this.byId('Token');
  }

  get nftsTab() {
    return this.byId('NFTs');
  }

  get pointTab() {
    return this.byId('Point');
  }

  // ── Summary card ──────────────────────────────────────────────────────────────

  get estTotalValue() {
    return this.byId('Est. Total Value');
  }

  // ── Quick action buttons ──────────────────────────────────────────────────────

  get transferButton() {
    return this.byId('Transfer');
  }

  get receiveButton() {
    return this.byId('Receive');
  }

  get historyButton() {
    return this.byId('History');
  }

  // ── Token list (dynamic) ──────────────────────────────────────────────────────

  /**
   * ดึง row ของ token โดยใช้ชื่อ symbol (เช่น "BTC", "ETH")
   * content-desc format: "Name\nSYMBOL\n***\n฿***"
   */
  tokenRow(symbol: string) {
    return this.byDesc(symbol);
  }

  // ── Bottom navigation (shared with HomeScreen) ────────────────────────────────

  get homeTab() {
    return this.byResourceId('navigation_menu_home');
  }

  get walletTab() {
    return this.byResourceId('navigation_menu_wallet');
  }

  get scanTab() {
    return this.byResourceId('navigation_menu_scan');
  }

  get dappTab() {
    return this.byResourceId('navigation_menu_dapp');
  }

  get profileTab() {
    return this.byResourceId('navigation_menu_profile');
  }

  // ── Screen detection ──────────────────────────────────────────────────────────

  async isOnWalletScreen(): Promise<boolean> {
    try {
      // Use getPageSource() — not affected by UiAutomator2 "displayed" degradation.
      // Check TWO signals to handle Wallet screen periodic data refresh:
      //   1. 'Crypto Wallet'        — primary signal (wallet name label)
      //   2. 'navigation_menu_home' — fallback: bottom nav is present even when wallet
      //      data is reloading and 'Crypto Wallet' is temporarily absent from the tree.
      //      Present on ALL main-tab screens (home/wallet/scan/dapp/profile).
      const source = await driver.getPageSource();
      return source.includes('Crypto Wallet') || source.includes('navigation_menu_home');
    } catch {
      return false;
    }
  }
}
