import {
  chromium,
  firefox,
  webkit,
  devices,
  type Browser,
  type BrowserType,
} from '@playwright/test';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { serializeCommands, stateful, type CampaignCommand } from './audit-campaigns';
import type { AuditResult } from '../tests/audit/types';

interface Replay {
  family: number;
  seed: number;
  steps: number;
  project?: string;
  commands?: CampaignCommand[];
}
interface Trial {
  matched: boolean;
  oracle: string | null;
  error?: string;
  duration: number;
  pageErrors: string[];
}
interface MinimizedRecord {
  id: string;
  project: string;
  run: string;
  family: number;
  seed: number;
  oracle: string;
  status: 'baseline-not-reproduced' | 'verified' | 'unstable' | 'budget-exhausted';
  originalCommands: CampaignCommand[];
  commands: CampaignCommand[];
  commandSource: string;
  originalCommandsRecovered: boolean;
  warnings: string[];
  trials: number;
  duration: number;
  verification: Trial[];
  baseline: Trial;
  oneMinimal: boolean;
  buildHash: string;
  originalCampaignSourceHash: string | null;
  executedCampaignSourceHash: string;
  artifacts: string;
}
const args = Object.fromEntries(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.replace(/^--/, '').split('=');
    return [key, value.join('=')];
  })
);
if (!args.run)
  throw new Error(
    'Usage: node --import tsx scripts/audit-shrink.ts --run=<deep-run> [--budgetMs=600000]'
  );
const run = resolve(args.run);
const budgetMs = Number(args.budgetMs ?? 600000);
if (!Number.isFinite(budgetMs) || budgetMs < 1000 || budgetMs > 600000)
  throw new Error('Shrink budget must be between 1000 and 600000 milliseconds per family/project');
const destination = join(run, 'minimized');
mkdirSync(destination, { recursive: true });
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const hash = (content: string | Buffer): string =>
  createHash('sha256').update(content).digest('hex');
const manifest = readJson<{ buildHash: string; cssHash?: string }>(join(run, 'manifest.json'));
const bundle = readFileSync(join(run, 'snapshot/browser-build/tvist.min.js'));
const css = readFileSync(join(run, 'snapshot/browser-build/tvist.css'));
if (hash(bundle) !== manifest.buildHash) throw new Error('SHRINK_BUILD_HASH_MISMATCH');
if (manifest.cssHash && hash(css) !== manifest.cssHash) throw new Error('SHRINK_CSS_HASH_MISMATCH');
const originalSource = join(run, 'snapshot/scripts/audit-campaigns.ts');
const originalCampaignSourceHash = existsSync(originalSource)
  ? hash(readFileSync(originalSource))
  : null;
const executedCampaignSourceHash = hash(readFileSync(resolve('scripts/audit-campaigns.ts')));
const results = readJson<AuditResult[]>(join(run, 'results.json'));
const firstFailures = new Map<string, AuditResult>();
for (const result of results) {
  const matched = /^DEEP-(\d+)-(\d+)$/.exec(result.id);
  if (!matched || result.status === 'pass' || !result.error) continue;
  const key = `${matched[1]}|${result.project}`;
  if (!firstFailures.has(key)) firstFailures.set(key, result);
}

