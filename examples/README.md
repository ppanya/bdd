# Examples

Reference implementations showing how to use this BDD framework for different project types.

## kub-wallet/

A mobile app testing example for a Flutter/React Native wallet application.

Includes:
- Screen objects for Login, Home, Profile, Settings, PDPA consent, PIN setup, DevTools navigation
- BDD feature file with real-world mobile test scenarios (Thai Gherkin)
- Step definitions with `ensureAuthenticated()`, DevTools navigation, anti-flakiness patterns
- API mock spec (`openapi.yaml`) for a crypto wallet REST API
- Mobile setup scripts for Android/iOS (Appium + emulator management)
- `CLAUDE.md` with project-specific Claude Code instructions

**To use**: Copy relevant screen objects into `screens/`, adapt locators for your app,
implement `support/mobile/screen-detector.ts` and `support/mobile/session-helper.ts`.

## users-api/

A REST API testing example using Prism mock server.

Includes:
- Generic Users CRUD API spec (`openapi.yaml`)
- BDD feature file with GET/POST scenarios (Thai Gherkin)
- Reusable step definitions: `When ฉันเรียก GET`, `Then status code ควรเป็น`, etc.

**To use**: Copy `openapi.yaml` to project root, adapt the spec to your API,
copy feature/step files into `features/api/` and `steps/api/`.
