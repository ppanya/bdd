# WDIO+Cucumber Test Review — Check Catalog

Complete catalog of all checks performed by `review-wdio-test`. Each entry includes: severity, what to look for, bad and good code examples, and a one-sentence rationale.

---

## CRASH Checks (C-series)

Tests in this category will crash or always fail — not flaky, definitively broken.

---

### C001 — Arrow function in Given/When/Then

**Severity**: CRITICAL
**Category**: CRASH
**Files**: `steps/**/*.steps.ts`

**What to look for**: `Given(`, `When(`, or `Then(` followed by an arrow function `async (` or `(` instead of `async function(` or `function(`.

**Bad**:
```typescript
When('I tap the login button', async (this: AppWorld) => {
  await login.tapLogin();
});
```

```typescript
Then('status code should be {int}', async (code: number) => {
  expect(this.lastResponse?.status).toBe(code); // this is undefined
});
```

**Good**:
```typescript
When('I tap the login button', async function (this: AppWorld) {
  await login.tapLogin();
});
```

**Why it matters**: Cucumber binds `this` to the World instance at call time using a regular function. Arrow functions capture `this` from the surrounding lexical scope (the module), so `this` is always `undefined` inside the step body. Official WDIO and Cucumber documentation explicitly forbid arrow functions in step definitions.

---

### C002 — `this.lastResponse` accessed without null check

**Severity**: CRITICAL
**Category**: CRASH
**Files**: `steps/api/**/*.steps.ts`

**What to look for**: `this.lastResponse.status`, `this.lastResponse.json()`, `this.lastResponse.headers`, or any property access on `this.lastResponse` without a preceding `if (!this.lastResponse)` guard.

**Bad**:
```typescript
Then('status code should be {int}', async function (this: AppWorld, status: number) {
  expect(this.lastResponse.status).toBe(status); // TypeError if When step failed
});
```

**Good**:
```typescript
Then('status code should be {int}', async function (this: AppWorld, status: number) {
  if (!this.lastResponse) {
    throw new Error('No response available — a When API call step must precede this Then step.');
  }
  expect(this.lastResponse.status).toBe(status);
});
```

**Why it matters**: `AppWorld.lastResponse` is typed as `Response | null` and initialised to `null` in every `Before` hook. If the `When` step fails or is skipped, `lastResponse` is still `null` and any property access throws `TypeError: Cannot read properties of null`, masking the real failure.

---

### C003 — `browser` or `$()` called in API step file

**Severity**: CRITICAL
**Category**: CRASH
**Files**: `steps/api/**/*.steps.ts`

**What to look for**: Any reference to the WDIO globals `browser`, `driver`, `$`, or `$$` inside a file under `steps/api/`.

**Bad**:
```typescript
// steps/api/users.steps.ts
Then('the page title should show the user', async function (this: AppWorld) {
  const title = await browser.getTitle(); // browser is undefined — no browser session
  expect(title).toContain('User');
});
```

**Good**:
```typescript
// steps/api/users.steps.ts — API steps only use fetch/BaseAPI
Then('response should have field {string}', async function (this: AppWorld, field: string) {
  if (!this.lastResponse) throw new Error('No response available');
  const body = (await this.lastResponse.json()) as Record<string, unknown>;
  if (!(field in body)) throw new Error(`Expected response to have field "${field}"`);
});
```

**Why it matters**: The API suite runs with `framework: 'cucumber'` and no browser capability. WDIO does not create a browser session, so `browser`, `driver`, `$`, and `$$` are all `undefined`. Any call crashes the entire worker process, failing every scenario in the file.

---

### C004 — `driver.pause()` / `browser.pause()` in any test file

**Severity**: CRITICAL
**Category**: CRASH
**Files**: `steps/**/*.steps.ts`, `screens/**/*.screen.ts`, `pages/**/*.page.ts`

**What to look for**: `driver.pause(`, `browser.pause(` with a numeric argument that is not part of a controlled internal utility (e.g. `BaseScreen.waitForIdle` which uses it deliberately for a well-documented 300ms tree-rebuild window).

**Bad**:
```typescript
When('I wait for the animation to finish', async function (this: AppWorld) {
  await browser.pause(3000); // hardcoded wall-clock wait
});
```

```typescript
async tapSubmit() {
  await this.tap(this.submitButton);
  await driver.pause(2000); // waiting for navigation — no guarantee
}
```

