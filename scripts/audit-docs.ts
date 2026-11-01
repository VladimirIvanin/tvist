import { chromium, firefox, webkit, type Page } from '@playwright/test';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { extname, join, relative, resolve, sep } from 'node:path';
import type { Tvist } from '../src/core/Tvist';

type Root = HTMLElement & { tvistInstance?: Tvist | null };
interface InstanceResult {
  instance: number;
  status: 'pass' | 'failure' | 'limitation';
  reason?: string;
  before?: number;
  after?: number;
  action?: string;
}
interface DemoResult {
  id: string;
  engine: string;
  status: 'pass' | 'failure' | 'limitation';
  instances: InstanceResult[];
  errors: string[];
  externalNetwork: string[];
  localNetwork?: string[];
  consoleErrors?: string[];
  fixture?: string;
  artifact?: string;
}

const workspace = process.cwd();
const requestedEngine = process.argv
  .find((value) => value.startsWith('--engine='))
  ?.slice('--engine='.length);
if (requestedEngine && !['chromium', 'firefox', 'webkit'].includes(requestedEngine))
  throw new Error(`Unknown engine ${requestedEngine}`);
const baselineFile = process.argv
  .find((value) => value.startsWith('--baseline='))
  ?.slice('--baseline='.length);
if (baselineFile && !requestedEngine) throw new Error('--baseline requires --engine');
const baseline = baselineFile
  ? (JSON.parse(readFileSync(resolve(baselineFile), 'utf8')) as {
      runId: string;
      fixture: string;
      generatedHtmlHash: string;
      results: DemoResult[];
      infrastructure: { engine: string; stage: string; error: string }[];
    })
  : undefined;
const fixture =
  'External images use a local SVG placeholder; external CSS uses an empty stylesheet; external fonts/media/other requests are blocked. Local docs scripts and CSS are unchanged.';
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const output = resolve('.tmp/audit/docs', runId);
const snapshot = join(output, 'snapshot');
mkdirSync(snapshot, { recursive: true });
for (const name of [
  'src',
  'scripts',
  'docs',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.docs.json',
  'vite.docs.config.ts',
]) {
  cpSync(resolve(name), join(snapshot, name), {
    recursive: true,
    filter: (file) => {
      const path = relative(workspace, file).split(sep).join('/');
      return !['docs/.generated', 'docs/dist', 'docs/audit', 'docs/.vitepress'].some(
        (excluded) => path === excluded || path.startsWith(excluded + '/')
      );
    },
  });
}

const buildLog: string[] = [];
for (const [script, ...args] of [
  [resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/generate-options-meta.ts'],
  [resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/build-docs.ts'],
  [resolve('node_modules/typescript/bin/tsc'), '--project', 'tsconfig.docs.json'],
  [resolve('node_modules/vite/bin/vite.js'), 'build', '--config', 'vite.docs.config.ts'],
]) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: snapshot,
    encoding: 'utf8',
  });
  buildLog.push(`COMMAND ${script} ${args.join(' ')}\n${result.stdout}${result.stderr}`);
  writeFileSync(join(output, 'build.log'), buildLog.join('\n'));
  if (result.status !== 0)
    throw new Error(`Isolated docs build failed: ${script}; see ${join(output, 'build.log')}`);
}

