import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';

export interface PlannedAuditTrial {
  id: string;
  project: string;
  trial: number;
}
export interface AuditExecutionPlan {
  schemaVersion: 1;
  expected: PlannedAuditTrial[];
  profile?: string;
  requested?: unknown;
}
export interface AuditInputFile {
  path: string;
  sha256: string;
}
export interface AuditInputSnapshot {
  inputHash: string;
  files: AuditInputFile[];
  testFiles: string[];
}
export interface AuditUnitEvidence extends AuditInputSnapshot {
  schemaVersion: 1;
  report: { path: string; sha256: string };
  command: { executable: string; args: string[]; cwd: string };
  terminal: { path: string; sha256: string };
  startedAt: string;
  finishedAt: string;
  exitCode: number | null;
  signal: string | null;
  completed: boolean;
  environment: { AUDIT_DEEP: null };
}
const slash = (path: string): string => path.replace(/\\/g, '/');
const digest = (data: string | Buffer): string => createHash('sha256').update(data).digest('hex');
const failPlan = (message: string): never => {
  throw new Error(`AUDIT_EXECUTION_PLAN: ${message}`);
};
const failUnit = (message: string): never => {
  throw new Error(`AUDIT_UNIT_EVIDENCE: ${message}`);
};

/** Exact trial accounting; historical ordinal assignment must happen explicitly before this call. */
export function validateExecutionPlan(
  plan: AuditExecutionPlan,
  results: Array<{ id: string; project: string; trial?: number }>
): void {
  if (!plan || plan.schemaVersion !== 1 || !Array.isArray(plan.expected) || !plan.expected.length)
    failPlan('missing or empty schemaVersion 1 plan');
  if (!Array.isArray(results)) failPlan('results must be an array');
  const key = (row: { id: string; project: string; trial?: number }, kind: string): string => {
    if (
      !row ||
      typeof row.id !== 'string' ||
      !row.id.trim() ||
      typeof row.project !== 'string' ||
      !row.project.trim() ||
      !Number.isInteger(row.trial) ||
      Number(row.trial) < 1
    )
      failPlan(`malformed ${kind} trial; normalize legacy rows explicitly`);
    return JSON.stringify([row.id, row.project, row.trial]);
  };
  const expected = new Set<string>();
  for (const row of plan.expected) {
    const value = key(row, 'planned');
    if (expected.has(value)) failPlan(`duplicate planned trial ${value}`);
    expected.add(value);
  }
  const observed = new Set<string>();
  for (const row of results) {
    const value = key(row, 'observed');
    if (observed.has(value)) failPlan(`duplicate observed trial ${value}`);
    if (!expected.has(value)) failPlan(`extra observed trial ${value}`);
    observed.add(value);
  }
  const missing = [...expected].filter((value) => !observed.has(value));
  if (missing.length)
    failPlan(`missing ${missing.length} trials: ${missing.slice(0, 8).join(', ')}`);
}

function filesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`AUDIT_INPUT_SYMLINK: ${path}`);
    return entry.isDirectory() ? filesUnder(path) : entry.isFile() ? [path] : [];
  });
}

/** Bind code, styles, helper scripts, test dependencies, configuration and dependency lockfile. */
export function computeAuditInputHash(workspace = process.cwd()): AuditInputSnapshot {
  const root = resolve(workspace);
  const code = /\.(?:[cm]?[jt]sx?|s?css|json)$/;
  const paths = [
    ...filesUnder(join(root, 'src')).filter((path) => code.test(path)),
    ...filesUnder(join(root, 'tests', 'audit')).filter((path) => code.test(path)),
    ...filesUnder(join(root, 'tests', 'fixtures')).filter((path) => code.test(path)),
    ...filesUnder(join(root, 'scripts')).filter((path) =>
      /^audit.*\.ts$/.test(slash(path).split('/').slice(-1)[0]!)
    ),
    ...readdirSync(root, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isFile() &&
          (/config(?:\.[^.]+)*\.(?:ts|js|mjs|cjs|json)$/.test(entry.name) ||
            /^package(?:-lock)?\.json$/.test(entry.name))
      )
      .map((entry) => join(root, entry.name)),
    ...(existsSync(join(root, 'tests', 'setup.ts')) ? [join(root, 'tests', 'setup.ts')] : []),
    ...(existsSync(join(root, 'docs', 'audit', 'commits.json'))
      ? [join(root, 'docs', 'audit', 'commits.json')]
      : []),
  ];
  const files = [...new Set(paths.map((path) => slash(relative(root, path))))]
    .sort()
    .map((path) => ({ path, sha256: digest(readFileSync(resolve(root, path))) }));
  const testFiles = files
    .map((file) => file.path)
    .filter((path) => /^tests\/audit\/.*\.audit\.ts$/.test(path));
  if (!testFiles.length) failUnit('no audit test files in current input inventory');
  for (const required of ['package.json', 'package-lock.json', 'vitest.audit.config.ts'])
    if (!files.some((file) => file.path === required))
      failUnit(`missing required input ${required}`);
  return { inputHash: digest(JSON.stringify({ schemaVersion: 1, files })), files, testFiles };
}

