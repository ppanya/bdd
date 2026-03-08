import { test as base, createBdd } from 'playwright-bdd';
import { request } from '@playwright/test';
import type { APIResponse } from '@playwright/test';

/**
 * AppFixtures — custom fixtures ที่ใช้ร่วมกันทุก step file
 *
 * apiContext : Playwright APIRequestContext พร้อม baseURL + headers
 * world      : object สำหรับเก็บ state ระหว่าง steps ของ scenario เดียวกัน
 *              (เหมือน "World" ใน Cucumber) — ปลอดภัยกว่า module-level variable
 *              เพราะ Playwright สร้าง instance ใหม่ให้ทุก scenario อัตโนมัติ
 */
export type AppFixtures = {
  apiContext: Awaited<ReturnType<typeof request.newContext>>;
  world: {
    lastResponse: APIResponse | null;
    // preferCode: ใช้กับ Prism mock เพื่อบังคับให้ return status code ที่ต้องการ
    // ตั้งค่าด้วย step "Given ทดสอบ error case ด้วย status {int}"
    preferCode: number | null;
  };
};

export const test = base.extend<AppFixtures>({
  apiContext: async ({}, use) => {
    const context = await request.newContext({
      baseURL: process.env.API_BASE_URL ?? 'http://localhost:4010',
      extraHTTPHeaders: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    await use(context);
    await context.dispose();
  },

  world: async ({}, use) => {
    // สร้างใหม่ทุก scenario — ไม่มี shared state ระหว่าง scenarios
    await use({ lastResponse: null, preferCode: null });
  },
});

// step files ทั้งหมด import Given/When/Then จากที่นี่ที่เดียว
export const { Given, When, Then } = createBdd(test);