const dist = join(snapshot, 'docs/dist');
const demos = JSON.parse(readFileSync(join(snapshot, 'docs/site/demos.json'), 'utf8')) as {
  id: string;
  title: string;
}[];
const manifest = {
  runId,
  source: 'isolated docs source build',
  commit: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(),
  demos: demos.map((demo) => demo.id),
  node: process.version,
  platform: process.platform,
  fixture,
  baseline: baseline
    ? { runId: baseline.runId, report: resolve(baselineFile!), replacedEngine: requestedEngine }
    : undefined,
  generatedHtmlHash: createHash('sha256')
    .update(readFileSync(join(dist, 'preview.html')))
    .digest('hex'),
};
writeFileSync(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
if (baseline && baseline.generatedHtmlHash !== manifest.generatedHtmlHash)
  throw new Error('Cannot combine docs evidence from different generated builds');
const mime: Record<string, string> = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
};
const server = createServer((request, response) => {
  const pathname = decodeURIComponent((request.url ?? '/').split('?')[0]);
  if (!pathname.startsWith('/tvist/')) {
    response.writeHead(404);
    response.end();
    return;
  }
  const target = resolve(dist, pathname.slice('/tvist/'.length) || 'index.html');
  if (!target.startsWith(dist + sep) || !existsSync(target) || !statSync(target).isFile()) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.setHeader('Content-Type', mime[extname(target)] ?? 'application/octet-stream');
  response.setHeader('Cache-Control', 'no-store');
  response.end(readFileSync(target));
});
await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Missing docs audit server');
const baseURL = `http://127.0.0.1:${address.port}/tvist/`;
const results: DemoResult[] =
  baseline?.results
    .filter((result) => result.engine !== requestedEngine)
    .map((result) => ({ ...result, fixture: result.fixture ?? baseline.fixture })) ?? [];
const reused = results.length;
const planned = baseline || !requestedEngine ? demos.length * 3 : demos.length;
const infrastructure: { engine: string; stage: string; error: string }[] =
  baseline?.infrastructure.filter((result) => result.engine !== requestedEngine) ?? [];
