import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type { AuditResult } from '../tests/audit/types';
import { registryUnitView, type KnownUnitFailure } from '../tests/audit/unit-registry';
import {
  validateExecutionPlan,
  validateUnitEvidence,
  type AuditExecutionPlan,
} from './audit-integrity';
interface Manifest {
  runDir?: string;
  runId: string;
  profile: string;
  buildHash: string;
  started: string;
  commit: string;
}
const base = resolve('.tmp/audit');
const latest = JSON.parse(readFileSync(join(base, 'latest.json'), 'utf8')) as Manifest & {
  runDir: string;
};
const dirs = process.argv.includes('--all')
  ? readdirSync(base, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => join(base, e.name))
  : [latest.runDir];
const registryPath = resolve('docs/audit/known-failures.json');
const known = existsSync(registryPath)
  ? (JSON.parse(readFileSync(registryPath, 'utf8')) as {
      id: string;
      project: string;
      fingerprint: string;
      issue: string;
    }[])
  : [];
const campaigns = dirs
  .filter((dir) => existsSync(join(dir, 'results.json')) && existsSync(join(dir, 'manifest.json')))
  .map((dir) => ({
    dir,
    manifest: JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as Manifest,
    aborted: existsSync(join(dir, 'aborted.json')),
    results: JSON.parse(readFileSync(join(dir, 'results.json'), 'utf8')) as AuditResult[],
  }));
const validCampaigns = campaigns.filter((c) => c.manifest.runId && c.manifest.profile);
const incomplete = validCampaigns
  .filter((c) => !existsSync(join(c.dir, 'complete.json')))
  .map((c) => c.manifest.runId);
const executionPlanErrors = validCampaigns.flatMap((c) => {
  try {
    validateExecutionPlan(
      JSON.parse(readFileSync(join(c.dir, 'execution-plan.json'), 'utf8')) as AuditExecutionPlan,
      c.results
    );
    return [];
  } catch (error) {
    return [{ runId: c.manifest.runId, error: String(error) }];
  }
});
const classified = validCampaigns.flatMap((c) =>
  c.results.map((r) => ({
    ...r,
    runId: c.manifest.runId,
    profile: c.manifest.profile,
    aborted: c.aborted,
    classification:
      r.status === 'pass'
        ? known.some((k) => k.id === r.id && k.project === r.project)
          ? 'unexpected-pass'
          : 'pass'
        : known.some(
              (k) => k.id === r.id && k.project === r.project && k.fingerprint === r.fingerprint
            )
          ? 'known-failure'
          : 'unexpected-failure',
  }))
);
const clusters = new Map<
  string,
  {
    id: string;
    project: string;
    errors: string[];
    failures: number;
    passes: number;
    runs: Set<string>;
  }
>();
for (const r of classified) {
  const key = r.id + '|' + r.project;
  const c = clusters.get(key) ?? {
    id: r.id,
    project: r.project,
    errors: [],
    failures: 0,
    passes: 0,
    runs: new Set<string>(),
  };
  c.runs.add(r.runId);
  if (r.status === 'pass') c.passes++;
  else {
    c.failures++;
    if (r.error && !c.errors.includes(r.error)) c.errors.push(r.error);
  }
  clusters.set(key, c);
}
const unitEvidenceErrors: string[] = [];
let unit: Record<string, unknown> | null = null;
try {
  const value: unknown = existsSync(join(base, 'unit-results.json'))
    ? JSON.parse(readFileSync(join(base, 'unit-results.json'), 'utf8'))
    : null;
  if (value && typeof value === 'object' && !Array.isArray(value))
    unit = value as Record<string, unknown>;
  else unitEvidenceErrors.push('Missing or non-object unit report');
} catch {
  unitEvidenceErrors.push('Malformed unit report JSON');
}
try {
  validateUnitEvidence(
    process.cwd(),
    join(base, 'unit-results.json'),
    join(base, 'unit-evidence.json')
  );
} catch (error) {
  unitEvidenceErrors.push(String(error));
}
const rawUnit = unit;
const knownUnitPath = resolve('docs/audit/known-unit-failures.json');
const unitRegistry = registryUnitView(
  unit,
  existsSync(knownUnitPath)
    ? (JSON.parse(readFileSync(knownUnitPath, 'utf8')) as KnownUnitFailure[])
    : []
);
unit = unitRegistry.view;
if (
  unitRegistry.observations.some((observation) =>
    observation.classification.startsWith('unexpected')
  )
)
  unitEvidenceErrors.push('Unexpected unit registry result');