/** Match the actual assertion code, never a generic exception or a different failure. */
function stableOracle(message: string): string | null {
  const lines = message.split(/\r?\n/).map((line) => line.trim());
  if (lines[0]?.includes('STATEFUL_FAILURE')) lines.shift();
  const first = lines.find(Boolean) ?? '';
  if (/^[A-Z][A-Z0-9_]+$/.test(first) && first !== 'AUDIT_TIMEOUT') return first;
  if (
    /^(finite-index|finite-transform|finite-rects|index-lower-bound|index-upper-bound|active-identity|active-original-identity)$/.test(
      first
    )
  )
    return first;
  return null;
}
function validCommands(value: unknown): value is CampaignCommand[] {
  return (
    Array.isArray(value) &&
    value.every(
      (command) =>
        command &&
        typeof command.action === 'string' &&
        Number.isFinite(command.value) &&
        ['next', 'prev'].includes(command.direction)
    )
  );
}
function recoverCommands(
  result: AuditResult,
  replay: Replay
): { commands: CampaignCommand[]; source: string; recovered: boolean; warnings: string[] } {
  if (validCommands(replay.commands))
    return {
      commands: replay.commands,
      source: 'saved replay commands',
      recovered: true,
      warnings: [],
    };
  const metricsPath = join(run, `${result.id}-${result.project}.metrics.json`);
  if (existsSync(metricsPath)) {
    const metrics = readJson<{ history?: unknown }>(metricsPath);
    if (validCommands(metrics.history) && metrics.history.length)
      return {
        commands: metrics.history,
        source: 'saved browser command history through failure',
        recovered: true,
        warnings: [],
      };
  }
  const history = /history=(\[[^\r\n]*\])(?:\r?\n|$)/.exec(result.error ?? '')?.[1];
  if (history) {
    try {
      const commands: unknown = JSON.parse(history);
      if (validCommands(commands))
        return {
          commands,
          source: 'concrete command history in original failure',
          recovered: true,
          warnings: [],
        };
    } catch {
      /* Preserve the warning below rather than inventing commands. */
    }
  }
  return {
    commands: serializeCommands(replay.family, replay.seed, replay.steps),
    source: 'current generator fallback',
    recovered: false,
    warnings: [
      'Original concrete commands were not saved. These commands were regenerated using the current generator; this is a candidate reproduction, not proof that the original sequence was minimized.',
    ],
  };
}
const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  const path = request.url?.split('?')[0];
  if (path === '/tvist.js') {
    response.setHeader('Content-Type', 'text/javascript');
    response.end(bundle);
  } else if (path === '/tvist.css') {
    response.setHeader('Content-Type', 'text/css');
    response.end(css);
  } else if (path === '/hash') {
    response.setHeader('Content-Type', 'text/plain');
    response.end(manifest.buildHash);
  } else {
    response.setHeader('Content-Type', 'text/html');
    response.end(
      '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/tvist.css"><script src="/tvist.js"></script></head><body></body></html>'
    );
  }
});
await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('SHRINK_SERVER_ADDRESS');
const url = `http://127.0.0.1:${address.port}`;
const engines: Record<string, BrowserType> = { chromium, firefox, webkit };
const registryPath = resolve('docs/audit/minimal-repros.json');
const registry = existsSync(registryPath) ? readJson<MinimizedRecord[]>(registryPath) : [];

function save(record: MinimizedRecord): void {
  writeFileSync(join(record.artifacts, 'minimal.json'), JSON.stringify(record, null, 2));
  const index = registry.findIndex(
    (previous) =>
      previous.run === record.run &&
      previous.id === record.id &&
      previous.project === record.project
  );
  if (index < 0) registry.push(record);
  else registry[index] = record;
  mkdirSync(resolve('docs/audit'), { recursive: true });
  writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}