/** The unit binding only accepts the complete standard audit invocation, without file filters. */
export function auditUnitCommand(
  workspace: string,
  reportPath: string
): AuditUnitEvidence['command'] {
  const root = resolve(workspace);
  return {
    executable: process.execPath,
    args: [
      resolve(root, 'node_modules/vitest/vitest.mjs'),
      'run',
      '--config',
      'vitest.audit.config.ts',
      `--outputFile=${resolve(root, reportPath)}`,
    ],
    cwd: root,
  };
}

function inside(root: string, path: string): string {
  const normalized = slash(relative(root, resolve(root, path)));
  if (normalized === '..' || normalized.startsWith('../') || isAbsolute(normalized))
    failUnit(`artifact or suite path outside workspace: ${path}`);
  return normalized;
}
function json(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch {
    return failUnit(`missing or malformed JSON: ${path}`);
  }
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Integrity only: known raw assertion failures are assessed separately by the reviewed unit registry. */
export function validateUnitEvidence(
  workspace: string,
  reportPath: string,
  evidencePath: string
): void {
  const root = resolve(workspace);
  const reportFile = resolve(root, reportPath);
  const evidence = json(resolve(root, evidencePath));
  if (!object(evidence) || evidence.schemaVersion !== 1)
    failUnit('missing schemaVersion 1 evidence');
  const saved = evidence as unknown as AuditUnitEvidence;
  const current = computeAuditInputHash(root);
  if (saved.inputHash !== current.inputHash)
    failUnit('current source/test/config input hash differs from unit run');
  if (JSON.stringify(saved.files) !== JSON.stringify(current.files))
    failUnit('source/test input inventory differs');
  if (JSON.stringify(saved.testFiles) !== JSON.stringify(current.testFiles))
    failUnit('expected test file inventory differs');
  if (
    !saved.report ||
    saved.report.path !== inside(root, reportFile) ||
    saved.report.sha256 !== digest(readFileSync(reportFile))
  )
    failUnit('unit report path or SHA-256 differs');
  if (!saved.completed || ![0, 1].includes(saved.exitCode as number) || saved.signal !== null)
    failUnit('unit process did not finish with a normal assertion outcome');
  if (
    !Number.isFinite(Date.parse(saved.startedAt)) ||
    !Number.isFinite(Date.parse(saved.finishedAt)) ||
    Date.parse(saved.finishedAt) < Date.parse(saved.startedAt)
  )
    failUnit('invalid unit execution timestamps');
  if (!saved.environment || saved.environment.AUDIT_DEEP !== null)
    failUnit('unexpected unit execution environment');
  if (JSON.stringify(saved.command) !== JSON.stringify(auditUnitCommand(root, reportFile)))
    failUnit('command differs from the full audit invocation');
  if (!saved.terminal || typeof saved.terminal.path !== 'string')
    failUnit('missing terminal artifact');
  const terminalPath = inside(root, saved.terminal.path);
  if (
    !existsSync(resolve(root, terminalPath)) ||
    digest(readFileSync(resolve(root, terminalPath))) !== saved.terminal.sha256
  )
    failUnit('terminal artifact SHA-256 differs');
  const report = json(reportFile);
  if (!object(report) || !Array.isArray(report.testResults))
    return failUnit('missing testResults inventory');
  const names = report.testResults.map((suite: unknown) => {
    if (!object(suite) || typeof suite.name !== 'string') return failUnit('malformed suite name');
    return inside(root, suite.name);
  });
  if (new Set(names).size !== names.length) failUnit('duplicate suite file in testResults');
  if (JSON.stringify([...names].sort()) !== JSON.stringify(current.testFiles))
    failUnit('testResults names do not match every actual audit test file');
}
