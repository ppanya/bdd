import { BaseScreen } from './base.screen.ts';

/**
 * LoginScreen — ใช้ Semantics identifier ผ่าน UIAutomator2/XCUITest
 * Flutter app ต้องมี Semantics(identifier: '...') ครอบแต่ละ widget
 */
export class LoginScreen extends BaseScreen {
  get usernameField() {
    return this.byId('login_username_field');
  }

  get passwordField() {
    return this.byId('login_password_field');
  }

  get loginButton() {
    return this.byId('login_submit_button');
  }

  get errorMessage() {
    return this.byId('login_error_message');
  }

  get welcomeText() {
    return this.byId('home_welcome_text');
  }

  async fillUsername(username: string) {
    const el = await this.waitForElement(this.usernameField);
    await this.setText(el, username);
  }

  async fillPassword(password: string) {
    const el = await this.waitForElement(this.passwordField);
    await this.setText(el, password);
  }

  async tapLogin() {
    const el = await this.waitForElement(this.loginButton);
    await this.tap(el);
  }

  async getErrorMessage(): Promise<string> {
    const el = await this.waitForElement(this.errorMessage);
    return this.getText(el);
  }

  async isWelcomeDisplayed(): Promise<boolean> {
    return this.isDisplayed(this.welcomeText);
  }
}
