import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { auditUnitCommand, computeAuditInputHash, type AuditUnitEvidence } from './audit-integrity';

// Partial unit selections must not overwrite the evidence for the full audit suite.
if (process.argv.length > 2)
  throw new Error('AUDIT_UNIT_FULL_ONLY: invoke without test filters or other arguments');
const root = resolve(process.cwd());
const output = join(root, '.tmp', 'audit');
mkdirSync(output, { recursive: true });
const reportPath = join(output, 'unit-results.json');
const evidencePath = join(output, 'unit-evidence.json');
const terminalPath = join(output, 'unit-terminal.log');
const before = computeAuditInputHash(root);
const command = auditUnitCommand(root, reportPath);
const startedAt = new Date().toISOString();
// Remove only these two named audit outputs so a failed launch cannot bind a stale report.
for (const path of [reportPath, evidencePath]) if (existsSync(path)) unlinkSync(path);
const environment = { ...process.env };
delete environment.AUDIT_DEEP;
delete environment.AUDIT_SLIDER_DEEP;
const result = spawnSync(command.executable, command.args, {
  cwd: command.cwd,
  env: environment,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
const finishedAt = new Date().toISOString();
const terminal = `Command: ${JSON.stringify(command)}\nStarted: ${startedAt}\nFinished: ${finishedAt}\nExit: ${String(result.status)}\nSignal: ${String(result.signal)}\nSTDOUT:\n${result.stdout ?? ''}\nSTDERR:\n${result.stderr ?? ''}\nSpawn error: ${result.error?.message ?? ''}\n`;
writeFileSync(terminalPath, terminal);
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');
const sha256 = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');
const after = computeAuditInputHash(root);
const evidence: AuditUnitEvidence = {
  schemaVersion: 1,
  ...before,
  report: {
    path: '.tmp/audit/unit-results.json',
    sha256: existsSync(reportPath) ? sha256(readFileSync(reportPath)) : '',
  },
  command,
  terminal: { path: '.tmp/audit/unit-terminal.log', sha256: sha256(terminal) },
  startedAt,
  finishedAt,
  exitCode: result.status,
  signal: result.signal,
  completed:
    !result.error &&
    result.signal === null &&
    result.status !== null &&
    before.inputHash === after.inputHash,
  environment: { AUDIT_DEEP: null },
};
writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
if (before.inputHash !== after.inputHash)
  process.stderr.write('AUDIT_UNIT_INPUT_CHANGED: input files changed during execution\n');
process.exitCode = evidence.completed ? (result.status ?? 1) : 1;
