# Mobile Patterns — WDIO + Appium + BaseScreen

Reference for implementing mobile test code in this project (Flutter + Android/iOS).

---

## Phase 0: MCP Element Discovery (MANDATORY)

**Never write a single locator without running Phase 0 first.** Resource IDs and content-desc values in Flutter apps are not guessable — they come from `Semantics(identifier: '...')` widgets in the app source.

### Step-by-step workflow

```
1. Start app session
   mcp__wdio-mcp__start_app_session
   (skip if session already running)

2. Navigate to the target screen
   Tap from the current screen to reach the screen you need to automate.
   Use mcp__wdio-mcp__tap_element or mcp__wdio-mcp__execute_script as needed.

3. Catalog all elements
   mcp__wdio-mcp__get_visible_elements
   → Review each element for:
       resource-id     — use byResourceId()  [priority 1]
       content-desc    — check if compound (has \n) → byDesc(), else byId()
       class name      — android.widget.Button vs android.view.View
       clickable attr  — distinguishes tappable views from labels

4. Take screenshot for visual reference
   mcp__wdio-mcp__take_screenshot

5. Verify interactive elements
   Tap each button/input → observe state change in screenshot
   This confirms your locator targets the right element.

6. Build locator map
   Annotate each element with the chosen strategy and note the discovery date.
```

### Critical: Accessibility must be enabled

Flutter Semantics only activates when TalkBack is running. Without it, page source returns blank `FrameLayout` nodes — no resource-id, no content-desc.

```bash
adb shell settings put secure enabled_accessibility_services \
  com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService
adb shell settings put secure accessibility_enabled 1
```

---

## Locator Priority Table

| Priority | Method | When to use | Example |
|----------|--------|-------------|---------|
| 1 (best) | `byResourceId('id')` | Element has `resource-id` attribute | `byResourceId('login_submit_button')` |
| 2 | `byId('exact')` | Exact unique `content-desc`, no `\n` | `byId('I already have an account')` |
| 3 | `byDesc('partial')` | Compound `content-desc` with `\n` | `byDesc('navigation_menu_wallet')` |
| 4 (last) | XPath | No id/desc, or must filter by class | `$('//android.widget.Button[@content-desc="Accept"]')` |

**Compound content-desc example**: element reports `content-desc = "navigation_menu_wallet\nWallet"`. Use `byDesc("navigation_menu_wallet")` — `descriptionContains` ignores the `\nWallet` suffix.

**XPath for class disambiguation**: when both `android.view.View` and `android.widget.Button` have the same `content-desc` (e.g. `"Accept"`), use XPath with class filter to pick the button:
```typescript
$('//android.widget.Button[@content-desc="Accept"]')
```

---

## BaseScreen Methods

All screen objects extend `BaseScreen` from `screens/base.screen.ts`.

```typescript
// Locator builders
protected byId(identifier: string)        // ~identifier (exact content-desc)
protected byDesc(partial: string)         // descriptionContains (partial content-desc)
protected byResourceId(resourceId: string) // resourceId() UiSelector

// Waiting
async waitForElement(el, timeout?)        // waitForDisplayed, returns el
async waitForClickable(el, timeout?)      // waitForDisplayed + poll clickable='true'

// Input
async setText(el, text)                   // click → clearValue → addValue (triggers Flutter onChange)
async getText(el)                         // el.getText()

// Tapping
async tap(el)                             // smart tap: handles clickable='false' via coordinate gesture

// Keyboard
async hideKeyboard()                      // safe no-op if already hidden
async resetCache()                        // mobile: resetAccessibilityCache — safe no-op on failure
async ensureVisible(el, timeout?)         // resetCache → hideKeyboard → waitForDisplayed

// Navigation
async waitForIdle(maxWait?)               // resetAccessibilityCache + 300ms settle time

// Scroll / Swipe
async scrollDown(percent?)               // mobile: scrollGesture
async swipe(startX, startY, endX, endY)  // pointer action swipe

// Utility
async isDisplayed(el)                    // boolean
```

### Why `setText` instead of `setValue`

Flutter's `TextEditingController` does not respond to `UiObject2.setText()` (which `setValue()` calls internally). `addValue()` sends keystrokes through the input method, triggering `onChanged` → form validation → button enable/disable. Always use `setText` from `BaseScreen`.

