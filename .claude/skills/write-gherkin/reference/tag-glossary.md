# Tag Glossary

Complete reference for tagging Gherkin scenarios in this project. Tags control CI execution, Allure reporting grouping, and link scenarios to external systems.

---

## The 2-Tag Rule

**Every scenario must have exactly 2 tags: one priority tag and one type tag.**

```gherkin
@smoke          ← priority
@happy-path     ← type
Scenario: Valid credentials grant access
```

**The `@monday=` metadata tag does NOT count toward this limit.** A scenario with `@monday=` has 3 lines of tags total but still satisfies the 2-tag rule.

```gherkin
@regression
@negative
@monday=7839498373/8142073690
Scenario: Wrong password shows error message
```

This is valid: `@regression` (priority) + `@negative` (type) = 2 tags. `@monday=` is metadata.

### Why exactly 2?

- **1 tag**: incomplete — either priority or type is missing, reducing filterability
- **2 tags**: correct — full classification for CI filtering and report grouping
- **3+ tags**: over-classification — pick the most relevant type, don't stack

---

## Priority Tags

Priority tags determine when a scenario runs in the CI/CD pipeline and how critical a failure is.

### `@smoke`

**Description**: The minimum set of scenarios that must pass before any deployment proceeds. These cover the critical path — the single most important flow in the feature.

**When to use**:
- The scenario covers the core happy path that blocks all other use of the feature
- A failure here means the feature is completely unusable
- You want this to run on every commit and every PR

**Limit**: 1 `@smoke` scenario per feature file. If you find yourself wanting two smoke scenarios, one of them is probably `@regression`.

**Example:**
```gherkin
@smoke
@happy-path
Scenario: Valid credentials grant access to home screen
  Given I am on the email login screen
  When I log in as "alice@example.com"
  Then I see the home screen
```

**CI behavior**: `TAGS='@smoke' bun run test:web` runs only smoke scenarios — fast gate before full regression.

---

### `@regression`

**Description**: All non-smoke scenarios. Runs in full regression cycles, scheduled runs, or pre-release sweeps.

**When to use**: Every scenario that is not the single critical-path smoke scenario. This includes happy paths for secondary flows, all negative tests, and all boundary tests.

**Example:**
```gherkin
@regression
@negative
Scenario: Wrong password shows invalid credentials error
  Given I am on the email login screen
  When I log in with an incorrect password
  Then I see an "Invalid credentials" error message
```

**CI behavior**: `TAGS='@regression' bun run test:web` runs the full non-smoke suite.

---

## Type Tags

Type tags describe the behavioral category of the scenario. They drive Allure report grouping and help engineers understand what kind of coverage exists.

### `@happy-path`

**Description**: The expected, successful flow. The system behaves correctly when inputs are valid and conditions are met.

**When to use**:
- The scenario ends in success (user achieves their goal)
- All inputs are valid
- No error conditions are triggered

**Examples:**
```gherkin
@smoke
@happy-path
Scenario: Valid credentials grant access to home screen

@regression
@happy-path
Scenario: New user registration completes with confirmation email

@regression
@happy-path
Scenario: สร้าง user ใหม่สำเร็จ
```

---

### `@negative`

**Description**: Error handling, validation rejection, and failure scenarios. The system correctly handles invalid input, unauthorized access, or unexpected conditions.

**When to use**:
- The scenario expects an error message, rejection, or failure state
- User provides invalid data (wrong format, missing required fields)
- Authorization or authentication fails
- Business rule is violated

**Examples:**
```gherkin
@regression
@negative
Scenario: Wrong password shows invalid credentials error

@regression
@negative
Scenario: Unverified account login shows verification prompt

@regression
@negative
Scenario: สร้าง user ที่ข้อมูลไม่ครบ ควรได้ 400

@regression
@negative
Scenario: ดึง user ที่ไม่มีอยู่ ควรได้ 404
```

---

### `@boundary`

**Description**: Limit, extreme, zero, and edge-case scenarios. Tests behavior at the edges of valid ranges, maximum/minimum values, and exact thresholds.

**When to use**:
- Testing the exact minimum or maximum of a valid range
- Zero values, empty states, first/last item
- Transition points (e.g., exactly at the expiry time)
- Large inputs at the upper limit

**Examples:**
```gherkin
@regression
@boundary
Scenario: Password at minimum length exactly is accepted

@regression
@boundary
Scenario: Transfer amount of exactly ฿0.01 is the minimum allowed

@regression
@boundary
Scenario: Username at 50 character limit is accepted

@regression
@boundary
Scenario: Session expires at exactly 30 minutes of inactivity
```

