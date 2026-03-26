# KUB Wallet — BDD Example

Mobile test suite example for a Flutter crypto wallet app (Android/iOS).

## What's Included

| Path | Description |
|------|-------------|
| `screens/` | Screen objects for all app screens (extends `../../screens/base.screen.ts`) |
| `features/mobile/login.feature` | Login scenarios (Thai Gherkin) |
| `steps/mobile/login.steps.ts` | Step definitions using `ensureAuthenticated()` + DevTools |
| `support/mobile/screen-detector.ts` | Screen detection by page source inspection |
| `support/mobile/session-helper.ts` | `ensureAuthenticated()` with DevTools navigation |
| `openapi.yaml` | REST API mock spec for Prism |
| `scripts/` | Android/iOS setup + emulator management |
| `CLAUDE.md` | Claude Code instructions for this project |

## Setup

1. Copy `openapi.yaml` to project root (required for Prism mock server)
2. Copy screen objects into `screens/` and adapt locators for your app
3. Copy `support/mobile/` files and adapt screen detection + auth logic
4. Add `MOBILE_PLATFORM`, `ANDROID_APP_PATH`, `APP_PACKAGE` to `.env`
5. Run `bun run android` to start emulator + pre-warm app

## Notes

- All screen locators were discovered via `wdio-mcp get_visible_elements` — never guessed
- DevTools navigation uses `click_element` only (tap/gesture fail on Flutter DevTools)
- TalkBack must be enabled for Flutter Semantics bridge to activate page source
