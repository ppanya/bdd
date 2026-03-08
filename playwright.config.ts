import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  // รวม fixtures/index.ts ใน steps เพื่อให้ playwright-bdd รู้จัก custom test instance
  steps: ['steps/**/*.ts', 'fixtures/index.ts'],
});

export default defineConfig({
  testDir,

  // BDD scenarios มักมี dependency กัน (เช่น login ก่อนแล้วค่อย assert)
  // ปิด parallel ไว้ก่อน — เปิดได้เมื่อ scenarios เป็น independent จริง ๆ
  fullyParallel: false,

  // retry 1 ครั้งใน CI เพื่อลด flaky test noise
  retries: process.env.CI ? 1 : 0,

  // timeout ต่อ 1 test (ms)
  timeout: 30_000,

  reporter: [
    ['list'], // แสดงผลใน terminal แบบ real-time
    ['html', { open: 'never' }], // สร้าง HTML report ที่ playwright-report/
  ],

  use: {
    baseURL: process.env.BASE_URL ?? 'https://the-internet.herokuapp.com',
    browserName: 'chromium',
    screenshot: 'only-on-failure', // ถ่าย screenshot เฉพาะตอน fail
    trace: 'retain-on-failure', // เก็บ trace เฉพาะตอน fail (เปิดดูด้วย `playwright show-trace`)
  },
});
