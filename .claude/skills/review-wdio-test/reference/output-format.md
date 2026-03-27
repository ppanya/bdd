# Review Report Output Format Specification

This document defines the exact format for reports produced by `review-wdio-test`. Follow this spec precisely — consistent format allows readers to scan findings quickly and CI tooling to parse results.

---

## 1. Per-File Header

Each reviewed file gets its own section. Use a level-3 heading (`###`) with the shortest unique relative path from the project root.

```
### steps/mobile/login.steps.ts
**Domain detected**: mobile step definitions
```

Domain detection labels:
- `mobile step definitions` — file path contains `steps/mobile/`
- `API step definitions` — file path contains `steps/api/`
- `web step definitions` — file path contains `steps/web/`
- `screen object (mobile)` — file path contains `screens/`
- `page object (web)` — file path contains `pages/`
- `feature file (mobile)` — file path contains `features/mobile/`
- `feature file (API)` — file path contains `features/api/`
- `feature file (web)` — file path contains `features/web/`

If no findings exist for a file, still include the header and write:

```
No findings — all checks passed.
```

---

## 2. Findings Table

List findings for the file in a markdown table immediately below the file header. Column order and names are fixed.

```markdown
| ID   | Severity | Category  | Line | Issue                                      | Fix                                        |
|------|----------|-----------|------|--------------------------------------------|--------------------------------------------|
| R001 | CRITICAL | CRASH     | 12   | Arrow function breaks `this` context       | Replace `async () =>` with `async function` |
| R002 | HIGH     | STEP_DEFN | 37   | Missing `this: AppWorld` type annotation   | Add `this: AppWorld` as first parameter    |
| R003 | MEDIUM   | CONVENTION| 5    | Import missing `.ts` suffix                | Change to `'../../fixtures/index.ts'`      |
```

Column rules:
- **ID**: Sequential, zero-padded to 3 digits. Format: `R` + number. Counter resets per review session (not per file).
- **Severity**: One of `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` — all caps.
- **Category**: One of `CRASH`, `FLAKINESS`, `PAGE_OBJ`, `STEP_DEFN`, `API_TEST`, `CONVENTION` — all caps.
- **Line**: The line number of the first occurrence. For deduplicated patterns, see section 4.
- **Issue**: One sentence, present tense, describing what is wrong. Use backtick-quoted code names.
- **Fix**: One sentence, imperative, describing the correction. Be specific — include the exact replacement when it fits in the column.

---

## 3. Evidence and Fix Code Blocks

For every CRITICAL finding, and for HIGH findings where the fix is not obvious from the table, include a code block immediately after the table showing both the problematic code and the corrected version.

Format:

```
**R001 — Arrow function breaks `this` context** (CRITICAL · CRASH · line 12)

Evidence:
```typescript
// steps/mobile/login.steps.ts:12
When('I tap the login button', async (this: AppWorld) => {
  await login.tapLogin();
});
```

Fix:
```typescript
When('I tap the login button', async function (this: AppWorld) {
  await login.tapLogin();
});
```
```

Rules for code blocks:
- Use `typescript` syntax highlighting for `.ts` files, `gherkin` for `.feature` files.
- Include a file path comment on the first line of the evidence block: `// path/to/file.ts:lineNumber`
- Show only the relevant code — do not paste entire functions unless the issue spans the whole function.
- The fix block must be a complete, valid replacement for the evidence block.

---

## 4. Deduplicated Patterns

When the same check fires on multiple lines within the same file, report it once with the count and all line numbers. Use the first occurrence as the primary finding in the table.

Table entry:

```markdown
| R007 | MEDIUM | CONVENTION | 8,24,31 | Internal import missing `.ts` suffix (x3) | Add `.ts` to all relative import paths |
```

Evidence block (list each occurrence):

```
**R007 — Internal import missing `.ts` suffix** (MEDIUM · CONVENTION · lines 8, 24, 31 — x3)

Evidence:
```typescript
// steps/api/orders.steps.ts:8
import type { AppWorld } from '../../fixtures/index';
// steps/api/orders.steps.ts:24
import { BaseAPI } from '../../support/api/base-api';
// steps/api/orders.steps.ts:31
import { TIMEOUTS } from '../../screens/base.screen';
```

Fix: Add `.ts` extension to all three imports:
```typescript
import type { AppWorld } from '../../fixtures/index.ts';
import { BaseAPI } from '../../support/api/base-api.ts';
import { TIMEOUTS } from '../../screens/base.screen.ts';
```
```

---

## 5. Summary Section

After all per-file sections, include a `## Summary` section.

Format:

