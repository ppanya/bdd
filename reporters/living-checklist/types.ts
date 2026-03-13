export interface ManualCheck {
  tester: string;
  timestamp: string; // ISO 8601
  checked: boolean;
}

export interface ReleaseSignOff {
  tester: string;
  timestamp: string; // ISO 8601
  comment?: string;
}

export interface ScenarioResult {
  name: string;
  feature: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  manual: boolean;
  tags: string[];
  errorMessage?: string;
  manualCheck?: ManualCheck;
}

export interface RunSummary {
  total: number;
  automated: number;
  manual: number;
  passed: number;
  failed: number;
  skipped: number;
  /** manual scenarios that were not executed (pending) */
  pending: number;
}

export interface RunRecord {
  /** UUID v4 */
  id: string;
  /** Configurable label: version, release name, branch, or any string */
  tag: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  scenarios: ScenarioResult[];
  summary: RunSummary;
  signOff?: ReleaseSignOff;
}

export interface LivingChecklistOptions {
  outputDir: string;
  releaseTag: string;
}
