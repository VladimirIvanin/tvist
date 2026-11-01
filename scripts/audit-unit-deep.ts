import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const run = spawnSync(
  process.execPath,
  [
    resolve('node_modules/vitest/vitest.mjs'),
    'run',
    '--config',
    'vitest.audit.config.ts',
    'tests/audit/deep.audit.ts',
    '--outputFile=.tmp/audit/unit-deep-vitest.json',
  ],
  { stdio: 'inherit', env: { ...process.env, AUDIT_DEEP: '1' } }
);
process.exitCode = run.status ?? 1;
