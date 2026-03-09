import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import type { AppWorld } from '../../fixtures/index.ts';
import { BaseAPI } from '../../support/api/base-api.ts';

// ── Helpers ──────────────────────────────────────────────────────────────────

function prismPrefer(code: number | null): Record<string, string> | undefined {
  return code ? { Prefer: `code=${code}` } : undefined;
}

// ── Given ─────────────────────────────────────────────────────────────────────

Given('ทดสอบ error case ด้วย status {int}', async function (this: AppWorld, code: number) {
  this.preferCode = code;
});

// ── When ──────────────────────────────────────────────────────────────────────

When('ฉันเรียก GET {string}', async function (this: AppWorld, path: string) {
  const api = new BaseAPI(process.env['API_BASE_URL'] ?? 'http://localhost:4010');
  this.lastResponse = await api.get(path, prismPrefer(this.preferCode));
  this.preferCode = null;
});

When('ฉันเรียก POST {string} ด้วย:', async function (this: AppWorld, path: string, table: DataTable) {
  const api = new BaseAPI(process.env['API_BASE_URL'] ?? 'http://localhost:4010');
  const [body] = table.hashes() as Record<string, string>[];
  this.lastResponse = await api.post(path, body, prismPrefer(this.preferCode));
  this.preferCode = null;
});

// ── Then ──────────────────────────────────────────────────────────────────────

Then('status code ควรเป็น {int}', async function (this: AppWorld, status: number) {
  if (!this.lastResponse)
    throw new Error('ยังไม่มี response — ต้องเรียก API ก่อน (When ฉันเรียก...)');
  const actual = this.lastResponse.status;
  if (actual !== status) throw new Error(`Expected status ${status} but got ${actual}`);
});

Then('response ควรเป็น array', async function (this: AppWorld) {
  if (!this.lastResponse) throw new Error('ยังไม่มี response');
  const body: unknown = await this.lastResponse.json();
  if (!Array.isArray(body)) throw new Error('Expected response to be an array');
});

Then('response ควรมี field {string}', async function (this: AppWorld, field: string) {
  if (!this.lastResponse) throw new Error('ยังไม่มี response');
  const body = (await this.lastResponse.json()) as Record<string, unknown>;
  if (!(field in body)) throw new Error(`Expected response to have field "${field}"`);
});