### Why `getAttribute('clickable')` instead of `isEnabled()`

Flutter elements always report `enabled=true` regardless of interactive state. The actual enabled/disabled state is reflected in `clickable` attribute:
- `clickable="true"` → button active (green)
- `clickable="false"` → button inactive (grey)

---

## TIMEOUTS Constants

```typescript
import { TIMEOUTS } from './base.screen.ts';

TIMEOUTS.element  // 10_000ms — wait for element without network/navigation
TIMEOUTS.nav      // 15_000ms — wait after navigation transition + network
TIMEOUTS.toast    // 5_000ms  — toast messages (short-lived)
```

**Never use magic numbers.** Always reference `TIMEOUTS`.

---

## Screen Object Template

```typescript
// screens/checkout.screen.ts
// Locators discovered via wdio-mcp get_visible_elements — 2026-03-27

import { BaseScreen, TIMEOUTS } from './base.screen.ts';

export class CheckoutScreen extends BaseScreen {
  // ── Elements (discovered via wdio-mcp, 2026-03-27) ──────────────────────────

  // resource-id: checkout_amount_input
  get amountInput() {
    return this.byResourceId('checkout_amount_input');
  }

  // resource-id: checkout_submit_button
  // compound content-desc: "checkout_submit_button\nConfirm"
  get confirmButton() {
    return this.byResourceId('checkout_submit_button');
  }

  // content-desc: "checkout_cancel_button\nCancel" → byDesc for compound
  get cancelButton() {
    return this.byDesc('checkout_cancel_button');
  }

  // content-desc: "Order Summary" (exact, no newline) → byId
  get orderSummaryTitle() {
    return this.byId('Order Summary');
  }

  // ── Screen detection ─────────────────────────────────────────────────────────

  async isOnCheckoutScreen(): Promise<boolean> {
    try {
      // getPageSource() is fast — no element query overhead
      const source = await driver.getPageSource();
      return source.includes('checkout_submit_button');
    } catch {
      return false;
    }
  }

  // ── Actions (no assertions here — assertions belong in step definitions) ─────

  async fillAmount(amount: string) {
    const el = await this.waitForElement(this.amountInput);
    await this.setText(el, amount);
  }

  async tapConfirm() {
    // waitForClickable: wait for Flutter to enable the button after form validation
    await this.waitForClickable(this.confirmButton);
    await this.tap(this.confirmButton);
    await this.waitForIdle(); // resetCache after navigation transition
  }

  async tapCancel() {
    const el = await this.waitForElement(this.cancelButton);
    await this.tap(el);
    await this.waitForIdle();
  }
}
```

---

## Step Definition Template

```typescript
// steps/mobile/checkout.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../../fixtures/index.ts';
import { CheckoutScreen } from '../../screens/checkout.screen.ts';
import { ensureAuthenticated } from '../../support/mobile/session-helper.ts';
import { TIMEOUTS } from '../../screens/base.screen.ts';

const checkout = new CheckoutScreen();

Given('I am on the Checkout screen', async function (this: AppWorld) {
  await ensureAuthenticated();
  // Navigate to checkout — adapt to your app's navigation pattern
  await checkout.waitForElement(checkout.amountInput, TIMEOUTS.nav);
});

When('I enter amount {string}', async function (this: AppWorld, amount: string) {
  await checkout.fillAmount(amount);
});

When('I tap Confirm', async function (this: AppWorld) {
  await checkout.tapConfirm();
});

Then('I should see the Success screen', async function (this: AppWorld) {
  // expect() auto-retries — no waitForDisplayed needed before it
  const successScreen = new (await import('../../screens/success.screen.ts')).SuccessScreen();
  await expect(successScreen.successTitle).toBeDisplayed();
});

Then('the Confirm button should be disabled', async function (this: AppWorld) {
  // Flutter disabled state = clickable='false'
  await expect(checkout.confirmButton).toHaveAttribute('clickable', 'false');
});

Then('the Confirm button should be enabled', async function (this: AppWorld) {
  await expect(checkout.confirmButton).toHaveAttribute('clickable', 'true');
});
```

