/**
 * checklist-server.ts — Minimal Bun HTTP server for Living Checklist auto-save
 * Usage: bun scripts/checklist-server.ts
 * Note: Bun-specific APIs (Bun.serve, import.meta.dir) — tsc errors expected, runs fine with Bun
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { RunRecord } from '../reporters/living-checklist/types.ts';
import { buildTemplate } from '../reporters/living-checklist/template.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Bun: any;

const PORT = 3030;
// import.meta.dir is a Bun extension; cast to any for tsc compat
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REPORTS_DIR = join((import.meta as any).dir, '..', 'reports');
const HISTORY_PATH = join(REPORTS_DIR, 'history.json');
const HTML_PATH = join(REPORTS_DIR, 'living-checklist.html');

function readHistory(): RunRecord[] {
  if (!existsSync(HISTORY_PATH)) return [];
  try {
    return JSON.parse(readFileSync(HISTORY_PATH, 'utf-8')) as RunRecord[];
  } catch {
    return [];
  }
}

function saveHistory(records: RunRecord[]): void {
  writeFileSync(HISTORY_PATH, JSON.stringify(records, null, 2), 'utf-8');
  writeFileSync(HTML_PATH, buildTemplate(records), 'utf-8');
}

const server = Bun.serve({
  port: PORT,
  async fetch(req: Request) {
    const url = new URL(req.url);

    // Serve HTML
    if (req.method === 'GET' && url.pathname === '/') {
      if (!existsSync(HTML_PATH)) {
        return new Response('No report found. Run tests first.', { status: 404 });
      }
      return new Response(readFileSync(HTML_PATH, 'utf-8'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // GET /api/history
    if (req.method === 'GET' && url.pathname === '/api/history') {
      return new Response(JSON.stringify(readHistory()), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // POST /api/save
    if (req.method === 'POST' && url.pathname === '/api/save') {
      try {
        const body = (await req.json()) as RunRecord[];
        if (!Array.isArray(body)) {
          return new Response('Expected array of RunRecord', { status: 400 });
        }
        saveHistory(body);
        return new Response(JSON.stringify({ ok: true }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (e) {
        return new Response(String(e), { status: 400 });
      }
    }

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    return new Response('Not found', { status: 404 });
  },
});

console.log(`\n📋 Living Checklist server running at http://localhost:${PORT}`);
console.log(`   Reports: ${REPORTS_DIR}`);
console.log(`   Press Ctrl+C to stop\n`);

// Auto-open browser
Bun.spawn(['open', `http://localhost:${PORT}`], { stdout: 'ignore', stderr: 'ignore' });