**Distinguish from `@negative`**: A boundary scenario tests an edge of validity — the value may be accepted or rejected, but the key is that it is at a limit. A negative scenario tests clearly invalid input where rejection is the only expected outcome.

---

## Other Tags (Do Not Use as Primary Tags)

These tags serve specific operational purposes and are never used as the priority or type tag. They are additional metadata when needed.

### `@wip`

Work in progress — excluded from all CI runs. Use during active development before a scenario is ready for review.

```gherkin
@wip
Scenario: Biometric login fallback to PIN
```

Remove `@wip` and add proper priority + type tags before merging.

### `@slow`

Scenarios that take more than 30 seconds. May be excluded from fast feedback loops.

```gherkin
@regression
@happy-path
@slow
Scenario: Full KYC verification flow completes
```

Note: `@slow` is a third tag and exceeds the 2-tag rule. Use sparingly and only when the slowness is significant enough to warrant CI filtering.

### `@flaky`

Known unreliable scenarios under active investigation. Never leave a `@flaky` scenario in this state indefinitely — file a ticket and fix it within the sprint.

### `@manual`

Scenarios that require human verification — cannot be automated. Common for visual regression, physical hardware interaction, or regulatory sign-off steps.

### `@skip`

Temporarily disabled. Must include a comment with the reason and a tracking reference.

```gherkin
# @skip reason: JIRA-1234 — PDPA endpoint returns 500 in staging, blocked by backend
@skip
@regression
@negative
Scenario: PDPA rejection logs the user out
```

### `@monday=BOARD/ITEM`

Links the scenario to a Monday.com card. Rendered as a clickable link in the Allure report. Does not count toward the 2-tag limit.

**Format**: `@monday=BOARDID/ITEMID`

```gherkin
@smoke
@happy-path
@monday=7839498373/8142073690
Scenario: New user login with PDPA and PIN setup reaches Home screen
```

Find the IDs in the Monday.com card URL:
`https://bbt.monday.com/boards/7839498373/pulses/8142073690`
→ `@monday=7839498373/8142073690`

---

## Valid Tag Combinations

### Correct

```gherkin
@smoke
@happy-path
# Critical path success flow — 1 per feature

@regression
@happy-path
# Non-critical success flow

@regression
@negative
# Error, rejection, or failure scenario

@regression
@boundary
# Edge case or limit scenario

@smoke
@happy-path
@monday=1234/5678
# With Monday link (3 lines, still 2 tags)

@regression
@negative
@monday=1234/5678
# With Monday link (3 lines, still 2 tags)
```

### Incorrect

```gherkin
# WRONG: Only one tag — missing type
@smoke
Scenario: Login works

# WRONG: Only one tag — missing priority
@happy-path
Scenario: Login works

# WRONG: Two priority tags
@smoke
@regression
Scenario: Login works

# WRONG: Two type tags — pick the most accurate one
@happy-path
@negative
Scenario: Login with invalid email

# WRONG: Three meaningful tags (not counting @monday=)
@smoke
@happy-path
@slow
Scenario: Full login flow
# → Either remove @slow and accept the slow test, or use @regression instead of @smoke

# WRONG: Using @wip without removing priority/type — leave them off until ready
@smoke
@happy-path
@wip
Scenario: New biometric login feature
# → Use @wip alone until the feature is complete
```

---

## Scenario Count Guidelines per Feature File

These are targets, not hard limits. Use judgment based on the story scope.

| Tag Combination | Typical Count per Feature |
|---|---|
| `@smoke @happy-path` | 1 (exactly — the critical path) |
| `@regression @happy-path` | 1–3 (secondary success flows) |
| `@regression @negative` | 2–5 (error cases per business rule) |
| `@regression @boundary` | 1–3 (edge cases where relevant) |

**Total scenarios per feature**: 5–10 is healthy. Fewer than 4 may indicate under-coverage. More than 15 suggests the feature file covers too many responsibilities and should be split.

---

## Quick Reference

```
PRIORITY (choose 1)        TYPE (choose 1)
─────────────────────      ─────────────────────────────────────
@smoke                     @happy-path
  1 per feature              success, valid input, goal achieved
  critical path only
                           @negative
@regression                  error, rejection, invalid input,
  everything else             unauthorized, business rule violation

                           @boundary
                             minimum, maximum, zero, exact threshold,
                             edge of valid range
```
