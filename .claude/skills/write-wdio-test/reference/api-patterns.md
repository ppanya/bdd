# API Patterns — WDIO + Cucumber + BaseAPI

Reference for implementing API test code in this project.

---

## BaseAPI Usage

`BaseAPI` wraps global `fetch` — no browser session required. API tests run entirely without launching a browser.

```typescript
import { BaseAPI } from '../../support/api/base-api.ts';

const api = new BaseAPI(process.env['API_BASE_URL'] ?? 'http://localhost:4010');

// GET
const res = await api.get('/api/users');

// GET with extra headers
const res = await api.get('/api/users', { Authorization: 'Bearer token' });

// POST
const res = await api.post('/api/users', { username: 'alice', email: 'alice@example.com' });

// POST with Prism Prefer header (error simulation)
const res = await api.post('/api/users', body, { Prefer: 'code=400' });

// PUT / PATCH / DELETE
const res = await api.put('/api/users/1', { username: 'bob' });
const res = await api.patch('/api/users/1', { email: 'bob@example.com' });
const res = await api.delete('/api/users/1');
```

**Constructor signature:**
```typescript
new BaseAPI(baseURL: string, defaultHeaders?: Record<string, string>)
// Default headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
```

---

## AppWorld State

`AppWorld` (defined in `fixtures/index.ts`) holds per-scenario state that resets automatically via the `Before` hook.

```typescript
export class AppWorld extends World {
  lastResponse: Response | null = null;  // the most recent API response
  preferCode: number | null = null;      // Prism error simulation code
}
```

Access via `this` in step functions:

```typescript
Given('some step', async function (this: AppWorld) {
  this.lastResponse;  // Response | null
  this.preferCode;    // number | null
});
```

---

## Prism Error Simulation

Prism mock server reads the `Prefer: code=XXX` request header to return a specific HTTP status code. The `prismPrefer` helper converts `preferCode` into the header object.

```typescript
function prismPrefer(code: number | null): Record<string, string> | undefined {
  return code ? { Prefer: `code=${code}` } : undefined;
}
```

Usage pattern — set `preferCode` in a `Given` step, consume it in the `When` step, then **always reset to `null`** after consuming:

```typescript
Given('ทดสอบ error case ด้วย status {int}', async function (this: AppWorld, code: number) {
  this.preferCode = code;
});

When('ฉันเรียก GET {string}', async function (this: AppWorld, path: string) {
  const api = new BaseAPI(process.env['API_BASE_URL'] ?? 'http://localhost:4010');
  this.lastResponse = await api.get(path, prismPrefer(this.preferCode));
  this.preferCode = null;  // ALWAYS reset after consuming
});
```

`preferCode` resets to `null` in `AppWorld.reset()` between scenarios, but resetting immediately after use prevents accidental leakage if a scenario has multiple API calls.

---

## Reusable Thai Step Patterns

These steps are defined in `steps/api/users.steps.ts` and are globally available to all API scenarios. **Do not re-define them.**

```gherkin
# Set Prefer header for Prism error simulation
Given ทดสอบ error case ด้วย status {int}

# HTTP calls
When ฉันเรียก GET {string}
When ฉันเรียก POST {string} ด้วย:
  | field1 | field2 |
  | value1 | value2 |

# Assertions
Then status code ควรเป็น {int}
Then response ควรเป็น array
Then response ควรมี field {string}
```

When adding PUT/PATCH/DELETE support, follow the same Thai naming convention:

```typescript
When('ฉันเรียก PUT {string} ด้วย:', async function (this: AppWorld, path: string, table: DataTable) {
  const api = new BaseAPI(process.env['API_BASE_URL'] ?? 'http://localhost:4010');
  const [body] = table.hashes() as Record<string, string>[];
  this.lastResponse = await api.put(path, body, prismPrefer(this.preferCode));
  this.preferCode = null;
});

When('ฉันเรียก DELETE {string}', async function (this: AppWorld, path: string) {
  const api = new BaseAPI(process.env['API_BASE_URL'] ?? 'http://localhost:4010');
  this.lastResponse = await api.delete(path, prismPrefer(this.preferCode));
  this.preferCode = null;
});
```

