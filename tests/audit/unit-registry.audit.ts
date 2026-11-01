import { expect, it } from 'vitest';
import { registryUnitView, type KnownUnitFailure } from './unit-registry';
const known: KnownUnitFailure[] = [
  {
    file: 'tests/audit/case.audit.ts',
    fullName: 'recursive once',
    message: 'expected 3 to be 1',
    issue: 'issue',
  },
];
const raw = () => ({
  success: false,
  numFailedTests: 1,
  numPassedTests: 2,
  numFailedTestSuites: 1,
  numPassedTestSuites: 1,
  testResults: [
    {
      name: '/workspace/tests/audit/case.audit.ts',
      status: 'failed',
      assertionResults: [
        {
          fullName: 'recursive once',
          status: 'failed',
          failureMessages: ['AssertionError: expected 3 to be 1'],
        },
      ],
    },
  ],
});
it('gate recognizes an exact reviewed unit violation without changing raw results', () => {
  const report = raw();
  const classified = registryUnitView(report, known);
  expect(classified.observations[0]?.classification).toBe('known-failure');
  expect(classified.view).toMatchObject({
    success: true,
    numFailedTests: 0,
    numFailedTestSuites: 0,
  });
  expect(report.success).toBe(false);
  expect(report.testResults[0]!.assertionResults[0]!.status).toBe('failed');
});
it('a different assertion message or file is not accepted as the known defect', () => {
  const report = raw();
  report.testResults[0]!.assertionResults[0]!.failureMessages = ['expected 4 to be 1'];
  expect(registryUnitView(report, known).view.success).toBe(false);
  report.testResults[0]!.name = '/workspace/tests/other.audit.ts';
  expect(registryUnitView(report, known).observations).toEqual([]);
});
it('an unexpected unit fix stays visible to the registry gate', () => {
  const report = raw();
  report.testResults[0]!.assertionResults[0]!.status = 'passed';
  expect(registryUnitView(report, known).observations[0]?.classification).toBe('unexpected-pass');
});
it('Vitest nested describe counts are accepted only after all failed files were reviewed', () => {
  expect(
    registryUnitView({ ...raw(), numFailedTestSuites: 2 }, known).view.numFailedTestSuites
  ).toBe(0);
  const report = raw();
  report.testResults.push({ name: '/workspace/other.ts', status: 'failed', assertionResults: [] });
  report.numFailedTestSuites = 2;
  expect(registryUnitView(report, known).view).toMatchObject({
    success: false,
    numFailedTestSuites: 1,
  });
});
it('a known assertion does not hide another failure, bad aggregates, or runtime crash', () => {
  const report = raw();
  report.testResults[0]!.assertionResults.push({
    fullName: 'other',
    status: 'failed',
    failureMessages: ['crash'],
  });
  report.numFailedTests = 2;
  expect(registryUnitView(report, known).view).toMatchObject({
    success: false,
    numFailedTests: 1,
    numFailedTestSuites: 1,
  });
  const inconsistent = raw();
  inconsistent.numFailedTests = 0;
  expect(registryUnitView(inconsistent, known).view.numFailedTests).toBe(-1);
  expect(registryUnitView({ ...raw(), numRuntimeErrorTestSuites: 1 }, known).view.success).toBe(
    false
  );
});
