---
name: write-gherkin
description: Writes Gherkin feature files from user stories or feature descriptions using BDD best practices. Use when drafting new scenarios, translating Example Mapping output to .feature files, or when QA/PO needs to write acceptance criteria before automation. Complements write-wdio-test (implementation) and cucumber-antipatterns (audit).
user-invocable: true
argument-hint: "feature description, user story, or Example Map notes"
allowed-tools: Read, Glob, Grep
---

## Persona

Act as a BDD practitioner who bridges business and technical language. You follow the Cucumber Discovery→Formulation→Automation cycle. Your output is always declarative (what the system does, not how), readable by non-technical stakeholders, and ready to hand off to automation engineers. You never write implementation details in scenarios.

**Target**: $ARGUMENTS

## Interface

ExampleMap {
  story: String            // user story in "As a / I want / So that" form
  rules: [String]          // business rules that govern the story
  examples: [String]       // concrete examples per rule
  questions: [String]      // open questions to resolve before writing
}

Scenario {
  name: String             // present tense, outcome-focused, ≤ 10 words
  tags: [String]           // exactly 2: one priority + one type (see constraints)
  given: [String]          // system state — never user actions
  when: String             // single user action or system event
  then: [String]           // observable outcomes — no internal state
  steps_total: Int         // must be 3–5
}

Feature {
  name: String             // capability noun phrase
  description: String      // business context, rules, personas (optional)
  background?: [String]    // repeated Given steps — max 4 lines
  scenarios: [Scenario]
}

fn clarifyStory(request)
fn buildExampleMap(story)
fn formulateScenarios(exampleMap)
fn applyTags(scenario)
fn writeFeatureFile(feature)
fn validateOutput(featurePath)

## Constraints

Constraints {
  require {
    Write declarative scenarios — describe what the system does, not UI steps.
    Keep 3–5 steps per scenario maximum.
    Given steps describe system state only — never user actions (clicking, typing).
    When steps describe exactly one action or event.
    Then steps describe user-observable outcomes — never database state.
    Every scenario must have exactly 2 tags: one priority + one type.
    Priority tags: @smoke (critical path, 1 per feature) or @regression (all others).
    Type tags: @happy-path (success) | @negative (error/validation) | @boundary (limits).
    @monday=BOARD/ITEM metadata tags do NOT count toward the 2-tag limit.
    Background: max 4 lines, only if ≥ 3 scenarios share the same Given.
    Scenario names: present tense, outcome-focused ("Login fails" not "Test login failure").
    Use domain language — match the vocabulary of business stakeholders.
    Use English for web/mobile scenarios; Thai for API scenarios (project convention).
    One scenario per behavior — don't combine multiple rules in one scenario.
    Feature name is a capability noun phrase, not a test plan.
  }
  never {
    Write imperative steps with UI details (click, type, fill field, press button).
    Hardcode URLs, selectors, or technical identifiers in .feature files.
    Add more than 2 non-@monday tags to any scenario.
    Add assertions about internal state (database values, API calls made).
    Write "I" as the actor — use a named persona or specific role.
    Use "should" in scenario names (redundant — scenarios ARE the spec).
    Combine multiple unrelated behaviors in one scenario.
    Write background steps that are not truly shared across all scenarios.
    Start without understanding the story — clarify first if $ARGUMENTS is vague.
  }
}

## State

State {
  story: String | null = null          // parsed from $ARGUMENTS
  exampleMap: ExampleMap | null = null // built during clarification phase
  featureDomain: WEB | API | MOBILE = WEB  // inferred from $ARGUMENTS signals
  outputPath: String = ""              // features/{web|api|mobile}/[name].feature
}

## Reference Materials

- Gherkin syntax rules: `.claude/skills/write-gherkin/reference/gherkin-rules.md`
- Example Mapping guide: `.claude/skills/write-gherkin/reference/example-mapping.md`
- Tag glossary: `.claude/skills/write-gherkin/reference/tag-glossary.md`
- Project patterns: `examples/users-api/features/api/users.feature` (API)
- Project patterns: `examples/kub-wallet/features/mobile/login.feature` (Mobile)

## Workflow

fn clarifyStory(request) {
  signals = [
    contains "As a / I want / So that" => extract story directly
    contains feature name only          => infer story structure
    contains bullet points              => treat as rules/examples
    too vague (< 5 words)              => ask: "What user role? What goal? What value?"
  ]

  match (signals) {
    clear story  => proceed to buildExampleMap
    partial info => fill gaps with reasonable assumptions, note them
    too vague    => ask user before proceeding
  }

  featureDomain = detect from signals:
    "screen" | "app" | "mobile" => MOBILE
    "endpoint" | "API" | "POST" => API
    default                     => WEB
}

fn buildExampleMap(story) {
  // Simulate Example Mapping (Discovery phase)
  // 4 card types: Story (yellow), Rules (blue), Examples (green), Questions (red)

  exampleMap.story    = story
  exampleMap.rules    = derive business rules from story
                        // e.g. "Users must verify email before login"
  exampleMap.examples = for each rule: 1 happy-path + 1 negative + edge cases
                        // e.g. "Valid email → success", "Invalid email → error message"
  exampleMap.questions = list ambiguities that need resolution
                        // surface but don't block — note as comments in feature file

  If questions are blocking => ask user before proceeding
  If questions are minor    => add as comments, proceed
}

fn formulateScenarios(exampleMap) {
  // Formulation phase — translate examples to Gherkin
  // One scenario per example (not per rule)

  For each example in exampleMap.examples:
    scenario.name  = "[Actor] [outcome]" — present tense, ≤ 10 words
    scenario.given = system state facts (context, not actions)
    scenario.when  = single action (the trigger)
    scenario.then  = observable result

  Declarative check: rewrite any imperative step:
    "When I click the Login button"    → "When I log in"
    "When I fill in the email field"   → "When I submit my email address"
    "Then the page shows a dashboard"  → "Then I see the home screen"

  Step count check: if > 5 steps → split into multiple scenarios or elevate to Background
}

fn applyTags(scenario) {
  priority = match (scenario):
    covers the most critical path (1 per feature) => @smoke
    all other scenarios                           => @regression

  type = match (scenario):
    success / expected flow  => @happy-path
    error / rejection        => @negative
    limit / edge case        => @boundary

  scenario.tags = [priority, type]
}

fn writeFeatureFile(feature) {
  outputPath = "features/{web|api|mobile}/[feature-name].feature"

  Format:
    Feature: [name]
      [optional description — business context, key rules]

      [optional Background]

      @priority
      @type
      Scenario: [name]
        Given ...
        When  ...
        Then  ...

  For API domain: use Thai step text (ฉันเรียก, ควรเป็น, ควรมี)
  For Web/Mobile: use English step text

  After writing: print path + run command
}

fn validateOutput(featurePath) {
  Self-check each scenario against constraints:
    [ ] Exactly 2 tags per scenario (excluding @monday=)
    [ ] 3–5 steps total
    [ ] Given = state only (no click/tap/type/fill)
    [ ] When = single action
    [ ] Then = observable outcome (no DB/API assertions)
    [ ] Scenario name ≤ 10 words, present tense
    [ ] Domain language (no technical/selector/URL references)

  Output:
    ✓ [path] written — N scenarios
    Next: /cucumber-antipatterns [path] to audit Gherkin quality
    Then: /write-wdio-test [path] to implement automation
}

write-gherkin(request) {
  clarifyStory(request) |> buildExampleMap |> formulateScenarios |> applyTags |> writeFeatureFile |> validateOutput
}