try {
  for (const result of firstFailures.values()) {
    const oracle = stableOracle(result.error!);
    if (!oracle) {
      writeFileSync(
        join(destination, `${result.id}-${result.project}.unshrinkable.json`),
        JSON.stringify(
          {
            result,
            reason:
              'No stable assertion code: do not minimize infrastructure exceptions or generic errors.',
          },
          null,
          2
        )
      );
      console.log(`${result.id} ${result.project}: no stable oracle, retained raw failure`);
      continue;
    }
    const scopedReplay = join(run, `${result.id}-${result.project}.replay.json`);
    const replay = readJson<Replay>(
      existsSync(scopedReplay) ? scopedReplay : join(run, `${result.id}.replay.json`)
    );
    const recovered = recoverCommands(result, replay);
    const artifacts = join(destination, `${result.id}-${result.project}`);
    mkdirSync(artifacts, { recursive: true });
    const rawPath = join(artifacts, 'original-raw.json');
    if (!existsSync(rawPath))
      writeFileSync(
        rawPath,
        JSON.stringify(
          { result, replay, ...recovered, manifest, originalCampaignSourceHash },
          null,
          2
        )
      );
    const started = Date.now();
    const deadline = started + budgetMs;
    let trials = 0;
    const warnings = [...recovered.warnings];
    if (originalCampaignSourceHash !== executedCampaignSourceHash)
      warnings.push(
        'The campaign harness changed since the source run. The production UMD is identical and concrete actions are replayed, but corrected assertions/setup can affect reproduction.'
      );
    async function trial(commands: CampaignCommand[], evidence?: string): Promise<Trial> {
      const trialStarted = Date.now();
      const pageErrors: string[] = [];
      let browser: Browser | undefined;
      let owner: Awaited<ReturnType<BrowserType['launchServer']>> | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let cancelled = false;
      trials++;
      try {
        const task = async (): Promise<Trial> => {
          const engineName = result.project.replace('-mobile', '');
          const engine = engines[engineName];
          if (!engine) throw new Error(`SHRINK_UNSUPPORTED_ENGINE ${result.project}`);
          owner = await engine.launchServer();
          browser = await engine.connect(owner.wsEndpoint());
          if (cancelled) {
            await browser.close();
            throw new Error('SHRINK_CANCELLED_DURING_LAUNCH');
          }
          const context = await browser.newContext(
            result.project.endsWith('mobile')
              ? { ...devices[engineName === 'webkit' ? 'iPhone 13' : 'Pixel 7'] }
              : {}
          );
          await context.addInitScript('globalThis.__name = (fn) => fn;');
          const page = await context.newPage();
          page.on('pageerror', (error) => pageErrors.push(error.message));
          await page.goto(url);
          if (
            (await page.evaluate(() => fetch('/hash').then((response) => response.text()))) !==
            manifest.buildHash
          )
            throw new Error('SHRINK_STALE_SERVER');
          let error: string | undefined;
          try {
            await stateful(page, replay.family, replay.seed, commands.length, commands);
          } catch (caught) {
            error = caught instanceof Error ? caught.message : String(caught);
          }
          const actual = error ? stableOracle(error) : null;
          if (evidence) {
            await page.screenshot({ path: join(artifacts, `${evidence}.png`) }).catch(() => {});
            writeFileSync(
              join(artifacts, `${evidence}.html`),
              await page.content().catch(() => '')
            );
          }
          return {
            matched: actual === oracle && pageErrors.length === 0,
            oracle: actual,
            error,
            pageErrors,
            duration: Date.now() - trialStarted,
          };
        };
        const remaining = Math.min(60000, deadline - Date.now());
        if (remaining <= 0) throw new Error('SHRINK_BUDGET_EXHAUSTED');
        return await Promise.race([
          task(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('SHRINK_TRIAL_TIMEOUT')), remaining);
          }),
        ]);
      } catch (caught) {
        return {
          matched: false,
          oracle: null,
          error: caught instanceof Error ? caught.message : String(caught),
          pageErrors,
          duration: Date.now() - trialStarted,
        };
      } finally {
        cancelled = true;
        if (timer) clearTimeout(timer);
        let closingTimer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            browser?.close().catch(() => {}),
            new Promise((resolve) => {
              closingTimer = setTimeout(resolve, 5000);
            }),
          ]);
        } finally {
          if (closingTimer) clearTimeout(closingTimer);
          if (owner?.process().exitCode === null) owner.process().kill('SIGKILL');
        }
      }
    }
    const baseline = await trial(recovered.commands, 'baseline');
    let commands = [...recovered.commands];
    let oneMinimal = false;
    const record: MinimizedRecord = {
      id: result.id,
      project: result.project,
      run,
      family: replay.family,
      seed: replay.seed,
      oracle,
      status: 'baseline-not-reproduced',
      originalCommands: recovered.commands,
      commands,
      commandSource: recovered.source,
      originalCommandsRecovered: recovered.recovered,
      warnings,
      trials,
      duration: Date.now() - started,
      verification: [],
      baseline,
      oneMinimal,
      buildHash: manifest.buildHash,
      originalCampaignSourceHash,
      executedCampaignSourceHash,
      artifacts,
    };
    if (!baseline.matched) {
      save(record);
      console.log(`${result.id} ${result.project}: original oracle no longer reproduced`);
      continue;
    }
    // Reserve time for three independent final launches; every trial starts a fresh browser.
    const shrinkDeadline = deadline - Math.min(60000, Math.floor(budgetMs / 3));
    let low = 0;
    let high = commands.length;
    while (low < high && Date.now() < shrinkDeadline) {
      const middle = Math.floor((low + high) / 2);
      if ((await trial(commands.slice(0, middle))).matched) high = middle;
      else low = middle + 1;
    }
    if (low === high) commands = commands.slice(0, high);
    let granularity = 2;
    while (commands.length > 0 && Date.now() < shrinkDeadline) {
      let reduced = false;
      const chunk = Math.ceil(commands.length / granularity);
      for (let start = 0; start < commands.length && Date.now() < shrinkDeadline; start += chunk) {
        const candidate = commands.slice(0, start).concat(commands.slice(start + chunk));
        if ((await trial(candidate)).matched) {
          commands = candidate;
          granularity = Math.max(2, granularity - 1);
          reduced = true;
          break;
        }
      }
      if (reduced) continue;
      if (granularity >= commands.length) {
        oneMinimal = Date.now() < shrinkDeadline;
        break;
      }
      granularity = Math.min(commands.length, granularity * 2);
    }
    if (!commands.length) oneMinimal = true;
    const verification: Trial[] = [];
    for (let repeat = 0; repeat < 3 && Date.now() < deadline; repeat++)
      verification.push(await trial(commands, `verify-${repeat + 1}`));
    Object.assign(record, {
      commands,
      verification,
      oneMinimal,
      trials,
      duration: Date.now() - started,
      status:
        verification.length < 3
          ? 'budget-exhausted'
          : verification.every((check) => check.matched)
            ? 'verified'
            : 'unstable',
    });
    save(record);
    console.log(
      `${result.id} ${result.project}: ${record.status}, ${recovered.commands.length} -> ${commands.length} actions, ${trials} fresh-browser trials, oracle=${oracle}`
    );
  }
} finally {
  await new Promise<void>((done) => server.close(() => done()));
}
