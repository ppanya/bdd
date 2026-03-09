/**
 * fixtures/index.ts — WDIO + Cucumber World
 *
 * แทน playwright-bdd fixtures ด้วย Cucumber World class
 * ทุก scenario จะได้ instance ใหม่ของ AppWorld โดยอัตโนมัติ
 *
 * Step files ใช้ `this` เพื่อเข้าถึง world:
 *   Given('step', async function(this: AppWorld) { this.lastResponse ... })
 */

import { setWorldConstructor, World, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import type { IWorldOptions } from '@cucumber/cucumber';

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

After(async function (this: AppWorld, scenario) {
  // ถ่าย screenshot เมื่อ test fail (web suite เท่านั้น — browser global available)
  if (scenario.result?.status === 'FAILED') {
    try {
      const screenshot = await browser.takeScreenshot();
      await this.attach(screenshot, 'image/png');
    } catch {
      // browser อาจไม่ถูกเปิด (เช่น API suite) — ไม่ต้อง throw
    }
  }
});
