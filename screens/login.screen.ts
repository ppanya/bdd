import { BaseScreen } from './base.screen.ts';

/**
 * LoginScreen — หน้า Login ของแอป KUB Wallet
 *
 * App เปิดมาแสดง Phone login เป็น default
 * ต้อง tap switch_to_email_button ก่อนถึงจะกรอก email/password ได้
 *
 * Element IDs จาก Appium Inspector (Flutter Semantics):
 *   Phone tab:   login_phone_input, login_submit_button, switch_to_email_button
 *   Email tab:   login_email_input, login_password_input, login_submit_button,
 *                switch_to_phone_button, forgot_password_button
 *   Social:      social_auth_with_google_button (facebook button removed from APK)
 *   Register:    login_nav_register_button
 *
 * Button state:
 *   ใช้ getAttribute('clickable') ไม่ใช่ isEnabled() เพราะ Flutter elements
 *   มี enabled=true เสมอ แต่ clickable=false เมื่อยังไม่พร้อม (แสดงเป็นสีเทา)
 */
export class LoginScreen extends BaseScreen {
  // ── Phone login ──────────────────────────────────────────────────────────────

  get phoneInput() {
    return this.byResourceId('login_phone_input');
  }

  get countryCodeSelector() {
    return this.byResourceId('country_code_selector');
  }

  get switchToEmailButton() {
    return this.byResourceId('switch_to_email_button');
  }

  // ── Email login ───────────────────────────────────────────────────────────────

  get emailInput() {
    return this.byResourceId('login_email_input');
  }

  get passwordInput() {
    return this.byResourceId('login_password_input');
  }

  get loginButton() {
    return this.byResourceId('login_submit_button');
  }

  get forgotPasswordButton() {
    return this.byResourceId('forgot_password_button');
  }

  get switchToPhoneButton() {
    return this.byResourceId('switch_to_phone_button');
  }

  // ── Social auth ───────────────────────────────────────────────────────────────
  // Verified from live APK (2026-03-12):
  //   Phone view: switch_to_email_button + social_auth_with_google_button
  //   Email view: switch_to_phone_button + social_auth_with_google_button
  //   Facebook button (social_auth_with_facebook_button) no longer exists in the APK

  get googleAuthButton() {
    return this.byResourceId('social_auth_with_google_button');
  }

  get registerButton() {
    return this.byResourceId('login_nav_register_button');
  }

  // ── Actions ───────────────────────────────────────────────────────────────────

  async isOnLoginScreen(): Promise<boolean> {
    try {
      return await this.isDisplayed(this.switchToEmailButton);
    } catch {
      return false;
    }
  }

  async switchToEmailLogin() {
    const el = await this.waitForElement(this.switchToEmailButton);
    await this.tap(el);
    await this.waitForIdle();  // Flutter view transition is async
    // goTo('Login') reuses Flutter widget — TextEditingController retains values.
    // Clear so @email-disable always starts with empty fields. No-op if already empty.
    await this.emailInput.clearValue().catch(() => {});
    await this.passwordInput.clearValue().catch(() => {});
  }

  async fillPhone(phone: string) {
    const el = await this.waitForElement(this.phoneInput);
    await this.setText(el, phone);
  }

  async switchToPhoneLogin() {
    const el = await this.waitForElement(this.switchToPhoneButton);
    await this.tap(el);
  }

  async fillEmail(email: string) {
    const el = await this.waitForElement(this.emailInput);
    await this.setText(el, email);
  }

  async fillPassword(password: string) {
    const el = await this.waitForElement(this.passwordInput);
    await this.setText(el, password);
  }

  async tapLogin() {
    // waitForClickable รอ displayed ก่อน แล้วค่อย poll clickable=true
    await this.waitForClickable(this.loginButton);
    await this.loginButton.click();
  }

  /**
   * ตรวจสอบว่าปุ่ม Log in สามารถกดได้หรือไม่
   * ใช้ getAttribute('clickable') เพราะ Flutter ไม่ใช้ enabled attribute มาตรฐาน
   * clickable="true"  → ปุ่มสีเขียว พร้อมใช้งาน
   * clickable="false" → ปุ่มสีเทา ยังกรอกข้อมูลไม่ครบ
   */
  async isLoginButtonClickable(): Promise<boolean> {
    const clickable = await this.loginButton.getAttribute('clickable');
    return clickable === 'true';
  }
}
