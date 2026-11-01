/** Build and consume an actual npm tarball without modifying tracked build artifacts. */
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { gunzipSync } from 'node:zlib';

type Status = 'pass' | 'reproduced' | 'unsupported' | 'blocked';
interface Result {
  id: string;
  status: Status;
  classification: string;
  durationMs: number;
  detail?: string;
  artifact?: string;
}
const root = process.cwd();
const output = resolve(root, '.tmp/audit');
const runDir = join(output, `package-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const snapshot = join(runDir, 'snapshot');
const consumer = join(runDir, 'consumer');
const packDir = join(runDir, 'packs');
for (const directory of [snapshot, consumer, packDir]) mkdirSync(directory, { recursive: true });
const results: Result[] = [];
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const npmCandidates = [
  process.env.npm_execpath,
  resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
];
const npmCLI = npmCandidates.find(
  (candidate) => candidate?.endsWith('.js') && existsSync(candidate)
);
if (!npmCLI)
  throw new Error('Cannot locate npm-cli.js; run through npm/tsx or install Node npm CLI.');
const tool = (file: string) => resolve(root, 'node_modules', file);
const manifest = {
  started: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  commit: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim(),
  runDir: relative(root, runDir).split(sep).join('/'),
  sourceFiles: [] as Array<{ path: string; sha256: string }>,
  packageVersion: '',
  tarball: '',
  browserHash: '',
  note: 'Node import checks module evaluation without DOM; no SSR rendering support is claimed. Direct CSS evaluation in Node requires a loader and is reported separately.',
};

function persist(): void {
  const report = { ...manifest, updated: new Date().toISOString(), results };
  mkdirSync(resolve(root, 'docs/audit'), { recursive: true });
  for (const destination of [
    join(output, 'package-results.json'),
    resolve(root, 'docs/audit/package-results.json'),
    join(runDir, 'results.json'),
  ]) {
    writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
  }
}
function normalise(detail: string): string {
  return detail
    .split(runDir)
    .join('<run>')
    .split(runDir.split('\\').join('/'))
    .join('<run>')
    .trim();
}
async function command(
  id: string,
  args: string[],
  cwd = snapshot
): Promise<{ code: number; stdout: string; stderr: string }> {
  const started = Date.now();
  const result = await new Promise<{ code: number; stdout: string; stderr: string }>((fulfil) => {
    let stdout = '';
    let stderr = '';
    const child = spawn(process.execPath, args, {
      cwd,
      windowsHide: true,
      env: { ...process.env, CI: 'true', npm_config_audit: 'false', npm_config_fund: 'false' },
    });
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (error) => {
      stderr += error.message;
      fulfil({ code: -1, stdout, stderr });
    });
    child.on('close', (code) => fulfil({ code: code ?? -1, stdout, stderr }));
  });
  const log = join(runDir, `${id}.log`);
  writeFileSync(log, result.stdout + result.stderr);
  results.push({
    id,
    status: result.code === 0 ? 'pass' : 'reproduced',
    classification: 'package-contract',
    durationMs: Date.now() - started,
    detail:
      result.code === 0 ? undefined : normalise(result.stdout + result.stderr).slice(0, 20000),
    artifact: relative(root, log).split(sep).join('/'),
  });
  persist();
  return result;
}
function check(
  id: string,
  assertion: () => string | void,
  classification = 'package-contract'
): void {
  const started = Date.now();
  try {
    const detail = assertion();
    results.push({
      id,
      status: 'pass',
      classification,
      durationMs: Date.now() - started,
      detail: detail || undefined,
    });
  } catch (error) {
    results.push({
      id,
      status: 'reproduced',
      classification,
      durationMs: Date.now() - started,
      detail: normalise(String(error)),
    });
  }
  persist();
}
function demand(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function collect(directory: string, prefix: string): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const name = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) collect(path, name);
    else manifest.sourceFiles.push({ path: name, sha256: hash(readFileSync(path)) });
  }
}
for (const file of [
  'src',
  'scripts/check-browser-size.ts',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'vite.browser.config.ts',
  'README.md',
  'LICENSE',
]) {
  const source = resolve(root, file);
  const destination = join(snapshot, file);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
  if (statSync(source).isDirectory()) collect(source, file);
  else manifest.sourceFiles.push({ path: file, sha256: hash(readFileSync(source)) });
}
manifest.sourceFiles.sort((a, b) => a.path.localeCompare(b.path));
manifest.packageVersion = JSON.parse(readFileSync(join(snapshot, 'package.json'), 'utf8')).version;
persist();

const typesBuild = await command('PKG-BUILD-TYPES', [
  tool('typescript/bin/tsc'),
  '--project',
  'tsconfig.json',
]);
const jsBuild = await command('PKG-BUILD-ESM-CJS', [
  tool('vite/bin/vite.js'),
  'build',
  '--config',
  'vite.config.ts',
]);
const browserBuild = await command('PKG-BUILD-UMD', [
  tool('vite/bin/vite.js'),
  'build',
  '--config',
  'vite.browser.config.ts',
]);
if (typesBuild.code === 0 && jsBuild.code === 0 && browserBuild.code === 0) {
  const packed = await command('PKG-PACK', [
    npmCLI,
    'pack',
    '--ignore-scripts',
    '--offline',
    '--json',
    '--pack-destination',
    packDir,
  ]);
  if (packed.code === 0) {
    const details = JSON.parse(packed.stdout) as Array<{
      filename: string;
      files: Array<{ path: string }>;
    }>;
    const tarball = join(packDir, details[0]!.filename);
    manifest.tarball = relative(root, tarball).split(sep).join('/');
    check('PKG-CONTENTS', () => {
      const files = new Set(details[0]!.files.map((item) => item.path));
      for (const file of [
        'dist/tvist.esm.js',
        'dist/tvist.cjs',
        'dist/types/index.d.ts',
        'dist/tvist.css',
        'browser-build/tvist.min.js',
        'browser-build/tvist.min.js.gz',
        'browser-build/tvist.css',
        'LICENSE',
      ])
        demand(files.has(file), `Missing published file ${file}`);
      demand(
        ![...files].some(
          (file) =>
            file.startsWith('tests/') || file.startsWith('.tmp/') || file.includes('node_modules/')
        ),
        'Tarball contains test/cache/dependency artifacts'
      );
      return `${files.size} packed files; tarball SHA256 ${hash(readFileSync(tarball))}`;
    });
    writeFileSync(
      join(consumer, 'package.json'),
      JSON.stringify({ name: 'tvist-audit-consumer', private: true, type: 'module' }, null, 2)
    );
    const installed = await command(
      'PKG-CONSUMER-INSTALL',
      [
        npmCLI,
        'install',
        '--offline',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        '--package-lock=false',
        `file:${tarball.split('\\').join('/')}`,
      ],
      consumer
    );
    if (installed.code === 0) {
      check('PKG-INSTALL-ISOLATION', () => {
        const resolved = realpathSync(join(consumer, 'node_modules/tvist'));
        demand(
          relative(consumer, resolved).split(sep)[0] !== '..',
          'Consumer resolves outside isolated directory'
        );
        demand(
          statSync(join(resolved, 'dist/types/index.d.ts')).isFile(),
          'Installed declarations missing'
        );
      });
      writeFileSync(
        join(consumer, 'runtime.mjs'),
        `import assert from 'node:assert/strict';\nimport Default, { Tvist, TvistV1, TVIST_CLASSES } from 'tvist';\nassert.equal(typeof document,'undefined');assert.equal(typeof window,'undefined');assert.equal(Default,Tvist);assert.equal(TvistV1,Tvist);assert.equal(typeof Tvist,'function');assert.equal(typeof TVIST_CLASSES.block,'string');console.log(JSON.stringify({format:'esm',version:Tvist.VERSION}));\n`
      );
      writeFileSync(
        join(consumer, 'runtime.cjs'),
        `const assert=require('node:assert/strict');const api=require('tvist');assert.equal(typeof document,'undefined');assert.equal(typeof window,'undefined');assert.equal(api.default,api.Tvist);assert.equal(api.TvistV1,api.Tvist);assert.equal(typeof api.Tvist,'function');assert.equal(typeof api.TVIST_CLASSES.block,'string');console.log(JSON.stringify({format:'cjs',version:api.Tvist.VERSION}));\n`
      );
      await command('PKG-NODE-ESM-NO-DOM', ['runtime.mjs'], consumer);
      await command('PKG-NODE-CJS-NO-DOM', ['runtime.cjs'], consumer);
      writeFileSync(
        join(consumer, 'css.cjs'),
        `const assert=require('node:assert/strict');const fs=require('node:fs');for(const name of ['tvist/dist/tvist.css','tvist/browser-build/tvist.css']){const path=require.resolve(name);assert.ok(fs.statSync(path).size>0);console.log(path);}\n`
      );
      await command('PKG-CSS-EXPORT-RESOLUTION', ['css.cjs'], consumer);
      writeFileSync(
        join(consumer, 'css-native.mjs'),
        `try{await import('tvist/dist/tvist.css');console.log('CSS_IMPORT_SUPPORTED')}catch(error){if(error.code!=='ERR_UNKNOWN_FILE_EXTENSION')throw error;console.log('EXPECTED_UNSUPPORTED_NATIVE_NODE_CSS:'+error.code);}\n`
      );
      const cssResult = await command('PKG-NATIVE-NODE-CSS', ['css-native.mjs'], consumer);
      if (
        cssResult.code === 0 &&
        cssResult.stdout.includes('EXPECTED_UNSUPPORTED_NATIVE_NODE_CSS')
      ) {
        const record = results.find((item) => item.id === 'PKG-NATIVE-NODE-CSS')!;
        record.status = 'unsupported';
        record.classification = 'native-node-css-needs-loader';
        record.detail =
          'Node rejects direct .css module evaluation without a loader. Export path resolution passed separately; this is not a Tvist defect.';
        persist();
      }
      const fixture = `import Tvist, { Tvist as Named, TvistV1, type TvistOptions, type AutoplayControls } from 'tvist';
const options: TvistOptions = { perPage: 2, loop: { withClones: true }, center: { focus: true }, on: { slideChangeEnd(index) { const value: number = index; void value; } } };
const slider = new Tvist(document.createElement('div'), options);
const constructors: typeof Tvist[] = [Named, TvistV1]; void constructors;
slider.updateOptions({ gap: '1rem', direction: 'vertical' });
const controls: AutoplayControls | undefined = slider.autoplay; controls?.pause();
// @ts-expect-error invalid direction must not silently widen to any
const wrong: TvistOptions = { direction: 'diagonal' }; void wrong;
// @ts-expect-error public realIndex is readonly
slider.realIndex = 2;
// @ts-expect-error virtual is not a public Tvist option
const absent: TvistOptions = { virtual: true }; void absent;
`;
      writeFileSync(join(consumer, 'consumer.mts'), fixture);
      writeFileSync(
        join(consumer, 'consumer.cts'),
        fixture.replace(
          "import Tvist, { Tvist as Named, TvistV1, type TvistOptions, type AutoplayControls } from 'tvist';",
          "import api = require('tvist');\nconst { Tvist, Tvist: Named, TvistV1 } = api;\ntype TvistOptions = api.TvistOptions; type AutoplayControls = api.AutoplayControls;"
        )
      );
      for (const mode of ['node16', 'nodenext', 'bundler'] as const) {
        for (const kind of mode === 'bundler' ? ['mts'] : ['mts', 'cts']) {
          const config = `tsconfig-${mode}-${kind}.json`;
          writeFileSync(
            join(consumer, config),
            JSON.stringify(
              {
                compilerOptions: {
                  target: 'ES2022',
                  module: mode === 'bundler' ? 'ESNext' : mode === 'node16' ? 'Node16' : 'NodeNext',
                  moduleResolution: mode,
                  strict: true,
                  skipLibCheck: false,
                  noEmit: true,
                  types: [],
                  lib: ['ES2022', 'DOM', 'DOM.Iterable'],
                },
                files: [`consumer.${kind}`],
              },
              null,
              2
            )
          );
          await command(
            `PKG-TYPES-${mode.toUpperCase()}-${kind.toUpperCase()}`,
            [tool('typescript/bin/tsc'), '--project', config],
            consumer
          );
        }
      }
      check('PKG-UMD-SIZE-GZIP-HASH', () => {
        const installedDirectory = join(consumer, 'node_modules/tvist/browser-build');
        const bundle = readFileSync(join(installedDirectory, 'tvist.min.js'));
        const compressed = readFileSync(join(installedDirectory, 'tvist.min.js.gz'));
        manifest.browserHash = hash(bundle);
        demand(bundle.length <= 100000, `Full UMD ${bundle.length} bytes exceeds 100000`);
        demand(
          bundle.toString().startsWith(`/*! Tvist v${manifest.packageVersion}`),
          'UMD license/version banner missing'
        );
        demand(gunzipSync(compressed).equals(bundle), 'Gzip copy differs from UMD');
        demand(
          hash(readFileSync(join(snapshot, 'browser-build/tvist.min.js'))) === manifest.browserHash,
          'Installed UMD differs from freshly built UMD'
        );
        return JSON.stringify({
          bytes: bundle.length,
          gzip: compressed.length,
          sha256: manifest.browserHash,
        });
      });
    }
  }
} else {
  results.push({
    id: 'PKG-CONSUMER',
    status: 'blocked',
    classification: 'build-prerequisite',
    durationMs: 0,
    detail: 'Consumer checks could not run because an isolated production build failed.',
  });
  persist();
}

if (process.argv.includes('--docs')) {
  for (const file of [
    'docs',
    'docs-tests',
    'scripts/build-docs.ts',
    'scripts/generate-options-meta.ts',
    'scripts/api-reference.ts',
    'tsconfig.docs.json',
    'vite.docs.config.ts',
  ]) {
    const destination = join(snapshot, file);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(resolve(root, file), destination, {
      recursive: true,
      filter: (source) =>
        !/(?:^|[\\/])(?:\.generated|dist|audit)(?:[\\/]|$)/.test(relative(root, source)),
    });
  }
  const metadata = await command('DOCS-METADATA', [
    tool('tsx/dist/cli.mjs'),
    'scripts/generate-options-meta.ts',
  ]);
  const generated = await command('DOCS-GENERATE', [
    tool('tsx/dist/cli.mjs'),
    'scripts/build-docs.ts',
  ]);
  const typed = await command('DOCS-TYPES', [
    tool('typescript/bin/tsc'),
    '--project',
    'tsconfig.docs.json',
  ]);
  const built = await command('DOCS-BUILD', [
    tool('vite/bin/vite.js'),
    'build',
    '--config',
    'vite.docs.config.ts',
  ]);
  if ([metadata, generated, typed, built].every((result) => result.code === 0)) {
    const docsDirectory = join(snapshot, 'docs/dist');
    const mime: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.webm': 'video/webm',
      '.mp4': 'video/mp4',
    };
    const server = createServer((request, response) => {
      const pathname = decodeURIComponent((request.url ?? '/').split('?')[0]!);
      if (!pathname.startsWith('/tvist/')) {
        response.writeHead(404);
        response.end();
        return;
      }
      const file = resolve(docsDirectory, pathname.slice('/tvist/'.length) || 'index.html');
      if (
        relative(docsDirectory, file).startsWith('..') ||
        !existsSync(file) ||
        !statSync(file).isFile()
      ) {
        response.writeHead(404);
        response.end();
        return;
      }
      response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
      response.end(readFileSync(file));
    });
    await new Promise<void>((fulfil) => server.listen(0, '127.0.0.1', fulfil));
    const address = server.address();
    demand(address && typeof address !== 'string', 'Docs server address unavailable');
    const baseURL = `http://127.0.0.1:${address.port}/tvist/`;
    // Apply routing only to the copied test fixture. External asset availability is
    // outside these local UI checks; a stalled Google Fonts @import blocks even
    // DOMContentLoaded and otherwise obscures every documentation assertion.
    writeFileSync(
      join(snapshot, 'docs-tests/audit-network-fixture.ts'),
      `import {test as base,expect} from '@playwright/test';
export {expect};
export const test=base.extend({context:async({context},use)=>{
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='127.0.0.1'||url.protocol==='data:'||url.protocol==='blob:'){await route.continue();return;}
    if(url.hostname==='fonts.googleapis.com'){await route.fulfill({status:200,contentType:'text/css',body:'/* Offline audit: system font fallback. */'});return;}
    if(route.request().resourceType()==='image'){await route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#cccccc"/></svg>'});return;}
    await route.abort('blockedbyclient');
  });
  await use(context);
}});\n`
    );
    for (const file of readdirSync(join(snapshot, 'docs-tests')).filter((name) =>
      name.endsWith('.spec.ts')
    )) {
      const path = join(snapshot, 'docs-tests', file);
      writeFileSync(
        path,
        readFileSync(path, 'utf8')
          .split("from '@playwright/test'")
          .join("from './audit-network-fixture'")
      );
    }
    results.push({
      id: 'DOCS-EXTERNAL-ASSETS',
      status: 'unsupported',
      classification: 'external-network-excluded',
      durationMs: 0,
      detail:
        'Copied tests use an empty Google Fonts stylesheet and deterministic external image placeholders; other external requests are blocked. Real CDN delivery, media playback and original font metrics are not validated. Built local documentation scripts/styles and all existing test assertions remain unchanged.',
    });
    persist();
    writeFileSync(
      join(snapshot, 'playwright.audit-docs.config.ts'),
      `import {defineConfig,devices} from '@playwright/test'; export default defineConfig({testDir:'./docs-tests',fullyParallel:true,workers:3,retries:0,reporter:[['json',{outputFile:'docs-playwright-results.json'}]],use:{baseURL:${JSON.stringify(baseURL)},...devices['Desktop Chrome']}});\n`
    );
    try {
      const tested = await command('DOCS-PLAYWRIGHT-ALL', [
        tool('@playwright/test/cli.js'),
        'test',
        '--config',
        'playwright.audit-docs.config.ts',
      ]);
      const resultFile = join(snapshot, 'docs-playwright-results.json');
      if (existsSync(resultFile)) {
        const result = JSON.parse(readFileSync(resultFile, 'utf8')) as {
          stats: Record<string, unknown>;
        };
        const record = results.find((item) => item.id === 'DOCS-PLAYWRIGHT-ALL')!;
        record.classification = 'documentation-browser-tests';
        record.detail = JSON.stringify(result.stats);
        cpSync(resultFile, join(runDir, 'docs-playwright-results.json'));
        record.artifact = relative(root, join(runDir, 'docs-playwright-results.json'))
          .split(sep)
          .join('/');
        record.status = tested.code === 0 ? 'pass' : 'reproduced';
        persist();
      }
    } finally {
      await new Promise<void>((fulfil, reject) =>
        server.close((error) => (error ? reject(error) : fulfil()))
      );
    }
  }
}
persist();
console.log(
  JSON.stringify({
    runDir: manifest.runDir,
    pass: results.filter((item) => item.status === 'pass').length,
    failures: results.filter((item) => item.status === 'reproduced').length,
    unsupported: results.filter((item) => item.status === 'unsupported').length,
  })
);
process.exitCode = results.some((item) => item.status === 'reproduced' || item.status === 'blocked')
  ? 1
  : 0;
