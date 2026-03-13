import WDIOReporter from '@wdio/reporter';
import type { SuiteStats, TestStats, RunnerStats, Options } from '@wdio/reporter';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import type { ScenarioResult, RunRecord, LivingChecklistOptions } from './types.ts';
import { buildTemplate } from './template.ts';

// Cucumber tag objects from WDIO come as { name: '@manual' }
type CucumberTag = { name: string };

function extractTagNames(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return (tags as CucumberTag[]).map((t) => t.name);
}

export default class LivingChecklistReporter extends WDIOReporter {
  private options: LivingChecklistOptions;
  private scenarios: ScenarioResult[] = [];
  private currentFeature = '';
  private currentTags: string[] = [];

  constructor(options: Partial<LivingChecklistOptions> & Options) {
    super(options);
    this.options = {
      outputDir: (options as LivingChecklistOptions).outputDir ?? 'reports',
      releaseTag: (options as LivingChecklistOptions).releaseTag ?? 'untagged',
    };
  }

  override onSuiteStart(suite: SuiteStats) {
    if (!suite.parent) {
      // Feature-level suite (no parent) — update feature name and feature-level tags
      this.currentFeature = suite.title;
      this.currentTags = extractTagNames((suite as unknown as { tags?: CucumberTag[] }).tags);
    }
    // Scenario-level suite (has parent) — don't overwrite currentFeature
    // scenario tags are read per-test in recordScenario()
  }

  override onTestPass(test: TestStats) {
    this.recordScenario(test, 'passed');
  }

  override onTestFail(test: TestStats) {
    this.recordScenario(test, 'failed', test.error?.message);
  }

  override onTestSkip(test: TestStats) {
    const testTags = extractTagNames((test as unknown as { tags?: CucumberTag[] }).tags);
    const isManual = this.currentTags.includes('@manual') || testTags.includes('@manual');
    this.recordScenario(test, isManual ? 'pending' : 'skipped');
  }

  private recordScenario(test: TestStats, status: ScenarioResult['status'], errorMessage?: string) {
    const testTags = extractTagNames((test as unknown as { tags?: CucumberTag[] }).tags);
    const tags = testTags.length > 0 ? testTags : this.currentTags;
    const isManual = tags.includes('@manual');
    this.scenarios.push({
      name: test.title,
      feature: this.currentFeature,
      status,
      manual: isManual,
      tags,
      ...(errorMessage ? { errorMessage } : {}),
    });
  }

  override async onRunnerEnd(_runner: RunnerStats) {
    await mkdir(this.options.outputDir, { recursive: true });

    const historyPath = join(this.options.outputDir, 'history.json');
    let history: RunRecord[] = [];

    if (existsSync(historyPath)) {
      try {
        const raw = await readFile(historyPath, 'utf-8');
        history = JSON.parse(raw) as RunRecord[];
      } catch {
        history = [];
      }
    }

    const automated = this.scenarios.filter((s) => !s.manual);
    const manual = this.scenarios.filter((s) => s.manual);

    // Carry forward manual check state from the previous run (same feature+name)
    const prevRun = history.length > 0 ? history[history.length - 1] : null;
    const scenariosWithChecks = this.scenarios.map((s) => {
      if (!s.manual || !prevRun) return s;
      const prev = prevRun.scenarios.find(
        (p) => p.name === s.name && p.feature === s.feature && p.manualCheck,
      );
      return prev?.manualCheck ? { ...s, manualCheck: prev.manualCheck } : s;
    });

    const record: RunRecord = {
      id: randomUUID(),
      tag: this.options.releaseTag,
      timestamp: new Date().toISOString(),
      scenarios: scenariosWithChecks,
      summary: {
        total: scenariosWithChecks.length,
        automated: automated.length,
        manual: manual.length,
        passed: scenariosWithChecks.filter((s) => s.status === 'passed').length,
        failed: scenariosWithChecks.filter((s) => s.status === 'failed').length,
        skipped: scenariosWithChecks.filter((s) => s.status === 'skipped').length,
        pending: scenariosWithChecks.filter((s) => s.status === 'pending').length,
      },
    };

    history.push(record);
    await writeFile(historyPath, JSON.stringify(history, null, 2), 'utf-8');

    const html = buildTemplate(history);
    const htmlPath = join(this.options.outputDir, 'living-checklist.html');
    await writeFile(htmlPath, html, 'utf-8');

    console.log(`\n📋 Living Checklist: ${htmlPath}`);
    console.log(
      `   Release: ${record.tag}  |  Passed: ${record.summary.passed}/${record.summary.total}`,
    );
  }
}