---

## Anti-Flakiness Rules

### NEVER

1. **Guess locators** — always use `mcp__wdio-mcp__get_visible_elements` first. Flutter IDs are unpredictable.
2. **Call raw `hideKeyboard` or `resetAccessibilityCache` with `.catch(() => {})`** — use `BaseScreen.hideKeyboard()` and `BaseScreen.resetCache()` which handle errors internally.
3. **Re-use the same element reference after `resetCache()`** — cache reset invalidates Appium's internal element handles. Re-query the element.
4. **Use `driver.pause(N)` with arbitrary values** — use `waitUntil`, `waitForDisplayed`, or `ensureVisible` instead.
5. **Check `isEnabled()` for button state** — Flutter always returns `enabled=true`. Use `getAttribute('clickable')`.

### ALWAYS

1. **Explore screen with wdio-mcp BEFORE writing any locator** — Phase 0 is mandatory.
2. **Locator priority**: `byResourceId` > `byId` > `byDesc` > XPath.
3. **After keyboard operations**: call `ensureVisible(element)` to flush cache, hide keyboard, and wait for element.
4. **Re-query elements after `resetCache()`** — get a fresh element reference.
5. **Screen detection via `getPageSource().includes()`** — faster than element queries, no Appium roundtrip for missing element.
6. **`waitForIdle()` after navigation** — flushes accessibility cache and allows Flutter to finish building the new screen's semantic tree.

---

## Post-resetCache Re-query Pattern

```typescript
// WRONG — element reference invalidated after resetCache
const btn = this.byResourceId('submit_button');
await this.resetCache();
await btn.click(); // Appium handle is stale — may throw StaleElementReferenceError

// CORRECT — re-query after cache reset
await this.resetCache();
const btn = this.byResourceId('submit_button'); // fresh reference
await btn.waitForDisplayed({ timeout: TIMEOUTS.element });
await btn.click();
```

`ensureVisible(el)` handles this pattern internally — it calls `resetCache()` then re-waits on the passed element. But note: the element getter is re-evaluated by WDIO's lazy proxy on each `.waitForDisplayed()` call, so passing `this.submitButton` (a getter) to `ensureVisible` is safe.

---

## ensureVisible After Keyboard/Navigation

Use `ensureVisible(el)` whenever:
- A keyboard was shown (after text input)
- A cache-invalidating operation ran
- Navigation just occurred and the new screen hasn't fully rendered

```typescript
async fillSearchQuery(query: string) {
  const el = await this.waitForElement(this.searchInput);
  await this.setText(el, query); // keyboard appears after click-to-focus
  // After typing, keyboard may still cover elements and cache may be stale
  await this.ensureVisible(this.searchResultsList); // resetCache + hideKeyboard + wait
}
```

---

## Flutter-Specific: `getAttribute('clickable')`

Flutter does not use the standard Android `enabled` attribute for interactive state. Always check `clickable`:

```typescript
// Check button state
const clickable = await el.getAttribute('clickable');
// 'true'  → button enabled (colored, interactive)
// 'false' → button disabled (greyed out, no touch response)
// null    → attribute not set (treat as enabled on iOS)

// In assertions
await expect(el).toHaveAttribute('clickable', 'true');   // must be enabled
await expect(el).toHaveAttribute('clickable', 'false');  // must be disabled

// In BaseScreen.tap() — handles both cases
// clickable='false' → coordinate gesture bypasses accessibility
// clickable='true'  → standard el.click()
```

---

## Run Commands

```bash
# Ensure TalkBack is enabled before running
adb shell settings put secure enabled_accessibility_services \
  com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService
adb shell settings put secure accessibility_enabled 1

# Run all mobile tests (Android)
bun run test:mobile:android

# Run all mobile tests (iOS)
bun run test:mobile:ios

# Filter by tag
TAGS='@smoke' bun run test:mobile:android

# Specific feature file
SPEC=features/mobile/checkout.feature bun run test:mobile:android
```

**Prerequisites:**
- Appium server running on port 4723
- Android emulator `Pixel_7_API_34_arm64` running (or real device connected)
- APK installed: `apps/app-mock-release.apk`
- TalkBack enabled (see above)