**Good**:
```typescript
When('I wait for the animation to finish', async function (this: AppWorld) {
  await home.homeTab.waitForDisplayed({ timeout: TIMEOUTS.nav });
});
```

```typescript
async tapSubmit() {
  await this.tap(this.submitButton);
  await this.waitForIdle(); // flushes accessibility cache, uses controlled 300ms internally
}
```

**Why it matters**: WDIO official best practices explicitly list `browser.pause()` as an antipattern. Fixed delays are always either too short (flaky in CI) or too long (slow in local dev). Condition-based waits (`waitForDisplayed`, `waitUntil`, `waitForClickable`) poll at an interval and resolve as soon as the condition is met.

---

## FLAKINESS Checks (F-series)

Tests in this category may pass locally but fail intermittently in CI or on slower devices.

---

### F001 — `forEach` with async callback

**Severity**: HIGH
**Category**: FLAKINESS
**Files**: `steps/**/*.steps.ts`, `screens/**/*.screen.ts`

**What to look for**: `.forEach(async ` — an async callback passed to `Array.prototype.forEach`.

**Bad**:
```typescript
const items = ['apple', 'banana', 'cherry'];
items.forEach(async (item) => {
  await listScreen.tapItem(item); // forEach does not await — all fire simultaneously
});
```

**Good**:
```typescript
const items = ['apple', 'banana', 'cherry'];
for (const item of items) {
  await listScreen.tapItem(item); // sequential, each awaited before the next
}
```

**Why it matters**: `Array.prototype.forEach` ignores the return value of its callback. With `async` callbacks, all iterations fire as unhandled floating promises — the loop body completes synchronously before any async work finishes. The test proceeds to the next step with partial or no work done, producing non-deterministic results. Use `for...of` to preserve sequential execution.

---

### F002 — Element reference reused after `resetCache()`

**Severity**: HIGH
**Category**: FLAKINESS
**Files**: `steps/**/*.steps.ts`, `screens/**/*.screen.ts`

**What to look for**: A variable holding a WDIO element (result of `$()`, `byId()`, `byResourceId()`, `byDesc()`, or `waitForElement()`) that is read or interacted with after any call to `resetCache()`, `this.resetCache()`, or `driver.execute('mobile: resetAccessibilityCache', ...)`.

**Bad**:
```typescript
const submitBtn = await login.waitForElement(login.loginButton);
await login.fillEmail('test@example.com');
await login.resetCache(); // UiAutomator2 rebuilds the accessibility tree
await submitBtn.click();  // stale reference — node may have new internal ID
```

**Good**:
```typescript
await login.fillEmail('test@example.com');
await login.resetCache();
const submitBtn = await login.waitForElement(login.loginButton); // re-query after cache reset
await submitBtn.click();
```

**Why it matters**: `resetAccessibilityCache` forces UiAutomator2 to rebuild the accessibility node tree. Element objects obtained before the reset hold internal node identifiers that may be reassigned after the rebuild, causing `StaleElementReferenceException` or silent failures on the next interaction.

---

### F003 — Raw `driver.hideKeyboard()` outside `BaseScreen`

**Severity**: HIGH
**Category**: FLAKINESS
**Files**: `steps/**/*.steps.ts`

**What to look for**: `driver.hideKeyboard()` or `browser.driver.hideKeyboard()` called directly in a step file, outside a screen object method.

**Bad**:
```typescript
When('I dismiss the keyboard', async function (this: AppWorld) {
  await driver.hideKeyboard(); // throws if keyboard is already hidden
});
```

**Good**:
```typescript
When('I dismiss the keyboard', async function (this: AppWorld) {
  await login.hideKeyboard(); // BaseScreen.hideKeyboard() wraps with try/catch
});
```

**Why it matters**: `driver.hideKeyboard()` throws an error if the keyboard is not currently visible. `BaseScreen.hideKeyboard()` wraps the call in a `try/catch` that silently ignores the "keyboard not visible" error, making it a safe no-op. Calling it raw fails the step on clean-state scenarios where no keyboard was raised.

---

### F004 — `driver.execute('mobile: resetAccessibilityCache')` called directly in step

**Severity**: HIGH
**Category**: FLAKINESS
**Files**: `steps/**/*.steps.ts`

**What to look for**: `driver.execute('mobile: resetAccessibilityCache'` called directly in a step file rather than via `this.resetCache()` or a screen object method.

