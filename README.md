# BDD Automation Framework

Framework สำหรับ **Behavior-Driven Development (BDD)** ครอบคลุม Web UI, API, และ Mobile (Flutter/Native)
ภายใต้ runner เดียว พร้อม mock server, API collection, และ living checklist report

---

## สารบัญ

1. [BDD คืออะไร](#bdd-คืออะไร)
2. [Stack](#stack)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [How to Read This Project](#how-to-read-this-project)
6. [โครงสร้างโปรเจค](#โครงสร้างโปรเจค)
7. [Workflow การทำงาน](#workflow-การทำงาน)
8. [Scripts](#scripts)
9. [Environment Variables](#environment-variables)
10. [เขียน Feature File](#เขียน-feature-file)
11. [เขียน Step Definitions](#เขียน-step-definitions)
12. [Page & Screen Objects](#page--screen-objects)
13. [API Testing](#api-testing)
14. [Mobile Testing](#mobile-testing)
15. [Cucumber World](#cucumber-world)
16. [Mock API ด้วย Prism](#mock-api-ด้วย-prism)
17. [Bruno API Collection](#bruno-api-collection)
18. [Living Checklist Reporter](#living-checklist-reporter)
19. [Config Files อธิบาย](#config-files-อธิบาย)
20. [ดู Test Results](#ดู-test-results)
21. [เพิ่ม Feature ใหม่](#เพิ่ม-feature-ใหม่)
22. [AI-Assisted Test Discovery](#ai-assisted-test-discovery)
23. [DevTools Panel](#devtools-panel)
24. [The One Prompt: Explore → Understand → Test](#the-one-prompt-explore--understand--test)
25. [How to Prompt Claude](#how-to-prompt-claude)
26. [Tag Strategy](#tag-strategy)
27. [Common Mistakes](#common-mistakes)

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
# ติดตั้งทุกอย่าง: JDK, Android SDK, ARM64 emulator, Xcode, iOS Simulator, Appium drivers
bun run setup              # interactive — เลือก Android / iOS / Both
bun run setup:android      # Android only
bun run setup:ios          # iOS only
```

---

## Quick Start

### Setup (First Time Only)

```bash
# 1. ติดตั้ง dependencies
bun install

# 2. สร้าง environment config
cp .env.example .env

# 3. Setup mobile environment (interactive — เลือก Android / iOS / Both)
bun run setup
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
# [Terminal 1] Android: boot emulator + start Appium + install APK
bun run android

# [Terminal 1] iOS: boot simulator + extract .ipa → .app + install + start Appium
bun run ios
```

**Then run tests** (emulator/simulator + Appium จะรันอยู่ตลอด):

```bash
# [Terminal 2] รัน mobile tests
bun run test:mobile:android
bun run test:mobile:ios

# หรือรัน feature เฉพาะ
bun run test:mobile:android -- --feature login
bun run test:mobile:ios -- --feature login
```

สาเหตุการแยก `android`/`ios` ออกจาก `test:mobile:*`:

- **`android`/`ios`** เปิด emulator/simulator + Appium ครั้งเดียว → ประหยัด boot time
- **`test:mobile:*`** รัน tests ซ้ำๆ ไม่ต้อง restart environment
- Pre-flight checks → fail fast ถ้า emulator/simulator/Appium ไม่พร้อม

---

## Before Running Tests

| Test Type      | Prerequisites                                          | Setup Script             |
| -------------- | ------------------------------------------------------ | ------------------------ |
| **Web**        | Node.js, Chrome                                        | `bun install` ✓          |
| **API**        | Node.js, Prism mock                                    | `bun install` + `bun run mock` ✓ |
| **Android**    | Android SDK, JDK, Appium, emulator, UiAutomator2       | `bun run setup:android`  |
| **iOS**        | Xcode, iOS Simulator runtime, Appium, XCUITest         | `bun run setup:ios`      |

### First-Time Setup Checklist

- [ ] `bun install` — install Node + Bun dependencies
- [ ] `cp .env.example .env` — create environment config
- [ ] `bun run setup` — setup mobile environment (Android / iOS / Both)

### Before Every Mobile Test Session

```bash
# Android
bun run android    # boot emulator + enable TalkBack + install APK + start Appium

# iOS
bun run ios        # boot simulator + extract .ipa → .app + install + start Appium
```

**`bun run android`** จะ:

1. ✓ Boot emulator (ถ้ายังไม่รัน)
2. ✓ Enable TalkBack (Flutter Semantics bridge)
3. ✓ Install APK
4. ✓ Start Appium server

**`bun run ios`** จะ:

1. ✓ Boot simulator (ถ้ายังไม่รัน) + เปิด Simulator.app
2. ✓ Extract `.ipa` → `.app` (ถ้า `IOS_APP_PATH` ชี้ไป `.ipa`)
3. ✓ Uninstall + reinstall app (fresh ทุกรอบ)
4. ✓ Extract bundle ID อัตโนมัติ
5. ✓ Start Appium server

ถ้า emulator/simulator + Appium รันอยู่แล้ว จะข้ามขั้นตอนนั้น → เร็ว

### Verify Setup

```bash
# Web + API tests
bun run test:web
bun run test:api

# Mobile tests
bun run test:mobile:android   # after bun run android
bun run test:mobile:ios       # after bun run ios
```

---

## How to Read This Project

New to the codebase? Follow this reading order to build a mental model:

| Order | Directory             | What you'll learn                                                           |
| ----- | --------------------- | --------------------------------------------------------------------------- |
| 1     | `features/`           | **WHAT** is tested — read Gherkin scenarios to understand business behavior |
| 2     | `steps/`              | **HOW** scenarios map to code — each `.steps.ts` implements Given/When/Then |
| 3     | `pages/` / `screens/` | **WHERE** elements live — locators and interaction methods                  |
| 4     | `fixtures/`           | **LIFECYCLE** — World class (shared state) + Before/After hooks             |
| 5     | `support/`            | **HELPERS** — API client, mobile gestures, screen detection, logger         |
| 6     | `wdio.conf.ts`        | **RUNTIME** — capabilities, reporters, services, timeouts                   |

**Recommended first read:** Pick any `.feature` file → find its matching `.steps.ts` → find the page/screen object it uses → run it.

```bash
# Example: trace the login flow end-to-end
# 1. Read the scenario
cat features/mobile/login.feature

# 2. Read the step definitions
cat steps/mobile/login.steps.ts

# 3. Read the screen object
cat screens/login.screen.ts

# 4. Run it
TAGS='@phone-enable' bun run test:mobile:android
```

The pattern is always: **Feature → Steps → Page/Screen → Run**.

---

## โครงสร้างโปรเจค

```
bdd/
├── features/                         # ① เขียนก่อนเสมอ — Gherkin (.feature files)
│   ├── web/
│   │   └── login.feature             # Web UI scenarios
│   ├── api/
│   │   └── users.feature             # API scenarios
│   └── mobile/
│       └── login.feature             # Login flow (Email tab, PDPA consent, PIN)
│
├── steps/                            # ② Step definitions — เชื่อม Gherkin กับ code
│   ├── web/
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
│   ├── devtools.screen.ts            # DEV TOOLS panel — session inject + 57-route nav
│   ├── login.screen.ts               # Email/Phone login, PDPA
│   ├── onboarding.screen.ts          # Onboarding / welcome screen
│   ├── home.screen.ts                # Home + bottom navigation
│   ├── pdpa.screen.ts                # PDPA Consent screen
│   └── pincode.screen.ts             # Set PIN / Confirm PIN
│
├── fixtures/
│   └── index.ts                      # Cucumber World class + Before/After hooks
│
├── support/
│   ├── api/
│   │   ├── base-api.ts               # standalone fetch wrapper (no browser)
│   │   └── client.ts                 # re-export alias
│   ├── data/
│   │   └── users.data.ts             # test data constants
│   ├── env.config.ts                 # centralised env var access
│   ├── mobile-gestures.ts            # reusable Appium gesture helpers
│   ├── context-switcher.ts           # native ↔ webview context switching
│   └── logger.ts                     # Winston logger (debug output)
│
├── discovery/                        # AI-generated screen catalog (auto-created)
│   └── screenshots/                  # per-route screenshots from wdio-mcp discovery
│
├── reporters/
│   └── living-checklist/
│       ├── index.ts                  # custom WDIO reporter
│       ├── template.ts               # HTML generator
│       └── types.ts                  # TypeScript interfaces
│
├── scripts/
│   ├── setup.sh                      # unified setup: Android / iOS / Both (interactive)
│   ├── start-android-all.sh          # boot emulator + enable TalkBack + install APK + start Appium
│   ├── start-ios-all.sh              # boot simulator + extract .ipa → .app + install + start Appium
│   ├── run-mobile-tests.sh           # pre-flight checks + run WDIO mobile suite
│   ├── lib/
│   │   ├── defaults.sh               # shared defaults + .env loader
│   │   ├── common.sh                 # Android helpers (boot, TalkBack, Appium)
│   │   ├── ios-common.sh             # iOS helpers (boot, UDID, IPA extract, install)
│   │   ├── setup-common.sh           # shared setup (Homebrew, JDK, Bun, Node)
│   │   ├── setup-android.sh          # Android setup (SDK, AVD, UiAutomator2)
│   │   └── setup-ios.sh              # iOS setup (Xcode, runtime, simulator, XCUITest)
│   └── talkback.sh                   # toggle TalkBack on/off
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
├── apps/                             # (gitignored) APK / .ipa / .app binaries
├── capabilities.json                 # Appium capabilities for Inspector (Android + iOS)
├── .mcp.json                         # wdio-mcp MCP server configuration
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
bun run android          # boot emulator + enable TalkBack + install APK + start Appium
bun run ios              # boot simulator + extract .ipa → .app + install + start Appium

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
bun run setup                  # unified setup: interactive (Android / iOS / Both)
bun run setup:android          # Android only (SDK, AVD, UiAutomator2 driver)
bun run setup:ios              # iOS only (Xcode, runtime, simulator, XCUITest driver)

# ── Emulator Mode ───────────────────────────────────────────
bun run emulator:interactive   # TalkBack OFF — ใช้ emulator ปกติ (manual / wdio-mcp)
bun run emulator:test-mode     # TalkBack ON  — เปิด Flutter Semantics bridge (ก่อนรัน tests)

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
| `IOS_APP_PATH`        | `apps/Runner.app`                    | Appium iOS `app` capability (รองรับทั้ง `.app` และ `.ipa` — auto-extract) |
| `IOS_DEVICE_NAME`     | (required for iOS)                   | ชื่อ iOS Simulator เช่น `iPhone 17`                                  |
| `IOS_PLATFORM_VER`    | (required for iOS)                   | iOS version เช่น `26.3` (ใช้ major.minor ไม่ใช่ patch)              |
| `IOS_BUNDLE_ID`       | auto-extracted from `.app`           | Bundle ID ของ iOS app                                                |
| `ANDROID_AVD`         | `Pixel_7_API_34_arm64`               | ชื่อ AVD ที่จะ boot                                                  |
| `APP_PACKAGE`         | auto-extracted from APK              | Android package name                                                 |
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

Feature files อยู่ใน `features/web/`, `features/api/`, `features/mobile/`

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

Step files อยู่ใน `steps/web/`, `steps/api/`, `steps/mobile/`

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

| File                       | หน้า                                                     |
| -------------------------- | -------------------------------------------------------- |
| `base.screen.ts`           | Abstract base — waitForElement, tap, scroll, swipe       |
| `devtools.screen.ts`       | DEV TOOLS panel — inject session, navigate 61 routes     |
| `onboarding.screen.ts`     | Welcome / onboarding screen                              |
| `login.screen.ts`          | Email tab, Phone tab, Login button                       |
| `pdpa.screen.ts`           | PDPA Consent — accept button                             |
| `home.screen.ts`           | Home screen + bottom navigation bar                      |
| `pincode.screen.ts`        | Set PIN + Confirm PIN (6-digit entry)                    |
| `wallet.screen.ts`         | Wallet tab — Crypto/THBK tabs, Token list, quick actions |
| `history.screen.ts`        | Crypto History — Token/NFT/Point tabs, transaction rows  |
| `profile-menu.screen.ts`   | Profile menu — app*menu*\* resource-ids, View Profile    |
| `settings.screen.ts`       | Application Setting — Appearances, Languages             |
| `my-profile.screen.ts`     | Profile Information — masking toggle, phone/email rows   |
| `nft-collection.screen.ts` | NFT Collections — wallet address, empty state            |

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
# Android
bun run android

# iOS
bun run ios
```

**`bun run android`** จะ: boot emulator → enable TalkBack → install APK → start Appium
**`bun run ios`** จะ: boot simulator → extract `.ipa` → `.app` → install (fresh) → start Appium

**ขั้น 2 — รัน tests**

```bash
# รัน mobile suite ทั้งหมด
bun run test:mobile:android
bun run test:mobile:ios

# รัน feature เฉพาะ (ชื่อไฟล์ ไม่ต้อง path/extension)
bun run test:mobile:android -- --feature login
bun run test:mobile:ios -- --feature login

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

`run-mobile-tests.sh` ทำ pre-flight checks ก่อนรัน — ถ้า emulator/simulator ไม่ได้เชื่อมต่อหรือ Appium ไม่รัน จะ fail พร้อมคำแนะนำ:

```
❌ No Android emulator connected.
   Run first:  bun run android

❌ No iOS simulator booted.
   Run first:  bun run ios
```

### APP_READY — skip reinstall + data cleared

`run-mobile-tests.sh` ตั้ง `APP_READY=true` อัตโนมัติ → WDIO ข้ามการ reinstall APK
(เพราะ `android` ติดตั้ง + clear data ให้แล้ว):

**ผลข้าง ๆ**:

- `adb install -r` ตั้ง `noReset: true` → เร็ว ไม่ต้อง reinstall
- `pm clear <package>` ใน `android` → ทุกครั้ง reset app state → tests เริ่มจาก Onboarding เสมอ
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

ใช้ inspect UI element บน emulator ที่รันอยู่ — เปิด Appium Inspector app แล้วตั้งค่า:

```
Remote Host: localhost
Remote Port: 4723
Desired Capabilities: (copy จาก capabilities.json ที่ project root)
```

> หรือใช้ **wdio-mcp** ใน Claude Code แทน Appium Inspector (เร็วกว่า, ไม่ต้องเปิด app):

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
    web:    ['./features/web/**/*.feature'],
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

  // Appium ไม่ใช้ @wdio/appium-service — manage ด้วย start-android-all.sh / start-ios-all.sh แทน
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

### Terminal — Spec Reporter

The spec reporter prints real-time results during the run. Each step shows ✓ (pass) or ✗ (fail) with duration:

```
[chrome]  ✓ Given ฉันอยู่ที่หน้า Login (1.2s)
[chrome]  ✓ When ฉันกรอกชื่อผู้ใช้ว่า "alice" (0.3s)
[chrome]  ✓ Then ฉันควรเห็นหน้า Dashboard (0.8s)

3 passing (2.3s)
```

### Allure Report

Rich HTML report with screenshots, step timeline, environment info, and historical trends.

```bash
# Install Allure CLI (one-time)
brew install allure

# Serve report from latest test results (auto-opens browser)
bun run report:allure

# Or generate static HTML for sharing (output: allure-report/)
bun run report:generate
```

**What's inside:**

- **Overview** — pass/fail summary, duration, environment metadata
- **Suites** — expandable test tree with step-by-step timeline
- **Screenshots** — automatically attached on failure (see below)
- **Categories** — failure classification (product bug vs test defect)
- **Trends** — historical pass rate across runs (when using `allure-results` history)

### Screenshot on Failure

Two hooks ensure screenshots are captured even when sessions are unstable:

| Hook        | Location            | When it fires                                                      |
| ----------- | ------------------- | ------------------------------------------------------------------ |
| `afterTest` | `wdio.conf.ts`      | After every failed test — wrapped in try/catch for session crashes |
| `After`     | `fixtures/index.ts` | Cucumber hook — checks session health before capturing             |

Screenshots are auto-attached to Allure report via `disableWebdriverScreenshotsReporting: false`.

### Video Recording (Web Only)

`wdio-video-reporter` records browser sessions for failed web tests. **Disabled for mobile** — rapid Appium screenshots cause "socket hang up" crashes.

- Videos saved to `reports/videos/` (only failed tests, 3x slowdown for review)
- Automatically included in Allure report for web test runs

### Living Checklist

Interactive HTML report for release sign-off — compare releases, check off manual items, export results.

```bash
# Generate and serve Living Checklist
bun run report:checklist
# Output: reports/living-checklist.html — open in browser
```

**Features:**

- Release comparison (diff between test runs)
- Manual checkboxes for human verification items
- Export to PDF/HTML for stakeholder sharing
- Auto-save progress via local server

---

## เพิ่ม Feature ใหม่

### เพิ่ม Web Feature

```bash
# 1. สร้าง feature file
touch features/web/checkout.feature

# 2. เขียน scenarios ก่อน (BDD: write feature first)

# 3. สร้าง Page Object (ถ้ามีหน้าใหม่)
touch pages/checkout.page.ts

# 4. สร้าง step definitions
touch steps/web/checkout.steps.ts

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
bun run android

# 2. สร้าง feature file
touch features/mobile/checkout.feature

# 3. Inspect UI ด้วย wdio-mcp ใน Claude Code หรือ Appium Inspector app
#    ดู capabilities.json ที่ project root สำหรับ Appium Inspector settings

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

## AI-Assisted Test Discovery

Framework รองรับ workflow ที่ให้ AI (Claude) ใช้ **wdio-mcp** เพื่อเปิด app, navigate ทุกหน้า, screenshot + inspect elements, แล้ว generate screen objects และ feature files อัตโนมัติ

### Prerequisites

```bash
# 1. Boot emulator + start Appium
bun run android

# 2. Enable TalkBack (Flutter Semantics bridge ต้องการ accessibility)
adb shell settings put secure enabled_accessibility_services \
  com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService
adb shell settings put secure accessibility_enabled 1
```

### วิธี Trigger Discovery

พิมพ์ prompt ภาษาไทยให้ Claude:

```
เปิด apps/app-mock-release.apk บน Android emulator แล้ว:
1. ถ่าย screenshot หน้าแรก
2. generate locators ทุก element
3. เขียน features/mobile/checkout.feature + steps/mobile/checkout.steps.ts + screens/checkout.screen.ts
   ให้ตรงกับ UI ที่เห็นจริงๆ
```

```
ดูหน้า dashboard ของ app แล้วเขียน feature test สำหรับ navigation ทุก tab bar item
ใช้ UiAutomator2 resource-id locators
```

### Discovery Protocol (Claude ทำอัตโนมัติ)

1. **start_app_session** — เปิด app บน emulator
2. **take_screenshot + get_visible_elements** — catalog elements ทุกหน้า
3. **execute_script `mobile: doubleClickGesture`** — เปิด DEV TOOLS (clickable=false bypass)
4. **Inject session** — เพื่อเข้าถึง authenticated screens
5. **Crawl 57 routes** — ถ่าย screenshot + record elements ต่อหน้า
6. **Generate artifacts** — screen objects + feature files + step definitions

### ผลที่ได้

| Artifact         | ที่เก็บ                             |
| ---------------- | ----------------------------------- |
| Screenshots      | `discovery/screenshots/{route}.png` |
| Screen objects   | `screens/{name}.screen.ts`          |
| Feature files    | `features/mobile/{name}.feature`    |
| Step definitions | `steps/mobile/{name}.steps.ts`      |

> **หมายเหตุ:** ใช้ **wdio-mcp เท่านั้น** — ห้ามใช้ appium-mcp ควบคู่ (สอง session ทำให้ UiAutomator2 crash)

---

## DevTools Panel

App มี DEV TOOLS overlay ที่ให้ navigate ไปยัง 57 screens ได้โดยตรง ใช้สำหรับ testing authenticated screens โดยไม่ต้อง login จริง

### วิธีเปิด

DEV TOOLS button มี `clickable=false` (Flutter intentional) — ต้องใช้ gesture แทน tap:

```typescript
// wdio-mcp: doubleClickGesture bypasses clickable=false
await driver.executeScript('mobile: doubleClickGesture', [{ x: 1050, y: 1825 }]);
// Pixel 7 API 34 coordinates: x = width * 0.97, y = height * 0.78
```

ใน screen object ใช้ `devtools.open()`:

```typescript
const devTools = new DevToolsScreen();
await devTools.open(); // doubleClickGesture ภายใน
```

### Session Injection

```typescript
await devTools.injectTestSession();
// 1. ค้นหา "Select Test Token" แล้ว tap
// 2. ค้นหา "Inject Session" แล้ว tap
// 3. รอ home screen
```

### Navigation (57 Routes)

```typescript
// GO = replace stack (reset navigation)
await devTools.navigateTo('Home');

// PUSH = push on stack (back button ใช้ได้)
await devTools.pushTo('Token Transfer');
```

Route สำคัญแบ่งตาม auth:

| กลุ่ม     | Routes                                      |
| --------- | ------------------------------------------- |
| Pre-auth  | Onboarding, Login, Signup                   |
| Main tabs | Home, Wallet, DApp, Scanner                 |
| Consent   | TOS, PDPA, Suitability Assessment           |
| Wallet    | History, Point Detail, Wrapable Token       |
| Tokens    | Transfer, Review, Summary, Detail           |
| NFTs      | Collection, Images, Video, Import, Receive  |
| Profile   | Menu, My Profile, Settings, Theme, Language |
| Transfers | Bank, Kub, Join, Programmable, Top Up       |

---

## The One Prompt: Explore → Understand → Test

The core insight: **one structured prompt** drives the entire lifecycle. Claude uses wdio-mcp to live-inspect the app, systematically test each interaction, identify what actually works, then generate tests grounded in verified reality.

### The Prompt Template

Copy this into Claude Code when you want to add tests for any new feature.
All tool calls use **`mcp__wdio-mcp__*`** — the MCP server defined in `.mcp.json`.

```
เปิด [APP_PATH] บน Android emulator แล้วทดสอบ [FEATURE_NAME]:

## Phase 1 — Setup
mcp__wdio-mcp__start_app_session:
  platform: Android
  deviceName: Pixel_7_API_34_arm64
  automationName: UiAutomator2
  appiumHost: localhost
  appiumPort: 4723
  noReset: true
  capabilities: { "appium:app": "<absolute-path>/[APP_PATH]" }

Open DevTools → navigate to [SCREEN]:
  mcp__wdio-mcp__execute_script: "mobile: doubleClickGesture"  args: [{"x":1050,"y":1825}]
  mcp__wdio-mcp__execute_script: "mobile: scrollGesture"
    args: [{"left":0,"top":400,"width":720,"height":1400,"direction":"down","percent":2}]
  mcp__wdio-mcp__click_element:
    selector: //android.view.View[contains(@content-desc,'[ROUTE_NAME]') and contains(@content-desc,'GO')]
    scrollToView: true  timeout: 10000

mcp__wdio-mcp__take_screenshot → confirm we are on the correct screen

## Phase 2 — Explore (visual + structural)
mcp__wdio-mcp__get_visible_elements → catalog every element with locator, clickable, bounds
For scrollable screens:
  mcp__wdio-mcp__scroll (direction: down) → mcp__wdio-mcp__get_visible_elements again
Identify: resource-id (preferred) → content-desc → xpath
Note: check clickable attribute — flutter buttons may be clickable=false

## Phase 3 — Verify each interaction (CRITICAL)
For every button/action that will be tested:
  1. mcp__wdio-mcp__click_element (selector) → mcp__wdio-mcp__take_screenshot → works?
  2. If fails: mcp__wdio-mcp__tap_element → mcp__wdio-mcp__take_screenshot
  3. If fails: mcp__wdio-mcp__execute_script "mobile: clickGesture" args:[{"x":X,"y":Y}]
              → mcp__wdio-mcp__take_screenshot
  Record: which mechanism works / which silently fails
  After each navigation: mcp__wdio-mcp__execute_script "mobile: getPageSource"
    → verify output includes '[expected_text]'

## Phase 4 — Generate artifacts
Using ONLY verified locators and working tap mechanisms:
  screens/[name].screen.ts  — extend BaseScreen, getters only, isOn[Name]Screen()
  features/mobile/[name].feature  — @mobile @devtools @[name]-screen tags + scenarios
  steps/mobile/[name].steps.ts    — function keyword, this: AppWorld, waitForElement+tap+waitForIdle
  For unreliable nav steps: 3s getPageSource check + DevTools fallback

## Phase 4b — Cleanup tag check (REQUIRED for sub-screen scenarios)
For every scenario that navigates AWAY from the Background screen:
  1. Add a unique scenario tag (e.g. @[name]-[action])
  2. Check fixtures/index.ts After hook filter:
       After({ tags: '@wallet-history or @profile-settings or @profile-my-profile' }, ...)
  3. If the new tag is NOT in the filter → add it to the filter
Rule: any scenario that ends on a sub-screen needs BACK navigation cleanup.
If unsure → add the tag anyway (BACK on a root screen is harmless).

## Phase 5 — Verify
Run: TAGS='@[name]-screen' bun run test:mobile:android
All scenarios must pass. If any fail, diagnose and fix before declaring done.
```

### Why Phase 3 Matters

The wallet-history case study shows why tap verification is non-negotiable:

| Element                    | Mechanism tried               | Result         | Root cause                                   |
| -------------------------- | ----------------------------- | -------------- | -------------------------------------------- |
| Transfer button            | `tap_element ~Transfer`       | ✅ Opens modal | Flutter modal — works with accessibility tap |
| History button             | `tap_element ~History`        | ❌ Silent fail | Flutter screen-push nav blocked by TalkBack  |
| History button             | `click_element ~History`      | ❌ Silent fail | Same — accessibility action insufficient     |
| History button             | `execute_script clickGesture` | ❌ Silent fail | Raw touch also blocked                       |
| DevTools `goTo('History')` | —                             | ✅ Works       | Direct route injection bypasses tap entirely |

**Result:** `When I tap the History button` step now: tries native tap → 3s `getPageSource` check → DevTools fallback if needed.
Without Phase 3, the generated test would have used `tap_element` and failed silently every run.

### Substitution Guide

| Placeholder       | Example                                                                             |
| ----------------- | ----------------------------------------------------------------------------------- |
| `[APP_PATH]`      | `apps/app-mock-release.apk`                                                         |
| `[FEATURE_NAME]`  | `Transfer flow / NFT Collection / Profile Settings`                                 |
| `[SCREEN]`        | `Wallet / Profile Menu / Crypto History`                                            |
| `[ROUTE_NAME]`    | `Wallet` / `Menu` / `History` (see `DevToolsRoute` in `screens/devtools.screen.ts`) |
| `[name]`          | `transfer` / `nft` / `settings`                                                     |
| `[expected_text]` | unique string visible in `getPageSource` on that screen                             |

### Quick Variant — Read-Only Screens

For screens with no interactive elements (display only):

```
mcp__wdio-mcp__start_app_session (same capabilities as Phase 1)
DevTools goTo('[ROUTE]') via execute_script doubleClickGesture + click_element XPath
mcp__wdio-mcp__take_screenshot + mcp__wdio-mcp__get_visible_elements
Write screens/[name].screen.ts + features/mobile/[name].feature + steps/mobile/[name].steps.ts
Skip Phase 3 (no taps — only Then/visibility checks)
Run: TAGS='@[name]-screen' bun run test:mobile:android
```

---

## How to Prompt Claude

This section is for **Claude Code** users. Claude can explore the live app, write tests, debug failures, and inspect elements — all through natural language prompts.

### Prerequisites

Before prompting, ensure:

1. **Emulator/Simulator is running**: `bun run android` or `bun run ios`
2. **Appium is alive**: check with `curl http://localhost:4723/status`
3. **TalkBack is ON** (Android only): `bun run emulator:test-mode` (required for Flutter Semantics)

### Prompt Examples by Task

#### Explore a New Screen

```
เปิด apps/app-mock-release.apk บน Android แล้วไปที่หน้า Wallet
ดู elements ทั้งหมดที่อยู่บนหน้า — resource-id, content-desc, clickable
ลอง tap แต่ละ button แล้วบอกว่าอันไหนทำงาน
```

#### Write Tests for an Existing Screen

```
เขียน mobile test สำหรับหน้า Transfer:
- สร้าง screen object (screens/transfer.screen.ts)
- สร้าง feature file (features/mobile/transfer.feature) ใช้ @smoke + @happy-path
- สร้าง step definitions (steps/mobile/transfer.steps.ts)
- รัน TAGS='@smoke' bun run test:mobile:android ให้ผ่าน
```

#### Debug a Failing Test

```
รัน TAGS='@wallet-history' bun run test:mobile:android แล้วดูว่า fail ตรงไหน
เปิด app แล้วไปที่หน้า Wallet History ลอง reproduce ปัญหา
แก้ไขแล้วรันใหม่จนผ่าน
```

#### Inspect Elements Without Writing Tests

```
เปิด app แล้วไปที่หน้า PDPA Consent
screenshot + get_visible_elements แล้วบอก:
- elements ทั้งหมดพร้อม locator strategy
- อันไหน clickable / อันไหนไม่
- แนะนำ locator ที่ดีที่สุดสำหรับแต่ละ element
```

#### Quick English Prompts

```
Open the app, navigate to Home screen via DevTools, take a screenshot and list all elements.

Write @smoke tests for the Profile screen. Use existing patterns from wallet.feature as reference.

The @email-enable test is flaky — investigate and fix.
```

### Tips for Better Prompts

- **Be specific about the screen name** — use route names from DevTools (e.g., "Wallet", "Menu", "History")
- **Mention tag strategy** — "@smoke + @happy-path" tells Claude exactly how to tag scenarios
- **Reference existing patterns** — "use the same pattern as login.steps.ts" grounds the output
- **Ask for verification** — "รันจนผ่าน" ensures Claude runs tests, not just writes them
- **One screen per prompt** — keep prompts focused for best results

---

## Tag Strategy

### Why So Many Tags?

Tags serve **three distinct purposes**. Conflating them creates confusion. Understanding the three layers explains every tag in the codebase.

### The 3 Layers

#### Layer 1 — Environment Tags (Feature-level)

These trigger `Before` hooks in `fixtures/index.ts`. They control **what setup runs before each scenario**.

| Tag             | Hook                               | What it does                                                           |
| --------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| `@mobile`       | `Before { tags: '@mobile' }`       | Health check: verify Appium session is alive                           |
| `@login-screen` | `Before { tags: '@login-screen' }` | Navigate to Login screen via DevTools before each scenario             |
| `@devtools`     | `Before { tags: '@devtools' }`     | Inject test session token via DevTools (skip if already authenticated) |
| `@navigation`   | `Before { tags: '@navigation' }`   | Full login flow once per session (for navigation tests)                |

**Rule: every mobile feature file needs `@mobile` at the top.** Add `@devtools` when the feature needs authentication. Add `@login-screen` only for login screen tests.

#### Layer 2 — Screen Scope Tags (Feature-level)

One per feature file. Identifies which screen is being tested — used for filtering runs.

```
@wallet-screen    →  features/mobile/wallet.feature
@profile-screen   →  features/mobile/profile.feature
@login-screen     →  features/mobile/login.feature  (doubles as Layer 1)
```

**Rule: one `@{screen}-screen` tag per feature file.**

#### Layer 3 — Scenario Tags (Scenario-level)

Two sub-types:

**3a. Domain tags** — describe what is being tested. Used for selective runs.

```
@smoke            — critical path scenario (must always pass, run in CI)
@wallet-tabs      — tests wallet tab switching
@wallet-history   — tests History navigation
@profile-settings — tests Settings navigation
@phone-enable     — tests phone input enables submit button
```

**3b. Cleanup tags** — trigger `After` hooks that press BACK after sub-screen navigation.

```
@wallet-history       ┐
@profile-settings     ├── After hook: BACK press + activateApp
@profile-my-profile   ┘   (fixtures/index.ts lines 304–319)
```

These are identical to domain tags — the same tag serves both purposes.

**Rule: any scenario that navigates TO a sub-screen must have a tag that matches the After hook filter.**

### Decision Tree for New Tags

```
Adding a new scenario:
│
├── New feature file?
│     YES → add @mobile (Layer 1) + @devtools if auth needed (Layer 1)
│           add @{screen}-screen (Layer 2)
│
├── Always → add @{screen}-{what} scenario tag (Layer 3 domain)
│            naming: kebab-case, screen prefix, describes what is tested
│            examples: @transfer-review, @nft-collection, @settings-language
│
└── Navigates to sub-screen?
      YES → ensure the tag matches After hook filter in fixtures/index.ts
            OR add the tag to the After hook filter:
            After({ tags: '@wallet-history or @profile-settings or @new-tag' }, ...)
```

### Filtering Runs with Tags

```bash
# Run only smoke tests
TAGS='@smoke' bun run test:mobile:android

# Run one specific scenario
TAGS='@wallet-history' bun run test:mobile:android

# Run all wallet tests
TAGS='@wallet-screen' bun run test:mobile:android

# Run everything except wip
TAGS='not @wip' bun run test:mobile:android

# Multiple conditions
TAGS='@mobile and not @smoke' bun run test:mobile:android
```

### Complete Tag Map (current)

| File              | Feature-level tags                     | Scenario-level tags                                                                                |
| ----------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `login.feature`   | `@mobile` `@login-screen`              | `@phone-disable` `@phone-enable` `@email-disable` `@email-partial` `@email-enable` `@new-user-pin` |
| `profile.feature` | `@mobile` `@profile-screen`            | `@smoke` `@profile-menu` `@profile-view-profile` `@profile-settings`_ `@profile-my-profile`_       |
| `wallet.feature`  | `@mobile` `@devtools` `@wallet-screen` | `@smoke` `@wallet-tabs` `@wallet-subtabs` `@wallet-actions` `@wallet-history`\*                    |

`*` = also triggers After hook cleanup (BACK press in `fixtures/index.ts`)

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
bun run android
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
