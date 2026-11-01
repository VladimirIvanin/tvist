import { commitCases, runCommitCase } from '../tests/audit/commits';
import { nativeMediaCases, runNativeMediaCase } from '../tests/audit/native-media';
import { nativeInputCases, runNativeInputCase } from '../tests/audit/native-input';
import { unitRegressionCases, runUnitRegressionCase } from '../tests/audit/unit-regressions';
import { eventRegressionCases, runEventRegressionCase } from '../tests/audit/event-regressions';
import { riskGeometryCases, runRiskGeometryCase } from '../tests/audit/risk-geometry';
import { riskInputCases, runRiskInputCase } from '../tests/audit/risk-input';
import { riskMediaCases, runRiskMediaCase } from '../tests/audit/risk-media';
import {
  additionalRiskCases,
  riskManifests,
  assertRiskDeclaration,
  mobileRiskCase,
} from '../tests/audit/risk-matrix';
import { riskExecutionCoverage } from '../tests/audit/risk-coverage';
import { checkMatrixGeometry } from '../tests/audit/matrix-oracles';
import { sourceGeometryCases, runSourceGeometryCase } from '../tests/audit/source-geometry';
import { sourceLifecycleCases, runSourceLifecycleCase } from '../tests/audit/source-lifecycle';
import { sourceMediaCases, runSourceMediaCase } from '../tests/audit/source-media';
import { generateMediaFixture } from './audit-media-fixture';
import {
  stateful,
  serializeCommands,
  type CampaignCommand,
  soakInstances,
  soakMotion,
  performanceCase,
} from './audit-campaigns';
import {
  chromium,
  firefox,
  webkit,
  devices,
  type BrowserType,
  type BrowserContext,
  type Page,
  type ConsoleMessage,
} from '@playwright/test';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { geometryCases, runGeometryCase } from '../tests/audit/geometry';
import { inputCases, runInputCase } from '../tests/audit/input';
import { mediaCases, runMediaCase } from '../tests/audit/media';
import { mount, check, settle, type AuditWindow } from '../tests/audit/browser-fixture';
import {
  generateMatrix,
  verifyMatrix,
  optionsFor,
  domains,
  boundaryCases,
  generateModuleMatrix,
  verifyModuleMatrix,
  optionsForModule,
} from '../tests/audit/matrix';
import type { AuditCase, AuditResult, CaseRunner } from '../tests/audit/types';
import { assertAuditCatalogue } from '../tests/audit/catalogue';
import { validateExecutionPlan } from './audit-integrity';
import {
  assertAuditResumeCompatible,
  auditArtifactStem,
  auditObservationKey,
  normalizeAuditTrials,
} from '../tests/audit/types';
const root = process.cwd();
const output = resolve(root, '.tmp/audit');
mkdirSync(output, { recursive: true });
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=') || 'true'];
  })
);
if (args.manual) {
  if (args.manual === 'true') throw new Error('--manual requires a case ID');
  args.case = args.manual;
  args.profile = 'smoke';
  args.project ??= 'chromium';
  if (args.project === 'all') throw new Error('Manual reproduction requires one browser project');
  args.repeat = '1';
}
const profile = args.profile ?? (args.replay ? 'replay' : 'smoke');
if (args['risk-only'] && profile !== 'matrix')
  throw new Error('--risk-only requires --profile=matrix');
if (!['smoke', 'matrix', 'deep', 'soak', 'performance', 'replay'].includes(profile))
  throw new Error(`Unknown audit profile ${profile}`);
if (
  args.project &&
  !['all', 'chromium', 'firefox', 'webkit', 'chromium-mobile', 'webkit-mobile'].includes(
    args.project
  )
)
  throw new Error(`Unknown audit project ${args.project}`);
for (const field of ['repeat', 'timeout', 'dpr', 'workers'])
  if (args[field] && (!Number.isFinite(Number(args[field])) || Number(args[field]) <= 0))
    throw new Error(`Invalid positive number --${field}`);
if (args.repeat && !Number.isInteger(Number(args.repeat)))
  throw new Error('--repeat must be an integer');
if (
  args.family !== undefined &&
  (!Number.isInteger(Number(args.family)) || Number(args.family) < 0 || Number(args.family) > 5)
)
  throw new Error('Family must be 0..5');
