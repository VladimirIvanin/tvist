/** Run the unchanged legacy E2E suite against an isolated fresh browser build. */
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';

const root = process.cwd();
const runDir = resolve(
  '.tmp/audit',
  `baseline-e2e-${new Date().toISOString().replace(/[:.]/g, '-')}`
);
const snapshot = join(runDir, 'snapshot');
mkdirSync(snapshot, { recursive: true });
for (const file of [
  'src',
  'scripts',
  'e2e',
  'docs/site/standalone.ts',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.browser.config.ts',
  'vite.e2e.config.ts',
  'playwright.config.ts',
])
  cpSync(resolve(file), join(snapshot, file), { recursive: true });
const build = spawnSync(
  process.execPath,
  [resolve('node_modules/vite/bin/vite.js'), 'build', '--config', 'vite.browser.config.ts'],
  { cwd: snapshot, encoding: 'utf8' }
);
writeFileSync(join(runDir, 'build.log'), build.stdout + build.stderr);
if (build.status !== 0) throw new Error(`Isolated baseline build failed: ${runDir}`);
const probe = createServer();
await new Promise<void>((done) => probe.listen(0, '127.0.0.1', done));
const address = probe.address();
if (!address || typeof address === 'string') throw new Error('Baseline port allocation failed');
const port = address.port;
await new Promise<void>((done, reject) => probe.close((error) => (error ? reject(error) : done())));
const config = readFileSync(resolve('playwright.config.ts'), 'utf8')
  .replaceAll('4173', String(port))
  .replace('reuseExistingServer: !process.env.CI', 'reuseExistingServer: false');
writeFileSync(join(snapshot, 'playwright.config.ts'), config);
writeFileSync(
  join(snapshot, 'vite.e2e.config.ts'),
  readFileSync(resolve('vite.e2e.config.ts'), 'utf8').replaceAll('4173', String(port))
);
const hash = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
const manifest = {
  started: new Date().toISOString(),
  commit: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(),
  bundleSha256: hash(join(snapshot, 'browser-build/tvist.min.js')),
  cssSha256: hash(join(snapshot, 'browser-build/tvist.css')),
  port,
  reuseExistingServer: false,
  retries: 0,
  workers: 1,
  productionModified: false,
  suite:
    'unchanged existing e2e/*.spec.ts; legacy assertion limitations remain separate from new audit',
};
writeFileSync(join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
const result = spawnSync(
  process.execPath,
  [
    resolve(root, 'node_modules/playwright/cli.js'),
    'test',
    '--config',
    'playwright.config.ts',
    '--workers=1',
    '--retries=0',
    '--reporter=json',
    `--output=${join(runDir, 'artifacts')}`,
  ],
  {
    cwd: snapshot,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: join(runDir, 'results.json') },
  }
);
writeFileSync(join(runDir, 'runner.log'), result.stdout + result.stderr);
writeFileSync(
  join(runDir, 'complete.json'),
  JSON.stringify(
    {
      ended: new Date().toISOString(),
      exitCode: result.status,
      signal: result.signal,
      error: result.error?.message,
    },
    null,
    2
  )
);
const report = JSON.parse(readFileSync(join(runDir, 'results.json'), 'utf8')) as { stats: unknown };
writeFileSync(
  resolve('docs/audit/baseline-e2e-results.json'),
  JSON.stringify({ ...manifest, runDir, exitCode: result.status, stats: report.stats }, null, 2)
);
console.log(JSON.stringify({ runDir, exitCode: result.status, stats: report.stats }));
process.exitCode = result.status ?? 1;
