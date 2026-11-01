import type { Page } from '@playwright/test';
export interface AuditCase {
  id: string;
  title: string;
  family: string;
  priority: 'P0' | 'P1' | 'P2';
  sources: string[];
}
export interface AuditResult {
  id: string;
  project: string;
  status:
    | 'pass'
    | 'reproduced'
    | 'test-harness-issue'
    | 'flaky'
    | 'unsupported'
    | 'contract-gap'
    | 'blocked-by'
    | 'not-reproduced';
  duration: number;
  error?: string;
  fingerprint?: string;
  artifact?: string;
  commands?: number;
  /** One-based execution number within a case/project pair. */
  trial?: number;
  metricsArtifact?: string;
  /** Completed trace for this exact browser context and trial. */
  traceArtifact?: string;
}

/** Stable first-trial path preserves existing replay/shrinker inputs. */
export function auditArtifactStem(id: string, project: string, trial = 1): string {
  if (!Number.isInteger(trial) || trial < 1) throw new Error('Invalid audit trial');
  return `${id}-${project}${trial === 1 ? '' : `-trial-${trial}`}`;
}

export function auditObservationKey(result: Pick<AuditResult, 'id' | 'project' | 'trial'>): string {
  return auditArtifactStem(result.id, result.project, result.trial ?? 1);
}

/** Upgrade historical rows in memory only; never rewrite their original evidence. */
export function normalizeAuditTrials(rows: AuditResult[]): AuditResult[] {
  const ordinals = new Map<string, number>();
  const seen = new Set<string>();
  return rows.map((row) => {
    const pair = `${row.id}|${row.project}`;
    const trial = row.trial ?? (ordinals.get(pair) ?? 0) + 1;
    const result = { ...row, trial };
    const key = auditObservationKey(result);
    if (seen.has(key)) throw new Error(`Duplicate audit observation ${key}`);
    seen.add(key);
    ordinals.set(pair, Math.max(ordinals.get(pair) ?? 0, trial));
    return result;
  });
}

export interface AuditResumeFingerprint {
  profile?: string;
  buildHash?: string;
  cssHash?: string;
  harnessHash?: string;
}

export function assertAuditResumeCompatible(
  previous: AuditResumeFingerprint,
  current: AuditResumeFingerprint
): void {
  for (const field of ['profile', 'buildHash', 'cssHash', 'harnessHash'] as const) {
    if (!previous[field] || previous[field] !== current[field])
      throw new Error(`Resume ${field} mismatch or missing evidence`);
  }
}
export type CaseRunner = (page: Page, id: string) => Promise<void>;
export class AuditFailure extends Error {
  constructor(
    public oracle: string,
    message: string
  ) {
    super(`${oracle}: ${message}`);
  }
}
