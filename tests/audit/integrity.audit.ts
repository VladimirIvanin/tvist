import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import {
  auditUnitCommand,
  computeAuditInputHash,
  validateExecutionPlan,
  validateUnitEvidence,
  type AuditExecutionPlan,
  type AuditUnitEvidence,
} from '../../scripts/audit-integrity';

const temporary: string[] = [];
afterEach(() => {
  for (const root of temporary.splice(0)) {
    const target = resolve(root);
    if (!/^tvist-audit-integrity-[^/\\]+$/.test(relative(resolve(tmpdir()), target)))
      throw new Error('Refusing cleanup outside this test temporary directory');
    rmSync(target, { recursive: true, force: true });
  }
});
const trial = (id: string, project = 'chromium', number = 1) => ({ id, project, trial: number });
const plan = (): AuditExecutionPlan => ({
  schemaVersion: 1,
  expected: [trial('A'), trial('A', 'firefox'), trial('A', 'chromium', 2)],
});

describe('independent execution-plan accounting', () => {
  it('accepts every trial exactly once in any result order', () => {
    const p = plan();
    expect(() => validateExecutionPlan(p, [...p.expected].reverse())).not.toThrow();
  });
  it('rejects a completed-looking partial selection and a missing repeat', () => {
    const p = plan();
    expect(() => validateExecutionPlan(p, p.expected.slice(0, 2))).toThrow(/missing 1 trials/);
  });
  it('rejects duplicates even when the row count equals the plan', () => {
    const p = plan();
    expect(() => validateExecutionPlan(p, [p.expected[0], p.expected[0], p.expected[2]])).toThrow(
      /duplicate observed/
    );
  });
  it('rejects an unexpected project or repeat', () => {
    expect(() => validateExecutionPlan(plan(), [trial('A', 'webkit')])).toThrow(/extra observed/);
    expect(() => validateExecutionPlan(plan(), [trial('A', 'chromium', 3)])).toThrow(
      /extra observed/
    );
  });
  it('rejects a malformed or duplicate expected plan instead of lowering its denominator', () => {
    expect(() => validateExecutionPlan({ schemaVersion: 1, expected: [] }, [])).toThrow(/empty/);
    expect(() =>
      validateExecutionPlan({ schemaVersion: 1, expected: [trial('A'), trial('A')] }, [trial('A')])
    ).toThrow(/duplicate planned/);
  });
  it('requires explicit legacy normalization and uses collision-free tuple keys', () => {
    expect(() => validateExecutionPlan(plan(), [{ id: 'A', project: 'chromium' }])).toThrow(
      /normalize legacy/
    );
    const expected = [trial('A-B', 'C'), trial('A', 'B-C')];
    expect(() => validateExecutionPlan({ schemaVersion: 1, expected }, expected)).not.toThrow();
  });
});

function fixture(): {
  root: string;
  report: string;
  evidence: string;
  save: (edit?: (value: AuditUnitEvidence) => void) => void;
} {
  const root = mkdtempSync(join(tmpdir(), 'tvist-audit-integrity-'));
  temporary.push(root);
  const write = (path: string, text: string) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  write('src/core/Counter.ts', 'export const value = 1;');
  write('tests/audit/a.audit.ts', 'export const testA = true;');
  write('tests/audit/b.audit.ts', 'export const testB = true;');
  write('tests/audit/helper.ts', 'export const helper = true;');
  write('scripts/audit-helper.ts', 'export const script = true;');
  write('vitest.audit.config.ts', 'export default {};');
  write('package.json', '{}');
  write('package-lock.json', '{}');
  const report = '.tmp/audit/unit-results.json';
  const evidence = '.tmp/audit/unit-evidence.json';
  write(
    report,
    JSON.stringify({
      success: false,
      testResults: ['a', 'b'].map((name) => ({
        name: join(root, 'tests/audit', name + '.audit.ts'),
      })),
    })
  );
  write('.tmp/audit/unit-terminal.log', 'raw assertion failure');
  const hash = (path: string) =>
    createHash('sha256')
      .update(readFileSync(join(root, path)))
      .digest('hex');
  const save = (edit?: (value: AuditUnitEvidence) => void) => {
    const value: AuditUnitEvidence = {
      schemaVersion: 1,
      ...computeAuditInputHash(root),
      report: { path: report, sha256: hash(report) },
      command: auditUnitCommand(root, report),
      terminal: {
        path: '.tmp/audit/unit-terminal.log',
        sha256: hash('.tmp/audit/unit-terminal.log'),
      },
      startedAt: '2026-11-01T00:00:00.000Z',
      finishedAt: '2026-11-01T00:00:01.000Z',
      exitCode: 1,
      signal: null,
      completed: true,
      environment: { AUDIT_DEEP: null },
    };
    edit?.(value);
    write(evidence, JSON.stringify(value));
  };
  save();
  return { root, report, evidence, save };
}