**Bad**:
```typescript
Given('the app is ready', async function (this: AppWorld) {
  await driver.execute('mobile: resetAccessibilityCache', {}); // no error handling
  await home.homeTab.waitForDisplayed();
});
```

**Good**:
```typescript
Given('the app is ready', async function (this: AppWorld) {
  await home.waitForIdle(); // BaseScreen wraps with try/catch and re-query guard
  await home.homeTab.waitForDisplayed();
});
```

**Why it matters**: Direct calls to `driver.execute('mobile: resetAccessibilityCache')` have no error handling. On some devices or app states the command can fail (e.g. service not ready). `BaseScreen.resetCache()` wraps the call in a `try/catch` to ensure non-critical failures do not abort the test.

---

### F005 — `waitForDisplayed()` immediately before `expect().toBeDisplayed()`

**Severity**: MEDIUM
**Category**: FLAKINESS
**Files**: `steps/**/*.steps.ts`

**What to look for**: `await el.waitForDisplayed(...)` on the line immediately before (or in the same function with no other operations between) `await expect(el).toBeDisplayed()`.

**Bad**:
```typescript
Then('the home tab should be visible', async function (this: AppWorld) {
  await home.homeTab.waitForDisplayed({ timeout: TIMEOUTS.nav });
  await expect(home.homeTab).toBeDisplayed(); // redundant — expect already retries
});
```

**Good**:
```typescript
Then('the home tab should be visible', async function (this: AppWorld) {
  await expect(home.homeTab).toBeDisplayed({ wait: TIMEOUTS.nav });
});
```

**Why it matters**: WDIO's `expect` matchers use built-in retry logic (configurable via `waitforTimeout`). Calling `waitForDisplayed` before `expect().toBeDisplayed()` doubles the wait time on failure and adds noise to the test. The `expect` call alone is sufficient and cleaner.

---

### F006 — `waitForExist()` immediately before `expect().toExist()`

**Severity**: MEDIUM
**Category**: FLAKINESS
**Files**: `steps/**/*.steps.ts`

**What to look for**: `await el.waitForExist(...)` on the line immediately before `await expect(el).toExist()`.

**Bad**:
```typescript
Then('the error banner should appear', async function (this: AppWorld) {
  await errorBanner.waitForExist({ timeout: 5000 });
  await expect(errorBanner).toExist(); // redundant
});
```

**Good**:
```typescript
Then('the error banner should appear', async function (this: AppWorld) {
  await expect(errorBanner).toExist({ wait: 5000 });
});
```

**Why it matters**: Same as F005 — `expect().toExist()` auto-retries. The preceding `waitForExist` is redundant and inflates failure wait times.

---

## PAGE_OBJ Checks (P-series)

Violations of the Page Object Model principle from Selenium/WDIO official guidance.

---

### P001 — `expect()` assertion inside page/screen object method

**Severity**: HIGH
**Category**: PAGE_OBJ
**Files**: `pages/**/*.page.ts`, `screens/**/*.screen.ts`

**What to look for**: Any `expect(` call inside a method body of a class in a page or screen file.

**Bad**:
```typescript
// screens/login.screen.ts
async verifyLoginButtonEnabled() {
  await expect(this.loginButton).toHaveAttribute('clickable', 'true'); // assertion in POM
}
```

**Good**:
```typescript
// screens/login.screen.ts — return state only, assert in step
async isLoginButtonClickable(): Promise<boolean> {
  const clickable = await this.loginButton.getAttribute('clickable');
  return clickable === 'true';
}

// steps/mobile/login.steps.ts — assertion lives in step
Then('the login button should be enabled', async function (this: AppWorld) {
  await expect(login.loginButton).toHaveAttribute('clickable', 'true');
});
```

**Why it matters**: Selenium and WDIO official Page Object Model guidance requires page objects to encapsulate locators and actions, not assertions. Assertions belong in step definitions. When a page object asserts, it breaks single responsibility — the object both drives UI and verifies state — and makes the assertion inaccessible for reuse across different scenarios with different expected outcomes.

---

### P002 — `isEnabled()` used to check Flutter button state

**Severity**: HIGH
**Category**: PAGE_OBJ
**Files**: `screens/**/*.screen.ts`

**What to look for**: `el.isEnabled()` or `await el.isEnabled()` in any screen object method intended to check whether a Flutter button is enabled/clickable.