if (
  profile === 'smoke' &&
  (!args.case || args.case.startsWith('NATIVE-')) &&
  (!args.prefix || args.prefix.startsWith('NATIVE'))
) {
  if (!existsSync(join(output, 'fixture-video.webm'))) await generateMediaFixture();
}
const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${profile}-${args.project ?? 'all'}-${randomUUID().slice(0, 8)}`;
const runDir = join(output, runId);
mkdirSync(runDir, { recursive: true });
const sha = (v: string | Buffer) => createHash('sha256').update(v).digest('hex');
const snapshotDir = join(runDir, 'snapshot');
if (!snapshotDir.startsWith(output + sep))
  throw new Error('Snapshot must stay inside audit output');
mkdirSync(snapshotDir, { recursive: true });
for (const f of [
  'src',
  'scripts',
  'tests/audit',
  'sandbox/index.html',
  'docs/audit/commits.json',
  'docs/audit/catalogue.json',
  'scripts/audit.ts',
  'scripts/audit-campaigns.ts',
  'tsconfig.audit.json',
  'vitest.audit.config.ts',
  'scripts/check-browser-size.ts',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.browser.config.ts',
])
  cpSync(resolve(root, f), join(snapshotDir, f), { recursive: true });
if (existsSync(join(output, 'fixture-video.webm'))) {
  mkdirSync(join(snapshotDir, 'fixtures'), { recursive: true });
  cpSync(join(output, 'fixture-video.webm'), join(snapshotDir, 'fixtures/fixture-video.webm'));
  if (existsSync(join(output, 'fixture-video.webm.json')))
    cpSync(
      join(output, 'fixture-video.webm.json'),
      join(snapshotDir, 'fixtures/fixture-video.webm.json')
    );
}
const built = spawnSync(
  process.execPath,
  [resolve('node_modules/vite/bin/vite.js'), 'build', '--config', 'vite.browser.config.ts'],
  { cwd: snapshotDir, encoding: 'utf8' }
);
writeFileSync(join(runDir, 'build.log'), built.stdout + built.stderr);
if (built.status !== 0) throw new Error('audit build failed; see build.log');
const bundle = readFileSync(join(snapshotDir, 'browser-build/tvist.min.js'));
const css = readFileSync(join(snapshotDir, 'browser-build/tvist.css'));
const buildHash = sha(bundle);
const commit = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
const sourceManifest = spawnSync('git', ['status', '--short'], { encoding: 'utf8' }).stdout;
const snapshotFiles = (directory: string, prefix = ''): { path: string; sha256: string }[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return snapshotFiles(join(directory, entry.name), relative);
    return [{ path: relative, sha256: sha(readFileSync(join(directory, entry.name))) }];
  });
const capturedFiles = snapshotFiles(snapshotDir);
const harnessHashFor = (files: { path: string; sha256: string }[]) =>
  sha(
    JSON.stringify(
      files
        .filter(
          (file) =>
            file.path.startsWith('tests/audit/') ||
            file.path.startsWith('scripts/audit') ||
            file.path.startsWith('fixtures/') ||
            [
              'tsconfig.audit.json',
              'vitest.audit.config.ts',
              'package.json',
              'package-lock.json',
              'docs/audit/commits.json',
            ].includes(file.path)
        )
        .sort((a, b) => a.path.localeCompare(b.path))
    )
  );
const browserVersions: Record<
  string,
  {
    version: string;
    userAgent: string;
    dpr: number;
    viewport: { width: number; height: number } | null;
  }
> = {};
const selectionHash = sha(
  JSON.stringify({
    profile,
    project: args.project ?? 'all',
    case: args.case ?? null,
    prefix: args.prefix ?? null,
    family: args.family ?? null,
    dpr: Number(args.dpr ?? 1),
    repeat: Number(args.repeat ?? 1),
    timeout: args.timeout ?? null,
    riskOnly: Boolean(args['risk-only']),
  })
);
const manifest = {
  runId,
  profile,
  commit,
  buildHash,
  cssHash: sha(css),
  sourceManifest,
  requested: args,
  snapshotFiles: capturedFiles,
  harnessHash: harnessHashFor(capturedFiles),
  selectionHash,
  browserIsolation: 'fresh-context-per-observation',
  node: process.version,
  platform: process.platform,
  browserVersions,
  started: new Date().toISOString(),
};
writeFileSync(join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
const server = createServer((req, res) => {
  const path = req.url?.split('?')[0];
  res.setHeader('Cache-Control', 'no-store');
  if (path === '/tvist.js') {
    res.setHeader('Content-Type', 'text/javascript');
    res.end(bundle);
  } else if (path === '/tvist.css') {
    res.setHeader('Content-Type', 'text/css');
    res.end(css);
  } else if (
    path === '/fixture.webm' &&
    existsSync(join(snapshotDir, 'fixtures/fixture-video.webm'))
  ) {
    const media = readFileSync(join(snapshotDir, 'fixtures/fixture-video.webm'));
    res.setHeader('Content-Type', 'video/webm');
    res.setHeader('Accept-Ranges', 'bytes');
    const range = req.headers.range?.match(/bytes=(\d+)-(\d*)/);
    if (range) {
      const start = Number(range[1]);
      const end = Math.min(Number(range[2] || media.length - 1), media.length - 1);
      if (start > end) {
        res.writeHead(416);
        res.end();
        return;
      }
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${media.length}`,
        'Content-Length': end - start + 1,
      });
      res.end(media.subarray(start, end + 1));
    } else {
      res.setHeader('Content-Length', media.length);
      res.end(media);
    }
  } else if (path === '/hash') {
    res.end(buildHash);
  } else if (path === '/sandbox/index.html') {
    res.setHeader('Content-Type', 'text/html');
    // Keep the project's single sandbox entry point; the selected scenario mounts its fixture.
    const html = readFileSync(join(snapshotDir, 'sandbox/index.html'), 'utf8')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<link\b[^>]*>/gi, '')
      .replace(
        '</head>',
        '<link rel="stylesheet" href="/tvist.css"><script src="/tvist.js"></script></head>'
      );
    res.end(html);
  } else {
    res.setHeader('Content-Type', 'text/html');
    res.end(
      '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/tvist.css"><script src="/tvist.js"></script></head><body></body></html>'
    );
  }
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('no audit server');
const url = `http://127.0.0.1:${address.port}`;
const entryUrl = args.manual
  ? `${url}/sandbox/index.html?case=${encodeURIComponent(args.manual)}`
  : url;