```markdown
## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 1     |
| HIGH     | 2     |
| MEDIUM   | 3     |
| LOW      | 0     |
| **Total**| **6** |

Files reviewed: 3
Files with findings: 2
```

---

## 6. Verdict Badge

Immediately below the summary table, show the verdict on its own line.

Verdict logic:
- Any CRITICAL finding, or 3+ HIGH findings → `REQUEST_CHANGES`
- 1–2 HIGH findings, or only MEDIUM/LOW → `APPROVE_WITH_COMMENTS`
- No findings at all → `APPROVE`

Format:

```
**Verdict: REQUEST CHANGES** 🔴
```

```
**Verdict: APPROVE WITH COMMENTS** 🟡
```

```
**Verdict: APPROVE** 🟢
```

The verdict text must match exactly (all caps, spaces not underscores).

---

## 7. Integration Callouts

After the verdict, include an `## Next Steps` section listing verification commands and complementary skills.

Always include the test verification command for the domain(s) reviewed:

```markdown
## Next Steps

- Fix CRITICAL and HIGH findings before merging.
- Run `TAGS='@smoke' bun run test:mobile:android` to verify fixes on device.
```

Include complementary skill callouts based on what was reviewed:

| Condition | Add callout |
|-----------|-------------|
| Feature files were in scope | "Run `/cucumber-antipatterns features/mobile/` for Gherkin scenario quality (step wording, Given/When/Then structure, scenario granularity)." |
| General code concerns found (architecture, security, performance) | "Run `/review steps/mobile/login.steps.ts` for security and performance checks." |

Always end with the run command appropriate to the domain:

| Domain | Command |
|--------|---------|
| mobile | `TAGS='@smoke' bun run test:mobile:android` |
| web | `TAGS='@smoke' bun run test:web` |
| API | `TAGS='@smoke' bun run test:api` |
| mixed | List all applicable commands |

---

## 8. Complete Example Report

The following is a complete example review of a step file with 3 findings (1 CRITICAL, 1 HIGH, 1 MEDIUM), illustrating every format element above.

---

### steps/api/orders.steps.ts
**Domain detected**: API step definitions

| ID   | Severity | Category   | Line | Issue                                                  | Fix                                                    |
|------|----------|------------|------|--------------------------------------------------------|--------------------------------------------------------|
| R001 | CRITICAL | CRASH      | 19   | Arrow function in `When` step breaks `this` context    | Replace `async (path) =>` with `async function(this: AppWorld, path)` |
| R002 | HIGH     | API_TEST   | 19   | `process.env['API_BASE_URL']` missing `??` fallback    | Append `?? 'http://localhost:4010'` after env read     |
| R003 | MEDIUM   | CONVENTION | 3    | Internal import missing `.ts` suffix                   | Change to `'../../fixtures/index.ts'`                  |

---

**R001 — Arrow function in `When` step breaks `this` context** (CRITICAL · CRASH · line 19)

Evidence:
```typescript
// steps/api/orders.steps.ts:19
When('ฉันเรียก GET {string}', async (path: string) => {
  const api = new BaseAPI(process.env['API_BASE_URL'] ?? 'http://localhost:4010');
  this.lastResponse = await api.get(path); // TypeError: Cannot set property of undefined
});
```

Fix:
```typescript
When('ฉันเรียก GET {string}', async function (this: AppWorld, path: string) {
  const api = new BaseAPI(process.env['API_BASE_URL'] ?? 'http://localhost:4010');
  this.lastResponse = await api.get(path);
  this.preferCode = null;
});
```

---

**R002 — `process.env['API_BASE_URL']` missing `??` fallback** (HIGH · API_TEST · line 19)

Evidence:
```typescript
// steps/api/orders.steps.ts:19
const api = new BaseAPI(process.env['API_BASE_URL']!);
```

Fix:
```typescript
const api = new BaseAPI(process.env['API_BASE_URL'] ?? 'http://localhost:4010');
```

---

### steps/api/users.steps.ts
**Domain detected**: API step definitions

No findings — all checks passed.

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 1     |
| HIGH     | 1     |
| MEDIUM   | 1     |
| LOW      | 0     |
| **Total**| **3** |

Files reviewed: 2
Files with findings: 1

**Verdict: REQUEST CHANGES** 🔴

## Next Steps

- Fix the arrow function (R001) — this crashes every scenario in the file.
- Add the `API_BASE_URL` fallback (R002) to prevent `undefined` base URL in local dev.
- Add `.ts` suffix to the import (R003) when fixing R001.
- Run `TAGS='@smoke' bun run test:api` to verify all fixes.
- Run `/cucumber-antipatterns features/api/` for Gherkin scenario quality review.
