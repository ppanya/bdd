# Quick Start — เริ่มเขียน Test ใน 10 นาที

## 1. Setup

```bash
bun install
cp .env.example .env
# แก้ค่าใน .env ตาม platform ที่ต้องการ test
```

> **หมายเหตุ:** API tests ต้องมี `openapi.yaml` ที่ project root
> Copy จาก `examples/users-api/openapi.yaml` แล้วแก้ให้ตรงกับ API ของคุณ

---

## 2. รัน Tests

### Option A: Local (เร็วสุด — สำหรับ development)

```bash
# เปิด Chrome + Prism mock server (ค้างไว้ตลอด dev session)
bun run docker:up

# รัน tests ใน terminal แยก
bun run test:api         # API tests
bun run test:web         # Web UI tests
bun run test             # ทั้งสองอย่าง

# Filter เฉพาะ test ที่ต้องการ
TAGS='@smoke' bun run test:api
SPEC=features/api/users.feature bun run test:api

# ปิด services เมื่อเสร็จ
bun run docker:down
```

### Option B: Docker (fully isolated — สำหรับ CI)

```bash
bun run docker:test:api    # API tests (Chrome + Prism ใน Docker)
bun run docker:test:web    # Web UI tests
bun run docker:test        # ทั้งสองอย่าง
bun run docker:down        # ปิด containers
```

---

## 3. รัน Mobile Tests (ต้องมี emulator + APK)

```bash
# ดู examples/kub-wallet/scripts/ สำหรับ setup scripts
bun run android                    # boot emulator + start Appium + install APK
bun run test:mobile:android        # รัน mobile tests ทั้งหมด
```

---

## 4. ดู Test Results

```bash
bun run report:allure              # เปิด Allure report ที่ http://localhost:4040
bun run report:api                 # generate จาก API test results
bun run report:mobile              # generate จาก mobile test results
```

---

## 5. เขียน API Test ใหม่

ดู `examples/users-api/` เป็น reference:

```
examples/users-api/
  openapi.yaml                    ← API spec สำหรับ Prism mock
  features/api/users.feature      ← Gherkin scenarios (Thai)
  steps/api/users.steps.ts        ← step definitions (reusable patterns)
```

Copy มาไว้ใน `features/api/` และ `steps/api/` แล้วแก้ตาม API ของคุณ

Reuse steps ที่มีอยู่แล้วได้เลย — ไม่ต้องเขียนใหม่ถ้า step เหมือนกัน

---

## 6. เขียน Mobile Test ใหม่

อ่าน `.claude/CLAUDE.md` → section **"Prompt: Write Mobile Test"**
หรือบอก Claude:

```
Write mobile test for [ชื่อ feature] following CLAUDE.md
```

Claude จะ explore locators จาก live app → generate screen object + feature file + steps ให้เลย

ดู `examples/kub-wallet/` สำหรับ reference implementation

---

## อ่านต่อ

| ต้องการอะไร | อ่านที่ไหน |
|------------|-----------|
| Full project guide | `README.md` |
| Critical rules + anti-patterns | `.claude/CLAUDE.md` |
| Docker + CI architecture | `docs/docker-ci-strategy.md` |
| Mobile test example | `examples/kub-wallet/` |
| API test example | `examples/users-api/` |
| Tag conventions | `CLAUDE.md` → Tag Glossary |
