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
  features/mobile/[name].feature  — @mobile @devtools @[name]-screen + scenarios
  steps/mobile/[name].steps.ts    — function keyword, this: AppWorld
  Unreliable nav steps: 3s getPageSource check + DevTools fallback

Phase 4b — Cleanup tag check
  For each sub-screen scenario: add tag → check fixtures/index.ts After hook filter
  If tag not in filter → add: After({ tags: '... or @new-tag' }, ...)

Phase 5 — Verify
  TAGS='@[name]-screen' bun run test:mobile:android — all must pass
```

## Tag Taxonomy

```
Layer 1 — Feature-level, triggers Before hooks:
  @mobile       → health check (required on every mobile feature)
  @devtools     → inject test session (authenticated screens)
  @login-screen → navigate to Login screen (login scenarios only)

Layer 2 — Feature-level, screen scope (one per feature file):
  @{screen}-screen  e.g. @wallet-screen, @profile-screen

Layer 3 — Scenario-level:
  @smoke            → critical path (CI gate)
  @{screen}-{what}  → domain tag  e.g. @wallet-history, @profile-settings
  * Sub-screen nav scenarios MUST also appear in fixtures/index.ts After hook filter
    After({ tags: '@wallet-history or @profile-settings or @profile-my-profile' }, ...)
```
