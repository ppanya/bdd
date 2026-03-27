# Example Mapping Guide

Example Mapping is a structured Discovery workshop technique that surfaces ambiguity, aligns understanding, and produces ready-to-formulate Gherkin examples — before a single line of code is written.

---

## What It Is

Example Mapping is a 3-Amigos workshop (Product Owner + QA + Developer) held before sprint work begins. The goal is not to write Gherkin — it is to **reach shared understanding** of a story. Gherkin comes after.

**Invented by Matt Wynne (Cucumber Ltd).** The technique uses four types of index cards, each a different color, to map out a story visually on a table.

### The 3-Amigos

Each role brings a different lens:

| Role | Contributes | Asks |
|---|---|---|
| Product Owner | Business rules, user value | "What does the business need?" |
| QA / Tester | Edge cases, negative paths, boundary conditions | "What could go wrong? What's missing?" |
| Developer | Technical constraints, implementation questions | "How will this actually work? What depends on what?" |

Without all three, you get incomplete understanding: PO alone produces rules without testable examples; Dev/QA alone produces tests without business intent.

---

## 4 Card Types

### Yellow Card — The Story

One per session. Written as a user story:

```
As a [role]
I want [capability]
So that [business value]
```

Example:
```
As a registered user
I want to log in with my email and password
So that I can access my account securely
```

The yellow card anchors the conversation. Everything else on the table connects to it.

---

### Blue Card — Business Rules

One card per business rule. Rules are the conditions the system must enforce. They come from the PO and are refined by the team.

Rules are written as short declarative statements:

```
Users must have a verified email to log in
Accounts are locked after 5 failed login attempts
Passwords must meet the complexity policy
```

A well-scoped story has 3–5 blue cards. If you find 10+, the story is too large — split it.

---

### Green Card — Examples

One card per example. Each example is a concrete scenario that illustrates (or challenges) a rule.

Format: `[Given context] → [When event] → [Then outcome]`

```
Verified account + correct password → login → home screen shown
Verified account + wrong password → login → error: invalid credentials
Unverified account + correct password → login → error: verify email first
Locked account + any password → login → error: account locked, contact support
```

**One happy-path example per rule minimum.** QA typically adds negative examples; PO adds edge cases they've seen in production.

---

### Red Card — Questions

One card per open question. Questions block agreement — they represent things the team doesn't know yet.

```
Q: What happens if the user has no password set (social login only)?
Q: Should locked accounts show the lockout reason or a generic message?
Q: Is the 5-attempt limit per device or per account globally?
```

**Red cards are the most valuable output of Example Mapping.** A session that produces 10 questions has saved 10 future bugs or rework cycles.

---

## How Example Mapping Feeds Gherkin

The mapping → Gherkin translation is direct:

| Example Map Card | Gherkin Element |
|---|---|
| Yellow (Story) | Feature description (narrative) |
| Blue (Rule) | Comment in feature file; groups related scenarios |
| Green (Example) | One Scenario (or one Outline row) |
| Red (Question) | Comment `# Q:` in feature file until resolved |

Each green card becomes one scenario. One example = one scenario = one behavior.

---

## Simulating Example Mapping from a Written Request

When you receive a written feature request (not a live workshop), simulate the mapping:

### Step 1 — Extract or Infer the Story

If the request is a user story: extract directly.

If the request is a feature name or description:
```
Request: "Password reset flow"

Inferred story:
  As a registered user who forgot my password
  I want to reset my password via email
  So that I can regain access to my account
```

Note assumptions made. Flag for confirmation if material.

### Step 2 — Derive Business Rules

Ask: "What conditions must the system enforce for this story?"

```
Rules for password reset:
1. Reset link is only sent to registered email addresses
2. Reset link expires after 30 minutes
3. New password must meet the complexity policy
4. Used reset links cannot be reused
```

Each rule becomes a blue card / comment grouping in the feature file.

### Step 3 — Generate Examples Per Rule

For each rule, generate:
- 1 happy-path example (rule is satisfied, success occurs)
- 1 negative example (rule is violated, error is shown)
- 1–2 boundary/edge cases (extreme values, timing, partial data)