**Bad**:
```typescript
async isSubmitButtonEnabled(): Promise<boolean> {
  return this.submitButton.isEnabled(); // always true for Flutter elements
}
```

**Good**:
```typescript
async isSubmitButtonClickable(): Promise<boolean> {
  const clickable = await this.submitButton.getAttribute('clickable');
  return clickable === 'true';
}
```

**Why it matters**: Flutter elements exposed through the Semantics bridge always report `enabled=true` in the accessibility tree regardless of their visual/functional state. Flutter uses the `clickable` attribute (`clickable="true"` / `clickable="false"`) to express whether a button can be interacted with. Using `isEnabled()` will always return `true` and never detect a disabled button. This is documented in `screens/login.screen.ts` with code comments.

---

### P003 — Constructor with injected parameters

**Severity**: MEDIUM
**Category**: PAGE_OBJ
**Files**: `pages/**/*.page.ts`, `screens/**/*.screen.ts`

**What to look for**: A `constructor(` in a page or screen class that accepts parameters beyond the default (i.e. any constructor that accepts arguments, not the parameter-less default).

**Bad**:
```typescript
export class LoginScreen extends BaseScreen {
  constructor(private config: { baseUrl: string }) {
    super();
  }
}
```

**Good**:
```typescript
export class LoginScreen extends BaseScreen {
  // No constructor — WDIO globals (browser, driver, $) are injected automatically
}
```

**Why it matters**: WDIO provides `browser`, `driver`, `$`, and `$$` as globals. Page and screen objects do not need to receive these via constructor injection. Constructor injection adds unnecessary coupling, makes the object harder to instantiate in tests, and violates the WDIO Page Object Model convention where objects are stateless and instantiated with `new ScreenName()`.

---

### P004 — Method name overrides `BaseScreen` method

**Severity**: MEDIUM
**Category**: PAGE_OBJ
**Files**: `screens/**/*.screen.ts`

**What to look for**: A public or protected method in a screen class with the same name as a method defined in `BaseScreen`: `waitForElement`, `hideKeyboard`, `resetCache`, `ensureVisible`, `waitForIdle`, `waitForClickable`, `tap`, `setText`, `getText`, `isDisplayed`, `scrollDown`, `swipe`.

**Bad**:
```typescript
export class HomeScreen extends BaseScreen {
  async tap(el: ChainablePromiseElement) {
    // custom tap logic that silently replaces BaseScreen.tap()
    await el.click();
  }
}
```

**Good**:
```typescript
export class HomeScreen extends BaseScreen {
  async tapWithConfirmation(el: ChainablePromiseElement) {
    await this.tap(el); // delegate to BaseScreen.tap(), add extra behaviour
    await this.confirmationDialog.waitForDisplayed({ timeout: TIMEOUTS.element });
  }
}
```

**Why it matters**: TypeScript allows method overriding, but without the `override` keyword the override is silent. A reader of `homeScreen.tap(el)` expects `BaseScreen.tap()` behaviour (which handles `clickable=false` via coordinate gesture). A hidden override bypasses that logic, creating a class that behaves differently from all other screens and is a source of confusion during debugging.

---

### P005 — Locator getter without source discovery comment

**Severity**: MEDIUM
**Category**: PAGE_OBJ
**Files**: `screens/**/*.screen.ts`

**What to look for**: A `get` accessor in a screen class that returns a locator (calls `byId`, `byDesc`, `byResourceId`, or `$()`) with no comment indicating how the locator was discovered (e.g. "Verified from live APK (date)", "wdio-mcp get_visible_elements", "Appium Inspector").

**Bad**:
```typescript
get submitButton() {
  return this.byResourceId('submit_button'); // where did this come from?
}
```

**Good**:
```typescript
// Verified via wdio-mcp get_visible_elements (2026-03-11):
//   resource-id: submit_button, content-desc: "submit_button\nSubmit"
get submitButton() {
  return this.byResourceId('submit_button');
}
```

**Why it matters**: Mobile locators are brittle. Without a discovery comment, the next developer has no way to verify the locator is still valid after an app update, or to know whether it came from live inspection (reliable) or was guessed (unreliable). The project CLAUDE.md explicitly requires MCP discovery before writing any locator.

---

### P006 — CSS class selector for interactive element

