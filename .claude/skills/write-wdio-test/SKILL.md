---
name: write-wdio-test
description: Implements WDIO+Cucumber test code (step definitions, page/screen objects) from an existing .feature file. Use after write-gherkin produces the feature file, or when implementing automation for an existing scenario. Covers Web (WDIO page objects), API (BaseAPI + AppWorld), and Mobile (Appium + BaseScreen).
user-invocable: true
argument-hint: "path to .feature file or feature name (e.g. features/web/login.feature)"
allowed-tools: Read, Glob, Grep, Bash, mcp__wdio-mcp__get_visible_elements, mcp__wdio-mcp__start_app_session, mcp__wdio-mcp__take_screenshot
---

## Persona

Act as a senior WDIO automation engineer. You implement clean, stable, maintainable test code from Gherkin specifications. You know the project architecture cold. You never add assertions to page/screen objects — those belong in step definitions. You never guess locators on mobile — you discover them first via MCP. You use WDIO built-in assertions which auto-retry, so you never add redundant waits before them.

**Target**: $ARGUMENTS

## Interface

Domain {
  kind: WEB | API | MOBILE
  featurePath: String
  stepPath: String
  objectPath: String    // pages/ for WEB, screens/ for MOBILE, none for API
}

fn detectDomain(request)
fn readFeatureFile(path)
fn discoverElements(domain)
fn scanExistingSteps(domain)
fn writeSteps(domain, feature, elements)
fn writePageObject(feature, elements)
fn writeScreenObject(feature, elements)
fn verify(artifacts)

## Constraints

Constraints {
  require {
    Read the .feature file first — implement exactly the steps written there, nothing extra.
    Detect domain (WEB/API/MOBILE) from the feature file path or $ARGUMENTS.
    For MOBILE: run Phase 0 MCP discovery BEFORE writing any locator.
    For API: read openapi.yaml at project root before writing paths or assertions.
    For WEB: check existing pages/ for matching page object before creating a new one.
    Use function keyword in all step definitions — never arrow functions.
    Type this: AppWorld on every step function.
    Use import type for AppWorld and all type-only imports.
    Use .ts suffix on all internal imports.
    NO assertions in page/screen objects — assertions belong in step definitions.
    Use WDIO built-in expect() assertions — they auto-retry, never add waitForDisplayed before them.
    Use for...of loops with async callbacks — never forEach with async.
    scanExistingSteps before writing — never duplicate step text already defined.
    Page/screen objects must be stateless — no constructor arguments, no mutable fields.
    All timeouts via TIMEOUTS constants from base.screen.ts — never magic numbers.
  }
  never {
    Guess locators for mobile — always discover via mcp__wdio-mcp__get_visible_elements.
    Add assertions (expect, throw, if-check) inside page/screen object methods.
    Use browser.pause(N) — use waitUntil or built-in assertions instead.
    Call waitForDisplayed() before expect().toBeDisplayed() — assertions auto-retry.
    Use forEach with an async callback — use for...of instead.
    Hardcode base URLs — use browser.url('/path') for web or API_BASE_URL env for API.
    Use browser or $ in API step files — no browser session in API suite.
    Add constructor parameters to page/screen objects.
    Write steps that duplicate existing step text.
    Implement steps not present in the feature file.
  }
}

## State

State {
  domain: Domain | null = null
  featureSteps: [String] = []       // step texts parsed from .feature file
  existingSteps: [String] = []      // step texts already defined in steps/{domain}/
  elements: Map<String, String> = {}  // locator map (mobile: from MCP, web: from DOM)
  artifacts: [String] = []          // written file paths
}

## Reference Materials

- Web patterns: `.claude/skills/write-wdio-test/reference/web-patterns.md`
- API patterns: `.claude/skills/write-wdio-test/reference/api-patterns.md`
- Mobile patterns: `.claude/skills/write-wdio-test/reference/mobile-patterns.md`
- BaseScreen source: `screens/base.screen.ts`
- BaseAPI source: `support/api/base-api.ts`
- AppWorld source: `fixtures/index.ts`
- Web example: `examples/users-api/steps/api/users.steps.ts`
- Mobile example: `examples/kub-wallet/steps/mobile/login.steps.ts`
- Mobile screen example: `examples/kub-wallet/screens/login.screen.ts`

## Workflow

fn detectDomain(request) {
  signals = [
    featurePath contains "features/mobile/"  => MOBILE
    featurePath contains "features/api/"     => API
    featurePath contains "features/web/"     => WEB
    request mentions "screen" | "app"        => MOBILE
    request mentions "endpoint" | "API"      => API
    default                                  => WEB
  ]
  domain.featurePath = resolve path from request
  domain.stepPath    = "steps/{web|api|mobile}/[name].steps.ts"
  domain.objectPath  = match domain: WEB => "pages/", MOBILE => "screens/", API => ""
}

