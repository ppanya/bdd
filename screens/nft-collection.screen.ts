import { BaseScreen, TIMEOUTS } from './base.screen.ts';

/**
 * NftCollectionScreen — หน้า NFT Collections
 *
 * Elements ยืนยันจาก wdio-mcp live inspection (2026-03-12, app v3.0.0 build 19):
 *   Title: "Collections" — accessibilityId
 *   Wallet address: dynamic content-desc (hex address) — shown below title
 *   NFT list: empty in mock APK — use title as screen detection anchor
 */
export class NftCollectionScreen extends BaseScreen {
  // ── Screen title ──────────────────────────────────────────────────────────────

  get title() {
    return this.byId('Collections');
  }

  // ── Screen detection ──────────────────────────────────────────────────────────

  async isOnNftCollectionScreen(): Promise<boolean> {
    try {
      await this.waitForIdle();
      await this.waitForElement(this.title, TIMEOUTS.nav);
      return true;
    } catch {
      return false;
    }
  }
}
