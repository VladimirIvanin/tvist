import { expect, it } from 'vitest';
import {
  verifyRiskCoverage,
  riskExecutionCoverage,
  type RiskFamilyManifest,
} from './risk-coverage';
const family = (): RiskFamilyManifest => ({
  family: 'R',
  domains: { a: [false, true], b: [1, 2], c: ['x', 'y'] },
  tuples: [false, true].flatMap((a) =>
    [1, 2].flatMap((b) => ['x', 'y'].map((c) => ({ id: `${a}-${b}-${c}`, factors: { a, b, c } })))
  ),
});
it('risk enumerator independently proves the finite triple denominator', () => {
  const report = verifyRiskCoverage([family()]);
  expect(report.errors).toEqual([]);
  expect(report.families[0]).toMatchObject({ required: 8, witnessed: 8 });
});
it('a duplicate generated tuple cannot disguise a missing one', () => {
  const f = family();
  f.tuples[7] = f.tuples[0]!;
  const report = verifyRiskCoverage([f]);
  expect(report.families[0]?.missing).toHaveLength(1);
  expect(report.errors.some((e) => e.startsWith('missing:'))).toBe(true);
});
it('invalid levels/factors and duplicate family declarations are rejected', () => {
  const f = family();
  f.tuples[0]!.factors.a = 'invalid';
  expect(verifyRiskCoverage([f, f]).errors.some((e) => e.startsWith('invalid-value:'))).toBe(true);
  expect(verifyRiskCoverage([f, f]).errors.some((e) => e.startsWith('duplicate-family:'))).toBe(
    true
  );
});
it('executed failing witnesses do not count as fully passing coverage', () => {
  const f = family();
  const report = riskExecutionCoverage(
    [f],
    [{ id: f.tuples[0]!.id, project: 'chromium', status: 'reproduced' }],
    ['chromium', 'webkit']
  );
  expect(report.executions).toMatchObject([
    { invoked: 1, completedPass: 0, required: 8 },
    { invoked: 0, completedPass: 0, required: 8 },
  ]);
});
