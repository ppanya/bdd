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
