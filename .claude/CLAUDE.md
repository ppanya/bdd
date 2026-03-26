# Project: BDD Framework (WDIO + Cucumber + Appium)

## Runtime

- **Install / scripts**: `bun install`, `bun run <script>`, `bun <file>`
- **Test runner**: `bunx wdio` (Node) — WDIO internals require Node's module loader
- Bun auto-loads `.env` — no dotenv needed for Bun scripts
- `bunx` = npx for one-off tools (e.g. Prism)

## Test Runner

Chrome + Prism run in Docker. Test runner runs locally (fast) or fully in Docker (CI).

### Local Dev (fast feedback)

- **`bun run docker:up`** → start Chrome + Prism (keep running during dev session)
- **`bun run mock`** → start Prism mock server only (local, no Docker)
- **`bun run test:web`** → web UI tests, test runner runs locally
- **`bun run test:api`** → API tests, test runner runs locally
- **`bun run test`** → both suites

### Docker (fully isolated — CI or reproducible run)

- **`bun run docker:test:web`** → web UI tests (Chrome stays up between runs)
- **`bun run docker:test:api`** → API tests (Prism stays up between runs)
- **`bun run docker:test`** → both suites
- **`bun run docker:report`** → clean run of both suites + generate Allure report
- **`bun run docker:down`** → stop all containers (end of session)

### Filtering (while services are up)

- `TAGS='@smoke' bun run test:web` — filter by tag
- `SPEC=features/ui/login.feature bun run test:web` — specific feature file
- `SCENARIO_NAME="Login" bun run test:api` — filter by scenario name

### Mobile (local only)

- **`bun run test:mobile:android`** / **`bun run test:mobile:ios`** → Appium + Flutter

### Reports

- **`bun run report:allure`** → open Allure report at http://localhost:4040
- **`bun run report:generate`** → build static HTML at `allure-report/` for sharing
- **`bun run report:api`** → generate report from API test results only
- **`bun run report:mobile`** → generate report from mobile test results only
- **`bun run report:all`** → combine API + mobile results into one report

## Architecture

