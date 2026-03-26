import { BaseScreen, TIMEOUTS } from './base.screen.ts';

export class HomeScreen extends BaseScreen {
  // ── Bottom navigation ────────────────────────────────────────────────────────
  // resource-id ยืนยันจาก Appium Inspector (live APK):
  //   content-desc = "navigation_menu_xxx\nLabel"  +  resource-id = "navigation_menu_xxx"
  // ใช้ byResourceId เพื่อความแม่นยำ (ไม่ขึ้นกับ label text)

  get walletTab() {
    return this.byResourceId('navigation_menu_wallet');
  }

  get homeTab() {
    return this.byResourceId('navigation_menu_home');
  }

  get dappTab() {
    return this.byResourceId('navigation_menu_dapp');
  }

  get profileTab() {
    return this.byResourceId('navigation_menu_profile');
  }

  get scanTab() {
    return this.byResourceId('navigation_menu_scan');
  }

  async isOnHomeScreen(): Promise<boolean> {
    try {
      await this.waitForIdle();
      await this.waitForElement(this.homeTab, TIMEOUTS.nav);
      return true;
    } catch {
      return false;
    }
  }

  async tapWallet() {
    const el = await this.waitForElement(this.walletTab);
    await this.tap(el);
  }

  async tapHome() {
    const el = await this.waitForElement(this.homeTab);
    await this.tap(el);
  }
}
