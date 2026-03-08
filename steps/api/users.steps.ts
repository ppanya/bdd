import { Given, When, Then } from '../../fixtures';
import { ApiClient } from '../../support/api/client';

// ── Helpers ──────────────────────────────────────────────────────────────────

// สร้าง Prefer header สำหรับ Prism mock
// เมื่อ API เป็น real server ไม่มีผลอะไร — server จะ ignore header ที่ไม่รู้จัก
function prismPrefer(code: number | null): Record<string, string> | undefined {
  return code ? { Prefer: `code=${code}` } : undefined;
}

// ── Given ─────────────────────────────────────────────────────────────────────

// ใช้เมื่อต้องการทดสอบ error case กับ Prism mock
// Prism ต้องการ Prefer header เพื่อรู้ว่าควร return status code ไหน
// (real API ไม่ต้องใช้ step นี้ — server จะ return error ตาม logic จริงได้เลย)
Given('ทดสอบ error case ด้วย status {int}', async ({ world }, code: number) => {
  world.preferCode = code;
});

// ── When ──────────────────────────────────────────────────────────────────────

When('ฉันเรียก GET {string}', async ({ apiContext, world }, path: string) => {
  const api = new ApiClient(apiContext);
  world.lastResponse = await api.get(path, prismPrefer(world.preferCode));
  world.preferCode = null;
});

When('ฉันเรียก POST {string} ด้วย:', async ({ apiContext, world }, path: string, table) => {
  const api = new ApiClient(apiContext);
  const [body] = table.hashes() as Record<string, string>[];
  world.lastResponse = await api.post(path, body, prismPrefer(world.preferCode));
  world.preferCode = null;
});

// ── Then ──────────────────────────────────────────────────────────────────────

Then('status code ควรเป็น {int}', async ({ world }, status: number) => {
  if (!world.lastResponse)
    throw new Error('ยังไม่มี response — ต้องเรียก API ก่อน (When ฉันเรียก...)');
  const actual = world.lastResponse.status();
  if (actual !== status) throw new Error(`Expected status ${status} but got ${actual}`);
});

Then('response ควรเป็น array', async ({ world }) => {
  if (!world.lastResponse) throw new Error('ยังไม่มี response');
  const body = await world.lastResponse.json();
  if (!Array.isArray(body)) throw new Error('Expected response to be an array');
});

Then('response ควรมี field {string}', async ({ world }, field: string) => {
  if (!world.lastResponse) throw new Error('ยังไม่มี response');
  const body = (await world.lastResponse.json()) as Record<string, unknown>;
  if (!(field in body)) throw new Error(`Expected response to have field "${field}"`);
});
