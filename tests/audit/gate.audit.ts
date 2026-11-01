import { it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  assertAuditResumeCompatible,
  auditArtifactStem,
  auditObservationKey,
  normalizeAuditTrials,
  type AuditResult,
} from './types';
import {
  auditUnitCommand,
  computeAuditInputHash,
  type AuditUnitEvidence,
} from '../../scripts/audit-integrity';

const validUnit = () => ({
  success: true,
  numTotalTests: 1,
  numPassedTests: 1,
  numFailedTests: 0,
  numPendingTests: 0,
  numTodoTests: 0,
  numTotalTestSuites: 1,
  numPassedTestSuites: 1,
  numFailedTestSuites: 0,
  numPendingTestSuites: 0,
  testResults: [{ status: 'passed', assertionResults: [{ status: 'passed' }] }],
});
type Control = {
  name: string;
  complete?: boolean;
  aborted?: boolean;
  unit?: unknown;
  rawUnit?: string;
  expected: number;
  omitPlan?: boolean;
  missingRepeat?: boolean;
  extraTrial?: boolean;
  duplicateTrial?: boolean;
  omitUnitBinding?: boolean;
};
const controls: Control[] = [
  { name: 'complete evidence', complete: true, unit: validUnit(), expected: 0 },
  {
    name: 'missing execution plan',
    complete: true,
    unit: validUnit(),
    omitPlan: true,
    expected: 1,
  },
  {
    name: 'completed count cannot hide a missing planned repeat',
    complete: true,
    unit: validUnit(),
    missingRepeat: true,
    expected: 1,
  },
  {
    name: 'extra execution trial',
    complete: true,
    unit: validUnit(),
    extraTrial: true,
    expected: 1,
  },
  {
    name: 'duplicate execution trial',
    complete: true,
    unit: validUnit(),
    duplicateTrial: true,
    expected: 1,
  },
  {
    name: 'full unit report without source binding',
    complete: true,
    unit: validUnit(),
    omitUnitBinding: true,
    expected: 1,
  },
  { name: 'incomplete run', unit: validUnit(), expected: 1 },
  { name: 'aborted run', aborted: true, unit: validUnit(), expected: 1 },
  {
    name: 'aborted even with a completion marker',
    aborted: true,
    complete: true,
    unit: validUnit(),
    expected: 1,
  },
  { name: 'missing unit', complete: true, expected: 1 },
  { name: 'malformed unit JSON', complete: true, rawUnit: '{', expected: 1 },
  { name: 'empty unit object', complete: true, unit: {}, expected: 1 },
  { name: 'non-object unit', complete: true, unit: [], expected: 1 },
  {
    name: 'unit success false despite zero failed tests',
    complete: true,
    unit: { ...validUnit(), success: false },
    expected: 1,
  },
  {
    name: 'suite-level crash despite zero failed tests',
    complete: true,
    unit: { ...validUnit(), numFailedTestSuites: 1 },
    expected: 1,
  },
  {
    name: 'runtime suite error',
    complete: true,
    unit: { ...validUnit(), numRuntimeErrorTestSuites: 1 },
    expected: 1,
  },
  {
    name: 'zero tests',
    complete: true,
    unit: { ...validUnit(), numTotalTests: 0, numPassedTests: 0, testResults: [] },
    expected: 1,
  },
  {
    name: 'all tests skipped',
    complete: true,
    unit: {
      ...validUnit(),
      numPassedTests: 0,
      numPendingTests: 1,
      testResults: [{ status: 'passed', assertionResults: [{ status: 'skipped' }] }],
    },
    expected: 1,
  },
  {
    name: 'invalid counter types',
    complete: true,
    unit: { ...validUnit(), numFailedTests: '0' },
    expected: 1,
  },
  {
    name: 'failed assertion hidden by aggregate counters',
    complete: true,
    unit: {
      ...validUnit(),
      testResults: [{ status: 'passed', assertionResults: [{ status: 'failed' }] }],
    },
    expected: 1,
  },
  {
    name: 'missing suite result evidence',
    complete: true,
    unit: { ...validUnit(), testResults: [] },
    expected: 1,
  },
];
for (const control of controls) {
  it(`registry gate validates actual evidence: ${control.name}`, () => {
    mkdirSync('.tmp/audit', { recursive: true });
    const dir = mkdtempSync(resolve('.tmp/audit/gate-control-'));
    const run = join(dir, '.tmp/audit/run');
    mkdirSync(run, { recursive: true });
    const json = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value));
    // A real, minimal input inventory keeps the positive fixture subject to the same
    // source/report binding rules as a real run. These remain explicitly synthetic controls.
    mkdirSync(join(dir, 'tests/audit'), { recursive: true });
    json(join(dir, 'package.json'), { private: true });
    json(join(dir, 'package-lock.json'), { lockfileVersion: 3 });
    writeFileSync(
      join(dir, 'vitest.audit.config.ts'),
      'export default { test: { include: ["tests/audit/**/*.audit.ts"] } };'
    );
    writeFileSync(join(dir, 'tests/audit/a.audit.ts'), 'export const syntheticGateFixture = true;');
    json(join(dir, '.tmp/audit/latest.json'), {
      runDir: run,
      runId: 'control',
      profile: 'smoke',
      buildHash: 'control',
    });
    json(join(run, 'manifest.json'), { runId: 'control', profile: 'smoke', buildHash: 'control' });
    const first = { id: 'control', project: 'chromium', trial: 1 };
    if (!control.omitPlan)
      json(join(run, 'execution-plan.json'), {
        schemaVersion: 1,
        profile: 'smoke',
        requested: {},
        expected: control.missingRepeat ? [first, { ...first, trial: 2 }] : [first],
      });
    const observed = { ...first, status: 'pass', duration: 1 };
    json(
      join(run, 'results.json'),
      control.extraTrial
        ? [observed, { ...observed, trial: 2 }]
        : control.duplicateTrial
          ? [observed, { ...observed }]
          : [observed]
    );
    if (control.complete) json(join(run, 'complete.json'), { executed: 1 });
    if (control.aborted) json(join(run, 'aborted.json'), { reason: 'control' });
    const reportPath = join(dir, '.tmp/audit/unit-results.json');
    let unit = control.unit;
    if (
      unit &&
      typeof unit === 'object' &&
      !Array.isArray(unit) &&
      'testResults' in unit &&
      Array.isArray(unit.testResults)
    ) {
      unit = {
        ...unit,
        testResults: unit.testResults.map((suite) => ({
          ...suite,
          name: join(dir, 'tests/audit/a.audit.ts'),
        })),
      };
    }
    if (unit !== undefined) json(reportPath, unit);
    if (control.rawUnit !== undefined)
      writeFileSync(join(dir, '.tmp/audit/unit-results.json'), control.rawUnit);
    if (existsSync(reportPath) && !control.omitUnitBinding) {
      const terminalPath = join(dir, '.tmp/audit/unit-terminal.log');
      writeFileSync(terminalPath, 'Synthetic gate-control unit terminal fixture');
      const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
      const evidence: AuditUnitEvidence = {
        schemaVersion: 1,
        ...computeAuditInputHash(dir),
        report: { path: '.tmp/audit/unit-results.json', sha256: hash(reportPath) },
        command: auditUnitCommand(dir, reportPath),
        terminal: { path: '.tmp/audit/unit-terminal.log', sha256: hash(terminalPath) },
        startedAt: '2026-11-01T00:00:00.000Z',
        finishedAt: '2026-11-01T00:00:01.000Z',
        exitCode: 0,
        signal: null,
        completed: true,
        environment: { AUDIT_DEEP: null },
      };
      json(join(dir, '.tmp/audit/unit-evidence.json'), evidence);
    }
    const result = spawnSync(
      process.execPath,
      [resolve('node_modules/tsx/dist/cli.mjs'), resolve('scripts/audit-report.ts'), '--gate'],
      { cwd: dir, encoding: 'utf8' }
    );
    expect(result.stderr, 'gate controls must reject evidence, not crash the script').toBe('');
    expect(result.status).toBe(control.expected);
  });
}