if (unit) {
  const counts = [
    'numTotalTests',
    'numPassedTests',
    'numFailedTests',
    'numPendingTests',
    'numTodoTests',
    'numTotalTestSuites',
    'numPassedTestSuites',
    'numFailedTestSuites',
    'numPendingTestSuites',
  ] as const;
  for (const field of counts) {
    if (
      typeof unit[field] !== 'number' ||
      !Number.isInteger(unit[field]) ||
      Number(unit[field]) < 0
    )
      unitEvidenceErrors.push(`Invalid or missing unit ${field}`);
  }
  if (unit.success !== true) unitEvidenceErrors.push('Unit run did not report success:true');
  if (!(Number(unit.numTotalTests) > 0) || !(Number(unit.numPassedTests) > 0))
    unitEvidenceErrors.push('Unit run has no executed passing tests');
  if (!(Number(unit.numTotalTestSuites) > 0) || !(Number(unit.numPassedTestSuites) > 0))
    unitEvidenceErrors.push('Unit run has no executed passing suites');
  if (
    unit.numFailedTests !== 0 ||
    unit.numFailedTestSuites !== 0 ||
    (unit.numRuntimeErrorTestSuites !== undefined && unit.numRuntimeErrorTestSuites !== 0)
  )
    unitEvidenceErrors.push('Unit tests or suites failed');
  if (
    Number(unit.numPassedTests) > Number(unit.numTotalTests) ||
    Number(unit.numPassedTestSuites) > Number(unit.numTotalTestSuites)
  )
    unitEvidenceErrors.push('Unit counts are inconsistent');
  if (!Array.isArray(unit.testResults) || unit.testResults.length === 0)
    unitEvidenceErrors.push('Unit report contains no suite results');
  else {
    let passedAssertions = 0;
    for (const result of unit.testResults) {
      if (!result || typeof result !== 'object') {
        unitEvidenceErrors.push('Malformed unit suite evidence');
        continue;
      }
      const suite = result as Record<string, unknown>;
      if (
        !['passed', 'pending', 'skipped'].includes(String(suite.status)) ||
        !Array.isArray(suite.assertionResults)
      ) {
        unitEvidenceErrors.push('Failed or malformed unit suite evidence');
        continue;
      }
      for (const assertion of suite.assertionResults) {
        const status =
          assertion && typeof assertion === 'object'
            ? (assertion as Record<string, unknown>).status
            : undefined;
        if (status === 'passed') passedAssertions++;
        else if (!['pending', 'skipped', 'todo'].includes(String(status)))
          unitEvidenceErrors.push('Failed or malformed unit assertion evidence');
      }
    }
    if (passedAssertions === 0) unitEvidenceErrors.push('No passing unit assertions recorded');
  }
}
const deepUnit = existsSync(join(base, 'unit-deep.json'))
  ? JSON.parse(readFileSync(join(base, 'unit-deep.json'), 'utf8'))
  : null;
const summary = {
  generated: new Date().toISOString(),
  latest,
  incomplete,
  executionPlanErrors,
  campaigns: validCampaigns.map((c) => ({
    runId: c.manifest.runId,
    profile: c.manifest.profile,
    hash: c.manifest.buildHash,
    aborted: c.aborted,
    executed: c.results.length,
    passed: c.results.filter((r) => r.status === 'pass').length,
    failures: c.results.filter((r) => r.status !== 'pass').length,
  })),
  total: classified.length,
  unit: {
    tests: rawUnit?.numTotalTests,
    passed: rawUnit?.numPassedTests,
    failed: rawUnit?.numFailedTests,
  },
  unitRegistry: unitRegistry.observations,
  unitEvidenceErrors,
  deepUnit,
  clusters: [...clusters.values()].map((c) => ({ ...c, runs: [...c.runs] })),
  classified,
};
if (!process.argv.includes('--gate')) {
  mkdirSync('docs/audit', { recursive: true });
  writeFileSync('docs/audit/latest-results.json', JSON.stringify(summary, null, 2));
  writeFileSync(
    'docs/audit/RESULTS.md',
    `# Tvist audit\n\nGenerated: ${summary.generated}. Production commit: ${latest.commit}.\n\n## Campaign ledger\n\nExecuted entries include exploratory runs and repeats; this is not a count of distinct bugs. Aborted campaigns are retained as diagnostic evidence, not complete coverage.\n\n| Run | Profile | Executed | Pass | Fail | Aborted |\n|---|---|---:|---:|---:|---|\n${summary.campaigns.map((c) => `| ${c.runId} | ${c.profile} | ${c.executed} | ${c.passed} | ${c.failures} | ${c.aborted} |`).join('\n')}\n\n## Case/engine observations\n\nRepeated failures require contract review; a matching first failure does not verify the remaining actions. Some cases share one cause (for example stale active classes).\n\n| Case | Engine | Pass observations | Failure observations | First evidence |\n|---|---|---:|---:|---|\n${summary.clusters.map((c) => `| ${c.id} | ${c.project} | ${c.passes} | ${c.failures} | ${(c.errors[0] ?? '').split('\n')[0].replace(/\|/g, '/')} |`).join('\n')}\n\n## Unit audit\n\n${JSON.stringify(summary.unit)}. Full details: .tmp/audit/unit-results.json. Deep models: .tmp/audit/unit-deep.json.\n\n## Limits\n\nRaw results remain failing; known-failures.json is only updated after review. No physical devices or screen reader assessment. Performance is environment-specific. Full traces and snapshots live under .tmp/audit; source catalogues and reviewed findings live beside this report. Uncovered contracts remain visible in tests/audit/contracts.json.\n`
  );
}
console.log(
  JSON.stringify({
    campaigns: campaigns.length,
    observations: summary.total,
    failed: classified.filter((r) => r.status !== 'pass').length,
    unit: summary.unit,
    unitEvidenceErrors,
    executionPlanErrors,
  })
);
if (process.argv.includes('--gate'))
  process.exitCode =
    classified.some((r) => r.classification.startsWith('unexpected')) ||
    unitEvidenceErrors.length > 0 ||
    executionPlanErrors.length > 0 ||
    validCampaigns.some((c) => c.aborted) ||
    incomplete.length > 0 ||
    validCampaigns.length === 0 ||
    classified.length === 0
      ? 1
      : 0;