```
Rule 1 — only registered emails receive a reset link:
  happy-path: registered email → reset email sent
  negative:   unregistered email → "if this address is registered, you'll receive an email"
  boundary:   email with uppercase letters (case sensitivity check)

Rule 2 — link expires after 30 minutes:
  happy-path: link used within 30 min → password reset form shown
  boundary:   link used at exactly 30 min → may expire (flag as question)
  negative:   link used after 30 min → "this link has expired" message shown

Rule 3 — complexity policy:
  happy-path: strong password → accepted, logged in
  negative:   password too short → inline validation error
  boundary:   password at minimum length exactly → accepted
```

### Step 4 — Identify Questions

Flag anything ambiguous:

```
Q: Is the "if registered" phrasing required (privacy) or does the system confirm registration?
Q: Does the 30-minute timer start from send time or first click?
Q: Can the reset link be resent if the first one hasn't expired?
```

**Blocking vs Minor:**
- **Blocking**: the question determines which scenario to write (e.g., "does the system confirm or not confirm the email exists?")
- **Minor**: the question affects wording or edge case but you can write the main scenarios regardless

For minor questions: write the scenario based on the most reasonable assumption, add `# Q:` comment.
For blocking questions: ask the user/PO before writing the scenario.

---

## Complete Example Map: Login Story

### Yellow — Story
```
As a registered user
I want to log in with email and password
So that I can access my account securely
```

### Blue — Rules
```
Rule 1: Both email and password are required to attempt login
Rule 2: Only matching credentials grant access
Rule 3: Unverified accounts cannot log in
Rule 4: Login button is disabled until both fields are filled
```

### Green — Examples (per rule)

**Rule 1 — Both fields required**
```
email + password filled → login button enabled
email only filled → login button disabled
password only filled → login button disabled
both empty → login button disabled
```

**Rule 2 — Matching credentials only**
```
correct email + correct password → home screen shown
correct email + wrong password → "Invalid credentials" error shown
unregistered email → "Invalid credentials" error shown (no account enumeration)
```

**Rule 3 — Unverified account**
```
unverified account + correct password → "Please verify your email" error
(edge case: user whose verification email expired — add question)
```

**Rule 4 — Button state**
```
(covered by Rule 1 examples above)
```

### Red — Questions
```
Q: Does "Invalid credentials" message reveal whether email exists?
Q: Is there a login attempt rate limit? What happens after N failed attempts?
Q: Can users log in via social login (Google/Apple) on this screen too?
```

---

## Extracting Scenarios from the Example Map

Each green card → one scenario. Group by rule using comments.

```gherkin
Feature: Email and Password Login

  Users must provide both email and password to log in.
  Only verified accounts with matching credentials gain access.
  The login button remains disabled until both fields have content.

  # Q: Does error message reveal email existence? (privacy policy decision pending)

  # Rule 1 + 4: Both fields required — button state
  @smoke
  @happy-path
  Scenario: Both fields filled enables the login button
    Given I am on the email login screen
    When I enter email "user@example.com" and password "any"
    Then the login button is enabled

  @regression
  @negative
  Scenario: Missing password keeps login button disabled
    Given I am on the email login screen
    When I enter only my email address
    Then the login button is disabled

  # Rule 2: Matching credentials
  @regression
  @happy-path
  Scenario: Correct credentials land on home screen
    Given I am on the email login screen
    When I log in as "alice@example.com"
    Then I see the home screen

  @regression
  @negative
  Scenario: Wrong password shows invalid credentials error
    Given I am on the email login screen
    When I log in with an incorrect password
    Then I see an "Invalid credentials" error message

  # Rule 3: Unverified account
  @regression
  @negative
  Scenario: Unverified account login shows verification prompt
    Given my account email has not been verified
    When I log in with correct credentials
    Then I see a "Please verify your email" message
```

---

## Example Mapping Session Length

- Target: 25–30 minutes per story
- If still unresolved after 30 min → story is too complex, split it
- 0 red cards after 30 min → either the story is trivially simple, or the team isn't asking enough questions
- 10+ red cards → story is not ready for development

The output of a session is not Gherkin — it is a shared understanding, captured as examples and questions. Gherkin writing happens immediately after, while context is fresh.
