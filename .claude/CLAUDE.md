# Project: BDD Framework (WDIO + Cucumber + Appium + Flutter)

## Runtime

- **Install / scripts**: `bun install`, `bun run <script>`, `bun <file>`
- **Test runner**: `npx wdio` (Node) — WDIO internals require Node's module loader
- Bun auto-loads `.env` — no dotenv needed for Bun scripts
- `bunx` = npx for one-off tools (e.g. Prism)

## Test Runner

- **`bun run test`** → `npx wdio run wdio.conf.ts` (all suites)
- **`bun run test:web`** → UI tests only
- **`bun run test:api`** → API tests only (no browser)
- **`bun run test:mobile:android`** / **`bun run test:mobile:ios`** → Appium + Flutter
- **`bun run mock`** → start Prism mock on :4010 before API tests
- **`bun run mock:test`** → Prism + API tests in one command

## Architecture

```
features/      # Gherkin .feature files (unchanged, Thai Gherkin)
  api/         # API scenarios
  ui/          # Web UI scenarios
  mobile/      # Flutter mobile scenarios
steps/         # Step definitions (WDIO Cucumber style)
pages/         # Page Objects (WDIO $() selectors)
screens/       # Screen Objects (Appium + Flutter ValueKey)
fixtures/      # Cucumber World class + hooks
support/api/   # BaseAPI (global fetch, no browser)
reporters/     # Living Checklist custom reporter
scripts/       # Dev utilities
openapi.yaml   # Prism mock spec
wdio.conf.ts   # WDIO configuration (replaces playwright.config.ts)
```

## Critical Rules

### Imports

- Step files MUST import `{ Given, When, Then }` from `'@cucumber/cucumber'`
- `fixtures/index.ts` uses `setWorldConstructor` from `@cucumber/cucumber`
- Use `import type` for type-only imports (verbatimModuleSyntax is on)
- Import extensions: use `.ts` suffix in internal imports (bundler mode)

### WDIO + Cucumber World

- Steps access shared state via `this` (typed as `AppWorld`):
  ```typescript
  Given('step', async function(this: AppWorld) { this.lastResponse ... })
  ```
- Arrow functions DO NOT work for steps that use `this` — always use `function` keyword
- `AppWorld` is defined in `fixtures/index.ts` — extends Cucumber `World`
- State resets automatically via `Before` hook in `fixtures/index.ts`

### Page Objects (Web)

- Use WDIO getters: `get usernameInput() { return $('#username'); }`
- No constructor injection — `browser` and `$` are WDIO globals
- Do NOT use Playwright `Locator` or `Page` types

### Screen Objects (Mobile)

- Extend `BaseScreen` (screens/base.screen.ts)
- Flutter elements: `this.flutterByKey('valuekey_name')` → `flutter=key("name")`
- Requires `automationName: FlutterIntegration` in Appium capability

### API Tests

- Use `BaseAPI` from `support/api/base-api.ts` (global fetch, no browser)
- API suite runs without launching browser at all
- baseURL from `API_BASE_URL` env var (default: http://localhost:4010)

### Prism Mock

- Prism always returns first defined response. Use `Prefer: code=XXX` header for non-2xx.
- Step: `Given ทดสอบ error case ด้วย status {int}` sets `this.preferCode`
- `prismPrefer(this.preferCode)` helper builds the header object

### URLs

- NEVER hardcode URLs in .feature files or step definitions
- UI tests: `browser.url('/path')` — uses `baseURL` from wdio.conf.ts → .env (BASE_URL)
- API tests: paths only (e.g. `/api/users`) — baseURL from `API_BASE_URL` in env

### Living Checklist Reporter

- Appends to `reports/history.json` each run
- Set `RELEASE_TAG=v1.0.0` env var for versioned releases
- `@manual` tag → scenario shown as interactive checkbox in HTML report
- `bun run report:checklist` → open `reports/living-checklist.html`

### Bruno Override System

- `bun run generate:bru` → regenerates `*.bru` files, NEVER touches `*.override.bru`
- `bun run generate:bru -- --merge` → creates `*.merged.bru` (base + override combined)
- Manual customizations go in `*.override.bru` (same basename + `.override`)

## Common Mistakes to Avoid

- `bun test` returns "no tests found" — use `bun run test`
- Using arrow functions `() =>` in step defs → `this` is undefined — use `function`
- Missing `bun run mock` before API tests → ECONNREFUSED
- `browser` global not available in API steps — use `BaseAPI` (global fetch)
- Mobile tests need Appium running — use `--suite mobile` only with emulator/device connected

## Mobile App Inspection (wdio-mcp เท่านั้น)

> ใช้ **wdio-mcp** เท่านั้น — ห้ามใช้ appium-mcp (สอง session พร้อมกันทำให้ UiAutomator2 crash)

### Setup

- `.mcp.json` กำหนด MCP server
- `capabilities.json` กำหนด base Android capabilities (Pixel_7_API_34, UiAutomator2)
- ทั้งสองไฟล์อยู่ที่ project root

### Workflow มาตรฐาน

1. เปิด Android emulator ก่อน (AVD: Pixel_7_API_34_arm64)
2. ใช้ `mcp__wdio-mcp__start_app_session` พร้อม `appPath` → เปิด app
3. ใช้ `mcp__wdio-mcp__take_screenshot` + `mcp__wdio-mcp__get_visible_elements` → ดู element
4. เขียน feature file + step definition + screen object จาก locators ที่ได้

### วิธีเปิด DevTools (clickable=false ต้อง force gesture)

```
mcp__wdio-mcp__execute_script:
  script: "mobile: doubleClickGesture"
  args: [{ x: 1050, y: 1825 }]   # Pixel 7 API 34: width*0.97, height*0.78
```

### วิธีเรียก start_app_session

```
platform: Android
deviceName: Pixel_7_API_34_arm64
automationName: UiAutomator2
appiumHost: localhost
appiumPort: 4723
noReset: true
capabilities: { "appium:app": "<absolute path>/apps/app-mock-release.apk" }
```

> path ของ APK ให้ใช้ absolute path จาก project root (ดูจาก `apps/` folder)

### ตัวอย่าง prompt (ภาษาไทย)

```
เปิด apps/app-mock-release.apk บน Android emulator แล้ว:
1. ถ่าย screenshot หน้าแรก
2. generate locators ทุก element
3. เขียน features/mobile/login.feature + steps/mobile/login.steps.ts + screens/login.screen.ts
   ให้ตรงกับ UI ที่เห็นจริงๆ
```

```
ดูหน้า dashboard ของ app แล้วเขียน feature test สำหรับ navigation ทุก tab bar item
ใช้ Flutter ValueKey locators ถ้าเป็น Flutter app ไม่งั้นใช้ accessibility id
```

### Screen Object Pattern (สำหรับ code ที่ generate)

- ถ้าเป็น Flutter app: ใช้ `this.flutterByKey('valuekey')` → `flutter=key("valuekey")`
- ถ้าเป็น native: ใช้ `accessibility id` หรือ `xpath` จาก `generate_locators`
- extend `BaseScreen` จาก `screens/base.screen.ts` เสมอ

### Tips

- ใช้ `appium_get_page_source` เพื่อดู XML tree เต็มของหน้า
- ใช้ `appium_scroll` + `appium_screenshot` เพื่อดู UI ที่ scroll ลงไป
- `generate_locators` จะ suggest best locator strategy ให้อัตโนมัติ
- `NO_UI=false` → interactive mode (debug), เปลี่ยนเป็น `true` สำหรับ CI
