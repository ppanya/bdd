/**
 * fixtures/index.ts — WDIO + Cucumber World
 *
 * แทน playwright-bdd fixtures ด้วย Cucumber World class
 * ทุก scenario จะได้ instance ใหม่ของ AppWorld โดยอัตโนมัติ
 *
 * Step files ใช้ `this` เพื่อเข้าถึง world:
 *   Given('step', async function(this: AppWorld) { this.lastResponse ... })
 *
 * Mobile hooks live in fixtures/mobile.hooks.ts (loaded after this file).
 */

import {
  setWorldConstructor,
  World,
  Before,
  After,
  BeforeStep,
  AfterStep,
  setDefaultTimeout,
} from '@cucumber/cucumber';
import type { IWorldOptions } from '@cucumber/cucumber';
import allureReporter from '@wdio/allure-reporter';
import logger from '../support/logger.ts';

// ── World type ────────────────────────────────────────────────────────────────

export class AppWorld extends World {
  /** Response ล่าสุดจาก API call — reset ทุก scenario */
  lastResponse: Response | null = null;

  /**
   * preferCode: ส่ง header `Prefer: code=XXX` ไปยัง Prism mock
   * เพื่อบังคับให้ return status code ที่ต้องการ
   * Set ด้วย step "Given ทดสอบ error case ด้วย status {int}"
   */
  preferCode: number | null = null;

  constructor(options: IWorldOptions) {
    super(options);
  }

  /** Reset world state — ใช้ใน Before hook */
  reset() {
    this.lastResponse = null;
    this.preferCode = null;
  }
}

setWorldConstructor(AppWorld);

// ── Hooks ─────────────────────────────────────────────────────────────────────

setDefaultTimeout(60_000);

Before(async function (this: AppWorld) {
  this.reset();
});

// ── Monday.com → Allure link ──────────────────────────────────────────────────
// @monday=BOARD_ID/ITEM_ID tag → clickable link in Allure report
Before(async function (this: AppWorld, { pickle }) {
  const mondayBase = process.env['MONDAY_BASE_URL'];
  if (!mondayBase) return;
  for (const tag of pickle.tags) {
    const match = tag.name.match(/^@monday=(\d+)\/(\d+)$/);
    if (match) {
      const url = `${mondayBase}/boards/${match[1]}/pulses/${match[2]}`;
      await allureReporter.addLink(url, 'Monday Card', 'tms');
    }
  }
});

// ── Step progress logger ───────────────────────────────────────────────────────
// BeforeStep: พิมพ์ชื่อ step พร้อม ⏳ (ไม่ขึ้นบรรทัดใหม่)
// AfterStep:  ใช้ \r overwrite บรรทัดเดิม → แสดงผลบรรทัดเดียวต่อ step + duration
BeforeStep(function ({ pickleStep }) {
  process.stdout.write(`    ⏳ ${pickleStep.text}`);
});

AfterStep(function ({ pickleStep, result }) {
  const icon =
    result?.status === 'PASSED'
      ? '✅'
      : result?.status === 'FAILED'
        ? '❌'
        : result?.status === 'SKIPPED'
          ? '⏭️'
          : '❓';
  const secs = ((result?.duration?.seconds ?? 0) + (result?.duration?.nanos ?? 0) / 1e9).toFixed(1);
  process.stdout.write(`\r    ${icon} ${pickleStep.text} (${secs}s)\n`);
});

After(async function (this: AppWorld, scenario) {
  // ถ่าย screenshot ทุก scenario บน mobile — ให้ visual proof ใน Allure ทั้ง pass และ fail
  // Web: ถ่ายเฉพาะ fail (video reporter ดูแล pass อยู่แล้ว)
  const isMobile = !!process.env['MOBILE_PLATFORM'];
  const shouldCapture = isMobile || scenario.result?.status === 'FAILED';
  const sessionId: string | undefined =
    typeof browser !== 'undefined' ? browser.sessionId : undefined;
  if (shouldCapture && sessionId) {
    try {
      const screenshot = await browser.takeScreenshot();
      void this.attach(screenshot, 'image/png');
    } catch (err) {
      // session อาจถูกปิดไปก่อน (เช่น app crash, AVD timeout) — ไม่ต้อง throw
      logger.warn('[After hook] screenshot skipped', { error: (err as Error).message });
    }
  }
});