const bounded = async <T>(promise: Promise<T>, label: string, milliseconds = 30000): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${milliseconds} ms`)),
          milliseconds
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};
const save = () => {
  const report = {
    ...manifest,
    artifactDirectory: output,
    complete: results.length === planned,
    executed: results.length,
    executedThisRun: results.length - reused,
    reused,
    planned,
    infrastructure,
    results,
  };
  writeFileSync(join(output, 'results.json'), JSON.stringify(report, null, 2));
  mkdirSync(resolve('docs/audit'), { recursive: true });
  writeFileSync(resolve('docs/audit/docs-results.json'), JSON.stringify(report, null, 2));
};

async function inspectInstance(page: Page, instance: number): Promise<InstanceResult> {
  const root = page.locator(`[data-audit-demo-instance="${instance}"]`);
  if (!(await root.isVisible()))
    return {
      instance,
      status: 'limitation',
      reason: 'Instance is hidden in this demo state; no movement claim.',
    };
  await root.scrollIntoViewIfNeeded();
  await root.evaluate((element) => {
    const slider = (element as Root).tvistInstance!;
    slider.autoplay?.stop();
    slider.marquee?.stop();
    slider.visibility?.check();
  });
  await page.waitForFunction(
    (id) => {
      const s = (document.querySelector(`[data-audit-demo-instance="${id}"]`) as Root)
        ?.tvistInstance;
      return (
        !s ||
        (!s.container.style.transition &&
          s.container.getAnimations().every((a) => a.playState !== 'running'))
      );
    },
    instance,
    { timeout: 12000 }
  );
  const initial = await root.evaluate((element) => {
    const s = (element as Root).tvistInstance!;
    const bounds = s.slides.map((slide) => slide.getBoundingClientRect());
    return {
      enabled: s.isEnabled,
      count: s.originalSlideCount,
      index: s.realIndex,
      next: s.canScrollNext,
      prev: s.canScrollPrev,
      finite: bounds.every((rect) =>
        [rect.left, rect.top, rect.width, rect.height].every(Number.isFinite)
      ),
      activeMatches: s.slides.some((slide) => {
        const index = slide.getAttribute('data-tvist-slide-index');
        const identity =
          index === null
            ? slide === s.slides[s.activeIndex] && s.activeIndex === s.realIndex
            : Number(index) === s.realIndex;
        return slide.classList.contains('tvist-v1__slide--active') && identity;
      }),
    };
  });
  if (!initial.finite) throw new Error('Non-finite initial DOM geometry');
  if (!initial.enabled)
    return {
      instance,
      status: 'limitation',
      reason: 'Demo deliberately disabled at this viewport.',
      before: initial.index,
    };
  if (!initial.count)
    return { instance, status: 'limitation', reason: 'Empty instance; navigation unavailable.' };
  if (!initial.activeMatches) throw new Error('Initial active DOM and logical index disagree');
  if (!initial.next && !initial.prev)
    return {
      instance,
      status: 'limitation',
      reason:
        'Locked content fits viewport; geometry and active identity checked, movement not exercised.',
      before: initial.index,
    };
  const action = initial.next ? 'next' : 'prev';
  await root.evaluate((element, direction) => {
    const slider = (element as Root).tvistInstance!;
    if (direction === 'next') slider.next();
    else slider.prev();
  }, action);
  await page.waitForFunction(
    (id) => {
      const s = (document.querySelector(`[data-audit-demo-instance="${id}"]`) as Root)
        ?.tvistInstance;
      return (
        !s ||
        (!s.container.style.transition &&
          s.container.getAnimations().every((a) => a.playState !== 'running'))
      );
    },
    instance,
    { timeout: 12000 }
  );
  await page.evaluate(
    () =>
      new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())))
  );
  const result = await root.evaluate((element) => {
    const s = (element as Root).tvistInstance!;
    const viewport = s.track.getBoundingClientRect();
    const active = s.slides.filter((slide) => {
      const index = slide.getAttribute('data-tvist-slide-index');
      const identity =
        index === null
          ? slide === s.slides[s.activeIndex] && s.activeIndex === s.realIndex
          : Number(index) === s.realIndex;
      return slide.classList.contains('tvist-v1__slide--active') && identity;
    });
    return {
      index: s.realIndex,
      count: s.originalSlideCount,
      active: active.length,
      finite: s.slides.every((slide) => {
        const r = slide.getBoundingClientRect();
        return [r.left, r.top, r.width, r.height].every(Number.isFinite);
      }),
      intersects: active.some((slide) => {
        const r = slide.getBoundingClientRect();
        return (
          r.right > viewport.left + 0.5 &&
          r.left < viewport.right - 0.5 &&
          r.bottom > viewport.top + 0.5 &&
          r.top < viewport.bottom - 0.5
        );
      }),
    };
  });
  if (result.index === initial.index)
    throw new Error(`Available ${action} did not change logical index ${initial.index}`);
  if (
    result.index < 0 ||
    result.index >= result.count ||
    !result.finite ||
    !result.active ||
    !result.intersects
  )
    throw new Error(`Navigation DOM invariant failed: ${JSON.stringify(result)}`);
  return { instance, status: 'pass', before: initial.index, after: result.index, action };
}

try {
  for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
    if (requestedEngine && engine !== requestedEngine) continue;
    console.log(`Launching ${engine}`);
    const browserServer = await bounded(browserType.launchServer(), `${engine} launch`);
    const browser = await bounded(
      browserType.connect(browserServer.wsEndpoint()),
      `${engine} connect`
    );
    try {
      for (const demo of demos) {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        await context.route('**/*', (route) => {
          if (route.request().url().startsWith(baseURL) || !/^https?:/.test(route.request().url()))
            return route.continue();
          if (route.request().resourceType() === 'image')
            return route.fulfill({
              contentType: 'image/svg+xml',
              body: '<svg xmlns="http://www.w3.org/2000/svg" width="440" height="550"><rect width="440" height="550" fill="#ddd"/></svg>',
            });
          if (route.request().resourceType() === 'stylesheet')
            return route.fulfill({ contentType: 'text/css', body: '' });
          return route.abort('blockedbyclient');
        });
        await context.addInitScript('globalThis.__name = (fn) => fn;');
        const page = await context.newPage();
        const entry: DemoResult = {
          id: demo.id,
          engine,
          status: 'pass',
          instances: [],
          errors: [],
          externalNetwork: [],
          localNetwork: [],
          consoleErrors: [],
          fixture,
        };
        page.on('pageerror', (error) => entry.errors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') entry.consoleErrors!.push(message.text());
        });
        page.on('requestfailed', (request) =>
          (request.url().startsWith(baseURL) ? entry.localNetwork! : entry.externalNetwork).push(
            `${request.url()}: ${request.failure()?.errorText}`
          )
        );
        try {
          const response = await page.goto(
            `${baseURL}preview.html?id=${encodeURIComponent(demo.id)}`,
            { waitUntil: 'domcontentloaded', timeout: 20000 }
          );
          if (response?.status() !== 200) throw new Error(`Preview HTTP ${response?.status()}`);
          await page.waitForFunction(
            () =>
              [...document.querySelectorAll<Root>('.tvist-v1')].some((root) =>
                Boolean(root.tvistInstance)
              ),
            undefined,
            { timeout: 10000 }
          );
          if (await page.locator('.preview-error').count())
            throw new Error('Demo script reports initialization failure');
          const instances = await page.evaluate(() => {
            const roots = [...document.querySelectorAll<Root>('.tvist-v1')].filter((root) =>
              Boolean(root.tvistInstance)
            );
            roots.forEach((root, index) => {
              root.dataset.auditDemoInstance = String(index);
              root.tvistInstance!.autoplay?.stop();
              root.tvistInstance!.marquee?.stop();
            });
            return roots.length;
          });
          for (let index = 0; index < instances; index++) {
            try {
              entry.instances.push(await inspectInstance(page, index));
            } catch (error) {
              entry.instances.push({ instance: index, status: 'failure', reason: String(error) });
            }
          }
          if (
            entry.errors.length ||
            entry.instances.some((instance) => instance.status === 'failure')
          )
            entry.status = 'failure';
          else if (
            !entry.instances.length ||
            entry.instances.every((instance) => instance.status === 'limitation')
          )
            entry.status = 'limitation';
        } catch (error) {
          entry.status = 'failure';
          entry.errors.push(String(error));
        }
        if (entry.status !== 'pass') {
          entry.artifact = join(output, `${engine}-${demo.id}`);
          await page.screenshot({ path: `${entry.artifact}.png`, fullPage: true }).catch(() => {});
          writeFileSync(`${entry.artifact}.html`, await page.content().catch(() => 'unavailable'));
        }
        results.push(entry);
        save();
        console.log(`${engine} ${demo.id}: ${entry.status} (${entry.instances.length} instances)`);
        await bounded(context.close(), `${engine}/${demo.id} context close`);
      }
    } finally {
      try {
        await bounded(browser.close(), `${engine} client close`, 10000);
      } catch (error) {
        infrastructure.push({ engine, stage: 'client-close', error: String(error) });
      }
      try {
        await bounded(browserServer.close(), `${engine} server close`, 10000);
      } catch (error) {
        infrastructure.push({ engine, stage: 'server-close', error: String(error) });
        try {
          await bounded(browserServer.kill(), `${engine} server kill`, 10000);
        } catch (killError) {
          infrastructure.push({ engine, stage: 'server-kill', error: String(killError) });
          // This PID belongs to this run's BrowserServer, never to an existing user browser.
          const pid = browserServer.process().pid;
          if (pid) {
            try {
              process.kill(pid);
            } catch (signalError) {
              if ((signalError as NodeJS.ErrnoException).code !== 'ESRCH')
                infrastructure.push({
                  engine,
                  stage: 'owned-process-kill',
                  error: String(signalError),
                });
            }
          }
        }
      }
    }
  }
} finally {
  server.close();
  save();
}
console.log(
  JSON.stringify({
    output,
    executed: results.length,
    pass: results.filter((r) => r.status === 'pass').length,
    failures: results.filter((r) => r.status === 'failure').length,
    limitations: results.filter((r) => r.status === 'limitation').length,
    infrastructure,
  })
);
process.exitCode =
  results.some((result) => result.status === 'failure') || infrastructure.length ? 1 : 0;
if (infrastructure.length) process.exit(process.exitCode);
