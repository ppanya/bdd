/**
 * generate-bru.ts
 *
 * Parse feature files ใน features/api/ แล้ว auto-generate Bruno (.bru) files
 * รองรับ success, failed, และ edge case scenarios
 *
 * รัน: bun run generate:bru
 *
 * รูปแบบ step ที่รองรับ:
 *   When ฉันเรียก GET "/api/users"
 *   When ฉันเรียก POST "/api/users" ด้วย:
 *   When ฉันเรียก PUT "/api/users/1" ด้วย:
 *   When ฉันเรียก DELETE "/api/users/1"
 *   Then status code ควรเป็น 200   ← จับ expected status มา generate test assertion
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';

const FEATURES_DIR = join(import.meta.dir, '../features/api');
const BRUNO_DIR = join(import.meta.dir, '../bruno');

const HTTP_STEP_REGEX = /ฉันเรียก (GET|POST|PUT|PATCH|DELETE) "([^"]+)"/i;
const STATUS_STEP_REGEX = /status code ควรเป็น (\d+)/;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ParsedRequest {
  method: HttpMethod;
  path: string;
  scenarioName: string;
  hasBody: boolean;
  tableHeaders: string[];
  expectedStatus: number | null; // null = ยังไม่รู้
}

function methodToSeq(method: HttpMethod): number {
  return { GET: 1, POST: 2, PUT: 3, PATCH: 4, DELETE: 5 }[method];
}

function buildStatusAssertion(status: number | null): string {
  if (status === null) {
    return `  test("status is successful", function() {\n    expect(res.status).to.be.lessThan(400);\n  });`;
  }
  return `  test("status is ${status}", function() {\n    expect(res.status).to.equal(${status});\n  });`;
}

function buildBruContent(req: ParsedRequest, seq: number): string {
  const hasRequestBody = ['POST', 'PUT', 'PATCH'].includes(req.method);
  const bodySection = hasRequestBody
    ? req.tableHeaders.length > 0
      ? `\nbody:json {\n  {\n${req.tableHeaders.map((h) => `    "${h}": ""`).join(',\n')}\n  }\n}`
      : `\nbody:json {\n  {}\n}`
    : '';

  const bodyType = hasRequestBody ? 'json' : 'none';
  const needsPrefer = req.expectedStatus !== null && req.expectedStatus >= 400;
  const headersSection = needsPrefer
    ? `\nheaders {\n  Prefer: code=${req.expectedStatus}\n}`
    : '';

  return `meta {
  name: ${req.scenarioName}
  type: http
  seq: ${seq}
}

${req.method.toLowerCase()} {
  url: {{baseUrl}}${req.path}
  body: ${bodyType}
  auth: none
}
${headersSection}${bodySection}
tests {
${buildStatusAssertion(req.expectedStatus)}
}
`;
}

async function parseFeatureFile(filePath: string): Promise<ParsedRequest[]> {
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const requests: ParsedRequest[] = [];

  let currentScenario = '';
  let pendingRequest: Partial<ParsedRequest> | null = null;
  let collectingTable = false;
  let tableHeaders: string[] = [];

  const flushPending = () => {
    if (pendingRequest?.method && pendingRequest?.path) {
      requests.push({ ...pendingRequest, tableHeaders } as ParsedRequest);
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('Scenario:')) {
      flushPending();
      currentScenario = trimmed.replace('Scenario:', '').trim();
      pendingRequest = null;
      collectingTable = false;
      tableHeaders = [];
      continue;
    }

    const httpMatch = trimmed.match(HTTP_STEP_REGEX);
    if (httpMatch) {
      // scenario นี้มี HTTP call หลายอัน — flush ก่อน
      flushPending();
      tableHeaders = [];
      pendingRequest = {
        method: httpMatch[1] as HttpMethod,
        path: httpMatch[2],
        scenarioName: currentScenario,
        hasBody: trimmed.endsWith('ด้วย:'),
        expectedStatus: null,
      };
      collectingTable = trimmed.endsWith('ด้วย:');
      continue;
    }

    // จับ expected status code จาก Then step
    const statusMatch = trimmed.match(STATUS_STEP_REGEX);
    if (statusMatch && pendingRequest) {
      pendingRequest.expectedStatus = parseInt(statusMatch[1]!, 10);
      continue;
    }

    // อ่าน table header row (บรรทัดแรกของ DataTable)
    if (collectingTable && trimmed.startsWith('|') && tableHeaders.length === 0) {
      tableHeaders = trimmed
        .split('|')
        .map((h) => h.trim())
        .filter(Boolean);
      collectingTable = false;
    }
  }

  flushPending();
  return requests;
}

async function run() {
  const featureFiles = (await readdir(FEATURES_DIR)).filter((f) => f.endsWith('.feature'));

  if (featureFiles.length === 0) {
    console.log('ไม่พบ feature files ใน features/api/');
    process.exit(0);
  }

  let totalGenerated = 0;

  for (const featureFile of featureFiles) {
    const featurePath = join(FEATURES_DIR, featureFile);
    const collectionName = basename(featureFile, '.feature');
    const outputDir = join(BRUNO_DIR, collectionName);

    await mkdir(outputDir, { recursive: true });

    const requests = await parseFeatureFile(featurePath);

    // จัดเรียงตาม method (GET → POST → PUT → PATCH → DELETE) แล้วตาม expected status
    requests.sort((a, b) => {
      const seqDiff = methodToSeq(a.method) - methodToSeq(b.method);
      if (seqDiff !== 0) return seqDiff;
      return (a.expectedStatus ?? 999) - (b.expectedStatus ?? 999);
    });

    for (let i = 0; i < requests.length; i++) {
      const req = requests[i]!;
      const pathSlug = req.path
        .replace(/^\//, '')
        .replace(/\//g, '-')
        .replace(/[^\w-]/g, '-');
      const statusTag = req.expectedStatus ? `-${req.expectedStatus}` : '';
      const filename = `${String(i + 1).padStart(2, '0')}-${req.method.toLowerCase()}-${pathSlug}${statusTag}.bru`;
      const outputPath = join(outputDir, filename);
      const content = buildBruContent(req, i + 1);

      await writeFile(outputPath, content, 'utf-8');
      console.log(`✓ ${filename}  (expect: ${req.expectedStatus ?? 'any'})`);
      totalGenerated++;
    }
  }

  console.log(`\nสรุป: สร้างไฟล์ .bru ทั้งหมด ${totalGenerated} ไฟล์`);
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
