# BDD Automation Framework

Framework สำหรับ **Behavior-Driven Development (BDD)** ครอบคลุม Web UI, API, และ Mobile (Flutter/Native)
ภายใต้ runner เดียว พร้อม mock server, API collection, และ living checklist report

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
11. [Page & Screen Objects](#page--screen-objects)
12. [API Testing](#api-testing)
13. [Mobile Testing](#mobile-testing)
14. [Cucumber World](#cucumber-world)
15. [Mock API ด้วย Prism](#mock-api-ด้วย-prism)
16. [Bruno API Collection](#bruno-api-collection)
17. [Living Checklist Reporter](#living-checklist-reporter)
18. [Config Files อธิบาย](#config-files-อธิบาย)
19. [ดู Test Results](#ดู-test-results)
20. [เพิ่ม Feature ใหม่](#เพิ่ม-feature-ใหม่)
21. [Common Mistakes](#common-mistakes)

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

| Layer             | Tool                                                                                                                        | หมายเหตุ                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Test runner       | [WebdriverIO v9](https://webdriver.io)                                                                                      | รันด้วย Node (`bunx wdio`)   |
| BDD engine        | [@wdio/cucumber-framework](https://webdriver.io/docs/frameworks#using-cucumber) + [@cucumber/cucumber](https://cucumber.io) | Gherkin → step definitions   |
| Web automation    | WDIO + ChromeDriver                                                                                                         | `browser`, `$()` globals     |
| API automation    | `BaseAPI` (global `fetch`)                                                                                                  | ไม่ต้องเปิด browser          |
| Mobile automation | [Appium v3](https://appium.io) + UIAutomator2 / XCUITest                                                                    | Flutter via Semantics bridge |
| API mock          | [Prism](https://stoplight.io/open-source/prism)                                                                             | อ่าน `openapi.yaml`          |
| API client (GUI)  | [Bruno](https://www.usebruno.com)                                                                                           | Git-friendly, `.bru` files   |
| Reports           | Allure + Living Checklist (custom)                                                                                          | release-based history        |
| Runtime (scripts) | [Bun](https://bun.sh)                                                                                                       | install, utilities, Prism    |
| Formatter         | [Prettier](https://prettier.io) + gherkin plugin                                                                            | `.ts` + `.feature`           |

> **หมายเหตุ:** WDIO รันด้วย **Node** (`bunx wdio`) — Bun ใช้สำหรับ `bun install` และ utility scripts เท่านั้น

---

## Prerequisites

| Tool                                              | วิธีติดตั้ง                                            |
| ------------------------------------------------- | ------------------------------------------------------ |
| [Node.js](https://nodejs.org) ≥ 18                | `brew install node`                                    |
| [Bun](https://bun.sh) ≥ 1.0                       | `brew install bun`                                     |
| [Bruno](https://www.usebruno.com) (GUI, optional) | ดาวน์โหลดจาก usebruno.com                              |
| Chrome / Chromium                                 | มีอยู่แล้วบน macOS หรือ `brew install --cask chromium` |

**สำหรับ Mobile testing (Apple Silicon):**

```bash
# ติดตั้ง JDK, Android SDK, ARM64 emulator, Appium และ drivers
sh scripts/setup-m-series.sh

# ติดตั้ง Appium drivers (UiAutomator2, XCUITest)
bun run setup:drivers
```

---

## Quick Start

### Setup (First Time Only)

```bash
# 1. ติดตั้ง dependencies
bun install

# 2. สร้าง environment config
cp .env.example .env

# 3. Bootstrap Apple Silicon environment (includes JDK, Android SDK, Appium, emulator)
sh scripts/setup-m-series.sh

# 4. ติดตั้ง Appium drivers (UiAutomator2, XCUITest)
bun run setup:drivers
```

### Web + API Tests (No Mobile)

```bash
# [Terminal 1] เริ่ม Prism mock server
bun run mock

# [Terminal 2] รัน web + API tests
bun run test:web
bun run test:api
```

ผลที่ควรได้:

```
Spec Files:    6 passed, 6 total
```

### Mobile Tests

**Before running mobile tests** — prepare environment **once per session**:

```bash
# [Terminal 1] Boot emulator + start Appium + install APK + clear data
bun run start:android
# Output: ✅ Android ready. Appium PID: 12345
```

**Then run tests** (emulator + Appium จะรันอยู่ตลอด):

```bash
# [Terminal 2] รัน mobile tests
bun run test:mobile:android

# หรือรัน feature เฉพาะ
bun run test:mobile:android -- --feature login
bun run test:mobile:android -- --feature navigation
```

สาเหตุการแยก `start:android` ออกมา:

- **`start:android`** เปิด emulator + Appium เดียวครั้ง → ประหยัด boot time
- **`test:mobile:android`** รัน tests ซ้ำๆ ไม่ต้อง restart environment
- Pre-flight checks → fail fast ถ้า emulator/Appium ไม่พร้อม

---

## Before Running Tests

| Test Type  | Prerequisites                                      | Setup Script                                               |
| ---------- | -------------------------------------------------- | ---------------------------------------------------------- |
| **Web**    | Node.js, Chrome                                    | `bun install` ✓                                            |
| **API**    | Node.js, Prism mock                                | `bun install` + `bun run mock` ✓                           |
| **Mobile** | Android SDK, JDK, Appium, emulator, Appium drivers | `sh scripts/setup-m-series.sh` + `bun run setup:drivers` ✓ |

### First-Time Setup Checklist

- [ ] `bun install` — install Node + Bun dependencies
- [ ] `cp .env.example .env` — create environment config
- [ ] `sh scripts/setup-m-series.sh` — install Android SDK, JDK, Appium (Apple Silicon only)
- [ ] `bun run setup:drivers` — install Appium drivers

### Before Every Mobile Test Session

```bash
bun run start:android
```

Script นี้จะ:

1. ✓ Boot emulator (ถ้ายังไม่รัน)
2. ✓ Start Appium server
3. ✓ Install APK
4. ✓ **Clear app data** — reset สถานะเป็น Onboarding
5. ✓ Launch app

ถ้า emulator / Appium รันอยู่แล้ว จะข้ามขั้นตอนนั้น → เร็ว

### Verify Setup

```bash
# Web + API tests
bun run test:web
bun run test:api

# Mobile tests (after bun run start:android)
bun run test:mobile:android
```

---

## โครงสร้างโปรเจค

```
bdd/
├── features/                         # ① เขียนก่อนเสมอ — Gherkin (.feature files)
│   ├── ui/
│   │   └── login.feature             # Web UI scenarios
│   ├── api/
│   │   └── users.feature             # API scenarios
│   └── mobile/
│       ├── login.feature             # Login flow (Email tab, PDPA consent)
│       └── navigation.feature        # Bottom navigation bar
│
├── steps/                            # ② Step definitions — เชื่อม Gherkin กับ code
│   ├── ui/
│   │   └── login.steps.ts
│   ├── api/
│   │   └── users.steps.ts
│   └── mobile/
│       └── login.steps.ts
│
├── pages/                            # ③ Page Objects (Web) — WDIO $() selectors
│   └── login.page.ts
│
├── screens/                          # ④ Screen Objects (Mobile) — Appium selectors
│   ├── base.screen.ts                # abstract: waitForElement/tap/scroll/swipe
│   ├── login.screen.ts               # Email/Phone login, PDPA
│   ├── onboarding.screen.ts          # Onboarding / welcome screen
│   ├── home.screen.ts                # Home + bottom navigation
│   └── pdpa.screen.ts                # PDPA Consent screen
│
├── fixtures/
│   └── index.ts                      # Cucumber World class + Before/After hooks
│
├── support/
│   ├── api/
│   │   ├── base-api.ts               # standalone fetch wrapper (no browser)
│   │   └── client.ts                 # re-export alias
│   └── data/
│       └── users.data.ts             # test data constants
│
├── reporters/
│   └── living-checklist/
│       ├── index.ts                  # custom WDIO reporter
│       ├── template.ts               # HTML generator
│       └── types.ts                  # TypeScript interfaces
│
├── scripts/
│   ├── start-android.sh              # boot emulator + start Appium + install APK
│   ├── run-mobile-tests.sh           # pre-flight checks + run WDIO mobile suite
│   ├── setup-m-series.sh             # bootstrap Apple Silicon environment
│   ├── setup-drivers.sh              # install Appium drivers
│   ├── inspect-android.sh            # open Appium Inspector (Android)
│   └── inspect-ios.sh                # open Appium Inspector (iOS)
│
├── bruno/                            # Bruno API collection
│   ├── bruno.json
│   ├── environments/
│   └── users/                        # auto-generated จาก generate:bru
│
├── reports/                          # (gitignored) Living Checklist output
│   ├── history.json                  # append-only run history
│   └── living-checklist.html         # interactive HTML report
│
├── apps/                             # (gitignored) APK / .app binaries
├── openapi.yaml                      # OpenAPI 3.0 spec — source of truth ของ API
├── wdio.conf.ts                      # WDIO configuration
├── tsconfig.json
├── .env                              # (gitignored) ค่าจริง — copy จาก .env.example
├── .env.example
└── package.json
```

---

## Workflow การทำงาน

```
┌─────────────────────────────────────────────┐
│  1. เขียน Feature (.feature)                 │
│     ภาษา Gherkin ที่ทุกคนเข้าใจ              │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│  2. เขียน Step Definitions (.steps.ts)       │
│     import { Given, When, Then }             │
│     from '@cucumber/cucumber'                │
└────────────────────┬────────────────────────┘
                     │
        ┌────────────┴─────────────┐
        │                          │
┌───────▼────────┐      ┌──────────▼──────────┐
│  Web/Mobile    │      │  API                 │
│  Page/Screen   │      │  BaseAPI (fetch)     │
│  browser/$()   │      │  ไม่ต้องเปิด browser │
└───────┬────────┘      └──────────┬──────────┘
        │                          │
        └────────────┬─────────────┘
                     │
┌────────────────────▼────────────────────────┐
│  3. รัน: bun run test                        │
│     bunx wdio run wdio.conf.ts               │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│  4. ดู Results                               │
│     spec reporter + Allure + Living Checklist│
└─────────────────────────────────────────────┘
```

---

## Scripts

```bash
# ── Tests ──────────────────────────────────────────────────
bun run test                   # รัน all suites (web + api + mobile ถ้าตั้ง MOBILE_PLATFORM)
bun run test:web               # Web UI tests เท่านั้น
bun run test:api               # API tests เท่านั้น (ไม่เปิด browser)
bun run test:mobile:android    # Android: pre-flight + รัน mobile suite
bun run test:mobile:ios        # iOS: pre-flight + รัน mobile suite

# กรอง scenario ด้วย tag
TAGS='@smoke' bun run test
TAGS='not @manual' bun run test:web

# ── Mobile Environment ──────────────────────────────────────
bun run start:android          # boot emulator + start Appium + install APK (ครั้งเดียวต่อ session)

# ── Mobile Test Selection ───────────────────────────────────
# รัน feature เฉพาะ (ชื่อ หรือ path)
bun run test:mobile:android -- --feature login
bun run test:mobile:android -- --feature navigation
bun run test:mobile:android -- --spec features/mobile/login.feature

# รัน scenario เฉพาะ (partial match)
bun run test:mobile:android -- --scenario "กรอก email และ password"

# รัน ด้วย tag
bun run test:mobile:android -- --tags @smoke
TAGS='@smoke' bun run test:mobile:android

# รวม filter
bun run test:mobile:android -- --feature login --tags "@happy-path"

# Full reinstall (ข้าม APP_READY, สำหรับ CI)
APP_READY=false bun run test:mobile:android

# ── Mock API ───────────────────────────────────────────────
bun run mock                   # เริ่ม Prism mock ที่ port 4010
bun run mock:test              # Prism + API tests + kill Prism (one-liner)

# ── Reports ────────────────────────────────────────────────
bun run report:checklist       # เปิด Living Checklist HTML (ต้องรัน test ก่อน)

# ── Bruno ──────────────────────────────────────────────────
bun run generate:bru           # สร้าง .bru files จาก features/api/
bun run generate:bru -- --merge  # สร้าง *.merged.bru (base + override รวมกัน)

# ── Setup ──────────────────────────────────────────────────
bun run setup:m-series         # bootstrap Apple Silicon (JDK, Android SDK, Appium)
bun run setup:drivers          # ติดตั้ง Appium drivers (UiAutomator2, XCUITest)
bun run inspect:android        # เปิด Appium Inspector สำหรับ Android
bun run inspect:ios            # เปิด Appium Inspector สำหรับ iOS

# ── Code Quality ───────────────────────────────────────────
bun run format                 # format ทุกไฟล์ (.ts, .feature, .json, .yaml)
bun run format:check           # เช็ค format โดยไม่แก้ไข (ใช้ใน CI)
```

---

## Environment Variables

**Bun โหลด `.env` อัตโนมัติ** สำหรับ utility scripts — WDIO (Node) อ่านผ่าน `process.env`

```bash
cp .env.example .env
```

| Variable              | Default                              | ใช้ที่ไหน                                                            |
| --------------------- | ------------------------------------ | -------------------------------------------------------------------- |
| `BASE_URL`            | `https://the-internet.herokuapp.com` | `browser.url('/login')` → `BASE_URL/login`                           |
| `API_BASE_URL`        | `http://localhost:4010`              | `BaseAPI` constructor                                                |
| `MOBILE_PLATFORM`     | (unset = web)                        | กำหนด capability: `android` \| `ios`                                 |
| `ANDROID_APP_PATH`    | `apps/app-mock-release.apk`          | Appium Android `app` capability                                      |
| `IOS_APP_PATH`        | `apps/Runner.app`                    | Appium iOS `app` capability                                          |
| `ANDROID_AVD`         | `Pixel_7_API_34_arm64`               | `start-android.sh` — ชื่อ AVD ที่จะ boot                             |
| `ANDROID_APP_PACKAGE` | (unset)                              | `start-android.sh` — launch app หลัง install (optional)              |
| `APPIUM_PORT`         | `4723`                               | Appium server port                                                   |
| `APP_READY`           | `false`                              | `true` = skip APK reinstall (set อัตโนมัติโดย `run-mobile-tests.sh`) |
| `RELEASE_TAG`         | git branch name                      | Living Checklist report label                                        |
| `TAGS`                | (unset = all)                        | `TAGS='@smoke' bun run test`                                         |

**สลับ environment ทำแค่เปลี่ยน `.env`:**

```bash
# ทดสอบกับ Prism mock
API_BASE_URL=http://localhost:4010

# ทดสอบกับ real API
API_BASE_URL=http://localhost:3000

# ทดสอบกับ staging
BASE_URL=https://staging.myapp.com
API_BASE_URL=https://api.staging.myapp.com
```

---

## เขียน Feature File

Feature files อยู่ใน `features/ui/`, `features/api/`, `features/mobile/`

### โครงสร้างพื้นฐาน

```gherkin
Feature: ชื่อ feature — บอก business capability

  Background:
    Given ฉันอยู่ที่หน้า Login   # รันก่อนทุก Scenario

  Scenario: เข้าสู่ระบบสำเร็จ
    When ฉันกรอกชื่อผู้ใช้ว่า "alice"
    And ฉันกรอกรหัสผ่านว่า "secret"
    And ฉันกดปุ่ม "Login"
    Then ฉันควรจะเห็นข้อความเตือนว่า "Welcome!"
```

### Tags

```gherkin
@smoke
Scenario: เข้าสู่ระบบสำเร็จ
  ...

@manual
Scenario: ตรวจสอบ UI ที่ไม่สามารถ automate ได้
  # Living Checklist แสดง scenario นี้เป็น checkbox แทน badge
  ...
```

```bash
TAGS='@smoke' bun run test        # รันเฉพาะ smoke
TAGS='not @manual' bun run test   # ข้าม manual scenarios
```

### DataTable

```gherkin
When ฉันเรียก POST "/api/users" ด้วย:
  | username | email             |
  | alice    | alice@example.com |
```

### กฎสำคัญ

- **1 Feature file = 1 business capability**
- **1 Scenario = independent** — ไม่พึ่ง scenario อื่น
- **Step text ต้องตรงกับ step definition** — ไม่ตรงจะ fail ด้วย `Undefined step`
- **URL ห้าม hardcode** — ใช้ path (`/login`) ให้ WDIO ต่อกับ `baseUrl` เอง

---

## เขียน Step Definitions

Step files อยู่ใน `steps/ui/`, `steps/api/`, `steps/mobile/`

> **กฎ:** ใช้ `function` keyword เสมอ (ไม่ใช่ arrow function) เพื่อให้ `this` เป็น `AppWorld`

### ตัวอย่าง UI Steps

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../../fixtures/index.ts';
import { LoginPage } from '../../pages/login.page.ts';

Given('ฉันอยู่ที่หน้า Login', async function (this: AppWorld) {
  await browser.url('/login'); // baseUrl มาจาก wdio.conf.ts → .env
});

When('ฉันกรอกชื่อผู้ใช้ว่า {string}', async function (this: AppWorld, username: string) {
  const page = new LoginPage();
  await page.fillUsername(username);
});

Then('ฉันควรจะเห็นข้อความเตือนว่า {string}', async function (this: AppWorld, message: string) {
  await $(`*=${message}`).waitForDisplayed({ timeout: 10_000 });
});
```

### ตัวอย่าง API Steps

```typescript
import { When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../../fixtures/index.ts';
import { BaseAPI } from '../../support/api/base-api.ts';

When('ฉันเรียก GET {string}', async function (this: AppWorld, path: string) {
  const api = new BaseAPI(process.env['API_BASE_URL'] ?? 'http://localhost:4010');
  this.lastResponse = await api.get(path);
  // เก็บไว้ใน this (AppWorld) เพื่อให้ Then steps ใช้ต่อได้
});

Then('status code ควรเป็น {int}', async function (this: AppWorld, status: number) {
  if (this.lastResponse!.status !== status)
    throw new Error(`Expected ${status} but got ${this.lastResponse!.status}`);
});
```

### Parameter Types

| Gherkin    | TypeScript  | ตัวอย่าง                              |
| ---------- | ----------- | ------------------------------------- |
| `{string}` | `string`    | `"hello world"`                       |
| `{int}`    | `number`    | `200`                                 |
| `{float}`  | `number`    | `3.14`                                |
| DataTable  | `DataTable` | `table.hashes()` → `[{ key: "val" }]` |

---

## Page & Screen Objects

### Page Objects (Web) — `pages/`

ใช้ WDIO getter pattern — element resolve ทุกครั้งที่เรียก (ไม่ stale):

```typescript
// pages/login.page.ts
export class LoginPage {
  get usernameInput() {
    return $('#username');
  }
  get passwordInput() {
    return $('#password');
  }

  async fillUsername(username: string) {
    await this.usernameInput.setValue(username);
  }
}
```

**ทำไมต้องใช้ Page Object?**

```
UI เปลี่ยน selector จาก #username → [data-testid="username"]
                              ↓
แก้ที่ pages/login.page.ts จุดเดียว — step files ไม่ต้องแตะ
```

### Screen Objects (Mobile) — `screens/`

extends `BaseScreen` ซึ่งมี helper methods สำหรับ Appium:

```typescript
// screens/login.screen.ts
export class LoginScreen extends BaseScreen {
  // byId('x') → $('~x') → Appium accessibility id selector
  get emailField() {
    return this.byId('login_email_field');
  }
  get loginButton() {
    return this.byId('login_submit_button');
  }

  async fillEmail(email: string) {
    const el = await this.waitForElement(this.emailField);
    await this.setText(el, email);
  }
}
```

Screen objects ที่มีอยู่:

| File                   | หน้า                                               |
| ---------------------- | -------------------------------------------------- |
| `base.screen.ts`       | Abstract base — waitForElement, tap, scroll, swipe |
| `onboarding.screen.ts` | Welcome / onboarding screen                        |
| `login.screen.ts`      | Email tab, Phone tab, Login button                 |
| `pdpa.screen.ts`       | PDPA Consent — accept button                       |
| `home.screen.ts`       | Home screen + bottom navigation bar                |

Flutter app ต้องมี `Semantics(identifier: '...')` ครอบ widget:

```dart
Semantics(
  identifier: 'login_email_field',  // → UIAutomator2: ~login_email_field
  child: TextField(...),
)
```

---

## API Testing

### BaseAPI

`support/api/base-api.ts` ใช้ global `fetch` — รันได้โดยไม่ต้องเปิด browser:

```typescript
const api = new BaseAPI('http://localhost:4010');

const res = await api.get('/api/users');
const res = await api.post('/api/users', { username: 'alice', email: 'alice@example.com' });
const res = await api.put('/api/users/1', { username: 'alice-updated' });
const res = await api.delete('/api/users/1');

// อ่าน response
console.log(res.status); // 200
const body = await res.json(); // parse JSON body
```

### ทดสอบ Error Cases กับ Prism Mock

Prism คืน response แรก (2xx) เสมอ ต้องใช้ `Prefer` header:

```gherkin
Scenario: ดึง user ที่ไม่มีอยู่ ควรได้ 404
  Given ทดสอบ error case ด้วย status 404
  When  ฉันเรียก GET "/api/users/9999"
  Then  status code ควรเป็น 404
```

> เมื่อ switch ไป real API ลบ `Given ทดสอบ error case...` ออกได้เลย

---

## Mobile Testing

### Architecture

```
Flutter App → Semantics(identifier: '...')
                        ↓
              Android: content-desc   iOS: accessibilityIdentifier
                        ↓
              Appium UIAutomator2 / XCUITest
                        ↓
              WDIO $('~identifier') selector
```

### Workflow ปกติ

Mobile testing แยกออกเป็น 2 ขั้นตอนชัดเจน:

**ขั้น 1 — เตรียม environment (ทำครั้งเดียวต่อ session)**

```bash
bun run start:android
```

script นี้จะ:

1. Boot emulator AVD (`Pixel_7_API_34_arm64`) ถ้ายังไม่รัน
2. หยุด Appium เก่า (ถ้ามี `.appium.pid`) แล้วเริ่มใหม่ที่ port 4723
3. รอ Appium พร้อม (poll `/status` สูงสุด 30 วินาที)
4. เปิด Android accessibility สำหรับ Flutter Semantics bridge
5. ติดตั้ง APK ด้วย `adb install -r`

**ขั้น 2 — รัน tests**

```bash
# รัน mobile suite ทั้งหมด
bun run test:mobile:android

# รัน feature เฉพาะ (ชื่อไฟล์ ไม่ต้อง path/extension)
bun run test:mobile:android -- --feature login
bun run test:mobile:android -- --feature navigation

# รัน ด้วย full path
bun run test:mobile:android -- --spec features/mobile/login.feature

# รัน scenario เฉพาะ (partial match กับชื่อ scenario)
bun run test:mobile:android -- --scenario "กรอก email และ password"

# รัน ด้วย Cucumber tag
bun run test:mobile:android -- --tags @smoke
TAGS='@smoke' bun run test:mobile:android

# รวม filter
bun run test:mobile:android -- --feature login --tags "@happy-path"
bun run test:mobile:android -- --feature login --scenario "เข้าสู่ระบบสำเร็จ"
```

`run-mobile-tests.sh` ทำ pre-flight checks ก่อนรัน — ถ้า emulator ไม่ได้เชื่อมต่อหรือ Appium ไม่รัน จะ fail พร้อมคำแนะนำ:

```
❌ No Android emulator connected.
   Run first:  bun run start:android
```

### APP_READY — skip reinstall + data cleared

`run-mobile-tests.sh` ตั้ง `APP_READY=true` อัตโนมัติ → WDIO ข้ามการ reinstall APK
(เพราะ `start:android` ติดตั้ง + clear data ให้แล้ว):

**ผลข้าง ๆ**:

- `adb install -r` ตั้ง `noReset: true` → เร็ว ไม่ต้อง reinstall
- `pm clear <package>` ใน `start:android` → ทุกครั้ง reset app state → tests เริ่มจาก Onboarding เสมอ
- ไม่มี stale data จากรอบ test ก่อนหน้า

```bash
# Force full reinstall (สำหรับ CI หรือเมื่อ APK เปลี่ยน)
APP_READY=false bun run test:mobile:android
```

### Capability ที่ใช้

| ค่า              | Android                     | iOS                |
| ---------------- | --------------------------- | ------------------ |
| `automationName` | `UiAutomator2`              | `XCUITest`         |
| `app`            | `apps/app-mock-release.apk` | `apps/Runner.app`  |
| `avd`            | `Pixel_7_API_34_arm64`      | —                  |
| selector         | `$('~identifier')`          | `$('~identifier')` |

### Appium Inspector

ใช้ inspect UI element บน emulator/simulator ที่รันอยู่:

```bash
bun run inspect:android   # เปิด Inspector สำหรับ Android
bun run inspect:ios       # เปิด Inspector สำหรับ iOS
```

---

## Cucumber World

`fixtures/index.ts` กำหนด `AppWorld` class — สร้างใหม่ทุก scenario, ไม่มี state รั่ว:

```typescript
export class AppWorld extends World {
  lastResponse: Response | null = null; // response ล่าสุดจาก API
  preferCode: number | null = null; // Prism Prefer header
}
```

Step files เข้าถึง world ผ่าน `this`:

```typescript
Given('step', async function (this: AppWorld) {
  this.lastResponse = await api.get('/path');
});

Then('step', async function (this: AppWorld) {
  console.log(this.lastResponse?.status); // 200
});
```

**Before hook** reset ทุก property อัตโนมัติก่อน scenario
**After hook** ถ่าย screenshot เมื่อ fail (web suite)

---

## Mock API ด้วย Prism

```bash
bun run mock
# Prism is listening on http://0.0.0.0:4010
```

```
openapi.yaml ──► Prism mock (port 4010) ──► API tests
                                       ──► Bruno (manual explore)
```

| สถานการณ์         | ตั้งค่า                                               |
| ----------------- | ----------------------------------------------------- |
| API ยังไม่พร้อม   | `API_BASE_URL=http://localhost:4010` + `bun run mock` |
| API พร้อมบน local | `API_BASE_URL=http://localhost:3000`                  |
| ทดสอบบน staging   | `API_BASE_URL=https://api.staging.myapp.com`          |

---

## Bruno API Collection

### เปิด Collection

1. เปิด Bruno app → **Open Collection** → เลือกโฟลเดอร์ `bruno/`
2. เลือก environment: **local** (Prism) หรือ **staging**
3. ส่ง request ได้เลย

### Auto-generate + Override System

```bash
bun run generate:bru          # สร้าง base .bru files จาก features/api/
bun run generate:bru -- --merge  # สร้าง *.merged.bru = base + override
```

Override system:

```
bruno/users/
├── 01-get-api-users-200.bru          ← auto-generated (ถูก overwrite ได้)
├── 01-get-api-users-200.override.bru ← manual edits (NEVER overwritten)
└── 01-get-api-users-200.merged.bru   ← debug only (--merge flag)
```

แก้ไขแค่ `*.override.bru` — script จะไม่แตะ override files เลย

---

## Living Checklist Reporter

Custom WDIO reporter ที่ track test history ข้าม releases:

```bash
# รันพร้อม tag release
RELEASE_TAG=v1.2.0 bun run test

# เปิด report
bun run report:checklist
```

**Features:**

- **Release selector** — เลือกดู release ไหนก็ได้จาก history
- **Trend chart** — กราฟ automated vs manual ข้าม releases
- **`@manual` tag** — แสดงเป็น interactive checkbox (เก็บไว้ใน localStorage)
- **Compare mode** — diff สอง releases (new/removed/changed scenarios)
- **Export** — Markdown หรือ JSON

**ค่า RELEASE_TAG:**

```bash
RELEASE_TAG=v1.0.0 bun run test      # version
RELEASE_TAG=sprint-23 bun run test   # sprint
RELEASE_TAG=hotfix-auth bun run test # branch/feature
# ถ้าไม่ระบุ → ใช้ git branch name อัตโนมัติ
```

---

## Config Files อธิบาย

### `wdio.conf.ts`

```typescript
export const config = {
  specs: ['./features/**/*.feature'],

  suites: {
    web:    ['./features/ui/**/*.feature'],
    api:    ['./features/api/**/*.feature'],
    mobile: ['./features/mobile/**/*.feature'],
  },

  framework: '@wdio/cucumber-framework',
  cucumberOpts: {
    require: ['./fixtures/index.ts', './steps/**/*.ts'],
    timeout: 60_000,
    tagExpression: process.env['TAGS'], // TAGS='@smoke' กรอง scenario
  },

  baseUrl: process.env['BASE_URL'] ?? 'https://the-internet.herokuapp.com',

  // Appium ไม่ใช้ @wdio/appium-service — manage ด้วย start-android.sh แทน
  // (Appium v3 เขียน log ไปที่ stderr — service จะ fail ใน onPrepare)
  services: [],

  reporters: ['spec', 'allure', [LivingChecklistReporter, { ... }]],
};
```

**APP_READY flag:**

```typescript
// APP_READY=true → noReset: true, dontStopAppOnReset: true
// APP_READY=false (default) → full clean install
const appReady = process.env['APP_READY'] === 'true';
```

**เลือก suite:**

```bash
bun run test:web              # WDIO --suite web
bun run test:api              # WDIO --suite api
bun run test:mobile:android   # MOBILE_PLATFORM=android + APP_READY=true + --suite mobile
```

### `tsconfig.json`

| Option                 | ค่า                            | ผลกระทบ                                 |
| ---------------------- | ------------------------------ | --------------------------------------- |
| `strict`               | `true`                         | TypeScript strict mode ทั้งหมด          |
| `moduleResolution`     | `"bundler"`                    | ใช้กับ Bun scripts                      |
| `verbatimModuleSyntax` | `true`                         | type-only imports ต้องใช้ `import type` |
| `types`                | `["@wdio/globals/types", ...]` | `browser`, `$`, `$$` เป็น globals       |
| `ts-node.esm`          | `true`                         | WDIO โหลด config/steps ผ่าน ts-node ESM |

---

## ดู Test Results

### Terminal (spec reporter)

ผลแสดงทันทีระหว่างรัน — pass/fail ต่อ scenario

### Allure Report

```bash
# ต้องติดตั้ง allure CLI ก่อน
brew install allure
allure serve allure-results
```

### Living Checklist

```bash
bun run report:checklist
# เปิด reports/living-checklist.html ใน browser
```

---

## เพิ่ม Feature ใหม่

### เพิ่ม Web Feature

```bash
# 1. สร้าง feature file
touch features/ui/checkout.feature

# 2. เขียน scenarios ก่อน (BDD: write feature first)

# 3. สร้าง Page Object (ถ้ามีหน้าใหม่)
touch pages/checkout.page.ts

# 4. สร้าง step definitions
touch steps/ui/checkout.steps.ts

# 5. รัน
bun run test:web
```

### เพิ่ม API Feature

```bash
# 1. เพิ่ม endpoint ใน openapi.yaml

# 2. สร้าง feature file
touch features/api/products.feature

# 3. step definitions ทั่วไป (GET, POST, status check)
#    มีอยู่แล้วใน users.steps.ts — ใช้ร่วมกันได้เลย

# 4. Generate Bruno collection
bun run generate:bru

# 5. รัน
bun run test:api
```

### เพิ่ม Mobile Feature

```bash
# 1. เตรียม environment (ถ้ายังไม่ได้ทำ)
bun run start:android

# 2. สร้าง feature file
touch features/mobile/checkout.feature

# 3. Inspect UI ด้วย Appium Inspector เพื่อหา accessibility identifiers
bun run inspect:android

# 4. สร้าง Screen Object (ถ้ามีหน้าใหม่)
touch screens/checkout.screen.ts
# → extend BaseScreen, ใช้ this.byId('accessibility_id') สำหรับ native
# → หรือ this.flutterByKey('value_key') สำหรับ Flutter (automationName: FlutterIntegration)

# 5. สร้าง step definitions
touch steps/mobile/checkout.steps.ts

# 6. รัน เฉพาะ feature ใหม่
bun run test:mobile:android -- --feature checkout

# 7. รัน ทั้งหมด
bun run test:mobile:android
```

---

## Common Mistakes

### ใช้ arrow function ใน step definitions

```typescript
// ❌ this เป็น undefined
Given('step', async () => {
  this.lastResponse; // undefined!
});

// ✅ ถูกต้อง — function keyword ให้ this เป็น AppWorld
Given('step', async function (this: AppWorld) {
  this.lastResponse; // ✓
});
```

### import ผิดที่

```typescript
// ❌
import { Given } from 'playwright-bdd'; // ไม่มีแล้ว

// ✅
import { Given, When, Then } from '@cucumber/cucumber';
```

### ใช้ browser global ใน API steps

```typescript
// ❌ browser ไม่มีใน API suite (ไม่เปิด browser)
When('step', async function (this: AppWorld) {
  await browser.url('/api/users'); // ERROR
});

// ✅ ใช้ BaseAPI (global fetch)
When('step', async function (this: AppWorld) {
  const api = new BaseAPI(process.env['API_BASE_URL']!);
  this.lastResponse = await api.get('/api/users');
});
```

### Module-level state

```typescript
// ❌ state รั่วระหว่าง scenarios
let lastResponse: Response;

// ✅ ใช้ this (AppWorld) — scoped ต่อ scenario
Given('step', async function (this: AppWorld) {
  this.lastResponse = await fetch('/api');
});
```

### รัน mobile tests โดยไม่ start environment ก่อน

```bash
# ❌ ถ้า Appium ไม่รัน → error ทันที
bun run test:mobile:android

# ✅ เตรียม environment ก่อนเสมอ (ครั้งเดียวต่อ session)
bun run start:android
bun run test:mobile:android
```

### URL hardcode ใน Feature

```gherkin
# ❌ เปลี่ยน environment ต้องแก้ feature
Given ฉันอยู่ที่ "https://production.myapp.com/login"

# ✅ ใช้ path — baseUrl อ่านจาก .env ผ่าน wdio.conf.ts
Given ฉันอยู่ที่หน้า Login
# step: browser.url('/login')
```

### type import ผิด

```typescript
// ❌ error กับ verbatimModuleSyntax
import { AppWorld } from '../../fixtures/index.ts'; // value import

// ✅
import type { AppWorld } from '../../fixtures/index.ts';
```
