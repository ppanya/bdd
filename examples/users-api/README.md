# Users API — BDD Example

REST API testing example using Prism mock server + BaseAPI utility.

## What's Included

| Path | Description |
|------|-------------|
| `openapi.yaml` | Generic Users CRUD API spec (GET /api/users, POST /api/users) |
| `features/api/users.feature` | API test scenarios (Thai Gherkin) |
| `steps/api/users.steps.ts` | Reusable step definitions |

## Reusable Steps

Copy these steps to your project — they work with any REST API:

```gherkin
When ฉันเรียก GET "/api/users"
When ฉันเรียก POST "/api/users" ด้วย:
  | name  | Alice |
  | email | alice@example.com |
Then status code ควรเป็น 200
Then response ควรเป็น array
Then response ควรมี field "id"
Given ทดสอบ error case ด้วย status 422
```

## Setup

1. Copy `openapi.yaml` to project root
2. Run `bun run docker:up` to start Prism mock server
3. Copy `features/api/` and `steps/api/` into your project
4. Run `bun run test:api` to execute
