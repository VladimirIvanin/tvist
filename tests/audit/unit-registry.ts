/** Registry changes are manual. This view is used only by the gate; raw Vitest results stay intact. */
export interface KnownUnitFailure {
  file: string;
  fullName: string;
  message: string;
  issue: string;
}
interface Assertion {
  fullName?: string;
  status?: string;
  failureMessages?: string[];
}
interface Suite {
  name?: string;
  status?: string;
  assertionResults?: Assertion[];
}
interface UnitReport {
  success?: boolean;
  numFailedTests?: number;
  numPassedTests?: number;
  numFailedTestSuites?: number;
  numPassedTestSuites?: number;
  numRuntimeErrorTestSuites?: number;
  testResults?: Suite[];
}
export function registryUnitView<T>(
  raw: T,
  known: KnownUnitFailure[]
): {
  view: T;
  observations: { file: string; fullName: string; classification: string; issue?: string }[];
} {
  const view = JSON.parse(JSON.stringify(raw)) as T & UnitReport;
  const observations: { file: string; fullName: string; classification: string; issue?: string }[] =
    [];
  if (!view || typeof view !== 'object' || !Array.isArray(view.testResults))
    return { view, observations };
  let matched = 0;
  let matchedSuites = 0;
  for (const suite of view.testResults) {
    if (!Array.isArray(suite?.assertionResults)) continue;
    let suiteMatches = 0;
    for (const assertion of suite.assertionResults) {
      const file = String(suite.name ?? '').replaceAll('\\', '/');
      const entry = known.find(
        (item) => file.endsWith('/' + item.file) && item.fullName === assertion.fullName
      );
      if (!entry) continue;
      const messages = assertion.failureMessages?.join('\n').replace(/\u001b\[[0-9;]*m/g, '') ?? '';
      const classification =
        assertion.status === 'passed'
          ? 'unexpected-pass'
          : assertion.status === 'failed' && messages.includes(entry.message)
            ? 'known-failure'
            : 'unexpected-failure';
      observations.push({ file, fullName: entry.fullName, classification, issue: entry.issue });
      if (classification === 'known-failure') {
        assertion.status = 'passed';
        matched++;
        suiteMatches++;
      }
    }
    if (
      suiteMatches &&
      suite.status === 'failed' &&
      suite.assertionResults.every((a) =>
        ['passed', 'pending', 'skipped', 'todo'].includes(String(a.status))
      )
    ) {
      suite.status = 'passed';
      matchedSuites++;
    }
  }
  if (matched) {
    // Invalid/hidden aggregate counts stay invalid and are rejected by the normal validator.
    view.numFailedTests = Number(view.numFailedTests) - matched;
    view.numPassedTests = Number(view.numPassedTests) + matched;
    const rawFailedSuites = Number(view.numFailedTestSuites);
    // Vitest counts describe groups as suites, while testResults contains files.
    // Accept those nested counts only when every failed file/assertion was matched.
    const allFailedFilesReviewed =
      matchedSuites > 0 &&
      rawFailedSuites >= matchedSuites &&
      view.numFailedTests === 0 &&
      view.testResults.every((suite) => suite.status !== 'failed');
    const reviewedSuiteCount = allFailedFilesReviewed ? rawFailedSuites : matchedSuites;
    view.numFailedTestSuites = rawFailedSuites - reviewedSuiteCount;
    view.numPassedTestSuites = Number(view.numPassedTestSuites) + reviewedSuiteCount;
    if (
      view.numFailedTests === 0 &&
      view.numFailedTestSuites === 0 &&
      !view.numRuntimeErrorTestSuites
    )
      view.success = true;
  }
  return { view, observations };
}
