import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../../fixtures/index.ts';
import { LoginPage } from '../../pages/login.page.ts';

Given('ฉันอยู่ที่หน้า Login', async function (this: AppWorld) {
  await browser.url('/login');
});

When('ฉันกรอกชื่อผู้ใช้ว่า {string}', async function (this: AppWorld, username: string) {
  const loginPage = new LoginPage();
  await loginPage.fillUsername(username);
});

When('ฉันกรอกรหัสผ่านว่า {string}', async function (this: AppWorld, password: string) {
  const loginPage = new LoginPage();
  await loginPage.fillPassword(password);
});

When('ฉันกดปุ่ม {string}', async function (this: AppWorld, buttonName: string) {
  // ใช้ partial text (*=) แทน exact match (=) เพราะ button text อาจมี whitespace
  await $(`button*=${buttonName}`).click();
});

Then('ฉันควรจะเห็นข้อความเตือนว่า {string}', async function (this: AppWorld, message: string) {
  const el = await $(`*=${message}`);
  await el.waitForDisplayed({ timeout: 10_000 });
});
