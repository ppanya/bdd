import { BaseScreen, TIMEOUTS } from './base.screen.ts';

/**
 * HistoryScreen — หน้า Crypto History (wallet transaction history)
 *
 * Elements ยืนยันจาก wdio-mcp live inspection (2026-03-12, app v3.0.0 build 19):
 *   Title: "Crypto History" — accessibilityId
 *   Tabs: Token / NFT / Point — content-desc "Name\nTab N of 3"
 *   Wallet filter: "Wallet 1" — accessibilityId
 *   Network filter: "All Networks" — accessibilityId
 *   Transaction rows: compound content-desc "Type\nAmount\nAddress\nDate"
 *   No resource-ids on this screen — use byId / byDesc
 */
export class HistoryScreen extends BaseScreen {
  // ── Screen title ──────────────────────────────────────────────────────────────

  get title() {
    return this.byId('Crypto History');
  }

  // ── History type tabs ─────────────────────────────────────────────────────────

  get tokenTab() {
    return this.byDesc('Token\nTab 1 of 3');
  }

  get nftTab() {
    return this.byDesc('NFT\nTab 2 of 3');
  }

  get pointTab() {
    return this.byDesc('Point\nTab 3 of 3');
  }

  // ── Filters ───────────────────────────────────────────────────────────────────

  get walletFilter() {
    return this.byId('Wallet 1');
  }

  get networkFilter() {
    return this.byId('All Networks');
  }

  // ── Transaction rows (dynamic) ────────────────────────────────────────────────

  /**
   * ค้นหา transaction row โดย type: "Receive" หรือ "Transfer"
   * content-desc format: "Type\nAmount\nAddress\nDate"
   * ใช้ byDesc(type) เพื่อ match แบบ partial
   */
  transactionByType(type: 'Receive' | 'Transfer') {
    return this.byDesc(type);
  }

  // ── Screen detection ──────────────────────────────────────────────────────────

  async isOnHistoryScreen(): Promise<boolean> {
    try {
      await this.waitForIdle();
      await this.waitForElement(this.title, TIMEOUTS.nav);
      return true;
    } catch {
      return false;
    }
  }
}