const results: AuditResult[] = [];
const meta = new Map<string, AuditCase>();
const runners = new Map<string, CaseRunner>();
for (const [cases, runner] of [
  [geometryCases, runGeometryCase],
  [inputCases, runInputCase],
  [mediaCases, runMediaCase],
  [commitCases, runCommitCase],
  [nativeMediaCases, runNativeMediaCase],
  [nativeInputCases, runNativeInputCase],
  [unitRegressionCases, runUnitRegressionCase],
  [eventRegressionCases, runEventRegressionCase],
  [riskGeometryCases, runRiskGeometryCase],
  [riskInputCases, runRiskInputCase],
  [riskMediaCases, runRiskMediaCase],
  [sourceGeometryCases, runSourceGeometryCase],
  [sourceLifecycleCases, runSourceLifecycleCase],
  [sourceMediaCases, runSourceMediaCase],
] as [AuditCase[], CaseRunner][]) {
  for (const c of cases) {
    if (meta.has(c.id)) throw new Error(`duplicate case ${c.id}`);
    meta.set(c.id, c);
    runners.set(c.id, runner);
  }
}
assertAuditCatalogue(JSON.parse(readFileSync(resolve('docs/audit/catalogue.json'), 'utf8')), {
  expectedCases: [...meta.values()],
  readSource: (file) => {
    const text = readFileSync(resolve(file), 'utf8');
    return { text, sha256: sha(text) };
  },
});
writeFileSync(join(runDir, 'cases.json'), JSON.stringify([...meta.values()], null, 2));
if (args.case && !meta.has(args.case)) throw new Error('Unknown case ' + args.case);
if (args.prefix && ![...meta.keys()].some((id) => id.startsWith(args.prefix)))
  throw new Error('Unknown case prefix ' + args.prefix);
