/**
 * LoginPage — WDIO Page Object
 * ใช้ getter แทน constructor assignment เพื่อ lazy-resolve element ทุกครั้งที่ใช้
 */
export class LoginPage {
  get usernameInput() {
    return $('#username');
  }

  get passwordInput() {
    return $('#password');
  }

  async fillUsername(username: string) {
    await this.usernameInput.setValue(username);
  }

  async fillPassword(password: string) {
    await this.passwordInput.setValue(password);
  }
}