describe('unit evidence is bound to code and the complete test inventory', () => {
  it('accepts an intact full report even when raw assertions failed', () => {
    const f = fixture();
    expect(() => validateUnitEvidence(f.root, f.report, f.evidence)).not.toThrow();
  });
  it.each([
    'src/core/Counter.ts',
    'tests/audit/helper.ts',
    'scripts/audit-helper.ts',
    'vitest.audit.config.ts',
    'package-lock.json',
  ])('invalidates changed input %s', (path) => {
    const f = fixture();
    writeFileSync(join(f.root, path), 'changed');
    expect(() => validateUnitEvidence(f.root, f.report, f.evidence)).toThrow(/input hash differs/);
  });
  it('rejects a partial report even if its hash was freshly recorded', () => {
    const f = fixture();
    writeFileSync(
      join(f.root, f.report),
      JSON.stringify({ testResults: [{ name: join(f.root, 'tests/audit/a.audit.ts') }] })
    );
    f.save();
    expect(() => validateUnitEvidence(f.root, f.report, f.evidence)).toThrow(
      /every actual audit test/
    );
  });
  it('rejects an extra suite replacing a missing actual audit test', () => {
    const f = fixture();
    writeFileSync(
      join(f.root, f.report),
      JSON.stringify({
        testResults: ['a.audit.ts', 'unknown.audit.ts'].map((name) => ({
          name: join(f.root, 'tests/audit', name),
        })),
      })
    );
    f.save();
    expect(() => validateUnitEvidence(f.root, f.report, f.evidence)).toThrow(
      /every actual audit test/
    );
  });
  it('rejects a modified report and a modified terminal independently', () => {
    const f = fixture();
    writeFileSync(join(f.root, f.report), '{}');
    expect(() => validateUnitEvidence(f.root, f.report, f.evidence)).toThrow(/SHA-256 differs/);
    f.save();
    writeFileSync(join(f.root, '.tmp/audit/unit-terminal.log'), 'edited');
    expect(() => validateUnitEvidence(f.root, f.report, f.evidence)).toThrow(
      /terminal artifact SHA-256/
    );
  });
  it('rejects source-inventory omission despite a matching aggregate hash', () => {
    const f = fixture();
    f.save((value) => {
      value.files = value.files.filter((file) => !file.path.endsWith('helper.ts'));
    });
    expect(() => validateUnitEvidence(f.root, f.report, f.evidence)).toThrow(
      /input inventory differs/
    );
  });
  it('rejects filtered commands, unfinished processes and signals', () => {
    const f = fixture();
    f.save((value) => {
      value.command.args.push('a.audit.ts');
    });
    expect(() => validateUnitEvidence(f.root, f.report, f.evidence)).toThrow(
      /full audit invocation/
    );
    f.save((value) => {
      value.completed = false;
    });
    expect(() => validateUnitEvidence(f.root, f.report, f.evidence)).toThrow(/did not finish/);
    f.save((value) => {
      value.signal = 'SIGTERM';
    });
    expect(() => validateUnitEvidence(f.root, f.report, f.evidence)).toThrow(/did not finish/);
  });
});