let resumeManifest: typeof manifest | undefined;
if (args.resume) {
  const previous = JSON.parse(readFileSync(join(resolve(args.resume), 'manifest.json'), 'utf8'));
  if (previous.selectionHash !== selectionHash)
    throw new Error(
      'Resume selection/environment hash differs or is missing; use the same filters, DPR and repeat count'
    );
  resumeManifest = previous;
  assertAuditResumeCompatible(
    {
      ...previous,
      harnessHash:
        previous.harnessHash ??
        (Array.isArray(previous.snapshotFiles) && previous.snapshotFiles.length
          ? harnessHashFor(previous.snapshotFiles)
          : undefined),
    },
    manifest
  );
  results.push(
    ...normalizeAuditTrials(
      JSON.parse(readFileSync(join(resolve(args.resume), 'results.json'), 'utf8')) as AuditResult[]
    )
  );
}
const save = () => {
  writeFileSync(join(runDir, 'results.json'), JSON.stringify(results, null, 2));
  writeFileSync(join(output, 'latest.json'), JSON.stringify({ runDir, ...manifest }, null, 2));
};
const projects: Record<string, BrowserType> = { chromium, firefox, webkit };
const replayProject = args.replay
  ? JSON.parse(readFileSync(resolve(args.replay), 'utf8')).project
  : undefined;
let selected =
  args.project === 'all'
    ? ['chromium', 'firefox', 'webkit']
    : args.project
      ? [args.project]
      : replayProject
        ? [replayProject]
        : ['chromium', 'firefox', 'webkit'];
if (profile === 'matrix')
  selected = selected.concat(
    args.project && args.project !== 'all' ? [] : ['chromium-mobile', 'webkit-mobile']
  );