**Severity**: MEDIUM
**Category**: PAGE_OBJ
**Files**: `pages/**/*.page.ts`

**What to look for**: `$('.` (a CSS class selector starting with `.`) used as the locator for a button, link, input, or other interactive element.

**Bad**:
```typescript
get submitButton() {
  return $('.btn-primary'); // breaks when CSS framework updates class names
}
```

**Good**:
```typescript
get submitButton() {
  return $('[data-testid="submit-button"]'); // test ID — stable across style changes
}
```

**Why it matters**: WDIO official best practices recommend test IDs (`data-testid`, `data-test`, or `aria-*` attributes) over CSS class selectors for interactive elements. CSS classes are styling artifacts that change with design updates. A CSS class refactor that does not touch any functionality will break tests, creating false failures that erode team trust in the test suite.

---

### P007 — No `isOn[Name]Screen()` detection method

**Severity**: LOW
**Category**: PAGE_OBJ
**Files**: `screens/**/*.screen.ts`

**What to look for**: A screen class that does not have a method named `isOn[ScreenName]Screen()` returning `Promise<boolean>`.

**Bad**:
```typescript
export class HomeScreen extends BaseScreen {
  get homeTab() { return this.byResourceId('navigation_menu_home'); }
  async tapWallet() { ... }
  // No isOnHomeScreen() — caller has no way to check if navigation succeeded
}
```

**Good**:
```typescript
export class HomeScreen extends BaseScreen {
  get homeTab() { return this.byResourceId('navigation_menu_home'); }

  async isOnHomeScreen(): Promise<boolean> {
    const source = await driver.getPageSource();
    return source.includes('navigation_menu_home');
  }
}
```

**Why it matters**: Screen detection methods using `getPageSource().includes()` are the recommended pattern for guard logic in session helpers and conditional steps (`When I accept PDPA if prompted`). Without a detection method the screen object cannot be used in session-guard flows (`ensureAuthenticated`, `detectScreen`), forcing callers to duplicate detection logic or use fragile `waitForDisplayed` checks.

---

## STEP_DEFN Checks (S-series)

---

### S001 — Missing `this: AppWorld` type annotation

**Severity**: HIGH
**Category**: STEP_DEFN
**Files**: `steps/**/*.steps.ts`

**What to look for**: A `Given`, `When`, or `Then` step using `function` keyword but lacking `this: AppWorld` as the first parameter.

**Bad**:
```typescript
When('I tap the login button', async function () {
  await login.tapLogin(); // this is untyped — IDE has no world state
});
```

```typescript
Then('I see the error message {string}', async function (message: string) {
  await expect($('.error')).toHaveText(message);
});
```

**Good**:
```typescript
When('I tap the login button', async function (this: AppWorld) {
  await login.tapLogin();
});

Then('I see the error message {string}', async function (this: AppWorld, message: string) {
  await expect($('.error')).toHaveText(message);
});
```

**Why it matters**: `this: AppWorld` is a TypeScript "fake parameter" that types the `this` context for the IDE and compiler. Without it, `this.lastResponse`, `this.preferCode`, and `this.attach()` have no type information, losing autocomplete and compile-time checks. The annotation has no runtime cost and is required by the project's `verbatimModuleSyntax` tsconfig.

---

### S002 — Hardcoded `http/https` URL in `browser.url()` call

**Severity**: HIGH
**Category**: STEP_DEFN
**Files**: `steps/web/**/*.steps.ts`, `steps/mobile/**/*.steps.ts`

**What to look for**: `browser.url('http` or `browser.url("http` in any step file.

**Bad**:
```typescript
Given('I am on the login page', async function (this: AppWorld) {
  await browser.url('https://app.example.com/login'); // hardcoded — breaks in staging/CI
});
```

**Good**:
```typescript
Given('I am on the login page', async function (this: AppWorld) {
  await browser.url('/login'); // relative path — WDIO prepends baseURL from wdio.conf.ts
});
```

**Why it matters**: `browser.url()` with a relative path prepends `baseURL` from `wdio.conf.ts`, which reads from the `BASE_URL` environment variable. Hardcoded URLs break in staging, CI, or Docker environments where the hostname differs. The CLAUDE.md project convention explicitly forbids hardcoded URLs in step definitions.

---

### S003 — Direct `$()` or `browser.` call in step (should use page object)

**Severity**: MEDIUM
**Category**: STEP_DEFN
**Files**: `steps/**/*.steps.ts`

