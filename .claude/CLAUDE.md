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
- **`bun run report:allure`** → serve Allure report locally (auto-opens browser)
- **`bun run report:generate`** → build static HTML at `allure-report/` for sharing

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

### URLs

- NEVER hardcode URLs in .feature files or step definitions
- UI tests: `browser.url('/path')` — uses `baseURL` from wdio.conf.ts → .env (BASE_URL)
- API tests: paths only (e.g. `/api/users`) — baseURL from `API_BASE_URL` in env

## Common Mistakes to Avoid

- `bun test` returns "no tests found" — use `bun run test`
- Using arrow functions `() =>` in step defs → `this` is undefined — use `function`
- Missing `bun run mock` before API tests → ECONNREFUSED
- `browser` global not available in API steps — use `BaseAPI` (global fetch)
- Mobile tests need Appium running — use `--suite mobile` only with emulator/device connected

## Mobile App Inspection (wdio-mcp only)

**Use wdio-mcp ONLY** — never use appium-mcp alongside it (two sessions crash UiAutomator2).

### Capabilities for start_app_session

```
platform: Android
deviceName: Pixel_7_API_34_arm64
automationName: UiAutomator2
appiumHost: localhost
appiumPort: 4723
noReset: true
capabilities: { "appium:app": "<absolute path>/apps/app-mock-release.apk" }
```

### Open DevTools

```
execute_script: "mobile: doubleClickGesture"
args: [{ "x": 1050, "y": 1825 }]   # Pixel 7 API 34: width*0.97, height*0.78
```

### Navigate DevTools Routes

**Use `click_element` only** — tap_element / clickGesture / coordinate taps do not work on route buttons.

```
# 1. Open DevTools (doubleClickGesture above)
# 2. Scroll toward target section
execute_script: "mobile: scrollGesture"
  args: [{"left": 0, "top": 400, "width": 720, "height": 1400, "direction": "down", "percent": 1.5}]

# 3. Click route with XPath matching both route name AND GO/PUSH
click_element:
  selector: //android.view.View[contains(@content-desc,'Wallet') and contains(@content-desc,'GO')]
  scrollToView: true
  timeout: 10000
```

Why two XPath conditions: route buttons have content-desc `emoji\nRouteName\nGO/PUSH`. The Navigator Launchpad header contains all section names, so `descriptionContains("Wallet")` matches the header first. The `and contains(@content-desc,'GO')` narrows to the actual button.

Scroll depth guide (percent from top):

- Onboarding/Main: 1.5x · Auth/Guard/Wallet: 2x · Token/NFTs/Home: 2.5–3x
- Profile/Withdrawal/Pincode: 3–3.5x · Consent/THBK/Bank/Redemption: 4–5x

Full route map: `memory/feedback_devtools_navigation.md`

### Locator Priority

1. Resource-id → `byResourceId('xxx')` (most reliable)
2. Content-desc → `byDesc('partial text')` or `byId('exact text')`
3. XPath → last resort

## The One Prompt

All tool calls use `mcp__wdio-mcp__*` (server defined in `.mcp.json`).

```
Open [APP_PATH] on Android emulator and test [FEATURE_NAME]:

Phase 1 — Setup
  mcp__wdio-mcp__start_app_session:
    platform:Android  deviceName:Pixel_7_API_34_arm64  automationName:UiAutomator2
    appiumHost:localhost  appiumPort:4723  noReset:true
    capabilities: {"appium:app":"<abs-path>/[APP_PATH]"}
  Open DevTools: execute_script "mobile: doubleClickGesture" args:[{"x":1050,"y":1825}]
  Scroll to section: execute_script "mobile: scrollGesture" args:[{...,"percent":2}]
  Navigate: click_element
    selector: //android.view.View[contains(@content-desc,'[ROUTE]') and contains(@content-desc,'GO')]
    scrollToView:true  timeout:10000
  mcp__wdio-mcp__take_screenshot → confirm correct screen

Phase 2 — Explore
  mcp__wdio-mcp__get_visible_elements → catalog locators + clickable attributes
  mcp__wdio-mcp__scroll if needed, repeat get_visible_elements

Phase 3 — Verify interactions (CRITICAL — do not skip)
  For each interactive element:
    mcp__wdio-mcp__click_element → take_screenshot → works?
    else mcp__wdio-mcp__tap_element → take_screenshot
    else mcp__wdio-mcp__execute_script "mobile: clickGesture" args:[{"x":X,"y":Y}]
    verify nav: execute_script "mobile: getPageSource" → includes '[expected_text]'

Phase 4 — Generate
  screens/[name].screen.ts        — extend BaseScreen, getters, isOn[Name]Screen()
  features/mobile/[name].feature  — @smoke/@regression + @happy-path/@negative
  steps/mobile/[name].steps.ts    — function keyword, this: AppWorld
  Given steps: call ensureAuthenticated() + DevTools navigation
  Use ensureVisible() after keyboard/cache operations

Phase 5 — Verify
  TAGS='@smoke' bun run test:mobile:android — all must pass
```

