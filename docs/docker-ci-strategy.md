# Docker & CI/CD Strategy

BDD test project — Web + API containerization plan and mobile CI options for the infra/devops team.

---

## Local Docker Quickstart

Prerequisites: Docker Desktop running, image built once with `bun run docker:build`.

```bash
# API tests only (starts Prism, runs, stops Prism automatically)
bun run docker:test:api

# Web tests only (starts Chrome, runs, stops Chrome automatically)
bun run docker:test:web

# Both suites back-to-back
bun run docker:test

# Debug a failing run — watch Chrome live at http://localhost:7900 (password: secret)
bun run docker:test:web &
# open http://localhost:7900 in browser while tests run

# Tear down all containers
bun run docker:down
```

### Service Port Map

| Service     | Port | Purpose                              |
| ----------- | ---- | ------------------------------------ |
| chrome      | 4444 | WebDriver protocol (WDIO connects)   |
| chrome      | 7900 | noVNC live view (visual debug)       |
| prism-mock  | 4010 | OpenAPI mock server for API tests    |

### Image Selection by Architecture

| Environment        | Chrome image                         |
| ------------------ | ------------------------------------ |
| Apple Silicon Mac  | `seleniarm/standalone-chromium`      |
| x86_64 Linux CI    | `selenium/standalone-chrome:latest`  |

Update the `chrome.image` value in `docker-compose.yml` when deploying to x86_64 CI runners.

---

## GitLab CI/CD Pipeline

Swap the Chrome image to `selenium/standalone-chrome` (x86_64 runners). Add this file at
`.gitlab-ci.yml`:

```yaml
stages:
  - test

variables:
  BASE_URL: "https://staging.example.com"

api-tests:
  stage: test
  image: node:22-slim
  services:
    - name: stoplight/prism:latest
      alias: prism-mock
      command: ["mock", "/app/openapi.yaml", "--host", "0.0.0.0", "--port", "4010"]
  before_script:
    - curl -fsSL https://bun.sh/install | bash
    - export PATH="$HOME/.bun/bin:$PATH"
    - bun install --frozen-lockfile
  script:
    - API_BASE_URL=http://prism-mock:4010 bun run test:api
  artifacts:
    when: always
    paths:
      - allure-results/

web-tests:
  stage: test
  image: node:22-slim
  services:
    - name: selenium/standalone-chrome:latest
      alias: chrome
  before_script:
    - curl -fsSL https://bun.sh/install | bash
    - export PATH="$HOME/.bun/bin:$PATH"
    - bun install --frozen-lockfile
  script:
    - SELENIUM_REMOTE_URL=http://chrome:4444 bun run test:web
  artifacts:
    when: always
    paths:
      - allure-results/
```

---

## Mobile CI

### Option A — `budtmo/docker-android` (Linux x86_64 + KVM)

Runs Android emulator inside Docker using KVM hardware acceleration.

**Requirements**:
- Linux host with KVM enabled (`/dev/kvm` present)
- GitLab runner on a bare-metal or KVM-capable VM (not shared cloud runners)
- Does **not** work on Apple Silicon — macOS does not support nested KVM

**docker-compose snippet for CI**:

```yaml
services:
  android:
    image: budtmo/docker-android:emulator_14.0
    privileged: true
    devices:
      - /dev/kvm
    environment:
      - EMULATOR_DEVICE=Samsung Galaxy S10
      - WEB_VNC=true
    ports:
      - "4723:4723" # Appium
      - "6080:6080" # noVNC

  test-runner:
    build: .
    depends_on:
      android:
        condition: service_healthy
    environment:
      - APPIUM_HOST=android
      - MOBILE_PLATFORM=android
```

**Caveats**:
- TalkBack must be enabled inside the emulator before tests run (Flutter semantics bridge requires it)
- Flutter's accessibility/semantics tree is only populated when an accessibility service is active
- First boot is slow (~3–5 min); use emulator snapshots if the runner supports them

### Option B — Cloud Device Farm

Avoids infra management. Tradeoffs:

| Provider          | Android | iOS | Price model         | Notes                              |
| ----------------- | ------- | --- | ------------------- | ---------------------------------- |
| BrowserStack App  | Yes     | Yes | Per minute          | Appium-compatible, good Flutter    |
| Sauce Labs        | Yes     | Yes | Per minute / bundle | Supports real devices              |
| AWS Device Farm   | Yes     | Yes | Per minute          | No TalkBack on managed fleet       |

Connect by setting `APPIUM_HOST` to the cloud provider's Appium hub and adding provider-specific
capabilities to `wdio.conf.ts`.

---

## iOS CI

| Option                   | Cost     | Complexity | Notes                                     |
| ------------------------ | -------- | ---------- | ----------------------------------------- |
| Mac mini self-hosted     | Hardware | Low        | Full control; XCUITest + simulator        |
| GitLab SaaS macOS runner | Per min  | Low        | Available on GitLab Premium               |
| Cloud (BrowserStack)     | Per min  | Medium     | Real devices; IPA signing required        |

iOS simulators require macOS — there is no Linux path. A dedicated Mac mini runner is the most
cost-effective option for teams running frequent iOS test cycles.

---

## Recommended Rollout

| Sprint | Work                                                              |
| ------ | ----------------------------------------------------------------- |
| 1      | Merge Docker Compose setup; run Web + API in CI on every MR       |
| 2      | Publish Allure reports as CI artifacts; add Slack notification    |
| 3      | Evaluate mobile CI: Option A (KVM runner) vs Option B (cloud)     |
| 4      | Add iOS runner (Mac mini or cloud); integrate into full CI gate   |