**What to look for**: `await $('`, `$('`, `browser.findElement`, or `await browser.$` used directly in a step body rather than delegating to a page or screen object method.

**Bad**:
```typescript
When('I click the submit button', async function (this: AppWorld) {
  await $('#submit-button').click(); // locator lives in step, not page object
});
```

**Good**:
```typescript
When('I click the submit button', async function (this: AppWorld) {
  await loginPage.tapSubmit(); // locator + interaction encapsulated in page object
});
```

**Why it matters**: Locators belong in page/screen objects so they can be updated in one place when the UI changes. Direct `$()` calls in step definitions scatter locators across the codebase and duplicate the logic that already belongs to the POM layer.

---

### S004 — Hardcoded timeout number (use `TIMEOUTS` constants)

**Severity**: MEDIUM
**Category**: STEP_DEFN
**Files**: `steps/**/*.steps.ts`, `screens/**/*.screen.ts`

**What to look for**: A numeric literal (e.g. `5000`, `10000`, `15000`, `30000`) passed as a `timeout` option to `waitForDisplayed`, `waitForExist`, `waitUntil`, or similar WDIO wait methods, outside of `BaseScreen` methods.

**Bad**:
```typescript
Then('the home screen is displayed', async function (this: AppWorld) {
  await home.homeTab.waitForDisplayed({ timeout: 15000 }); // magic number
});
```

**Good**:
```typescript
import { TIMEOUTS } from '../../screens/base.screen.ts';

Then('the home screen is displayed', async function (this: AppWorld) {
  await home.homeTab.waitForDisplayed({ timeout: TIMEOUTS.nav });
});
```

**Why it matters**: `TIMEOUTS` in `BaseScreen` is the single source of truth for timeout values across the project. Magic numbers make timeouts inconsistent across files and require grep-and-replace when tuning for CI environments. Named constants communicate intent (`TIMEOUTS.nav` = post-navigation including network, `TIMEOUTS.element` = local element visibility).

---

### S005 — `import AppWorld` without `type` keyword

**Severity**: MEDIUM
**Category**: CONVENTION
**Files**: `steps/**/*.steps.ts`

**What to look for**: `import { AppWorld }` or `import { AppWorld, ... }` where `AppWorld` is used only as a TypeScript type annotation (i.e. only appears as `this: AppWorld`) without the `type` modifier.

**Bad**:
```typescript
import { AppWorld } from '../../fixtures/index.ts'; // value import for type-only use
```

**Good**:
```typescript
import type { AppWorld } from '../../fixtures/index.ts'; // type-only import
```

or when mixing value and type imports from the same file:

```typescript
import { setWorldConstructor } from '@cucumber/cucumber';
import type { AppWorld } from '../../fixtures/index.ts';
```

**Why it matters**: The project `tsconfig.json` sets `"verbatimModuleSyntax": true`, which requires type-only imports to use `import type`. A regular `import` for a type-only use will be emitted as a runtime import by the bundler, adding unnecessary module resolution overhead and potentially causing issues with tree-shaking.

---

### S006 — Internal import without `.ts` suffix

**Severity**: MEDIUM
**Category**: CONVENTION
**Files**: `steps/**/*.steps.ts`, `screens/**/*.screen.ts`, `pages/**/*.page.ts`

**What to look for**: An `import` statement referencing a relative path (`./` or `../../`) without the `.ts` file extension.

**Bad**:
```typescript
import type { AppWorld } from '../../fixtures/index';
import { LoginScreen } from '../../screens/login.screen';
import { TIMEOUTS } from '../../screens/base.screen';
```

**Good**:
```typescript
import type { AppWorld } from '../../fixtures/index.ts';
import { LoginScreen } from '../../screens/login.screen.ts';
import { TIMEOUTS } from '../../screens/base.screen.ts';
```

**Why it matters**: The project uses Bun in bundler mode, which requires explicit `.ts` suffixes on internal imports. Without the suffix, Bun may fail to resolve the module or fall back to slow resolution strategies. All existing example files in the project use `.ts` suffixes consistently.

---

## API_TEST Checks (A-series)

---

### A001 — `process.env['API_BASE_URL']` without `?? 'http://localhost:4010'` fallback

**Severity**: HIGH
**Category**: API_TEST
**Files**: `steps/api/**/*.steps.ts`

