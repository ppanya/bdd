import { BaseScreen, TIMEOUTS } from './base.screen.ts';

/**
 * PdpaScreen — หน้า PDPA Consent ที่แสดงหลัง login ครั้งแรก
 *
 * Elements ยืนยันจาก Appium Inspector (live APK):
 *   "Manage PDPA Consent"                          → title / header (android.view.View)
 *   "I consent to the processing of all my personal data" → checkbox label (android.view.View)
 *   android.view.View   content-desc="Accept"      → radio buttons (1 ต่อ consent item)
 *   android.view.View   content-desc="Reject"      → radio button Reject
 *   android.widget.Button content-desc="Accept"    → ปุ่มสีเขียวด้านล่าง (confirm button)
 *
 * การยอมรับ: tap android.widget.Button[@content-desc="Accept"]
 * ใช้ xpath เพราะแยก class จาก radio button (android.view.View) ได้ชัดเจน
 */
export class PdpaScreen extends BaseScreen {
  get title() {
    return this.byDesc('Manage PDPA Consent');
  }

  get consentCheckbox() {
    // resource-id verified from live APK (2026-03-12): consent_pdpa_accept_all
    return this.byResourceId('consent_pdpa_accept_all');
  }

  get rejectButton() {
    return this.byDesc('Reject');
  }

  /**
   * ปุ่ม Accept สีเขียวด้านล่าง — resourceId: pdpa_consent_confirm_button
   * accessibilityId = "pdpa_consent_confirm_button\nAccept" (compound)
   *
   * ⚠️ เดิมใช้ xpath //android.widget.Button[@content-desc="Accept"] แต่ใช้ไม่ได้แล้ว
   *    เพราะ content-desc เป็น compound "pdpa_consent_confirm_button\nAccept" ไม่ใช่ "Accept" อย่างเดียว
   *    Verified from live APK (2026-03-12)
   */
  get acceptConfirmButton() {
    return this.byResourceId('pdpa_consent_confirm_button');
  }

  async isOnPdpaScreen(): Promise<boolean> {
    try {
      // waitForIdle รอให้ navigation transition เสร็จก่อน ลด false-negative จาก timing
      await this.waitForIdle();
      await this.waitForElement(this.title, TIMEOUTS.nav);
      return true;
    } catch {
      return false;
    }
  }

  async acceptPdpa() {
    await this.waitForElement(this.title, TIMEOUTS.nav);
    await this.waitForElement(this.acceptConfirmButton);
    await this.acceptConfirmButton.click();
  }

  async rejectPdpa() {
    const el = await this.waitForElement(this.rejectButton);
    await this.tap(el);
  }
}
