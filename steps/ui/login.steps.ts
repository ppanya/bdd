import { Given, When, Then } from '../../fixtures';
import { LoginPage } from '../../pages/login.page';

Given('ฉันอยู่ที่หน้า Login', async ({ page }) => {
  await page.goto('/login');
});

When('ฉันกรอกชื่อผู้ใช้ว่า {string}', async ({ page }, username: string) => {
  const loginPage = new LoginPage(page);
  await loginPage.fillUsername(username);
});

When('ฉันกรอกรหัสผ่านว่า {string}', async ({ page }, password: string) => {
  const loginPage = new LoginPage(page);
  await loginPage.fillPassword(password);
});

When('ฉันกดปุ่ม {string}', async ({ page }, buttonName: string) => {
  await page.getByRole('button', { name: buttonName }).click();
});

Then('ฉันควรจะเห็นข้อความเตือนว่า {string}', async ({ page }, message: string) => {
  await page.getByText(message).waitFor();
});