**What to look for**: `process.env['API_BASE_URL']` or `process.env.API_BASE_URL` used to construct a `BaseAPI` instance without a `?? 'http://localhost:4010'` fallback.

**Bad**:
```typescript
const api = new BaseAPI(process.env['API_BASE_URL']!); // throws if env var not set
```

```typescript
const api = new BaseAPI(process.env['API_BASE_URL'] as string); // undefined cast
```

**Good**:
```typescript
const api = new BaseAPI(process.env['API_BASE_URL'] ?? 'http://localhost:4010');
```

**Why it matters**: `process.env['API_BASE_URL']` is `string | undefined`. Without a fallback, passing `undefined` to `BaseAPI` constructs an invalid base URL (`undefined/api/users`). The fallback `http://localhost:4010` is the Prism mock server address for local development. Using `!` or `as string` casts hide the undefined case rather than handling it.

---

### A002 — `this.preferCode` set but never reset to `null` after use

**Severity**: HIGH
**Category**: API_TEST
**Files**: `steps/api/**/*.steps.ts`

**What to look for**: A `When` step that calls an API method using `this.preferCode` to set the `Prefer` header but does not set `this.preferCode = null` immediately after the call.

**Bad**:
```typescript
When('ฉันเรียก GET {string}', async function (this: AppWorld, path: string) {
  const api = new BaseAPI(process.env['API_BASE_URL'] ?? 'http://localhost:4010');
  const headers = this.preferCode ? { Prefer: `code=${this.preferCode}` } : undefined;
  this.lastResponse = await api.get(path, headers);
  // preferCode not reset — bleeds into the next When step in the same scenario
});
```

**Good**:
```typescript
When('ฉันเรียก GET {string}', async function (this: AppWorld, path: string) {
  const api = new BaseAPI(process.env['API_BASE_URL'] ?? 'http://localhost:4010');
  const headers = this.preferCode ? { Prefer: `code=${this.preferCode}` } : undefined;
  this.lastResponse = await api.get(path, headers);
  this.preferCode = null; // consume and reset — one Given sets one When
});
```

**Why it matters**: `AppWorld.preferCode` is reset by the `Before` hook between scenarios, not between steps. If a scenario has multiple `When` API calls, the `preferCode` set by a `Given` step in the first call will leak into the second call, causing the mock server to return the wrong status code. Reset immediately after consuming.

---

### A003 — `this.lastResponse.status` accessed without null guard

**Severity**: MEDIUM
**Category**: API_TEST
**Files**: `steps/api/**/*.steps.ts`

**What to look for**: `this.lastResponse.status` accessed without a preceding `if (!this.lastResponse)` check. This is a lower-severity variant of C002 — accessing `.status` is less likely to crash than `.json()` (which is async and parses the body) but is still a type error if `lastResponse` is null.

**Bad**:
```typescript
Then('the response code is {int}', async function (this: AppWorld, code: number) {
  const actual = this.lastResponse.status; // TypeScript error: possibly null
  expect(actual).toBe(code);
});
```

**Good**:
```typescript
Then('the response code is {int}', async function (this: AppWorld, code: number) {
  if (!this.lastResponse) throw new Error('No response — run a When API step first');
  expect(this.lastResponse.status).toBe(code);
});
```

**Why it matters**: TypeScript types `lastResponse` as `Response | null`. Accessing `.status` on `null` throws `TypeError` at runtime. The null guard also produces a meaningful error message ("No response — run a When API step first") rather than a confusing `TypeError: Cannot read properties of null`.

---

## CONVENTION Checks (V-series)

---

### V001 — Scenario has fewer or more than 2 tags (excluding `@monday=`)

**Severity**: HIGH
**Category**: CONVENTION
**Files**: `features/**/*.feature`

**What to look for**: A `Scenario:` line whose preceding tag lines have fewer than 2 or more than 2 tags, after excluding any `@monday=BOARD/ITEM` tags (which are metadata and do not count toward the limit).

**Bad**:
```gherkin
@smoke
Scenario: User can log in with valid credentials
```

```gherkin
@smoke
@happy-path
@regression
Scenario: User can log in with valid credentials
```

**Good**:
```gherkin
@smoke
@happy-path
Scenario: User can log in with valid credentials
```

```gherkin
@smoke
@happy-path
@monday=7839498373/8142073690
Scenario: User can log in with valid credentials
```