// Declare the selected workload before executing it. Completion markers alone do not prove coverage.
const planned: { id: string; project: string; trial: number }[] = [];
const declare = (project: string, id: string, trials = 1) => {
  for (let trial = 1; trial <= trials; trial++) planned.push({ id, project, trial });
};
for (const project of selected) {
  if (profile === 'smoke' || args.case) {
    for (const c of meta.values())
      if (
        (!c.id.startsWith('RISK-') || args.case || args.prefix) &&
        (!args.case || c.id === args.case) &&
        (!args.prefix || c.id.startsWith(args.prefix))
      )
        declare(project, c.id, Number(args.repeat ?? 1));
    if (!args.case && !args.prefix && project === 'chromium')
      for (let family = 0; family < 6; family++)
        for (let sample = 0; sample < 10; sample++) declare(project, `SMOKE-${family}-${sample}`);
  } else if (profile === 'matrix') {
    if (!args['risk-only']) {
      generateModuleMatrix().rows.forEach((_, i) => {
        if (!project.endsWith('mobile') || i % 3 === 0) declare(project, `MODULE-${i}`);
      });
      if (!project.endsWith('mobile')) boundaryCases().forEach((c) => declare(project, c.id));
      generateMatrix().rows.forEach((_, i) => {
        if (!project.endsWith('mobile') || i % 10 === 0) declare(project, `MATRIX-${i}`);
      });
    }
    for (const c of additionalRiskCases)
      if (!project.endsWith('mobile') || mobileRiskCase(c.id)) declare(project, c.id);
    if (project.endsWith('mobile')) for (const c of nativeInputCases) declare(project, c.id);
  } else if (profile === 'deep') {
    for (let family = 0; family < 6; family++)
      if (args.family === undefined || Number(args.family) === family)
        for (let seed = 0; seed < 50; seed++) declare(project, `DEEP-${family}-${seed}`);
  } else if (profile === 'soak') {
    [1, 10, 50].forEach((count) => declare(project, `SOAK-${count}`));
    ['autoplay', 'marquee', 'resize', 'drag'].forEach((mode) =>
      declare(project, `SOAK-TIME-${mode}`)
    );
  } else if (profile === 'performance') {
    for (const [count, instances] of [
      [10, 1],
      [100, 1],
      [1000, 1],
      [100, 10],
      [100, 50],
    ])
      for (let repeat = 0; repeat < 5; repeat++)
        declare(project, `PERF-${count}-I${instances}-${repeat}`);
  } else if (profile === 'replay') {
    declare(
      project,
      `REPLAY-${JSON.parse(readFileSync(resolve(args.replay), 'utf8')).family}`,
      Number(args.repeat ?? 1)
    );
  }
}
const executionPlan = { schemaVersion: 1 as const, profile, requested: args, expected: planned };
writeFileSync(join(runDir, 'execution-plan.json'), JSON.stringify(executionPlan, null, 2));
save();
async function bounded<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
async function execute(
  page: Page,
  id: string,
  run: () => Promise<number | void>,
  project: string,
  trial = 1
) {
  const key = auditObservationKey({ id, project, trial });
  if (args.resume && results.some((r) => auditObservationKey(r) === key)) return;
  const artifact = join(runDir, auditArtifactStem(id, project, trial));
  const start = Date.now();
  const errors: string[] = [];
  const onError = (e: Error) => errors.push(e.message);
  const onConsole = (message: ConsoleMessage) => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
  };
  page.on('pageerror', onError);
  page.on('console', onConsole);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const commands = await Promise.race([
      run(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('AUDIT_TIMEOUT')),
          Number(args.timeout ?? (profile === 'soak' ? 630000 : 60000))
        );
      }),
    ]);
    if (errors.length) throw new Error(`pageerror:${errors.join(';')}`);
    results.push({
      id,
      project,
      trial,
      status: 'pass',
      duration: Date.now() - start,
      commands: typeof commands === 'number' ? commands : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fingerprint = sha(
      `${id}|${project}|${message
        .replace(/\d+(\.\d+)?/g, '#')
        .split('\n')
        .slice(0, 4)
        .join('\n')}`
    ).slice(0, 20);
    results.push({
      id,
      project,
      trial,
      status:
        message === 'AUDIT_TIMEOUT' ||
        message.includes('AUDIT_FIXTURE_ERROR:') ||
        message.includes('NATIVE_MEDIA_ENVIRONMENT:') ||
        message.includes('FIXTURE_TRANSPORT:')
          ? 'test-harness-issue'
          : message.includes('CONTRACT_GAP:')
            ? 'contract-gap'
            : message.includes('UNSUPPORTED_CODEC:') || message.includes('UNSUPPORTED_INPUT:')
              ? 'unsupported'
              : 'reproduced',
      duration: Date.now() - start,
      error: message,
      fingerprint,
      artifact,
    });
    save();
    await bounded(
      page.screenshot({ path: `${artifact}.png` }).catch(() => undefined),
      5000,
      undefined
    );
    writeFileSync(
      `${artifact}.json`,
      JSON.stringify(
        {
          id,
          project,
          trial,
          error: message,
          html: await bounded(
            page.content().catch(() => ''),
            3000,
            ''
          ),
          snapshot: await bounded(
            page
              .evaluate(() => ({ url: location.href, body: document.body.innerHTML }))
              .catch(() => null),
            3000,
            null
          ),
        },
        null,
        2
      )
    );
  } finally {
    if (timer) clearTimeout(timer);
    page.off('pageerror', onError);
    page.off('console', onConsole);
    const metrics = await bounded(
      page
        .evaluate(() => ({
          metrics: (window as unknown as Record<string, unknown>).auditCampaignMetrics,
          history: (window as unknown as Record<string, unknown>).auditCommandHistory,
          sourceCloneEvidence: (window as unknown as Record<string, unknown>).sourceCloneEvidence,
        }))
        .catch(() => null),
      3000,
      null
    );
    const observation = results.find((r) => auditObservationKey(r) === key);
    if (metrics) {
      const metricsArtifact = `${artifact}.metrics.json`;
      writeFileSync(metricsArtifact, JSON.stringify({ trial, ...metrics }));
      if (observation) observation.metricsArtifact = metricsArtifact;
    }
    save();
  }
}

