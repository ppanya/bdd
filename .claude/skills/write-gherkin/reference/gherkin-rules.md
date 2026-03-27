# Gherkin Rules Reference

Authoritative rules for writing well-formed, BDD-compliant Gherkin scenarios. Each section includes the rule, rationale, and concrete before/after examples.

---

## 1. Given / When / Then — Purpose and Boundaries

### Given — Establish System State

**Purpose**: Describe the world as it is before the user acts. Given steps create context, not action.

**Rule**: Given steps must describe system state, pre-conditions, or data that already exists. They never describe what the user does to get there.

| Wrong (imperative) | Right (declarative) |
|---|---|
| `Given I navigate to the login page` | `Given I am on the login screen` |
| `Given I click "My Account"` | `Given I am viewing my account settings` |
| `Given I enter username "alice"` | `Given a registered user with username "alice" exists` |
| `Given I open the wallet` | `Given my wallet has a balance of ฿10,000` |

**Why it matters**: Given steps are read by business stakeholders who want to understand the pre-condition, not re-live the UI path to get there. Navigation belongs in the step definition code, not in the scenario.

---

### When — Single User Action or System Event

**Purpose**: The trigger — one thing that happens. This is the focal point of the scenario.

**Rule**: One and only one When per scenario. It describes a single user action or an external event that causes the system to respond.

| Wrong | Right |
|---|---|
| `When I click submit and wait for the result` | `When I submit the form` |
| `When I fill in email and click login` | `When I log in with valid credentials` |
| `When I navigate to checkout and enter payment` | `When I place my order` |
| `When the server returns an error` + `When I refresh the page` | Split into two scenarios |

**Why it matters**: Multiple When steps indicate you are testing multiple behaviors at once. Each behavior deserves its own scenario for isolation and clarity.

---

### Then — Observable Outcome

**Purpose**: What the user can see, read, or experience after the When. Observable means perceivable without accessing a database or reading logs.

**Rule**: Then steps describe what a real user would observe in the UI, API response, or app state. They never assert internal system state.

| Wrong (internal state) | Right (observable) |
|---|---|
| `Then a record is inserted into the users table` | `Then I see a "Welcome aboard!" confirmation message` |
| `Then the API call is made to /auth/login` | `Then I am taken to the home screen` |
| `Then the JWT token is stored in localStorage` | `Then I remain logged in when I return to the app` |
| `Then the event is published to the queue` | `Then I receive a confirmation email` |

**Why it matters**: Scenarios are living documentation. If the implementation changes (e.g., a relational DB replaced by a document store), the observable outcome stays the same. Internal assertions couple your Gherkin to implementation details.

---

## 2. Scenario Structure Rules

### Step Count: 3–5 Steps Maximum

Scenarios must be concise. The 3–5 step rule forces you to stay focused on a single behavior.

- **3 steps** (Given/When/Then): ideal for simple, focused scenarios
- **4 steps** (adding one And): one additional context or outcome
- **5 steps**: the hard ceiling — beyond this, split or move setup to Background

**Too long — split it:**

```gherkin
# BAD: 7 steps, testing two behaviors at once
Scenario: User logs in and sees portfolio
  Given I am on the login screen
  When I enter email "alice@example.com"
  And I enter password "secret"
  And I tap the Log in button
  Then I see the home screen
  And my portfolio value is displayed
  And the last transaction date is shown
```

```gherkin
# GOOD: two focused scenarios
Scenario: Valid credentials grant access to home screen
  Given I am on the login screen
  When I log in as "alice@example.com"
  Then I see the home screen

Scenario: Home screen displays portfolio summary
  Given I am logged in as a user with portfolio data
  Then I see my portfolio value
  And my last transaction date is shown
```

---

### One When Per Scenario

Never use two When steps. If you feel the urge, you are testing a workflow (multi-step flow), which should be split into individual focused scenarios or handled as a journey test tagged `@slow`.

---

### And / But Keywords

`And` and `But` inherit the meaning of the preceding keyword. Use them to add steps of the same type without repeating Given/When/Then.

```gherkin
# Correct use of And
Given I am on the email login screen
And my account is verified

When I log in with valid credentials

Then I see the home screen
And the welcome banner shows my first name
```