**Why it matters**: The tag glossary in CLAUDE.md specifies exactly 2 tags per scenario — one priority tag (`@smoke` or `@regression`) and one type tag (`@happy-path`, `@negative`, or `@boundary`). Fewer tags makes filtering impossible; more tags bloats tag queries and signals the scenario is doing too much.

---

### V002 — Two priority tags on same scenario

**Severity**: HIGH
**Category**: CONVENTION
**Files**: `features/**/*.feature`

**What to look for**: A scenario with both `@smoke` and `@regression` tags.

**Bad**:
```gherkin
@smoke
@regression
@happy-path
Scenario: User can log in
```

**Good**:
```gherkin
@smoke
@happy-path
Scenario: User can log in  # critical path — blocks deploy
```

**Why it matters**: `@smoke` and `@regression` are mutually exclusive priority tiers. `@smoke` is the CI gate (fast, critical path). `@regression` is the full suite. A scenario cannot be both; tagging it with both causes it to run in both suites, doubling execution time with no benefit.

---

### V003 — Two type tags on same scenario

**Severity**: HIGH
**Category**: CONVENTION
**Files**: `features/**/*.feature`

**What to look for**: A scenario with two or more type tags from the set: `@happy-path`, `@negative`, `@boundary`.

**Bad**:
```gherkin
@regression
@happy-path
@negative
Scenario: Login with empty fields shows an error
```

**Good**:
```gherkin
@regression
@negative
Scenario: Login with empty fields shows an error
```

**Why it matters**: Type tags describe the nature of the scenario's test coverage. A scenario that is simultaneously a happy path and a negative case is testing two behaviors and should be split into two scenarios. Dual type tags are a symptom of an overly broad scenario that violates the one-assertion-per-scenario principle.

---

### V004 — `http/https` URL hardcoded in `.feature` file step

**Severity**: HIGH
**Category**: CONVENTION
**Files**: `features/**/*.feature`

**What to look for**: Any step line in a `.feature` file containing `http://` or `https://` as part of the step text or a data table value.

**Bad**:
```gherkin
When I navigate to "https://app.example.com/login"
```

```gherkin
When ฉันเรียก GET "https://localhost:4010/api/users"
```

**Good**:
```gherkin
When I am on the login page
```

```gherkin
When ฉันเรียก GET "/api/users"
```

**Why it matters**: Feature files are business-readable specifications. Hardcoded URLs are implementation details that belong in `wdio.conf.ts` (via `BASE_URL`) or in step definitions (via `API_BASE_URL`). Hardcoded URLs in features break when the environment changes and violate the Gherkin principle that feature files should read as plain-language requirements.

---

### V005 — Thai step text in web/mobile `.feature` file

**Severity**: MEDIUM
**Category**: CONVENTION
**Files**: `features/web/**/*.feature`, `features/mobile/**/*.feature`

**What to look for**: A `Given`, `When`, `Then`, or `And` step line containing Thai Unicode characters (code points U+0E00–U+0E7F) in a file under `features/web/` or `features/mobile/`.

**Bad**:
```gherkin
# features/web/login.feature
When ฉันคลิกปุ่ม Log in
```

**Good**:
```gherkin
# features/web/login.feature
When I click the Log in button
```

**Why it matters**: Project convention separates languages by domain: web and mobile features use English steps (matching the English step definitions in `steps/web/` and `steps/mobile/`), while API features use Thai steps (matching `steps/api/`). Mixing languages in web/mobile features will cause Cucumber to fail to match the step with an "Undefined step" error.

---

### V006 — English step text in API `.feature` file

**Severity**: MEDIUM
**Category**: CONVENTION
**Files**: `features/api/**/*.feature`

**What to look for**: A step line in a file under `features/api/` that is written entirely in English (no Thai characters) when the shared API step definitions (`steps/api/`) use Thai step text.

**Bad**:
```gherkin
# features/api/orders.feature
When I call GET "/api/orders"
Then status code should be 200
```

**Good**:
```gherkin
# features/api/orders.feature
When ฉันเรียก GET "/api/orders"
Then status code ควรเป็น 200
```

**Why it matters**: API step definitions in `steps/api/` (see `examples/users-api/steps/api/users.steps.ts`) are written in Thai. An English step in an API feature will not match any registered step definition and will produce an "Undefined step" error, failing the scenario before any API call is made.