## Tag Glossary

Tags classify scenarios by priority and type. Max 2 tags per scenario.

Platform separation by command, not tags:

- `bun run test:web` → `features/ui/**`
- `bun run test:api` → `features/api/**`
- `bun run test:mobile:android` → `features/mobile/**`

| Tag           | Purpose                                    | Scope    |
| ------------- | ------------------------------------------ | -------- |
| `@smoke`      | CI gate — critical path, blocks deploy     | Scenario |
| `@regression` | Full regression — all non-smoke            | Scenario |
| `@happy-path` | Positive/success flows                     | Scenario |
| `@negative`   | Error, validation, edge cases              | Scenario |
| `@boundary`   | Limits, extremes, zero values              | Scenario |
| `@wip`        | Work in progress — excluded from CI        | Scenario |
| `@slow`       | >30s — may exclude from fast loops         | Scenario |
| `@flaky`      | Known unreliable — under investigation     | Scenario |
| `@manual`     | Human verification only                    | Scenario |
| `@skip`       | Temporarily disabled (must add reason)     | Scenario |
| `@monday=BOARD/ITEM` | Links to Monday.com card in Allure report | Scenario |

> **Note:** `@monday=` tags are metadata links — they do NOT count toward the 2-tag-per-scenario limit.

## Prompt: Write Mobile Test

### Phase 0 — Explore Screen (REQUIRED before writing code)

Use wdio-mcp to discover real locators from the live app. NEVER guess element IDs.

1. Start app session:
   `mcp__wdio-mcp__start_app_session` (Android, UiAutomator2, Pixel_7_API_34_arm64)

2. Navigate to target screen:
   - Open DevTools: `execute_script "mobile: doubleClickGesture"` args:[{"x":1050,"y":1825}]
   - Scroll + `click_element` to target route

3. Catalog all elements:
   `mcp__wdio-mcp__get_visible_elements` → record every element's:
   - resource-id (most reliable)
   - content-desc (compound text with \n separators)
   - class name (android.widget.Button vs android.view.View)
   - clickable attribute (true/false)
   - Scroll down and repeat until all elements cataloged

4. Build locator map — choose strategy per element:

   | Priority | Strategy             | When to use                          | Example                                                |
   | -------- | -------------------- | ------------------------------------ | ------------------------------------------------------ |
   | 1 (best) | `byResourceId('id')` | Element has resource-id              | `byResourceId('login_submit_button')`                  |
   | 2        | `byId('exact text')` | Unique exact content-desc            | `byId('Crypto Wallet')`                                |
   | 3        | `byDesc('partial')`  | Compound content-desc with \n        | `byDesc('navigation_menu_wallet')`                     |
   | 4 (last) | XPath                | No id, no desc, or need class filter | `$('//android.widget.Button[@content-desc="Accept"]')` |

   Rules:
   - NEVER use XPath when resource-id exists
   - NEVER guess locators — every locator must come from get_visible_elements output
   - For buttons with clickable=false: note in screen object (tap() handles via clickGesture)
   - For compound content-desc: use byDesc with the stable part (before first \n)