fn readFeatureFile(path) {
  Read the .feature file
  Extract all Given/When/Then/And step texts
  state.featureSteps = list of step texts (deduplicated)
}

fn discoverElements(domain) {
  match (domain.kind) {
    WEB => {
      Check pages/ for existing page object matching the feature name
      If exists: read it, extract getter names and selectors
      If not: note selector patterns needed — will infer from step text
    }
    API => {
      Read openapi.yaml — extract paths, methods, status codes, request/response shapes
      Build elements map: { path, method, successCode, errorCodes, responseFields }
    }
    MOBILE => {
      // Phase 0 — MANDATORY, no exceptions
      mcp__wdio-mcp__start_app_session if session not running
      Navigate to the target screen
      mcp__wdio-mcp__get_visible_elements — catalog all elements with:
        resource-id   => byResourceId('id')   [priority 1]
        content-desc  => byId('exact')        [priority 2]
        compound desc => byDesc('partial')    [priority 3]
        class only    => XPath                [priority 4]
      mcp__wdio-mcp__take_screenshot — visual confirmation
      Tap interactive elements → observe state changes
      Build state.elements map from discovered locators
    }
  }
}

fn scanExistingSteps(domain) {
  Glob("steps/{domain.kind.lower()}/**/*.steps.ts")
  Read each file — collect Given/When/Then text patterns
  state.existingSteps = [step texts]
  // Steps in featureSteps but NOT in existingSteps = steps to implement
}

fn writeSteps(domain, feature, elements) {
  newSteps = state.featureSteps - state.existingSteps

  If newSteps is empty:
    Report: "All steps already implemented — no new steps file needed"
    Return

  Write steps/{web|api|mobile}/[name].steps.ts:

  Header imports (always):
    import { Given, When, Then } from '@cucumber/cucumber'
    import type { AppWorld } from '../../fixtures/index.ts'

  Additional imports per domain:
    WEB    => import { [Name]Page } from '../../pages/[name].page.ts'
    API    => import { BaseAPI } from '../../support/api/base-api.ts'
    MOBILE => import { [Name]Screen } from '../../screens/[name].screen.ts'
              import { ensureAuthenticated } from '../../support/mobile/session-helper.ts'

  For each step in newSteps:
    Given/When/Then('[text]', async function (this: AppWorld) { ... })
    // function keyword — never arrow
    // Use screen/page object methods — no direct DOM manipulation
    // API: this.lastResponse = await api.get/post(path, headers?)
    // Web: await page.actionMethod()
    // Mobile: await screen.actionMethod()

  Assertions (in Then steps only, never in page/screen object methods):
    await expect(el).toBeDisplayed()          // auto-retries — no waitForDisplayed needed
    await expect(el).toHaveText('text')
    await expect(el).toHaveAttribute('k','v')
    if (!this.lastResponse) throw new Error('No response')  // API null guard
}

fn writePageObject(feature, elements) {
  // WEB domain only
  Write pages/[name].page.ts:

  class [Name]Page — no extends, no constructor
  get [element]() { return $('[selector]'); }   // lazy evaluation, re-queries DOM each time
  async [action]() { ... }                      // user-service methods, no assertions

  Selector priority: $('[data-testid=""]') > $('[name=""]') > $('#id') > $('[aria-label=""]') > $('//xpath')
  Never: $('.class') for interactive elements
}

fn writeScreenObject(feature, elements) {
  // MOBILE domain only
  Write screens/[name].screen.ts:

  import { BaseScreen, TIMEOUTS } from './base.screen.ts'
  export class [Name]Screen extends BaseScreen

  Getter per element (from Phase 0 MCP discovery):
    get [element]() { return this.byResourceId('id'); }  // priority 1
    // Comment: source "discovered via wdio-mcp [date]"

  isOn[Name]Screen(): Promise<boolean>:
    // Use getPageSource().includes('unique_element_id') — fast, no element query
    // Return false in catch block

  Action methods:
    async fill[Field](value: string) — waitForElement → setText
    async tap[Button]()              — waitForClickable → tap
    // NO assertions here — assertions belong in step definitions
}

fn verify(artifacts) {
  For each written .ts file: check for common issues
    Arrow function in steps?     => CRITICAL, fix immediately
    Assertion in page object?    => HIGH, move to step
    forEach with async?          => HIGH, replace with for...of
    browser.pause()?             => HIGH, replace with waitUntil
    waitForDisplayed before expect? => MEDIUM, remove redundant wait

  Output:
    ## Files Written
    [list each path]

    ## Run Command
    TAGS='@smoke' bun run test:[web|api|mobile:android]

    ## Next Step
    /review-wdio-test [paths] to audit code quality
}

write-wdio-test(request) {
  detectDomain(request) |> readFeatureFile |> discoverElements |> scanExistingSteps |> writeSteps |> match(domain.kind) { WEB => writePageObject, MOBILE => writeScreenObject, API => skip } |> verify
}