it('repeat observations and artifacts preserve all trials while retaining the legacy first-trial path', () => {
  const stems = [1, 2, 3].map((trial) => auditArtifactStem('CASE', 'chromium', trial));
  expect(stems).toEqual(['CASE-chromium', 'CASE-chromium-trial-2', 'CASE-chromium-trial-3']);
  expect(new Set(stems.map((stem) => `${stem}.metrics.json`)).size).toBe(3);
  const recorded = new Set([auditObservationKey({ id: 'CASE', project: 'chromium', trial: 1 })]);
  expect(
    recorded.has(auditObservationKey({ id: 'CASE', project: 'chromium', trial: 2 })),
    'a completed trial must not suppress the next trial'
  ).toBe(false);
});

it('historical rows get trial ordinals in memory without rewriting original evidence', () => {
  const row: AuditResult = { id: 'CASE', project: 'chromium', status: 'pass', duration: 1 };
  const source = [row, { ...row }, { ...row, project: 'firefox' }];
  expect(normalizeAuditTrials(source).map((result) => result.trial)).toEqual([1, 2, 1]);
  expect(source.every((result) => result.trial === undefined)).toBe(true);
  expect(() =>
    normalizeAuditTrials([
      { ...row, trial: 1 },
      { ...row, trial: 1 },
    ])
  ).toThrow('Duplicate audit observation');
});

const fingerprint = {
  profile: 'smoke',
  buildHash: 'js',
  cssHash: 'css',
  harnessHash: 'tests-and-fixtures',
};
it('resume accepts identical JS, CSS and harness evidence', () => {
  expect(() => assertAuditResumeCompatible(fingerprint, { ...fingerprint })).not.toThrow();
});
for (const field of ['profile', 'buildHash', 'cssHash', 'harnessHash'] as const) {
  it(`resume rejects changed or missing ${field}`, () => {
    expect(() =>
      assertAuditResumeCompatible({ ...fingerprint, [field]: 'changed' }, fingerprint)
    ).toThrow(field);
    expect(() =>
      assertAuditResumeCompatible({ ...fingerprint, [field]: undefined }, fingerprint)
    ).toThrow(field);
  });
}
