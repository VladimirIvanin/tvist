import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  validateSliderUnitCohort,
  type SliderUnitRecord,
} from '../tests/audit/fixtures/slider-unit-accounting';

interface ChildSummary {
  complete: boolean;
  controlsPassed: number;
  baseSeed: number;
  sourceHash: string;
  fixtureHash: string;
  productionHash: string;
  environment: string;
  scopes: string[];
  seedProfiles: Record<string, string>;
  actionMap: string[][];
  minimized: Record<string, unknown>[];
  families: { family: number; name: string; seedsFile: string }[];
  replayResult?: SliderUnitRecord;
}
interface Shard {
  directory: string;
  family?: number;
  offset?: number;
  seeds?: number;
  exit: number | null;
  controls: number;
  complete: boolean;
  log: string;
}
const args = Object.fromEntries(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.replace(/^--/, '').split('=');
    return [key, value.join('=') || 'true'];
  })
);
for (const key of Object.keys(args))
  if (!['seeds', 'shrinkMs', 'family', 'controls', 'replay'].includes(key))
    throw new Error(`Unknown --${key}`);
for (const key of ['seeds', 'shrinkMs'])
  if (args[key] && (!Number.isInteger(Number(args[key])) || Number(args[key]) < 0))
    throw new Error(`Invalid --${key}`);
const seeds = Number(args.seeds ?? 500);
const shrinkBudget = Number(args.shrinkMs ?? (args.controls || args.replay ? 0 : 600000));
if (seeds < 1 || seeds > 500)
  throw new Error('--seeds must be 1..500; reduced values are sampling, not the full campaign');
if (shrinkBudget > 600000) throw new Error('--shrinkMs is bounded to 600000 globally');
if (args.family && !/^[0-5]$/.test(args.family)) throw new Error('--family must be 0..5');
if (args.controls && args.replay) throw new Error('--controls and --replay are mutually exclusive');

const baseSeed = 20261101;
const chunkSize = 100;
const mode = args.controls
  ? 'controls'
  : args.replay
    ? 'replay'
    : seeds === 500 && !args.family
      ? 'full'
      : 'sample';
const root = resolve('.tmp/audit/slider-deep');
mkdirSync(root, { recursive: true });
const directory = mkdtempSync(
  join(root, `${new Date().toISOString().replace(/[:.]/g, '-')}-${mode}-`)
);
const errors: string[] = [];
const shards: Shard[] = [];
const minimized: Record<string, unknown>[] = [];
const records = new Map<number, SliderUnitRecord[]>();
const firstFailures = new Map<string, SliderUnitRecord>();
const names = [
  'navigation-loop',
  'input-navigation',
  'responsive-lifecycle',
  'sync-nested',
  'media-autoplay',
  'effects-grid',
];
let reference: ChildSummary | undefined;
let replayResult: SliderUnitRecord | undefined;
let shrinkElapsedMs = 0;

function runChild(name: string, env: Record<string, string>, timeout = 900000) {
  const childDir = join(directory, name);
  mkdirSync(childDir, { recursive: true });
  const vitest = join(childDir, 'vitest.json');
  const log = join(childDir, 'console.log');
  // Every process owns its report path. A killed worker cannot borrow a stale successful report.
  const result = spawnSync(
    process.execPath,
    [resolve('node_modules/vitest/vitest.mjs'), 'run', '--config', 'vitest.slider-audit.config.ts'],
    {
      encoding: 'utf8',
      timeout,
      maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env,
        AUDIT_SLIDER_DEEP: '1',
        AUDIT_SLIDER_CONTROLS_ONLY: '0',
        AUDIT_SLIDER_FAMILY: undefined,
        AUDIT_SLIDER_REPLAY: undefined,
        AUDIT_SLIDER_OFFSET: '0',
        AUDIT_SLIDER_SEEDS: '1',
        AUDIT_SLIDER_SHRINK_MS: '0',
        ...env,
        AUDIT_SLIDER_OUTPUT: childDir,
        AUDIT_SLIDER_VITEST: vitest,
        AUDIT_SLIDER_WRITE_LATEST: '0',
      },
    }
  );
  writeFileSync(
    log,
    [result.stdout, result.stderr, result.error ? String(result.error) : '']
      .filter(Boolean)
      .join('\n')
  );
  let summary: ChildSummary | undefined;
  try {
    summary = JSON.parse(readFileSync(join(childDir, 'summary.json'), 'utf8')) as ChildSummary;
    const report = JSON.parse(readFileSync(vitest, 'utf8')) as {
      numTotalTests: number;
      numPassedTests: number;
      success: boolean;
    };
    if (
      !Number.isInteger(report.numTotalTests) ||
      report.numPassedTests < 5 ||
      typeof report.success !== 'boolean'
    )
      throw new Error('missing executed Vitest controls/evidence');
    if (result.status === null || result.error || !summary.complete || summary.controlsPassed !== 5)
      throw new Error('incomplete child or invalid control evidence');
    if (
      reference &&
      [reference.productionHash, reference.sourceHash, reference.fixtureHash].join(':') !==
        [summary.productionHash, summary.sourceHash, summary.fixtureHash].join(':')
    )
      throw new Error('source/model/fixture changed across isolated workers');
    reference ??= summary;
  } catch (error) {
    errors.push(`${name}:${String(error)}`);
  }
  shards.push({
    directory: childDir,
    family: env.AUDIT_SLIDER_FAMILY === undefined ? undefined : Number(env.AUDIT_SLIDER_FAMILY),
    offset: Number(env.AUDIT_SLIDER_OFFSET ?? 0),
    seeds: Number(env.AUDIT_SLIDER_SEEDS ?? 0),
    exit: result.status,
    controls: summary?.controlsPassed ?? 0,
    complete: summary?.complete ?? false,
    log,
  });
  return { summary, code: result.status ?? 1, childDir };
}

