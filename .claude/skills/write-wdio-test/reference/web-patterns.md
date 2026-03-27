# Web Patterns — WDIO + Cucumber

Reference for implementing web UI test code in this project.

---

## Page Object Template

```typescript
// pages/login.page.ts
export class LoginPage {
  // ── Getters (lazy evaluation — re-queries DOM on each access) ────────────────

  get usernameInput() {
    return $('[data-testid="username-input"]');
  }

  get passwordInput() {
    return $('[data-testid="password-input"]');
  }

  get submitButton() {
    return $('[data-testid="login-submit"]');
  }

  get errorMessage() {
    return $('[data-testid="error-message"]');
  }

  // ── Action methods (user services, not mechanical steps) ─────────────────────

  async fillUsername(username: string) {
    await this.usernameInput.setValue(username);
  }

  async fillPassword(password: string) {
    await this.passwordInput.setValue(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async login(username: string, password: string) {
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.submit();
  }

  // isOnLoginPage(): no assertions here — use getPageSource() or URL check
  async isOnLoginPage(): Promise<boolean> {
    try {
      const url = await browser.getUrl();
      return url.includes('/login');
    } catch {
      return false;
    }
  }
}
```

### Key rules

- **No `constructor`** — WDIO globals (`$`, `browser`) are injected automatically.
- **No mutable fields** — page objects are stateless. No `this.currentUser = ...`.
- **No assertions** — `expect()` belongs in step definitions, not page objects.
- **Getters, not stored references** — `get el() { return $(...); }` re-queries the DOM on every access. Stored references go stale after navigation or DOM mutations.
- **Return `this` for chaining** where it reads naturally, but don't force it.

---

## Selector Priority

| Priority | Selector | Rationale |
|----------|----------|-----------|
| 1 (best) | `$('[data-testid="..."]')` | Decoupled from styling and text — survives CSS/copy changes |
| 2 | `$('[name="..."]')` | Stable for form inputs |
| 3 | `$('#id')` | Reliable when IDs are semantic, not generated |
| 4 | `$('[aria-label="..."]')` | Accessibility attribute — stable if maintained |
| 5 | `$('//xpath')` | Last resort — brittle, avoid for interactive elements |
| Never | `$('.css-class')` | Breaks on any style refactor |

**WDIO best practice**: prefer test IDs and accessibility IDs. They survive visual redesigns and are explicit contracts between dev and QA.

---

## Why Getters, Not Stored References

```typescript
// WRONG — stored reference goes stale after navigation
class BadPage {
  private submitBtn = $('[data-testid="submit"]'); // evaluated once at construction

  async submit() {
    await this.submitBtn.click(); // may point to detached DOM node
  }
}

// CORRECT — getter re-queries DOM on every call
class GoodPage {
  get submitBtn() {
    return $('[data-testid="submit"]'); // re-evaluated each time
  }

  async submit() {
    await this.submitBtn.click(); // always fresh reference
  }
}
```

WDIO's `$()` returns a `ChainablePromiseElement` — a lazy proxy. The actual DOM lookup happens when you `await` it or chain an action. Getters preserve this laziness.

---

## Step Definition Template

```typescript
// steps/web/login.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../../fixtures/index.ts';
import { LoginPage } from '../../pages/login.page.ts';

const page = new LoginPage();

Given('I am on the login page', async function (this: AppWorld) {
  await browser.url('/login');
});

When('I enter username {string}', async function (this: AppWorld, username: string) {
  await page.fillUsername(username);
});

When('I enter password {string}', async function (this: AppWorld, password: string) {
  await page.fillPassword(password);
});

When('I click the login button', async function (this: AppWorld) {
  await page.submit();
});

Then('I should see the dashboard', async function (this: AppWorld) {
  await expect($('[data-testid="dashboard"]')).toBeDisplayed();
});

Then('I should see error {string}', async function (this: AppWorld, message: string) {
  await expect(page.errorMessage).toHaveText(message);
});
```

### Import rules

- Always `import { Given, When, Then }` from `'@cucumber/cucumber'`
- Always `import type { AppWorld }` — type-only import (verbatimModuleSyntax)
- Always use `.ts` suffix on internal imports
- `function` keyword on every step — **never arrow functions** (arrow functions lose `this` binding)

---

## WDIO Built-in Assertions

All `expect()` assertions auto-retry until the condition is true or the timeout expires. **Never add `waitForDisplayed()` before them** — it is redundant and adds unnecessary latency.

```typescript
// Element visibility
await expect(el).toBeDisplayed();           // element is visible in viewport
await expect(el).not.toBeDisplayed();       // element is hidden or absent
await expect(el).toExist();                 // element exists in DOM (may be hidden)

// Text content
await expect(el).toHaveText('exact text');
await expect(el).toHaveTextContaining('partial');

// Value (inputs)
await expect(el).toHaveValue('some value');

// Attributes
await expect(el).toHaveAttribute('aria-disabled', 'true');
await expect(el).toHaveAttribute('href', '/dashboard');

// CSS class
await expect(el).toHaveElementClass('active');

// URL / title
await expect(browser).toHaveUrl('https://example.com/dashboard');
await expect(browser).toHaveUrlContaining('/dashboard');
await expect(browser).toHaveTitle('Dashboard');
```

```typescript
// WRONG — redundant wait before assertion
await el.waitForDisplayed();          // unnecessary — expect() already retries
await expect(el).toBeDisplayed();

// CORRECT — assertion retries automatically
await expect(el).toBeDisplayed();
```

---

## Navigation

```typescript
// CORRECT — relative path, baseURL from wdio.conf.ts / .env (BASE_URL)
await browser.url('/login');
await browser.url('/dashboard?tab=overview');

// WRONG — hardcoded URL
await browser.url('https://app.example.com/login');
```

`baseURL` is set in `wdio.conf.ts` from the `BASE_URL` env var. Never duplicate it in steps or page objects.

---

## Async Loops: `for...of` vs `forEach`

`forEach` does not await async callbacks — the loop body runs but errors are silently swallowed and execution continues without waiting.

```typescript
// WRONG — forEach ignores async
const items = await $$('[data-testid="item"]');
items.forEach(async (item) => {
  await item.click(); // NOT awaited — fires and forgets
});

// CORRECT — for...of awaits each iteration
const items = await $$('[data-testid="item"]');
for (const item of items) {
  await item.click(); // properly awaited
}
```

Same rule applies to `map`, `filter`, `reduce` with async callbacks — use `Promise.all()` for concurrent or `for...of` for sequential.

---

## Feature File Example

```gherkin
Feature: User login

  @smoke
  @happy-path
  Scenario: Successful login redirects to dashboard
    Given I am on the login page
    When I enter username "alice@example.com"
    And I enter password "secret123"
    And I click the login button
    Then I should see the dashboard

  @regression
  @negative
  Scenario: Wrong password shows error message
    Given I am on the login page
    When I enter username "alice@example.com"
    And I enter password "wrongpassword"
    And I click the login button
    Then I should see error "Invalid credentials"
```

**Declarative style** — steps describe intent, not implementation. "I click the login button" not "I click the element with selector `[data-testid='submit']`".

---

## Run Commands

```bash
# Start Chrome + services (keep running during dev session)
bun run docker:up

# Run all web tests
bun run test:web

# Filter by tag
TAGS='@smoke' bun run test:web

# Run a specific feature file
SPEC=features/web/login.feature bun run test:web

# Filter by scenario name (substring match)
SCENARIO_NAME="successful login" bun run test:web
```