5. Verify interactions — for each interactive element:
   `mcp__wdio-mcp__click_element` → `take_screenshot` → confirm navigation/state change
   If click fails: try `tap_element` → then `execute_script "mobile: clickGesture"`

### Phase 1 — Generate Screen Object

`screens/[name].screen.ts` — extend BaseScreen:

- Typed getters using locators from Phase 0
- `isOn[Name]Screen()` method using `getPageSource().includes()`
- Action methods (fill, tap, switch)

### Phase 2 — Generate Feature File

`features/mobile/[name].feature`:

- Tags: `@smoke`/`@regression` + `@happy-path`/`@negative`/`@boundary`
- Max 2 tags per scenario
- Background step calls `Given "I am on [Screen] via DEV TOOLS"`
- One assertion per Then step

### Phase 3 — Generate Step Definitions

`steps/mobile/[name].steps.ts`:

- `function` keyword (never arrows) for `this: AppWorld`
- Given steps: call `ensureAuthenticated()` + DevTools navigation
- Use `ensureVisible()` after cache/keyboard operations
- Re-query elements after `resetCache()`
- No DevTools fallback for tap failures
- No hardcoded `driver.pause()`

### Phase 4 — Verify

```bash
TAGS='@smoke' bun run test:mobile:android — all must pass
```

## Prompt: Write API Test

Context:

- BaseAPI from `support/api/base-api.ts` (global fetch, no browser)
- Mock server: Prism on localhost:4010 (from openapi.yaml)
- Existing convention: Thai Gherkin steps
- Error simulation: `Given ทดสอบ error case ด้วย status {int}` sets Prefer header

Generate:

1. `features/api/[name].feature` — `@smoke`/`@regression` + `@happy-path`/`@negative`
2. `steps/api/[name].steps.ts` — reuse existing When/Then steps if applicable

Reusable steps (from `steps/api/users.steps.ts`):

- `When ฉันเรียก GET {string}`
- `When ฉันเรียก POST {string} ด้วย: [DataTable]`
- `Then status code ควรเป็น {int}`
- `Then response ควรเป็น array`
- `Then response ควรมี field {string}`

Rules:

- NEVER hardcode base URL — use `API_BASE_URL` env var
- One scenario per behavior (success, each error case)
- Check status, response shape, and field presence

## Prompt: Write Web Test

Context:

- Page Object: `pages/[name].page.ts` (WDIO getter pattern, no constructor)
- Selectors: WDIO `$()` / `$$()` — CSS/ID selectors, NOT Playwright
- `browser` and `$` are WDIO globals — no injection needed
- Steps use `function` keyword for `this: AppWorld`

Generate:

1. `pages/[name].page.ts` — WDIO getters, action methods
2. `features/ui/[name].feature` — `@smoke`/`@regression` + `@happy-path`/`@negative`
3. `steps/web/[name].steps.ts` — `function` keyword, `this: AppWorld`

Rules:

- NEVER hardcode URLs — `browser.url('/path')`, baseUrl from `.env`
- Use `$()` selectors, NOT Playwright Locator/Page types
- Page Objects: lazy getters, no constructor injection

## Mobile Test Anti-Flakiness Rules

### NEVER:

1. Guess locators — always discover via wdio-mcp `get_visible_elements` first
2. Raw `hideKeyboard`/`resetAccessibilityCache` with `.catch(() => {})`
   → Use `BaseScreen.hideKeyboard()`, `resetCache()`, `ensureVisible()`
3. `el.getLocation()` after `resetCache()` on the SAME element reference
   → Re-query: `const fresh = await this.waitForElement(this.someGetter)`
4. DevTools fallback for tap failures → fix the tap
5. Hardcoded `driver.pause(N)` → use `waitUntil`/`waitForDisplayed`

### ALWAYS:

1. Explore screen with wdio-mcp BEFORE writing locators
2. Locator priority: resource-id > exact content-desc > partial desc > XPath
3. After keyboard/cache operations: `ensureVisible(element)`
4. Re-query elements after `resetCache()`
5. Screen detection via `getPageSource().includes()` / `detectScreen()`
