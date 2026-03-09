import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../../fixtures/index.ts';
import { LoginScreen } from '../../screens/login.screen.ts';

const screen = new LoginScreen();

Given('ฉันอยู่ที่หน้า Login ของแอป', async function (this: AppWorld) {
  // รอให้แอปเปิดและ login screen พร้อม
  await screen.waitForElement(screen.loginButton);
});

When('ฉันกรอกชื่อผู้ใช้บนมือถือว่า {string}', async function (this: AppWorld, username: string) {
  await screen.fillUsername(username);
});

When('ฉันกรอกรหัสผ่านบนมือถือว่า {string}', async function (this: AppWorld, password: string) {
  await screen.fillPassword(password);
});

When('ฉันกดปุ่ม Login บนมือถือ', async function (this: AppWorld) {
  await screen.tapLogin();
});

Then('ฉันควรจะเห็นข้อความ error ว่า {string}', async function (this: AppWorld, message: string) {
  const actual = await screen.getErrorMessage();
  if (!actual.includes(message)) {
    throw new Error(`Expected error "${message}" but got "${actual}"`);
  }
});

Then('ฉันควรจะเห็นหน้าหลักของแอป', async function (this: AppWorld) {
  const displayed = await screen.isWelcomeDisplayed();
  if (!displayed) {
    throw new Error('คาดว่าจะเห็นหน้าหลักของแอป แต่ไม่พบ welcome element');
  }
});

Then('ปุ่ม Login ควร disabled อยู่', async function (this: AppWorld) {
  const btn = await screen.waitForElement(screen.loginButton);
  const enabled = await btn.isEnabled();
  if (enabled) {
    throw new Error('คาดว่าปุ่ม Login จะ disabled แต่กลับ enabled');
  }
});