---

## Null Guard Pattern

Always guard `this.lastResponse` before reading it. Throw a descriptive error — not an assertion — so the failure message clearly identifies the root cause.

```typescript
Then('status code ควรเป็น {int}', async function (this: AppWorld, status: number) {
  if (!this.lastResponse) {
    throw new Error('ยังไม่มี response — ต้องเรียก API ก่อน (When ฉันเรียก...)');
  }
  const actual = this.lastResponse.status;
  if (actual !== status) {
    throw new Error(`Expected status ${status} but got ${actual}`);
  }
});

Then('response ควรมี field {string}', async function (this: AppWorld, field: string) {
  if (!this.lastResponse) throw new Error('ยังไม่มี response');
  const body = (await this.lastResponse.json()) as Record<string, unknown>;
  if (!(field in body)) {
    throw new Error(`Expected response to have field "${field}" but got: ${Object.keys(body).join(', ')}`);
  }
});
```

**Note:** `Response.json()` consumes the body stream — you can only call it once. If you need both status and body in the same step, read the body once and store it in a local variable.

---

## Env Var Fallback

```typescript
// Always use env var with fallback — never hardcode the URL
const api = new BaseAPI(process.env['API_BASE_URL'] ?? 'http://localhost:4010');
```

`API_BASE_URL` is set in `.env` (for local dev) or injected by CI. The fallback `http://localhost:4010` matches the Prism default port so local runs work without any `.env` setup.

---

## Full Steps File Template

```typescript
// steps/api/payments.steps.ts
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

When(
  'ฉันเรียก POST {string} ด้วย:',
  async function (this: AppWorld, path: string, table: DataTable) {
    const api = new BaseAPI(process.env['API_BASE_URL'] ?? 'http://localhost:4010');
    const [body] = table.hashes() as Record<string, string>[];
    this.lastResponse = await api.post(path, body, prismPrefer(this.preferCode));
    this.preferCode = null;
  },
);

// ── Then ──────────────────────────────────────────────────────────────────────

Then('status code ควรเป็น {int}', async function (this: AppWorld, status: number) {
  if (!this.lastResponse) {
    throw new Error('ยังไม่มี response — ต้องเรียก API ก่อน (When ฉันเรียก...)');
  }
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
```

---

## Feature File Template (Thai Gherkin)

```gherkin
Feature: จัดการข้อมูล Payments ผ่าน API

  @smoke
  @happy-path
  Scenario: ดึงรายการ payments ทั้งหมด
    When ฉันเรียก GET "/api/payments"
    Then status code ควรเป็น 200
    And response ควรเป็น array

  @regression
  @happy-path
  Scenario: สร้าง payment ใหม่สำเร็จ
    When ฉันเรียก POST "/api/payments" ด้วย:
      | amount | currency | reference       |
      | 100    | THB      | PAY-20260101-01 |
    Then status code ควรเป็น 201
    And response ควรมี field "id"
    And response ควรมี field "status"

  @regression
  @negative
  Scenario: สร้าง payment ที่ข้อมูลไม่ครบ ควรได้ 400
    Given ทดสอบ error case ด้วย status 400
    When ฉันเรียก POST "/api/payments" ด้วย:
      | amount |
      | 100    |
    Then status code ควรเป็น 400

  @regression
  @negative
  Scenario: ดึง payment ที่ไม่มีอยู่ ควรได้ 404
    Given ทดสอบ error case ด้วย status 404
    When ฉันเรียก GET "/api/payments/9999"
    Then status code ควรเป็น 404
```

---

## Run Commands

```bash
# Start Prism mock server (requires openapi.yaml at project root)
bun run docker:up       # Chrome + Prism in Docker
bun run mock            # Prism only, local (no Docker)

# Run all API tests
bun run test:api

# Filter by tag
TAGS='@smoke' bun run test:api

# Specific feature file
SPEC=features/api/payments.feature bun run test:api

# Filter by scenario name
SCENARIO_NAME="สร้าง payment" bun run test:api
```

**Prerequisite**: `openapi.yaml` must exist at project root before running API tests. Copy from `examples/users-api/` and adapt for your API spec. It is gitignored.
