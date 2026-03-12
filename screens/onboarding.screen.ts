import { BaseScreen } from './base.screen.ts';

/**
 * OnboardingScreen — หน้าต้อนรับที่แสดงเมื่อเปิดแอปครั้งแรก (หลัง clear app data)
 *
 * Elements:
 *   i_already_have_account_button  →  "I already have an account" (ไปหน้า Login)
 *   create_a_new_account_button    →  "Create a new account" (ไปหน้าสมัครสมาชิก)
 */
export class OnboardingScreen extends BaseScreen {
  /**
   * Flutter-rendered buttons with resource-id from Appium Inspector
   * i_already_have_account_button  →  resource-id (more reliable)
   * create_a_new_account_button    →  resource-id (more reliable)
   */
  get loginButton() {
    return this.byResourceId('i_already_have_account_button');
  }

  get createAccountButton() {
    return this.byResourceId('create_a_new_account_button');
  }

  async isOnOnboardingScreen(): Promise<boolean> {
    try {
      return await this.isDisplayed(this.loginButton);
    } catch {
      return false;
    }
  }

  async tapLogin() {
    const el = await this.waitForElement(this.loginButton);
    await this.tap(el);
  }

  async tapCreateAccount() {
    const el = await this.waitForElement(this.createAccountButton);
    await this.tap(el);
  }
}