`But` is used for negative outcomes alongside positive ones:

```gherkin
Then I see the home screen
But the premium features are not unlocked
```

---

## 3. Background Rules

### When to Use Background

Use Background only when **all** scenarios in the file share the exact same Given setup. If even one scenario does not need a Background step, do not use it.

**Criteria checklist:**
- [ ] 3 or more scenarios share identical Given steps
- [ ] Every scenario in the file needs that setup
- [ ] The setup describes state, not navigation actions

### Maximum 4 Lines

Background blocks must be 4 lines or fewer. Longer setups indicate the feature file is covering too many unrelated behaviors.

```gherkin
# GOOD: concise, shared state
Background:
  Given the mock API server is running
  And a registered user "alice@example.com" exists

# BAD: too long, includes actions
Background:
  Given I open the app
  And I tap "Log In"
  And I fill in the email field
  And I fill in the password field
  And I tap submit
  And I wait for the home screen
```

The bad example above is a sequence of UI actions disguised as setup. The step definitions would be doing the work of a login flow — hide this in a support helper instead and expose it as a single Given:

```gherkin
Background:
  Given I am logged in as "alice@example.com"
```

---

## 4. Scenario Outline Rules

### When to Use Scenario Outline

Use Scenario Outline when you need to run the **same scenario logic** against multiple data sets. Do not use it to avoid writing separate scenarios for distinct behaviors.

```gherkin
# GOOD: same behavior, different data
Scenario Outline: Registration rejects invalid email formats
  Given I am on the registration screen
  When I submit registration with email "<email>"
  Then I see an "Invalid email" error

  Examples:
    | email          |
    | notanemail     |
    | missing@domain |
    | @nodomain.com  |
```

### Mobile: Maximum 3–4 Example Rows

Each row in a Scenario Outline launches a full app session on mobile (emulator boot, app install, navigation). Cap at 3–4 rows in `features/mobile/`. API tests have no such constraint — data-driven API tests are fast and can have more rows.

### Do Not Use Outline to Combine Behaviors

```gherkin
# BAD: mixing happy-path and negative in one outline
Scenario Outline: Login result
  When I log in with "<email>" and "<password>"
  Then I see "<outcome>"

  Examples:
    | email             | password | outcome                  |
    | valid@example.com | correct  | home screen              |
    | valid@example.com | wrong    | invalid password message |
    | notexist@x.com    | any      | user not found message   |
```

These are three distinct behaviors (success, wrong password, unknown user). Each deserves its own scenario and its own tag pair.

---

## 5. Feature Naming Conventions

**Rule**: Feature names are capability noun phrases. They describe what the system does, not what the test suite covers.

| Wrong | Right |
|---|---|
| `Feature: Test Login Functionality` | `Feature: User Authentication` |
| `Feature: Login Test Suite` | `Feature: Phone and Email Login` |
| `Feature: TC001 — Auth Tests` | `Feature: Account Access via Social Login` |
| `Feature: Verify API endpoints` | `Feature: User Management API` |

**Pattern**: `[Domain Noun] [Capability]` or just `[Capability Noun Phrase]`

Examples:
- `Feature: Portfolio Balance Display`
- `Feature: PDPA Consent Management`
- `Feature: Wallet Transfer`
- `Feature: จัดการข้อมูล Users ผ่าน API` (Thai for API domain)

---

## 6. Scenario Naming Conventions

