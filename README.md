# BDD Automation Template

Template สำหรับสอน QA เริ่มต้นทำ **Behavior-Driven Development (BDD)**
ครอบคลุม automated test ทั้ง **UI** และ **API** พร้อม mock server และ API documentation

---

## สารบัญ

1. [BDD คืออะไร](#bdd-คืออะไร)
2. [Stack](#stack)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [โครงสร้างโปรเจค](#โครงสร้างโปรเจค)
6. [Workflow การทำงาน](#workflow-การทำงาน)
7. [Scripts](#scripts)
8. [Environment Variables](#environment-variables)
9. [เขียน Feature File](#เขียน-feature-file)
10. [เขียน Step Definitions](#เขียน-step-definitions)
11. [Page Object Model](#page-object-model)
12. [API Testing](#api-testing)
13. [Fixtures และ World](#fixtures-และ-world)
14. [Mock API ด้วย Prism](#mock-api-ด้วย-prism)
15. [Bruno API Collection](#bruno-api-collection)
16. [Config Files อธิบาย](#config-files-อธิบาย)
17. [ดู Test Results](#ดู-test-results)
18. [เพิ่ม Feature ใหม่](#เพิ่ม-feature-ใหม่)
19. [Common Mistakes](#common-mistakes)

---

## BDD คืออะไร

**Behavior-Driven Development** คือแนวคิดที่ให้ทุกคนในทีม (QA, Dev, BA, PO)
ร่วมกันเขียน test ด้วยภาษาที่มนุษย์อ่านได้ก่อน แล้วค่อย implement automation ตาม

```gherkin
Feature: ระบบ Login

  Scenario: เข้าสู่ระบบสำเร็จ
    Given ฉันอยู่ที่หน้า Login
    When ฉันกรอกชื่อผู้ใช้ว่า "alice"
    And ฉันกรอกรหัสผ่านว่า "secret"
    And ฉันกดปุ่ม "Login"
    Then ฉันควรจะเห็นข้อความเตือนว่า "Welcome, alice!"
```

ไฟล์ `.feature` คือ **living documentation** — อ่านได้โดยทุกคนในทีม ไม่ใช่แค่คนที่เขียน code

### ทำไม BDD?

| ปัญหาเดิม                                      | BDD แก้ด้วย                                   |
| ---------------------------------------------- | --------------------------------------------- |
| QA เขียน test เสร็จแล้ว Dev ไม่รู้ว่าทดสอบอะไร | Feature file เป็น shared language ทั้งทีม     |
| Test ล้าสมัย ไม่ตรงกับ requirement จริง        | Feature file = requirement = test ในไฟล์เดียว |
| หา bug ยาก ไม่รู้ว่า flow ไหนพัง               | Scenario ชัดเจน อ่านแล้วรู้ทันทีว่าพังตรงไหน  |

---

## Stack

| Layer            | Tool                                                         | เวอร์ชัน |
| ---------------- | ------------------------------------------------------------ | -------- |
| BDD runner       | [playwright-bdd](https://github.com/vitalets/playwright-bdd) | ^8.4     |
| UI automation    | [Playwright](https://playwright.dev)                         | ^1.58    |
| API automation   | Playwright request API                                       | built-in |
| API mock         | [Prism](https://stoplight.io/open-source/prism)              | ^5.14    |
| API client (GUI) | [Bruno](https://www.usebruno.com)                            | latest   |
| Runtime          | [Bun](https://bun.sh)                                        | ^1.0     |
| Formatter        | [Prettier](https://prettier.io) + gherkin plugin             | ^3.8     |

> **หมายเหตุ:** โปรเจคนี้ใช้ **Playwright** เป็น test runner ไม่ใช่ Bun test runner
> ดังนั้นต้องใช้ `bun run test` (ผ่าน Playwright) ไม่ใช่ `bun test`

---

## Prerequisites

| Tool                                    | วิธีติดตั้ง                                 |
| --------------------------------------- | ------------------------------------------- |
| [Bun](https://bun.sh) ≥ 1.0             | `curl -fsSL https://bun.sh/install \| bash` |
| [Bruno](https://www.usebruno.com) (GUI) | ดาวน์โหลดจาก usebruno.com                   |

---

## Quick Start

```bash
# 1. ติดตั้ง dependencies
bun install

# 2. ติดตั้ง Playwright browsers
bunx playwright install chromium

# 3. สร้าง environment config
cp .env.example .env

# 4. [Terminal 1] เริ่ม Prism mock server (สำหรับ API tests)
bun run mock

# 5. [Terminal 2] รัน tests ทั้งหมด
bun run test
```

ผลที่ควรได้:

```
Running 6 tests using 2 workers

  ✓  API › ดึงรายการ users ทั้งหมด
  ✓  API › สร้าง user ใหม่สำเร็จ
  ✓  API › สร้าง user ที่ข้อมูลไม่ครบ ควรได้ 400
  ✓  API › ดึง user ที่ไม่มีอยู่ ควรได้ 404
  ✓  UI  › เข้าสู่ระบบไม่สำเร็จด้วยรหัสผ่านที่ผิด
  ✓  UI  › เข้าสู่ระบบสำเร็จด้วยข้อมูลที่ถูกต้อง

  6 passed
```

---

## โครงสร้างโปรเจค

```
bdd/
│
├── features/                    # ① เขียนก่อนเสมอ — Gherkin (.feature files)
│   ├── ui/
│   │   └── login.feature        # UI test scenarios
│   └── api/
│       └── users.feature        # API test scenarios
│
├── steps/                       # ② Step definitions — เชื่อม Gherkin กับ code
│   ├── ui/
│   │   └── login.steps.ts       # implement steps จาก login.feature
│   └── api/
│       └── users.steps.ts       # implement steps จาก users.feature
│
├── pages/                       # ③ Page Object Model (เฉพาะ UI)
│   └── login.page.ts            # locators + actions ของหน้า Login
│
├── fixtures/
│   └── index.ts                 # Custom fixtures + export Given/When/Then
│
├── support/
│   ├── api/
│   │   └── client.ts            # ApiClient — HTTP wrapper สำหรับ API steps
│   └── data/
│       └── users.data.ts        # Test data กลาง (ใช้ร่วมกัน UI + API)
│
├── bruno/                       # Bruno API collection (commit ลง Git ได้)
│   ├── bruno.json               # collection config
│   ├── environments/
│   │   ├── local.bru            # baseUrl = http://localhost:4010 (Prism)
│   │   └── staging.bru          # baseUrl = https://staging.example.com
│   └── users/                   # auto-generated จาก generate:bru
│       ├── 01-get-api-users-200.bru
│       ├── 02-get-api-users-9999-404.bru
│       ├── 03-post-api-users-201.bru
│       └── 04-post-api-users-400.bru
│
├── scripts/
│   └── generate-bru.ts          # Script: parse features/api/ → สร้าง .bru files
│
├── .features-gen/               # (auto-generated, gitignored) Playwright spec files
│                                # playwright-bdd สร้างจาก .feature ก่อนรัน อย่าแก้ไขตรงนี้
│
├── openapi.yaml                 # OpenAPI 3.0 spec — source of truth ของ API
├── playwright.config.ts         # Playwright + BDD config
├── tsconfig.json                # TypeScript config
├── .env                         # (gitignored) ค่าจริง — copy จาก .env.example
├── .env.example                 # ตัวอย่าง environment variables
├── .prettierrc                  # Prettier config (รองรับ .ts และ .feature)
└── package.json
```

---

## Workflow การทำงาน

```
┌─────────────────────────────────────────────────────────┐
│  1. เขียน Feature (.feature)                             │
│     บอกว่าระบบควรทำอะไร ในภาษาที่ทุกคนเข้าใจ            │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  2. เขียน Step Definitions (.steps.ts)                   │
│     เชื่อม Gherkin text กับ Playwright / ApiClient       │
└──────────────────────────┬──────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          │                                 │
┌─────────▼──────────┐           ┌──────────▼──────────┐
│  UI: Page Object   │           │  API: ApiClient      │
│  (pages/*.ts)      │           │  (support/api/)      │
│  locators+actions  │           │  HTTP GET/POST/etc   │
└─────────┬──────────┘           └──────────┬──────────┘
          │                                 │
          └────────────────┬────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  3. รัน: bun run test                                    │
│     playwright-bdd generate .features-gen/ แล้วรัน      │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  4. ดู Results                                           │
│     terminal (list) + HTML report + trace (on failure)  │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  5. bun run generate:bru → Bruno collection              │
│     explore API manually + living documentation          │
└─────────────────────────────────────────────────────────┘
```

---

## Scripts

```bash
# ── Tests ──────────────────────────────────────────────────
bun run test              # รัน BDD tests ทั้งหมด
bun run test:ui           # เปิด Playwright UI mode (debug-friendly, มี timeline)
bun run test -- --grep "Login"       # รันเฉพาะ test ที่ชื่อมี "Login"
bun run test -- --grep "@smoke"      # รันเฉพาะ test ที่ tag ด้วย @smoke

# ── Mock API ───────────────────────────────────────────────
bun run mock              # เริ่ม Prism mock server ที่ port 4010
bun run mock:verbose      # Prism + debug logs (ดู request/response ทุกอัน)

# ── Bruno ──────────────────────────────────────────────────
bun run generate:bru      # สร้าง .bru files จาก features/api/*.feature

# ── Code Quality ───────────────────────────────────────────
bun run format            # format ทุกไฟล์ (.ts, .feature, .json, .yaml)
bun run format:check      # เช็ค format โดยไม่แก้ไข (ใช้ใน CI)

# ── Utilities ──────────────────────────────────────────────
bun run codegen           # เปิด Playwright codegen สำหรับ record locators
bunx playwright show-report          # เปิด HTML report ใน browser
```

---

## Environment Variables

**Bun โหลด `.env` อัตโนมัติ** — ไม่ต้อง `import 'dotenv/config'` หรือ setup อะไรเพิ่ม

```bash
cp .env.example .env
```

| Variable       | Default (fallback)                   | ใช้ที่ไหน                                |
| -------------- | ------------------------------------ | ---------------------------------------- |
| `BASE_URL`     | `https://the-internet.herokuapp.com` | `page.goto('/login')` → `BASE_URL/login` |
| `API_BASE_URL` | `http://localhost:4010`              | `apiContext` fixture → ทุก API request   |

**สลับ environment ทำแค่เปลี่ยน `.env`:**

```bash
# ทดสอบกับ Prism mock (API ยังไม่พร้อม)
API_BASE_URL=http://localhost:4010

# ทดสอบกับ real API
API_BASE_URL=http://localhost:3000

# ทดสอบกับ staging
BASE_URL=https://staging.myapp.com
API_BASE_URL=https://api.staging.myapp.com
```

ไม่ต้องแก้ code ใน steps หรือ fixtures เลย

---

## เขียน Feature File

Feature files อยู่ใน `features/ui/` (UI tests) และ `features/api/` (API tests)

### โครงสร้างพื้นฐาน

```gherkin
Feature: ชื่อ feature — บอก business capability

  # Background: รัน steps เหล่านี้ก่อนทุก Scenario ในไฟล์นี้
  Background:
    Given ฉันอยู่ที่หน้า Login

  # Scenario: 1 scenario = 1 test case = 1 behavior
  Scenario: เข้าสู่ระบบสำเร็จ
    When ฉันกรอกชื่อผู้ใช้ว่า "alice"
    And ฉันกรอกรหัสผ่านว่า "secret"
    And ฉันกดปุ่ม "Login"
    Then ฉันควรจะเห็นข้อความเตือนว่า "Welcome!"
```

### Scenario Outline — รัน scenario เดิมกับ input หลายชุด

```gherkin
Scenario Outline: ทดสอบ API หลาย endpoint
  When  ฉันเรียก GET "<path>"
  Then  status code ควรเป็น <status>

  Examples:
    | path            | status |
    | /api/users      | 200    |
    | /api/users/9999 | 404    |
```

### Tags — จัดกลุ่ม test สำหรับ selective run

```gherkin
@smoke
Scenario: เข้าสู่ระบบสำเร็จ
  ...

@regression @login
Scenario: เข้าสู่ระบบด้วย account ที่ถูก lock
  ...
```

```bash
bun run test -- --grep "@smoke"       # รันเฉพาะ smoke tests
bun run test -- --grep "@regression"  # รันเฉพาะ regression tests
```

### DataTable — ส่ง structured data ให้ step

```gherkin
When ฉันเรียก POST "/api/users" ด้วย:
  | username | email             |
  | alice    | alice@example.com |
```

### กฎสำคัญ

- **1 Feature file = 1 business capability** (login, checkout, user management ฯลฯ)
- **1 Scenario = independent** — setup ข้อมูลของตัวเองได้โดยไม่พึ่ง scenario อื่น
- **Step text ต้องตรงกับ step definition** — ถ้าไม่ตรงจะ fail ด้วย `Step not found`
- **ไม่ควรมี logic ใน Feature** — Feature บอก "อะไร" ไม่ใช่ "ยังไง"

---

## เขียน Step Definitions

Step files อยู่ใน `steps/ui/` และ `steps/api/`

> **กฎ:** import `Given/When/Then` จาก `../../fixtures` เท่านั้น ห้าม import จาก `playwright-bdd` โดยตรง

### ตัวอย่าง UI Steps

```typescript
// steps/ui/login.steps.ts
import { Given, When, Then } from '../../fixtures';
import { LoginPage } from '../../pages/login.page';

Given('ฉันอยู่ที่หน้า Login', async ({ page }) => {
  await page.goto('/login'); // baseURL มาจาก .env → playwright.config.ts
});

When('ฉันกรอกชื่อผู้ใช้ว่า {string}', async ({ page }, username: string) => {
  const loginPage = new LoginPage(page);
  await loginPage.fillUsername(username);
});

Then('ฉันควรจะเห็นข้อความเตือนว่า {string}', async ({ page }, message: string) => {
  await page.getByText(message).waitFor();
});
```

### ตัวอย่าง API Steps

```typescript
// steps/api/users.steps.ts
import { Given, When, Then } from '../../fixtures';
import { ApiClient } from '../../support/api/client';

When('ฉันเรียก GET {string}', async ({ apiContext, world }, path: string) => {
  const api = new ApiClient(apiContext);
  world.lastResponse = await api.get(path); // เก็บ response ไว้ใน world
});

Then('status code ควรเป็น {int}', async ({ world }, status: number) => {
  const actual = world.lastResponse!.status();
  if (actual !== status) throw new Error(`Expected ${status} but got ${actual}`);
});
```

### Parameter Types

| Gherkin    | TypeScript   | ตัวอย่างค่า                           |
| ---------- | ------------ | ------------------------------------- |
| `{string}` | `string`     | `"hello world"`                       |
| `{int}`    | `number`     | `200`                                 |
| `{float}`  | `number`     | `3.14`                                |
| DataTable  | 3rd argument | `table.hashes()` → `[{ key: "val" }]` |

### Fixtures ที่ใช้ได้ใน steps

| Fixture      | Type                           | ใช้ทำอะไร                             |
| ------------ | ------------------------------ | ------------------------------------- |
| `page`       | `Page`                         | Playwright browser page (UI steps)    |
| `apiContext` | `APIRequestContext`            | HTTP client พร้อม baseURL (API steps) |
| `world`      | `{ lastResponse, preferCode }` | เก็บ state ระหว่าง steps ของ scenario |

---

## Page Object Model

Page Object อยู่ใน `pages/` — เก็บ **locators** และ **actions** ของแต่ละหน้าไว้ที่เดียว

```typescript
// pages/login.page.ts
import type { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;

  constructor(page: Page) {
    // กำหนด locators ใน constructor เสมอ (ไม่ใช่ class body)
    // เพื่อให้ถูกต้องกับ TypeScript strict + verbatimModuleSyntax
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
  }

  async fillUsername(username: string) {
    await this.usernameInput.fill(username);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }
}
```

**ทำไมต้องใช้ Page Object?**

```
UI เปลี่ยน selector จาก #username → [data-testid="username"]
                                    ↓
แก้ที่ pages/login.page.ts จุดเดียว — step files ไม่ต้องแตะเลย
```

**Locator strategies ที่แนะนำ (เรียงตาม resilience):**

```typescript
page.getByRole('button', { name: 'Login' }); // ✅ best — semantic HTML
page.getByLabel('Username'); // ✅ good — accessibility
page.getByTestId('login-btn'); // ✅ good — explicit test id
page.locator('#username'); // ⚠️ ok — id อาจเปลี่ยน
page.locator('.btn-primary'); // ❌ avoid — CSS class เปลี่ยนบ่อย
```

---

## API Testing

### ApiClient

`support/api/client.ts` เป็น wrapper บาง ๆ รอบ Playwright request:

```typescript
const api = new ApiClient(apiContext);

// GET
const res = await api.get('/api/users');

// POST พร้อม body
const res = await api.post('/api/users', { username: 'alice', email: 'alice@example.com' });

// PUT, DELETE
const res = await api.put('/api/users/1', { username: 'alice-updated' });
const res = await api.delete('/api/users/1');

// Assert status + ดึง body ในขั้นตอนเดียว
const body = await api.expectJson<User>(res, 201);
```

### รับ Response ใน Then steps ผ่าน world

```typescript
When('ฉันเรียก GET {string}', async ({ apiContext, world }, path) => {
  world.lastResponse = await new ApiClient(apiContext).get(path);
  //    ↑ เก็บไว้ใน world เพื่อให้ Then steps ใช้ต่อได้
});

Then('status code ควรเป็น {int}', async ({ world }, status) => {
  const actual = world.lastResponse!.status();
  //                    ↑ ดึงจาก world
});
```

### ทดสอบ Error Cases กับ Prism Mock

Prism static mock return response แรก (200) เสมอ ต้องใช้ `Prefer` header เพื่อบอกว่าต้องการ status ไหน:

```gherkin
Scenario: ดึง user ที่ไม่มีอยู่ ควรได้ 404
  Given ทดสอบ error case ด้วย status 404  ← บอก Prism ว่าต้องการ 404
  When  ฉันเรียก GET "/api/users/9999"
  Then  status code ควรเป็น 404
```

> เมื่อ switch ไป real API ลบบรรทัด `Given ทดสอบ error case...` ออกได้เลย
> server จะ return 404 ตาม logic จริงเอง

---

## Fixtures และ World

`fixtures/index.ts` เป็น central place สำหรับ:

1. Custom fixtures (`apiContext`, `world`)
2. Export `Given/When/Then` ที่ bind กับ custom fixtures

### world fixture

`world` คือ plain object ที่เก็บ state ระหว่าง steps ของ scenario เดียวกัน Playwright สร้าง instance ใหม่ทุก scenario → **ไม่มี state รั่วระหว่าง scenarios**

```typescript
export type AppFixtures = {
  apiContext: Awaited<ReturnType<typeof request.newContext>>;
  world: {
    lastResponse: APIResponse | null; // response ล่าสุดจาก API call
    preferCode: number | null; // Prism Prefer header สำหรับ error cases
  };
};
```

### เพิ่ม Fixture ใหม่

เพิ่มที่ `fixtures/index.ts` เท่านั้น ทุก step file จะได้ใช้ทันที:

```typescript
// ตัวอย่าง: loggedInPage — เปิดหน้าและ login ไว้ก่อน
// ใช้ใน steps ที่ต้องการ session อยู่แล้ว ไม่ต้อง login ซ้ำทุก scenario
loggedInPage: async ({ page }, use) => {
  await page.goto('/login');
  await page.locator('#username').fill('admin');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('/dashboard');
  await use(page);
},
```

---

## Mock API ด้วย Prism

Prism อ่าน `openapi.yaml` แล้วสร้าง mock server ที่ตอบ response ตาม examples ทันที

```bash
bun run mock
# [11:00:00] › Starting Prism…
# [11:00:00] › Prism is listening on http://127.0.0.1:4010
```

```
openapi.yaml ──► Prism mock (port 4010) ──► API tests
                                       ──► Bruno (manual explore)
```

**Flow การใช้งาน:**

| สถานการณ์         | ตั้งค่า                                               |
| ----------------- | ----------------------------------------------------- |
| API ยังไม่พร้อม   | `API_BASE_URL=http://localhost:4010` + `bun run mock` |
| API พร้อมบน local | `API_BASE_URL=http://localhost:3000`                  |
| ทดสอบบน staging   | `API_BASE_URL=https://api.staging.myapp.com`          |

**อัปเดต `openapi.yaml` เมื่อ API เปลี่ยน:**

```yaml
# เพิ่ม endpoint ใหม่ใน openapi.yaml
paths:
  /api/products:
    get:
      responses:
        '200':
          content:
            application/json:
              example:
                - id: 1
                  name: 'Widget'
```

Prism จะ return example นั้นทันทีเมื่อเรียก `GET /api/products`

---

## Bruno API Collection

Bruno เป็น Git-friendly API client เก็บ collection เป็น `.bru` text files

### เปิด Collection

1. เปิด Bruno app → **Open Collection** → เลือกโฟลเดอร์ `bruno/`
2. เลือก environment: **local** (Prism, port 4010) หรือ **staging**
3. ส่ง request ได้เลย

### Auto-generate จาก Feature Files

```bash
bun run generate:bru
```

Script อ่าน `features/api/*.feature` แล้วสร้าง `.bru` files อัตโนมัติ รองรับ:

- HTTP method จาก `When ฉันเรียก GET/POST/PUT/DELETE`
- Request body จาก DataTable
- Expected status → สร้าง test assertion ใน `.bru` ให้เลย

ตัวอย่าง input → output:

```gherkin
# features/api/users.feature
Scenario: สร้าง user ใหม่สำเร็จ
  When ฉันเรียก POST "/api/users" ด้วย:
    | username | email             |
    | alice    | alice@example.com |
  Then status code ควรเป็น 201
```

```
# bruno/users/03-post-api-users-201.bru (auto-generated)
meta {
  name: สร้าง user ใหม่สำเร็จ
  type: http
  seq: 3
}

post {
  url: {{baseUrl}}/api/users
  body: json
}

body:json {
  { "username": "", "email": "" }
}

tests {
  test("status is 201", function() {
    expect(res.status).to.equal(201);
  });
}
```

---

## Config Files อธิบาย

### `playwright.config.ts`

```typescript
defineBddConfig({
  features: 'features/**/*.feature', // ครอบคลุมทุก subdirectory
  steps: ['steps/**/*.ts', 'fixtures/index.ts'], // ต้องรวม fixtures เสมอ
});
// → สร้าง .features-gen/ ก่อนรัน (auto, gitignored)

defineConfig({
  fullyParallel: false, // ปิด — BDD scenarios มักมี dependency กัน
  retries: CI ? 1 : 0, // retry ครั้งเดียวใน CI ลด flaky
  timeout: 30_000, // 30 วินาทีต่อ test

  reporter: [
    ['list'], // real-time output ใน terminal
    ['html', { open: 'never' }], // → playwright-report/index.html
  ],

  use: {
    baseURL: process.env.BASE_URL ?? 'https://the-internet.herokuapp.com',
    browserName: 'chromium',
    screenshot: 'only-on-failure', // ประหยัด disk
    trace: 'retain-on-failure', // เก็บไว้เปิด debug เมื่อ fail
  },
});
```

### `tsconfig.json`

| Option                     | ค่า         | ผลกระทบ                                                  |
| -------------------------- | ----------- | -------------------------------------------------------- |
| `strict`                   | `true`      | เปิด TypeScript strict mode ทั้งหมด                      |
| `moduleResolution`         | `"bundler"` | ใช้กับ Bun (ไม่ใช่ Node.js resolution)                   |
| `verbatimModuleSyntax`     | `true`      | type-only imports ต้องใช้ `import type`                  |
| `noUncheckedIndexedAccess` | `true`      | `arr[0]` มี type เป็น `T \| undefined` บังคับ null-check |

### `.prettierrc`

```json
{
  "plugins": ["prettier-plugin-gherkin"],
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

`prettier-plugin-gherkin` format `.feature` files ด้วย — `bun run format` ครอบคลุมทุกอย่าง

### `openapi.yaml`

OpenAPI 3.0 spec — **single source of truth** ของ API:

| ใช้กับ | ทำอะไร                                         |
| ------ | ---------------------------------------------- |
| Prism  | อ่าน spec → สร้าง mock server                  |
| Bruno  | import spec → สร้าง collection ได้             |
| QA     | อ่านเพื่อเข้าใจ API contract ก่อนเขียน feature |
| Dev    | document API ให้ทีม                            |

---

## ดู Test Results

```bash
# HTML Report (หลังรัน test)
bunx playwright show-report

# Trace Viewer (เมื่อ test fail)
bunx playwright show-trace test-results/**/trace.zip
# → เปิด browser แสดง timeline ทุก action, screenshot, network request

# รันแบบ headed (เห็น browser จริง)
bun run test -- --headed

# Debug mode (หยุดที่ each step)
bun run test -- --debug
```

**Trace** บอกอะไรได้บ้าง:

- Screenshot ณ จุดที่ fail
- Network requests ทุกอัน (status, body)
- Timeline ของ actions
- Console logs จาก browser

---

## เพิ่ม Feature ใหม่

### เพิ่ม UI Feature

```bash
# 1. สร้าง feature file
touch features/ui/checkout.feature

# 2. เขียน scenarios ก่อน (ก่อน implement)
# Feature: ระบบ Checkout
#   Scenario: ชำระเงินสำเร็จ
#     Given ฉันมีสินค้าในตะกร้า
#     When  ฉันกดปุ่ม "ชำระเงิน"
#     Then  ฉันควรเห็นหน้า "ยืนยันการสั่งซื้อ"

# 3. สร้าง Page Object
touch pages/checkout.page.ts

# 4. สร้าง step definitions
touch steps/ui/checkout.steps.ts
# → implement steps ที่ bddgen แจ้งว่า missing

# 5. รัน
bun run test -- --grep "Checkout"
```

### เพิ่ม API Feature

```bash
# 1. เพิ่ม endpoint ใน openapi.yaml ก่อน

# 2. สร้าง feature file
touch features/api/products.feature

# 3. สร้าง step definitions (ถ้า steps ใหม่)
touch steps/api/products.steps.ts
# steps ทั่วไปอย่าง "ฉันเรียก GET", "status code ควรเป็น"
# มีอยู่แล้วใน users.steps.ts ใช้ร่วมกันได้เลย

# 4. Generate Bruno collection
bun run generate:bru

# 5. รัน
bun run test -- --grep "Products"
```

---

## Common Mistakes

### import ผิดที่

```typescript
// ❌ ไม่ได้รับ custom fixtures (apiContext, world)
import { createBdd } from 'playwright-bdd';
const { Given } = createBdd();

// ✅ ถูกต้อง
import { Given } from '../../fixtures';
```

### Locator ใน class body

```typescript
// ❌ TypeScript strict error: "used before initialization"
export class LoginPage {
  readonly input = this.page.locator('#username'); // ERROR

  constructor(private page: Page) {}
}

// ✅ ถูกต้อง — กำหนดใน constructor
export class LoginPage {
  readonly input: Locator;

  constructor(page: Page) {
    this.input = page.locator('#username');
  }
}
```

### Module-level state

```typescript
// ❌ race condition ถ้า parallel, state รั่วระหว่าง scenarios
let lastResponse: APIResponse;

// ✅ ใช้ world fixture — scoped ต่อ scenario
async ({ world }) => {
  world.lastResponse = await api.get(path);
};
```

### Scenario มี dependency กัน

```gherkin
# ❌ scenario 2 พึ่ง data จาก scenario 1
Scenario: สร้าง user    # → สร้าง id=1
Scenario: ดึง user     # → GET /users/1 (พังถ้ารันแยก)

# ✅ แต่ละ scenario independent
Scenario: ดึง user ที่มีอยู่
  Given มี user อยู่ในระบบแล้ว   # setup เอง
  When  ฉันเรียก GET "/api/users/1"
  Then  status code ควรเป็น 200
```

### URL ฝังใน Feature

```gherkin
# ❌ URL ฝังแข็ง — เปลี่ยน environment ต้องแก้ feature
Given ฉันอยู่ที่หน้า Login ของเว็บ "https://production.myapp.com/login"

# ✅ ใช้ path — baseURL อ่านจาก .env อัตโนมัติ
Given ฉันอยู่ที่หน้า Login
# step: await page.goto('/login')  ← baseURL มาจาก playwright.config.ts
```

### type import ผิด

```typescript
// ❌ error กับ verbatimModuleSyntax
import { Page } from '@playwright/test';

// ✅ ถูกต้อง
import type { Page } from '@playwright/test';
```