const ownedServers: Awaited<ReturnType<BrowserType['launchServer']>>[] = [];
try {
  for (const project of selected) {
    const engine = project.replace('-mobile', '');
    const browserServer = await projects[engine].launchServer({ headless: !args.manual });
    ownedServers.push(browserServer);
    const browser = await projects[engine].connect(browserServer.wsEndpoint());
    const contextOptions = project.endsWith('mobile')
      ? {
          ...devices[engine === 'webkit' ? 'iPhone 13' : 'Pixel 7'],
          ...(args.dpr ? { deviceScaleFactor: Number(args.dpr) } : {}),
        }
      : { deviceScaleFactor: Number(args.dpr ?? 1) };
    async function openPage(context: BrowserContext, target: string): Promise<Page> {
      await context.addInitScript('globalThis.__name = (fn) => fn;');
      const page = await context.newPage();
      await page.goto(target, { timeout: 30000 });
      const realClock = await page.evaluate(
        () => (Date as DateConstructor & { isFake?: boolean }).isFake === undefined
      );
      if (!realClock)
        throw new Error('AUDIT_FIXTURE_ERROR: fresh context inherited a Playwright clock');
      return page;
    }
    async function closeContext(context: BrowserContext): Promise<void> {
      if (args.manual && !browser.isConnected()) return;
      const closed = await bounded(
        context.close().then(
          () => true,
          () => false
        ),
        10000,
        false
      );
      if (!closed)
        throw new Error(
          `AUDIT_FIXTURE_ERROR: ${project} context cleanup exceeded its deadline or failed`
        );
    }
    const metadataContext = await browser.newContext(contextOptions);
    try {
      const page = await openPage(metadataContext, entryUrl);
      browserVersions[project] = {
        version: browser.version(),
        ...(await page.evaluate(() => ({ userAgent: navigator.userAgent, dpr: devicePixelRatio }))),
        viewport: page.viewportSize(),
      };
      if (
        resumeManifest &&
        JSON.stringify(resumeManifest.browserVersions?.[project]) !==
          JSON.stringify(browserVersions[project])
      )
        throw new Error(`Resume actual browser version, viewport or DPR differs for ${project}`);
      writeFileSync(join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
      if ((await page.evaluate(() => fetch('/hash').then((r) => r.text()))) !== buildHash)
        throw new Error('stale server');
    } finally {
      await closeContext(metadataContext);
    }

    async function runTrial(
      id: string,
      operation: (page: Page) => Promise<number | void>,
      trial = 1,
      target = url
    ): Promise<void> {
      const key = auditObservationKey({ id, project, trial });
      if (args.resume && results.some((row) => auditObservationKey(row) === key)) return;
      const artifact = join(runDir, auditArtifactStem(id, project, trial));
      const context = await browser.newContext(contextOptions);
      let tracing = false;
      try {
        if (profile === 'smoke') {
          await context.tracing.start({ screenshots: true, snapshots: true });
          tracing = true;
        }
        const page = await openPage(context, target);
        await execute(page, id, () => operation(page), project, trial);
      } catch (error) {
        if (results.some((row) => auditObservationKey(row) === key)) throw error;
        const message = `AUDIT_FIXTURE_ERROR: context setup for ${key}: ${String(error)}`;
        results.push({
          id,
          project,
          trial,
          status: 'test-harness-issue',
          duration: 0,
          artifact,
          error: message,
        });
        writeFileSync(
          `${artifact}.json`,
          JSON.stringify({ id, project, trial, error: message }, null, 2)
        );
      } finally {
        try {
          if (tracing) {
            const path = `${artifact}.trace.zip`;
            const captured = await bounded(
              context.tracing.stop({ path }).then(
                () => true,
                () => false
              ),
              10000,
              false
            );
            const observation = results.find((row) => auditObservationKey(row) === key);
            if (captured && existsSync(path) && observation) observation.traceArtifact = path;
            else
              writeFileSync(
                `${artifact}.trace-error.json`,
                JSON.stringify({
                  id,
                  project,
                  trial,
                  error: 'trace capture failed or exceeded deadline',
                })
              );
          }
          save();
          const manualPage = args.manual ? context.pages()[0] : undefined;
          if (manualPage && !manualPage.isClosed() && browser.isConnected()) {
            console.log(
              `Manual case ${args.manual}: ${entryUrl}\nFixture is retained for inspection. Close the browser or press Ctrl+C to finish.`
            );
            await new Promise<void>((resolve) => {
              const finish = () => {
                process.off('SIGINT', finish);
                browser.off('disconnected', finish);
                manualPage.off('close', finish);
                resolve();
              };
              process.once('SIGINT', finish);
              browser.once('disconnected', finish);
              manualPage.once('close', finish);
            });
          }
        } finally {
          await closeContext(context);
        }
      }
    }
    if (profile === 'smoke' || args.case) {
      for (const c of meta.values()) {
        if (c.id.startsWith('RISK-') && !args.case && !args.prefix) continue;
        if (args.case && c.id !== args.case) continue;
        if (args.prefix && !c.id.startsWith(args.prefix)) continue;
        for (let trial = 0; trial < Number(args.repeat ?? 1); trial++) {
          await runTrial(c.id, (page) => runners.get(c.id)!(page, c.id), trial + 1, entryUrl);
        }
      }
      if (!args.case && !args.prefix && project === 'chromium') {
        for (let family = 0; family < 6; family++)
          for (let sample = 0; sample < 10; sample++) {
            const seed = 20261101 + family * 1000 + sample;
            const id = `SMOKE-${family}-${sample}`;
            writeFileSync(
              join(runDir, `${id}-${project}.replay.json`),
              JSON.stringify(
                {
                  family,
                  seed,
                  steps: 20,
                  commands: serializeCommands(family, seed, 20),
                  project,
                  buildHash,
                },
                null,
                2
              )
            );
            await runTrial(id, (page) => stateful(page, family, seed, 20));
          }
      }
    } else if (profile === 'matrix') {
      assertRiskDeclaration();
      writeFileSync(
        join(runDir, 'risk-declaration.json'),
        JSON.stringify(
          {
            families: riskManifests,
            mobileSubset: additionalRiskCases.filter((c) => mobileRiskCase(c.id)).map((c) => c.id),
            selection: args['risk-only'] ? 'additional-risk-only' : 'full-matrix',
          },
          null,
          2
        )
      );
      const matrix = generateMatrix();
      const missing = verifyMatrix(matrix.rows, matrix.required);
      writeFileSync(
        join(runDir, 'matrix.json'),
        JSON.stringify({ ...matrix, missing, domains }, null, 2)
      );
      if (missing.length) throw new Error('matrix denominator uncovered');
      const modules = generateModuleMatrix();
      const moduleMissing = verifyModuleMatrix(modules.rows, modules.required);
      writeFileSync(
        join(runDir, 'module-matrix.json'),
        JSON.stringify({ ...modules, missing: moduleMissing }, null, 2)
      );
      if (moduleMissing.length) throw new Error('module denominator uncovered');
      if (!args['risk-only']) {
        for (const [i, row] of modules.rows.entries()) {
          if (project.endsWith('mobile') && i % 3 !== 0) continue;
          await runTrial(`MODULE-${i}`, async (page) => {
            await mount(page, optionsForModule(row), { count: 12 });
            await check(page);
            await checkMatrixGeometry(page);
            await page.evaluate(() => {
              const s = (window as unknown as AuditWindow).auditSlider;
              s.next();
              s.disable();
              s.enable();
              s.update();
            });
            await settle(page);
            await check(page);
            await checkMatrixGeometry(page);
            return 4;
          });
        }
        for (const b of boundaryCases()) {
          if (project.endsWith('mobile')) continue;
          await runTrial(b.id, async (page) => {
            await mount(page, b.options, { count: b.count });
            await check(page);
            await checkMatrixGeometry(page);
            return 1;
          });
        }
        for (const [i, row] of matrix.rows.entries()) {
          if (project.endsWith('mobile') && i % 10 !== 0) continue;
          await runTrial(`MATRIX-${i}`, async (page) => {
            await mount(page, optionsFor(row), {
              count: domains.count[row.count],
              widths: row.sizing === 1 ? [80, 320, 110, 640, 75] : undefined,
            });
            await check(page);
            await checkMatrixGeometry(page);
            for (let j = 0; j < 4; j++) {
              await page.evaluate(() => {
                (window as unknown as AuditWindow).auditSlider.next();
              });
              await settle(page);
              await check(page);
              await checkMatrixGeometry(page);
            }
            return 4;
          });
        }
      }
      for (const c of additionalRiskCases) {
        if (project.endsWith('mobile') && !mobileRiskCase(c.id)) continue;
        await runTrial(c.id, (page) => runners.get(c.id)!(page, c.id));
      }
      if (project.endsWith('mobile'))
        for (const c of nativeInputCases) {
          await runTrial(c.id, (page) => runners.get(c.id)!(page, c.id));
        }
      writeFileSync(
        join(runDir, 'risk-coverage.json'),
        JSON.stringify(riskExecutionCoverage(riskManifests, results, selected), null, 2)
      );
    } else if (profile === 'deep') {
      for (let family = 0; family < 6; family++) {
        if (args.family !== undefined && Number(args.family) !== family) continue;
        let cursor = 0;
        await Promise.all(
          Array.from({ length: Math.max(1, Math.min(8, Number(args.workers ?? 1))) }, async () => {
            while (cursor < 50) {
              const n = cursor++;
              const id = `DEEP-${family}-${n}`;
              if (
                args.resume &&
                results.some(
                  (r) => auditObservationKey(r) === auditObservationKey({ id, project, trial: 1 })
                )
              )
                continue;
              const seed = 20261031 + family * 1000 + n;
              writeFileSync(
                join(runDir, `${id}-${project}.replay.json`),
                JSON.stringify({
                  family,
                  seed,
                  steps: 50,
                  project,
                  buildHash,
                  commands: serializeCommands(family, seed, 50),
                })
              );
              await runTrial(id, (page) => stateful(page, family, seed, 50));
            }
          })
        );
      }
    } else if (profile === 'soak') {
      for (const count of [1, 10, 50]) {
        await runTrial(`SOAK-${count}`, (page) => soakInstances(page, count));
      }
      await Promise.all(
        ['autoplay', 'marquee', 'resize', 'drag'].map((mode) =>
          runTrial(`SOAK-TIME-${mode}`, (page) => soakMotion(page, mode, 600000))
        )
      );
    } else if (profile === 'performance') {
      for (const fixture of [
        { count: 10, instances: 1 },
        { count: 100, instances: 1 },
        { count: 1000, instances: 1 },
        { count: 100, instances: 10 },
        { count: 100, instances: 50 },
      ])
        for (let repeat = 0; repeat < 5; repeat++) {
          const id = `PERF-${fixture.count}-I${fixture.instances}-${repeat}`;
          await runTrial(id, async (page) => {
            const metrics = await performanceCase(page, fixture.count, fixture.instances);
            writeFileSync(join(runDir, `${id}-${project}.json`), JSON.stringify(metrics));
            return 5;
          });
        }
    } else if (profile === 'replay') {
      const replay = JSON.parse(readFileSync(resolve(args.replay), 'utf8')) as {
        family: number;
        seed: number;
        steps: number;
        commands?: CampaignCommand[];
      };
      for (let trial = 0; trial < Number(args.repeat ?? 1); trial++) {
        await runTrial(
          `REPLAY-${replay.family}`,
          (page) =>
            stateful(
              page,
              replay.family,
              replay.seed,
              replay.steps ?? replay.commands?.length ?? 0,
              replay.commands
            ),
          trial + 1
        );
      }
    } else throw new Error(`Unknown profile ${profile}`);
    const closed = await bounded(
      browser.close().then(() => true),
      10000,
      false
    );
    if (!closed)
      results.push({
        id: 'BROWSER-CLEANUP',
        project,
        status: 'test-harness-issue',
        duration: 10000,
        error: 'Owned browser cleanup exceeded deadline',
      });
    await bounded(
      browserServer.close().catch(() => {}),
      3000,
      undefined
    );
    if (browserServer.process().exitCode === null) browserServer.process().kill('SIGKILL');
  }
} finally {
  save();
  for (const owner of ownedServers) {
    if (owner.process().exitCode === null) owner.process().kill('SIGKILL');
  }
  server.close();
}
validateExecutionPlan(executionPlan, results);
writeFileSync(
  join(runDir, 'complete.json'),
  JSON.stringify({ completedAt: new Date().toISOString(), executed: results.length })
);
console.log(
  JSON.stringify({
    runDir,
    profile,
    passed: results.filter((r) => r.status === 'pass').length,
    failures: results.filter((r) => r.status !== 'pass').length,
  })
);
process.exitCode = results.some((r) => r.status !== 'pass') ? 1 : 0;
