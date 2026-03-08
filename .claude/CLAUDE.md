# Project: BDD Template (playwright-bdd + Playwright + Prism)

## Runtime
- Use `bun` (not node/npm/yarn). Bun auto-loads `.env` — no dotenv.
- `bunx` = npx, `bun install`, `bun run <script>`, `bun <file>`

## Test Runner
- **`bun run test`** → runs Playwright (BDD). NOT `bun test` (no .test.ts files here).
- `bun run mock` → start Prism mock on :4010 before running API tests.
- `bunx bddgen` → regenerates `.features-gen/` when .feature files change.

## Architecture
```
features/      # Gherkin .feature files (what to test)
steps/         # Step definitions (how to test)
pages/         # Page Object Models (UI locators)
fixtures/      # Custom test instance + Given/When/Then exports
support/api/   # ApiClient wrapper
scripts/       # Dev utilities (generate-bru.ts)
openapi.yaml   # Prism mock spec
```

## Critical Rules

### Imports
- Step files MUST import `{ Given, When, Then }` from `../../fixtures` (NOT playwright-bdd directly).
- `fixtures/index.ts` MUST use `import { test as base } from 'playwright-bdd'` (NOT `@playwright/test`).
- Use `import type` for type-only imports (verbatimModuleSyntax is on).

### playwright-bdd
- `defineBddConfig.steps` must include `'fixtures/index.ts'` to register custom test instance.
- `.features-gen/` is auto-generated — never edit, gitignored.
- `createBdd(test)` must receive the extended `test` from `fixtures/index.ts`.

### Page Objects
- Locators MUST be initialized in constructor body (not as class field initializers) — TypeScript strict mode.
- Use `import type { Page, Locator }` for type imports.

### State sharing between steps
- Use `world` fixture (plain object per scenario), not module-level variables.
- `world: { lastResponse, preferCode }` — reset automatically between scenarios.

### Prism Mock
- Prism always returns first defined response. Use `Prefer: code=XXX` header for non-2xx.
- Step: `Given ทดสอบ error case ด้วย status {int}` sets `world.preferCode`.
- `prismPrefer(world.preferCode)` helper builds the header object.

### URLs
- NEVER hardcode URLs in .feature files or step definitions.
- UI tests: `page.goto('/path')` — uses `baseURL` from playwright.config.ts → .env.
- API tests: paths only (e.g. `/api/users`) — baseURL from `API_BASE_URL` in fixtures.

## Common Mistakes to Avoid
- `bun test` returns "no tests found" — use `bun run test`
- Missing `bun run mock` before API tests → ECONNREFUSED
- `createBdd()` with wrong test instance → runtime error
- `importTestFrom` option in defineBddConfig → deprecated, use steps array instead