**Rules:**
- Present tense — scenarios ARE the spec, not tests of it
- Outcome-focused — name the result, not the action
- 10 words maximum
- No "should" (the scenario itself is the assertion)
- No "test" or "verify" (implied)
- No step text paraphrase (don't restate the steps)

| Wrong | Right |
|---|---|
| `Scenario: Test that login works` | `Scenario: Valid credentials grant home screen access` |
| `Scenario: Verify login should fail with wrong password` | `Scenario: Wrong password shows error message` |
| `Scenario: User clicks login button and sees dashboard` | `Scenario: Successful login lands on dashboard` |
| `Scenario: TC-045` | `Scenario: Expired session requires re-authentication` |
| `Scenario: User registration form validation should reject empty fields` | `Scenario: Empty registration form is rejected` |

**Format options:**

- `[Actor] [outcome]`: "New user registration completes with confirmation email"
- `[Condition] [outcome]`: "Empty phone number disables login button"
- `[Event] [result]`: "Session expiry redirects to login screen"

---

## 7. Step Language by Domain

This project uses language separation to distinguish test suites at a glance.

### API Scenarios — Thai

All steps in `features/api/` use Thai text. This matches the existing project step definitions in `steps/api/`.

```gherkin
Feature: จัดการข้อมูล Users ผ่าน API

  @smoke
  @happy-path
  Scenario: ดึงรายการ users ทั้งหมด
    When ฉันเรียก GET "/api/users"
    Then status code ควรเป็น 200
    And response ควรเป็น array

  @regression
  @negative
  Scenario: ดึง user ที่ไม่มีอยู่ ควรได้ 404
    Given ทดสอบ error case ด้วย status 404
    When ฉันเรียก GET "/api/users/9999"
    Then status code ควรเป็น 404
```

### Web / Mobile Scenarios — English

All steps in `features/web/` and `features/mobile/` use English.

```gherkin
Feature: Phone and Email Login

  @smoke
  @happy-path
  Scenario: Valid phone number enables the login button
    Given I am on the phone login screen
    When I enter a valid phone number
    Then the login button is enabled
```

---

## 8. Common Bad Steps with Declarative Rewrites

The most common mistakes are imperative steps (describing how to operate the UI). Rewrite them to describe intent.

### Navigation Actions

| Imperative (bad) | Declarative (good) |
|---|---|
| `Given I open the browser and go to /login` | `Given I am on the login screen` |
| `Given I click the Wallet tab` | `Given I am viewing my wallet` |
| `When I tap the back button` | `When I return to the previous screen` |
| `When I scroll down and tap "Settings"` | `When I open Settings` |

### Form Interactions

| Imperative (bad) | Declarative (good) |
|---|---|
| `When I type "alice" in the username field` | `When I enter username "alice"` |
| `When I click the Submit button` | `When I submit the form` |
| `When I fill in the email field with "x@y.com"` | `When I provide email "x@y.com"` |
| `When I check the "Remember me" checkbox` | `When I choose to stay logged in` |

### Result Assertions

| Internal state (bad) | Observable outcome (good) |
|---|---|
| `Then the DB has a users record` | `Then I see a success confirmation` |
| `Then an HTTP 200 is returned` (in UI test) | `Then I am taken to the home screen` |
| `Then localStorage contains the token` | `Then I remain logged in on next visit` |
| `Then the Redux store has isLoggedIn=true` | `Then I see my account dashboard` |

---

## 9. Data Tables

Use Data Tables for structured input with multiple fields. They keep scenarios readable while passing rich data to step definitions.

```gherkin
# GOOD: structured multi-field input
Scenario: Create a new user account
  When ฉันเรียก POST "/api/users" ด้วย:
    | username | email             | role  |
    | alice    | alice@example.com | admin |
  Then status code ควรเป็น 201
  And response ควรมี field "id"
```

**Rules for Data Tables:**
- Header row is optional but strongly recommended for readability
- One row = one test case; multiple rows = Scenario Outline (not a Data Table)
- Column names use domain vocabulary, not technical field names where possible
- Never put selector IDs, CSS classes, or XPath in table cells

---

## 10. Feature Description (Optional but Recommended)

The lines between `Feature:` and the first `Background:`/`Scenario:` are free text and serve as living documentation.

Use this space to:
- State the business context
- List key business rules
- Identify the primary persona(s)
- Note open questions or known limitations

```gherkin
Feature: PDPA Consent Management

  Users must provide explicit PDPA consent on first login.
  Rejecting consent logs the user out and prevents access.
  Consent choices are stored and respected across sessions.

  Personas: new_user (first login), returning_user (consent already given)

  @smoke
  @happy-path
  Scenario: New user accepts PDPA consent and proceeds to home screen
    ...
```

This narrative is visible in Allure reports and CI outputs, making it valuable for non-technical reviewers.