const familyIds = args.family ? [Number(args.family)] : [0, 1, 2, 3, 4, 5];
function writeSummary(finished: boolean) {
  const families = [...records].map(([family, rows]) => {
    const actions: Record<string, number> = {};
    for (const row of rows)
      for (const command of row.commands.slice(0, row.attempted)) {
        const name = reference?.actionMap[family]?.[command.op] ?? `op${command.op}`;
        actions[name] = (actions[name] ?? 0) + 1;
      }
    return {
      family,
      name: names[family],
      requestedSeeds: seeds,
      executedSeeds: rows.length,
      passed: rows.filter((row) => row.status === 'pass').length,
      failures: rows.filter((row) => row.status === 'failure').length,
      harnessErrors: rows.filter((row) => row.status === 'harness-error').length,
      plannedCommands: rows.reduce((sum, row) => sum + row.commands.length, 0),
      attemptedCommands: rows.reduce((sum, row) => sum + row.attempted, 0),
      verifiedCommands: rows.reduce((sum, row) => sum + row.verified, 0),
      blockedTailCommands: rows.reduce((sum, row) => sum + row.blocked, 0),
      attemptedActions: actions,
      seedsFile: join(directory, `family-${family}.jsonl`),
      firstFailures: [...firstFailures.values()]
        .filter((row) => row.family === family)
        .map((row) => ({ seed: row.seed, oracle: row.failure!.oracle, step: row.failure!.step })),
    };
  });
  const totals = {
    sequences: 0,
    passed: 0,
    failures: 0,
    harnessErrors: 0,
    plannedCommands: 0,
    attemptedCommands: 0,
    verifiedCommands: 0,
    blockedTailCommands: 0,
  };
  for (const family of families) {
    totals.sequences += family.executedSeeds;
    for (const field of [
      'passed',
      'failures',
      'harnessErrors',
      'plannedCommands',
      'attemptedCommands',
      'verifiedCommands',
      'blockedTailCommands',
    ] as const)
      totals[field] += family[field];
  }
  const complete =
    finished &&
    errors.length === 0 &&
    (args.controls || args.replay
      ? shards.length === 1 && shards[0]!.complete
      : families.length === familyIds.length &&
        families.every((family) => family.executedSeeds === seeds));
  const result = {
    generatedAt: new Date().toISOString(),
    directory,
    mode,
    complete,
    fullCampaign: complete && mode === 'full',
    controlsOnly: Boolean(args.controls),
    replay: args.replay ?? null,
    replayResult: replayResult ?? null,
    campaignStatus:
      errors.length || totals.harnessErrors || replayResult?.status === 'harness-error'
        ? 'harness-error'
        : totals.failures || replayResult?.status === 'failure'
          ? 'model-failures'
          : complete
            ? 'pass'
            : 'incomplete',
    requestedSeedsPerFamily: seeds,
    baseSeed,
    commandLengthRange: [50, 200],
    factoryProbes: false,
    productionAccess: 'Only public Tvist constructor/options/methods/getters/events and DOM',
    environment: reference?.environment,
    scopes: reference?.scopes,
    actionMap: reference?.actionMap,
    seedProfiles: reference?.seedProfiles,
    productionHash: reference?.productionHash,
    sourceHash: reference?.sourceHash,
    fixtureHash: reference?.fixtureHash,
    controlsPassed: shards.length ? Math.min(...shards.map((shard) => shard.controls)) : 0,
    chunkSize,
    processIsolation:
      'Fresh Vitest/happy-dom process for each <=100-seed chunk. Earlier monolithic worker reached its V8 heap limit; no attribution to production is implied.',
    totals,
    families,
    minimized,
    shrinking: {
      globalBudgetMs: shrinkBudget,
      elapsedMs: shrinkElapsedMs,
      deduplication: 'once per family/oracle across all shards',
      originalSequencesPreserved: true,
    },
    shards,
    errors,
  };
  const json = JSON.stringify(result, null, 2);
  writeFileSync(join(directory, 'summary.json'), json);
  writeFileSync(resolve('.tmp/audit/slider-unit-deep.json'), json);
  return result;
}