```
features/      # Gherkin .feature files
  api/         # API scenarios
  web/         # Web UI scenarios
  mobile/      # Mobile app scenarios
steps/         # Step definitions (WDIO Cucumber style)
pages/         # Page Objects (WDIO $() selectors) — web tests
screens/       # Screen Objects (Appium) — mobile tests
  base.screen.ts   # Base class — extend for all screen objects
fixtures/      # Cucumber World class + hooks
support/
  api/         # BaseAPI (global fetch, no browser)
  mobile/      # Mobile utilities (screen detection, session helpers)
  logger.ts    # Structured JSON logger
scripts/       # Dev utilities (run-mobile-tests.sh, talkback.sh, lib/)
openapi.yaml   # Prism mock spec — place at project root (gitignored)
wdio.conf.ts   # WDIO configuration
examples/      # Reference implementations — copy & adapt for your project
  kub-wallet/  # Flutter mobile app + wallet API example
  users-api/   # Generic REST API example
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

- Extend `BaseScreen` (`screens/base.screen.ts`)
- Locator priority: `byResourceId()` > `byId()` > `byDesc()` > XPath
- NEVER guess locators — discover via wdio-mcp `get_visible_elements` first

### API Tests

- Use `BaseAPI` from `support/api/base-api.ts` (global fetch, no browser)
- API suite runs without launching browser at all
- baseURL from `API_BASE_URL` env var (default: http://localhost:4010)
- Place `openapi.yaml` at project root before running API tests

### URLs

- NEVER hardcode URLs in .feature files or step definitions
- UI tests: `browser.url('/path')` — uses `baseURL` from wdio.conf.ts → .env (BASE_URL)
- API tests: paths only (e.g. `/api/users`) — baseURL from `API_BASE_URL` in env

## Reporting

### Screenshots on Failure

Two hooks capture screenshots — redundancy ensures capture even when sessions crash:

1. **`afterTest`** in `wdio.conf.ts` — WDIO hook, wrapped in try/catch
2. **`After`** in `fixtures/index.ts` — Cucumber hook, checks session health before capture

Both auto-attach to Allure report.

### Video Recording (Web Only)

`wdio-video-reporter` is conditionally loaded — **disabled when `MOBILE_PLATFORM` is set**.

- Web tests: videos saved to `reports/videos/` (failed tests only)
- Mobile tests: screenshots only (no video)

## Tag Glossary

Tags classify scenarios by priority and type. Max 2 tags per scenario.

Platform separation by command, not tags:

- `bun run test:web` → `features/web/**`
- `bun run test:api` → `features/api/**`
- `bun run test:mobile:android` → `features/mobile/**`

| Tag                  | Purpose                                   | Scope    |
| -------------------- | ----------------------------------------- | -------- |
| `@smoke`             | CI gate — critical path, blocks deploy    | Scenario |
| `@regression`        | Full regression — all non-smoke           | Scenario |
| `@happy-path`        | Positive/success flows                    | Scenario |
| `@negative`          | Error, validation, edge cases             | Scenario |
| `@boundary`          | Limits, extremes, zero values             | Scenario |
| `@wip`               | Work in progress — excluded from CI       | Scenario |
| `@slow`              | >30s — may exclude from fast loops        | Scenario |
| `@flaky`             | Known unreliable — under investigation    | Scenario |
| `@manual`            | Human verification only                   | Scenario |
| `@skip`              | Temporarily disabled (must add reason)    | Scenario |
| `@monday=BOARD/ITEM` | Links to Monday.com card in Allure report | Scenario |

> **Note:** `@monday=` tags are metadata links — they do NOT count toward the 2-tag-per-scenario limit.

## Prompt: Write Mobile Test

> Use this prompt for generating new mobile test code. Always explore before writing.

### Phase 0 — Explore Screen (REQUIRED)

Use wdio-mcp to discover real locators. NEVER guess element IDs.

1. Start app session: `mcp__wdio-mcp__start_app_session`
2. Navigate to target screen
3. Catalog all elements via `mcp__wdio-mcp__get_visible_elements`:
   - resource-id (most reliable)
   - content-desc (may be compound with `\n`)
   - class name (Button vs View)
   - clickable attribute

4. Build locator map:

   | Priority | Strategy             | When to use                          |
   | -------- | -------------------- | ------------------------------------ |
   | 1 (best) | `byResourceId('id')` | Element has resource-id              |
   | 2        | `byId('exact text')` | Unique exact content-desc            |
   | 3        | `byDesc('partial')`  | Compound content-desc with `\n`      |
   | 4 (last) | XPath                | No id/desc, or need class filter     |

5. Verify each interactive element: click → screenshot → confirm state change

### Phase 1 — Screen Object

`screens/[name].screen.ts` — extend `BaseScreen`:
- Typed getters using locators from Phase 0
- `isOn[Name]Screen()` using `getPageSource().includes()`
- Action methods (fill, tap, switch)

### Phase 2 — Feature File

`features/mobile/[name].feature`:
- Tags: `@smoke`/`@regression` + `@happy-path`/`@negative`/`@boundary`
- Max 2 tags per scenario
- One assertion per Then step

### Phase 3 — Step Definitions

`steps/mobile/[name].steps.ts`:
- `function` keyword (never arrows) for `this: AppWorld`
- Use `ensureAuthenticated()` from `support/mobile/session-helper.ts`
- Use `ensureVisible()` after cache/keyboard operations
- Re-query elements after `resetCache()`
- No hardcoded `driver.pause()` — use `waitUntil`/`waitForDisplayed`

### Phase 4 — Verify

```bash
TAGS='@smoke' bun run test:mobile:android
```

## Prompt: Write API Test

Context:
- BaseAPI from `support/api/base-api.ts` (global fetch, no browser)
- Mock server: Prism on localhost:4010 (from `openapi.yaml`)
- Error simulation: `Given ทดสอบ error case ด้วย status {int}` sets Prefer header

Generate:
1. `features/api/[name].feature` — `@smoke`/`@regression` + `@happy-path`/`@negative`
2. `steps/api/[name].steps.ts` — reuse existing When/Then steps if applicable

Reusable step patterns (see `examples/users-api/steps/api/`):
- `When ฉันเรียก GET {string}`
- `When ฉันเรียก POST {string} ด้วย: [DataTable]`
- `Then status code ควรเป็น {int}`
- `Then response ควรเป็น array`
- `Then response ควรมี field {string}`

Rules:
- NEVER hardcode base URL — use `API_BASE_URL` env var
- One scenario per behavior (success, each error case)
- Check status, response shape, and field presence

## Mobile Test Anti-Flakiness Rules

### NEVER:
1. Guess locators — always use wdio-mcp `get_visible_elements` first
2. Call raw `hideKeyboard`/`resetAccessibilityCache` with `.catch(() => {})` — use `BaseScreen` methods
3. Call `el.getLocation()` on the same element reference after `resetCache()` — re-query first
4. Use hardcoded `driver.pause(N)` — use `waitUntil`/`waitForDisplayed`

### ALWAYS:
1. Explore screen with wdio-mcp BEFORE writing any locators
2. Locator priority: resource-id > exact content-desc > partial desc > XPath
3. After keyboard/cache operations: `ensureVisible(element)`
4. Re-query elements after `resetCache()`
5. Screen detection via `getPageSource().includes()` / `detectScreen()`

## Common Mistakes

- `bun test` returns "no tests found" — use `bun run test`
- Arrow functions `() =>` in step defs → `this` is undefined — use `function`
- `bun run mock` or `bun run docker:up` required before API tests → ECONNREFUSED
- `browser` global not available in API steps — use `BaseAPI`
- Mobile tests need Appium running — use `--suite mobile` only with emulator/device connected
- `openapi.yaml` must exist at project root for Prism (gitignored — copy from `examples/users-api/`)