if (args.controls || args.replay) {
  const child = runChild(
    mode,
    args.controls
      ? { AUDIT_SLIDER_CONTROLS_ONLY: '1' }
      : { AUDIT_SLIDER_REPLAY: resolve(args.replay!), AUDIT_SLIDER_SHRINK_MS: String(shrinkBudget) }
  );
  replayResult = child.summary?.replayResult;
  minimized.push(...(child.summary?.minimized ?? []));
  const summary = writeSummary(true);
  console.log(`slider-unit ${mode}: ${summary.campaignStatus}; ${directory}`);
  process.exitCode = errors.length ? 2 : child.code;
} else {
  writeSummary(false);
  for (const family of familyIds) {
    const all: SliderUnitRecord[] = [];
    records.set(family, all);
    for (let offset = 0; offset < seeds; offset += chunkSize) {
      const count = Math.min(chunkSize, seeds - offset);
      const name = `shard-family-${family}-${offset}`;
      const child = runChild(name, {
        AUDIT_SLIDER_FAMILY: String(family),
        AUDIT_SLIDER_OFFSET: String(offset),
        AUDIT_SLIDER_SEEDS: String(count),
      });
      try {
        const source = join(child.childDir, `family-${family}.jsonl`);
        const raw = readFileSync(source, 'utf8');
        const rows = raw
          .trim()
          .split(/\r?\n/)
          .filter(Boolean)
          .map((line) => JSON.parse(line) as SliderUnitRecord);
        errors.push(
          ...validateSliderUnitCohort(rows, family, baseSeed + family * 100000 + offset, count)
        );
        if (child.code === 0 && rows.some((row) => row.status !== 'pass'))
          errors.push(`${name}: false-green child exit`);
        if (child.code !== 0 && rows.every((row) => row.status === 'pass'))
          errors.push(`${name}: nonzero child exit without recorded model failures`);
        all.push(...rows);
        appendFileSync(join(directory, `family-${family}.jsonl`), raw);
        for (const row of rows)
          if (row.failure && !firstFailures.has(`${family}/${row.failure.oracle}`))
            firstFailures.set(`${family}/${row.failure.oracle}`, row);
        console.log(
          `slider-unit ${names[family]} ${offset + rows.length}/${seeds}: ${all.filter((row) => row.status === 'pass').length} pass, ${all.filter((row) => row.status === 'failure').length} model failures, ${all.filter((row) => row.status === 'harness-error').length} harness errors`
        );
      } catch (error) {
        errors.push(`${name}: malformed/missing raw observations: ${String(error)}`);
      }
      writeSummary(false);
    }
    errors.push(...validateSliderUnitCohort(all, family, baseSeed + family * 100000, seeds));
  }
  const shrinkStart = Date.now();
  const shrinkDeadline = shrinkStart + shrinkBudget;
  for (const row of firstFailures.values()) {
    const oracle = row.failure!.oracle;
    const original = join(directory, `original-${row.family}-${oracle}.json`);
    writeFileSync(original, JSON.stringify(row, null, 2));
    const remaining = shrinkDeadline - Date.now();
    if (row.status === 'harness-error' || remaining <= 4000) {
      minimized.push({
        family: row.family,
        seed: row.seed,
        oracle,
        original,
        status:
          row.status === 'harness-error' ? 'harness-error-not-shrunk' : 'budget-not-available',
      });
      continue;
    }
    const child = runChild(
      `shrink-${row.family}-${oracle}`,
      { AUDIT_SLIDER_REPLAY: original, AUDIT_SLIDER_SHRINK_MS: String(remaining - 4000) },
      remaining
    );
    if (child.summary?.replayResult?.failure?.oracle !== oracle)
      errors.push(`shrink-${row.family}-${oracle}: original failed to reproduce`);
    if (child.summary?.minimized.length) minimized.push(...child.summary.minimized);
    else
      minimized.push({
        family: row.family,
        seed: row.seed,
        oracle,
        original,
        status: 'no-minimum-produced',
      });
    shrinkElapsedMs = Date.now() - shrinkStart;
    writeSummary(false);
  }
  shrinkElapsedMs = Date.now() - shrinkStart;
  const summary = writeSummary(true);
  console.log(
    `slider-unit ${mode}: ${summary.campaignStatus}; ${summary.totals.sequences} sequences, ${summary.totals.verifiedCommands} verified, ${summary.totals.blockedTailCommands} blocked; ${directory}`
  );
  process.exitCode =
    errors.length || !summary.complete
      ? 2
      : summary.totals.failures || summary.totals.harnessErrors
        ? 1
        : 0;
}
