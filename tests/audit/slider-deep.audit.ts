import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { performance as wallClock } from 'node:perf_hooks';
import { Tvist } from '../../src/core/Tvist';
import type { TvistOptions } from '../../src/core/types';
import {
  installSliderUnitEnvironment,
  makeSliderUnitRoot,
  startUnitClock,
  stopUnitClock,
} from './fixtures/slider-unit-environment';
import { validateSliderUnitCohort } from './fixtures/slider-unit-accounting';

interface Command {
  op: number;
  value: number;
  flag: boolean;
}
interface Machine {
  apply(command: Command): void;
  verify(): void;
  dispose(): void;
}
interface Failure {
  oracle: string;
  detail: string;
  step: number;
}
interface Outcome {
  status: 'pass' | 'failure' | 'harness-error';
  attempted: number;
  verified: number;
  blocked: number;
  failure?: Failure;
  cleanupErrors: string[];
  durationMs: number;
}
interface SeedRecord extends Outcome {
  family: number;
  seed: number;
  commands: Command[];
}
interface FamilyReport {
  family: number;
  name: string;
  requestedSeeds: number;
  executedSeeds: number;
  passed: number;
  failures: number;
  harnessErrors: number;
  plannedCommands: number;
  attemptedCommands: number;
  verifiedCommands: number;
  blockedTailCommands: number;
  attemptedActions: Record<string, number>;
  seedsFile: string;
  firstFailures: SeedRecord[];
}
class ModelFailure extends Error {
  constructor(
    public oracle: string,
    detail: string
  ) {
    super(detail);
  }
}

const enabled = process.env.AUDIT_SLIDER_DEEP === '1';
const controlsOnly = process.env.AUDIT_SLIDER_CONTROLS_ONLY === '1';
const requestedSeeds = Number(process.env.AUDIT_SLIDER_SEEDS ?? 500);
const seedOffset = Number(process.env.AUDIT_SLIDER_OFFSET ?? 0);
const selectedFamily =
  process.env.AUDIT_SLIDER_FAMILY === undefined
    ? undefined
    : Number(process.env.AUDIT_SLIDER_FAMILY);
const replayPath = process.env.AUDIT_SLIDER_REPLAY;
const shrinkBudgetMs = Math.min(600000, Number(process.env.AUDIT_SLIDER_SHRINK_MS ?? 600000));
const baseSeed = 20261101;
const familyNames = [
  'navigation-loop',
  'input-navigation',
  'responsive-lifecycle',
  'sync-nested',
  'media-autoplay',
  'effects-grid',
];
const scopes = [
  'Integer perPage=1 next/prev/jump, finite and loop index arithmetic, enable/disable and recreate; no physical geometry claim.',
  'Generated arrows and clickable pagination via DOM click, disabled input gating; no native wheel/drag/keyboard or pointer-event claim.',
  'Window max-width breakpoints, perPage/currentBreakpoint, enable/disable/update/recreate; explicitly mocked media queries and layout, no ResizeObserver geometry claim.',
  'Bidirectional public sync and independent nested slider navigation; no native nested drag, iframe or gesture claim.',
  'Autoplay timer state with alternating manual-control and hover-only seed profiles; whole-delay advances and fake timers. Explicit start during hover is outside the model. No video codec or real visibility claim.',
  'Alternating grid-only and effect-only seed profiles: effect option normalization, integer grid page/card cardinality and stable original identities; no CSS compositor, projection, opacity or pixel claim.',
];
const actions = [
  ['next', 'prev', 'jump', 'loop-option', 'enabled-option', 'recreate', 'gap-option', 'update'],
  [
    'arrow-next',
    'arrow-prev',
    'bullet-click',
    'disable',
    'enable',
    'arrow-next',
    'recreate',
    'update',
  ],
  ['viewport', 'viewport', 'disable', 'enable', 'recreate', 'update', 'gap-option', 'viewport'],
  [
    'main-next',
    'partner-prev',
    'main-jump',
    'partner-jump',
    'child-next',
    'child-prev',
    'update-parent',
    'recreate-all',
  ],
  ['advance-delay', 'stop', 'start', 'pause', 'resume', 'hover-enter', 'hover-leave', 'recreate'],
  [
    'grid-shape',
    'effect-mode',
    'next',
    'prev',
    'jump-page',
    'recreate',
    'gap-option',
    'repeat-grid-options',
  ],
];
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const directory =
  process.env.AUDIT_SLIDER_OUTPUT ??
  resolve(
    '.tmp/audit/slider-deep',
    `${runId}-${controlsOnly ? 'controls' : replayPath ? 'replay' : requestedSeeds === 500 ? 'full' : 'sample'}`
  );
const reports: FamilyReport[] = [];
const minimized: Record<string, unknown>[] = [];
let fixture: ReturnType<typeof installSliderUnitEnvironment>;
let controlsPassed = 0;
let replayRecord: SeedRecord | undefined;
let productionHash = '';
let shrinkStartedAt: number | undefined;
let shrinkFinishedAt: number | undefined;
const commandArbitrary = fc.record({
  op: fc.integer({ min: 0, max: 7 }),
  value: fc.integer({ min: 0, max: 30 }),
  flag: fc.boolean(),
});
function arbitraryFor(family: number, seed: number) {
  // Separate supported contracts so an early stop defect does not block every timer
  // sequence, and an effect normalization defect does not block every grid sequence.
  const allowed =
    family === 4
      ? seed % 2 === 0
        ? [0, 5, 6, 7]
        : [0, 1, 2, 3, 4, 7]
      : family === 5
        ? seed % 2 === 0
          ? [0, 2, 3, 4, 5, 6, 7]
          : [1, 2, 3, 4, 5, 6, 7]
        : undefined;
  return allowed
    ? fc.record({
        op: fc.constantFrom(...allowed),
        value: fc.integer({ min: 0, max: 30 }),
        flag: fc.boolean(),
      })
    : commandArbitrary;
}

function equal(actual: unknown, expected: unknown, oracle: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new ModelFailure(
      oracle,
      `expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`
    );
}
function boundedIndex(index: number, count: number, loop: boolean): number {
  return loop ? ((index % count) + count) % count : Math.max(0, Math.min(count - 1, index));
}
function commandsFor(seed: number, family = 0): Command[] {
  const length = 50 + ((seed >>> 0) % 151);
  return fc.sample(fc.array(arbitraryFor(family, seed), { minLength: length, maxLength: length }), {
    seed,
    numRuns: 1,
  })[0]!;
}
function originalCards(slider: Tvist): string[] {
  return [...slider.root.querySelectorAll<HTMLElement>('[data-unit-card]')]
    .filter(
      (card) =>
        card.closest('.tvist-v1') === slider.root &&
        !card.classList.contains('tvist-v1__slide--clone')
    )
    .map((card) => card.dataset.unitCard!)
    .sort();
}
function createMachine(family: number, seed: number): Machine {
  const count = 3 + (seed % 5);
  const owned: Tvist[] = [];
  const create = (root: HTMLElement, options: TvistOptions = {}) => {
    const slider = new Tvist(root, { speed: 0, visibility: false, perPage: 1, ...options });
    owned.push(slider);
    return slider;
  };
  const flush = () => vi.advanceTimersByTime(32);
  const dispose = () => {
    for (const slider of owned.reverse()) slider.destroy({ destroyNested: true });
  };

  if (family === 0 || family === 1) {
    let index = 0;
    let loop = family === 0 && seed % 2 === 0;
    let active = true;
    let gap = 0;
    let root = makeSliderUnitRoot(count);
    let slider = create(root, {
      loop,
      arrows: family === 1,
      pagination: family === 1 ? { clickable: true } : false,
    });
    const next = (delta: number) => {
      if (active) index = boundedIndex(index + delta, count, loop);
    };
    const recreate = () => {
      slider.destroy();
      root.remove();
      root = makeSliderUnitRoot(count);
      slider = create(root, {
        loop,
        enabled: active,
        gap,
        arrows: family === 1,
        pagination: family === 1 ? { clickable: true } : false,
      });
      index = 0;
    };
    flush();
    return {
      dispose,
      apply(command) {
        const target = command.value % count;
        if (family === 0) {
          if (command.op === 0) {
            slider.next();
            next(1);
          }
          if (command.op === 1) {
            slider.prev();
            next(-1);
          }
          if (command.op === 2) {
            slider.scrollTo(target);
            if (active) index = target;
          }
          if (command.op === 3) {
            loop = command.flag;
            slider.updateOptions({ loop });
          }
          if (command.op === 4) {
            active = command.flag;
            if (active) slider.enable();
            else slider.disable();
          }
          if (command.op === 5) recreate();
          if (command.op === 6) {
            gap = command.value;
            slider.updateOptions({ gap });
          }
          if (command.op === 7) slider.update();
        } else {
          if (command.op === 0 || command.op === 5) {
            root.querySelector<HTMLButtonElement>('.tvist-v1__arrow--next')?.click();
            next(1);
          }
          if (command.op === 1) {
            root.querySelector<HTMLButtonElement>('.tvist-v1__arrow--prev')?.click();
            next(-1);
          }
          if (command.op === 2) {
            root.querySelectorAll<HTMLElement>('.tvist-v1__bullet')[target]?.click();
            if (active) index = target;
          }
          if (command.op === 3) {
            slider.disable();
            active = false;
          }
          if (command.op === 4) {
            slider.enable();
            active = true;
          }
          if (command.op === 6) recreate();
          if (command.op === 7) slider.update();
        }
        flush();
      },
      verify() {
        equal(
          slider.realIndex,
          index,
          family === 0 ? 'SLIDER_UNIT_NAV_INDEX' : 'SLIDER_UNIT_INPUT_INDEX'
        );
        equal(slider.isEnabled, active, 'SLIDER_UNIT_ENABLED');
        equal(
          originalCards(slider),
          Array.from({ length: count }, (_, i) => String(i)).sort(),
          'SLIDER_UNIT_ORIGINAL_CARDS'
        );
      },
    };
  }

  if (family === 2) {
    let width = 1300;
    let active = true;
    let gap = 0;
    let root = makeSliderUnitRoot(count);
    const options: TvistOptions = {
      perPage: 3,
      breakpoints: { 799: { perPage: 1 }, 1199: { perPage: 2 } },
    };
    let slider = create(root, options);
    flush();
    return {
      dispose,
      apply(command) {
        if ([0, 1, 7].includes(command.op)) {
          if (!active) {
            slider.enable();
            active = true;
          }
          width = [480, 799, 800, 1199, 1200, 1600][command.value % 6]!;
          fixture.setViewport(width);
        }
        if (command.op === 2) {
          slider.disable();
          active = false;
        }
        if (command.op === 3) {
          slider.enable();
          active = true;
        }
        // Recreate has an explicit enabled:true base policy. Mixing an enabled:false
        // base with a later imperative enable requires a separate breakpoint policy.
        if (command.op === 4) {
          slider.destroy();
          root.remove();
          root = makeSliderUnitRoot(count);
          slider = create(root, { ...options, enabled: true, gap });
          active = true;
        }
        if (command.op === 5) slider.update();
        if (command.op === 6) {
          gap = command.value;
          slider.updateOptions({ gap });
        }
        flush();
      },
      verify() {
        equal(
          slider.options.perPage,
          width <= 799 ? 1 : width <= 1199 ? 2 : 3,
          'SLIDER_UNIT_BREAKPOINT_PERPAGE'
        );
        equal(
          slider.currentBreakpoint,
          width <= 799 ? 799 : width <= 1199 ? 1199 : null,
          'SLIDER_UNIT_BREAKPOINT_ID'
        );
        equal(slider.isEnabled, active, 'SLIDER_UNIT_BREAKPOINT_ENABLED');
        equal(
          (root as HTMLElement & { tvistInstance?: Tvist }).tvistInstance === slider,
          true,
          'SLIDER_UNIT_ROOT_OWNER'
        );
        equal(originalCards(slider).length, count, 'SLIDER_UNIT_RESPONSIVE_CARD_COUNT');
      },
    };
  }

  if (family === 3) {
    let index = 0;
    let childIndex = 0;
    let main: Tvist;
    let partner: Tvist;
    let child: Tvist;
    const rebuild = () => {
      main?.destroy({ destroyNested: true });
      partner?.destroy();
      child?.destroy();
      document.body.innerHTML = '';
      main = create(makeSliderUnitRoot(count, 'unit-main'));
      partner = create(makeSliderUnitRoot(count, 'unit-partner'));
      main.sync(partner);
      child = create(makeSliderUnitRoot(3, 'unit-child', main.slides[0]!));
      index = 0;
      childIndex = 0;
    };
    rebuild();
    flush();
    return {
      dispose,
      apply(command) {
        if (command.op === 0) {
          main.next();
          index = boundedIndex(index + 1, count, false);
        }
        if (command.op === 1) {
          partner.prev();
          index = boundedIndex(index - 1, count, false);
        }
        if (command.op === 2) {
          index = command.value % count;
          main.scrollTo(index);
        }
        if (command.op === 3) {
          index = command.value % count;
          partner.scrollTo(index);
        }
        if (command.op === 4) {
          child.next();
          childIndex = Math.min(2, childIndex + 1);
        }
        if (command.op === 5) {
          child.prev();
          childIndex = Math.max(0, childIndex - 1);
        }
        if (command.op === 6) main.update();
        if (command.op === 7) rebuild();
        flush();
      },
      verify() {
        equal([main.realIndex, partner.realIndex], [index, index], 'SLIDER_UNIT_SYNC_INDICES');
        equal(child.realIndex, childIndex, 'SLIDER_UNIT_NESTED_INDEX');
        equal(originalCards(main).length, count, 'SLIDER_UNIT_NESTED_PARENT_CARD_COUNT');
      },
    };
  }

  if (family === 4) {
    let index = 0;
    let stopped = false;
    let paused = false;
    let hover = false;
    let root = makeSliderUnitRoot(count);
    let slider: Tvist;
    const createAutoplay = () =>
      create(root, {
        loop: true,
        autoplay: {
          delay: 160,
          pauseOnHover: true,
          pauseOnFocus: false,
          pauseOnInteraction: false,
        },
      });
    slider = createAutoplay();
    return {
      dispose,
      apply(command) {
        if (command.op === 0) {
          const ticks = 1 + (command.value % 3);
          vi.advanceTimersByTime(160 * ticks);
          if (!stopped && !paused && !hover) index = boundedIndex(index + ticks, count, true);
        }
        if (command.op === 1) {
          slider.autoplay!.stop();
          stopped = true;
        }
        if (command.op === 2) {
          slider.autoplay!.start();
          stopped = false;
          paused = false;
        }
        if (command.op === 3) {
          slider.autoplay!.pause();
          paused = true;
        }
        if (command.op === 4) {
          slider.autoplay!.resume();
          if (!stopped) paused = false;
        }
        if (command.op === 5) {
          root.dispatchEvent(new MouseEvent('mouseenter'));
          hover = true;
        }
        if (command.op === 6) {
          root.dispatchEvent(new MouseEvent('mouseleave'));
          hover = false;
        }
        if (command.op === 7) {
          slider.destroy();
          root.remove();
          root = makeSliderUnitRoot(count);
          slider = createAutoplay();
          index = 0;
          stopped = false;
          paused = false;
          hover = false;
        }
      },
      verify() {
        equal(slider.realIndex, index, 'SLIDER_UNIT_AUTOPLAY_INDEX');
        equal(slider.autoplay!.isStopped(), stopped, 'SLIDER_UNIT_AUTOPLAY_STOPPED');
        // Stop is a separate state; hover/manual pause flags are not asserted as one flag.
        if (!stopped)
          equal(slider.autoplay!.isRunning(), !paused && !hover, 'SLIDER_UNIT_AUTOPLAY_RUNNING');
      },
    };
  }

  let rows = 1;
  let cols = 1;
  let effect: 'slide' | 'fade' | 'cube' = 'slide';
  let gap = 0;
  let root = makeSliderUnitRoot(count);
  let slider = create(root, { grid: { rows, cols }, effect });
  flush();
  return {
    dispose,
    apply(command) {
      if (command.op === 0) {
        rows = 1 + (command.value % 2);
        cols = 1 + (Math.floor(command.value / 2) % 3);
        effect = 'slide';
        slider.updateOptions({ grid: { rows, cols }, effect, perPage: 1 });
      }
      if (command.op === 1) {
        rows = 1;
        cols = 1;
        effect = (['slide', 'fade', 'cube'] as const)[command.value % 3]!;
        slider.updateOptions({ grid: { rows, cols }, effect, perPage: effect === 'slide' ? 1 : 3 });
      }
      if (command.op === 2) slider.next();
      if (command.op === 3) slider.prev();
      if (command.op === 4) slider.scrollTo(command.value % Math.ceil(count / (rows * cols)));
      if (command.op === 5) {
        slider.destroy();
        root.remove();
        root = makeSliderUnitRoot(count);
        slider = create(root, { grid: { rows, cols }, effect, gap });
      }
      if (command.op === 6) {
        gap = command.value;
        slider.updateOptions({ gap });
      }
      if (command.op === 7) slider.updateOptions({ grid: { rows, cols } });
      flush();
    },
    verify() {
      equal(slider.slideCount, Math.ceil(count / (rows * cols)), 'SLIDER_UNIT_GRID_PAGE_COUNT');
      equal(
        originalCards(slider),
        Array.from({ length: count }, (_, i) => String(i)).sort(),
        'SLIDER_UNIT_GRID_CARD_IDENTITIES'
      );
      equal(slider.options.perPage, 1, 'SLIDER_UNIT_EFFECT_PERPAGE');
      equal(slider.options.effect, effect, 'SLIDER_UNIT_EFFECT_OPTION');
      equal(
        Number.isInteger(slider.realIndex) &&
          slider.realIndex >= 0 &&
          slider.realIndex < slider.slideCount,
        true,
        'SLIDER_UNIT_GRID_INDEX_RANGE'
      );
    },
  };
}

function executeSequence(
  family: number,
  seed: number,
  commands: Command[],
  factory = createMachine
): Outcome {
  fixture.reset();
  startUnitClock();
  const start = wallClock.now();
  let machine: Machine | undefined;
  let attempted = 0;
  let verified = 0;
  let failure: Failure | undefined;
  const cleanupErrors: string[] = [];
  try {
    machine = factory(family, seed);
    machine.verify();
    for (const command of commands) {
      attempted++;
      machine.apply(command);
      machine.verify();
      verified++;
    }
  } catch (error) {
    failure = {
      oracle: error instanceof ModelFailure ? error.oracle : 'SLIDER_UNIT_EXCEPTION',
      detail: String(error),
      step: attempted - 1,
    };
  } finally {
    try {
      machine?.dispose();
    } catch (error) {
      cleanupErrors.push(String(error));
    }
    stopUnitClock();
    fixture.reset();
  }
  if (!failure && cleanupErrors.length)
    failure = {
      oracle: 'SLIDER_UNIT_CLEANUP_EXCEPTION',
      detail: cleanupErrors.join('; '),
      step: attempted,
    };
  return {
    status: failure ? (failure.oracle.includes('EXCEPTION') ? 'harness-error' : 'failure') : 'pass',
    attempted,
    verified,
    blocked: commands.length - attempted,
    failure,
    cleanupErrors,
    durationMs: wallClock.now() - start,
  };
}

function persist(complete: boolean): void {
  if (!enabled) return;
  mkdirSync(directory, { recursive: true });
  const summary = {
    generatedAt: new Date().toISOString(),
    runId,
    directory,
    complete,
    controlsOnly,
    replay: replayPath ?? null,
    requestedSeedsPerFamily: requestedSeeds,
    baseSeed,
    seedOffset,
    commandLengthRange: [50, 200],
    factoryProbes: false,
    productionAccess:
      'Only public Tvist constructor/options/methods/getters/events and DOM; no __tvistInternal access',
    environment:
      'happy-dom; explicit width/height/rect fixture; max-width matchMedia; inert observers; fake scheduling clocks. No native rendering/codec/gesture claim.',
    scopes,
    actionMap: actions,
    controlsPassed,
    replayResult: replayRecord ?? null,
    seedProfiles: {
      fixture: 'cardCount = 3 + seed % 5; width720/height240; speed0; visibility:false',
      navigation: 'initial loop = even seed; dynamic loop updates remain generated',
      autoplay:
        'odd seeds manual controls without hover; even seeds hover/advance/recreate without explicit manual overrides',
      effectsGrid: 'odd seeds effect-only; even seeds grid-only; integer rows/cols',
    },
    fullCampaign:
      complete &&
      !controlsOnly &&
      !replayPath &&
      selectedFamily === undefined &&
      requestedSeeds === 500 &&
      seedOffset === 0,
    campaignStatus:
      reports.some((report) => report.harnessErrors > 0) || replayRecord?.status === 'harness-error'
        ? 'harness-error'
        : reports.some((report) => report.failures > 0) || replayRecord?.status === 'failure'
          ? 'model-failures'
          : complete
            ? 'pass'
            : 'incomplete',
    productionHash,
    processMemory: process.memoryUsage(),
    shrinking: {
      globalBudgetMs: shrinkBudgetMs,
      deduplication: 'once per family/oracle',
      elapsedMs:
        shrinkStartedAt === undefined ? 0 : (shrinkFinishedAt ?? wallClock.now()) - shrinkStartedAt,
      originalSequencesPreserved: true,
    },
    sourceHash: createHash('sha256')
      .update(readFileSync(resolve('tests/audit/slider-deep.audit.ts')))
      .digest('hex'),
    fixtureHash: createHash('sha256')
      .update(readFileSync(resolve('tests/audit/fixtures/slider-unit-environment.ts')))
      .digest('hex'),
    totals: {
      sequences: reports.reduce((sum, report) => sum + report.executedSeeds, 0),
      passed: reports.reduce((sum, report) => sum + report.passed, 0),
      failures: reports.reduce((sum, report) => sum + report.failures, 0),
      harnessErrors: reports.reduce((sum, report) => sum + report.harnessErrors, 0),
      plannedCommands: reports.reduce((sum, report) => sum + report.plannedCommands, 0),
      attemptedCommands: reports.reduce((sum, report) => sum + report.attemptedCommands, 0),
      verifiedCommands: reports.reduce((sum, report) => sum + report.verifiedCommands, 0),
      blockedTailCommands: reports.reduce((sum, report) => sum + report.blockedTailCommands, 0),
    },
    families: reports.map((report) => ({
      ...report,
      firstFailures: report.firstFailures.map((record) => ({
        seed: record.seed,
        oracle: record.failure!.oracle,
        step: record.failure!.step,
      })),
    })),
    minimized,
  };
  writeFileSync(join(directory, 'summary.json'), JSON.stringify(summary, null, 2));
  if (process.env.AUDIT_SLIDER_WRITE_LATEST !== '0')
    writeFileSync(resolve('.tmp/audit/slider-unit-deep.json'), JSON.stringify(summary, null, 2));
}

beforeAll(() => {
  if (!enabled) return;
  fixture = installSliderUnitEnvironment();
  mkdirSync(directory, { recursive: true });
  const hash = createHash('sha256');
  const hashTree = (path: string) => {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      const absolute = join(path, entry.name);
      if (entry.isDirectory()) hashTree(absolute);
      else
        hash
          .update(relative(resolve('src'), absolute).split('\\').join('/'))
          .update(readFileSync(absolute));
    }
  };
  hashTree(resolve('src'));
  productionHash = hash.digest('hex');
  for (const path of [
    'tests/audit/slider-deep.audit.ts',
    'tests/audit/fixtures/slider-unit-environment.ts',
    'tests/audit/fixtures/slider-unit-accounting.ts',
    'scripts/audit-slider-deep.ts',
    'vitest.slider-audit.config.ts',
  ])
    copyFileSync(resolve(path), join(directory, path.split('/').pop()!));
  persist(false);
});
afterAll(() => {
  if (!enabled) return;
  shrinkStartedAt = wallClock.now();
  const deadline = shrinkStartedAt + shrinkBudgetMs;
  try {
    const candidates = reports.flatMap((report) => report.firstFailures);
    if (replayRecord?.failure) candidates.push(replayRecord);
    for (const original of candidates) {
      if (
        original.status === 'harness-error' ||
        shrinkBudgetMs === 0 ||
        wallClock.now() >= deadline
      )
        continue;
      const oracle = original.failure!.oracle;
      const remaining = Math.max(1, deadline - wallClock.now());
      let shrinkExecutions = 0;
      const result = fc.check(
        fc.property(
          fc.array(arbitraryFor(original.family, original.seed), { maxLength: 200 }),
          (candidate) => {
            shrinkExecutions++;
            return (
              executeSequence(original.family, original.seed, candidate).failure?.oracle !== oracle
            );
          }
        ),
        {
          seed: original.seed,
          examples: [[original.commands]],
          numRuns: 1,
          interruptAfterTimeLimit: remaining,
          markInterruptAsFailure: true,
        }
      );
      const commands = result.counterexample?.[0] ?? original.commands;
      const verification = Array.from({ length: 3 }, () =>
        executeSequence(original.family, original.seed, commands)
      );
      const record = {
        family: original.family,
        seed: original.seed,
        oracle,
        originalCommands: original.commands,
        commands,
        shrinkExecutions,
        numShrinks: result.numShrinks,
        counterexamplePath: result.counterexamplePath,
        interrupted: result.interrupted,
        status: verification.every((outcome) => outcome.failure?.oracle === oracle)
          ? result.interrupted
            ? 'budget-exhausted-reproduced'
            : 'reproduced'
          : 'unstable',
        verification,
      };
      const artifact = join(directory, `minimal-family-${original.family}-${oracle}.json`);
      writeFileSync(artifact, JSON.stringify(record, null, 2));
      minimized.push({ ...record, originalCommands: undefined, commands, artifact });
      persist(false);
    }
  } finally {
    shrinkFinishedAt = wallClock.now();
    fixture.restore();
    persist(
      controlsPassed === 5 &&
        (controlsOnly ||
          Boolean(replayRecord) ||
          (reports.length === (selectedFamily === undefined ? 6 : 1) &&
            reports.every((report) => report.executedSeeds === report.requestedSeeds)))
    );
  }
}, 660000);

describe.runIf(enabled)('slider unit models without baseline probes', () => {
  it('controls: rejects deliberately incorrect projections for every family', () => {
    const projections = [
      { oracle: 'SLIDER_UNIT_NAV_INDEX', correct: boundedIndex(-1, 5, true), wrong: 0 },
      { oracle: 'SLIDER_UNIT_INPUT_INDEX', correct: 1, wrong: 0 },
      { oracle: 'SLIDER_UNIT_BREAKPOINT_PERPAGE', correct: 2, wrong: 3 },
      { oracle: 'SLIDER_UNIT_SYNC_INDICES', correct: [2, 2], wrong: [2, 1] },
      { oracle: 'SLIDER_UNIT_AUTOPLAY_STOPPED', correct: true, wrong: false },
      { oracle: 'SLIDER_UNIT_GRID_CARD_IDENTITIES', correct: ['0', '1'], wrong: ['0', '0'] },
    ];
    for (const projection of projections) {
      expect(() => equal(projection.correct, projection.correct, projection.oracle)).not.toThrow();
      expect(() => equal(projection.wrong, projection.correct, projection.oracle)).toThrow(
        ModelFailure
      );
    }
    controlsPassed++;
  });
  it('controls: early failure does not count blocked tail or prevent later seeds', () => {
    const commands = commandsFor(baseSeed).slice(0, 5);
    let launched = 0;
    const factory = () => {
      launched++;
      let completed = 0;
      return {
        apply() {
          if (++completed === 2)
            throw new ModelFailure('CONTROL_BAD_SECOND_COMMAND', 'deliberately broken');
        },
        verify() {},
        dispose() {},
      };
    };
    const outcomes = [1, 2, 3].map((seed) => executeSequence(0, seed, commands, factory));
    expect(launched).toBe(3);
    for (const outcome of outcomes)
      expect([outcome.attempted, outcome.verified, outcome.blocked, outcome.status]).toEqual([
        2,
        1,
        3,
        'failure',
      ]);
    controlsPassed++;
  });
  it('controls: records fixture exceptions as harness errors and generates replayable varied commands', () => {
    const outcome = executeSequence(0, baseSeed, commandsFor(baseSeed), () => {
      throw new Error('deliberately broken fixture');
    });
    expect(outcome.status).toBe('harness-error');
    expect(outcome.attempted).toBe(0);
    expect(outcome.verified).toBe(0);
    expect(commandsFor(baseSeed)).toEqual(commandsFor(baseSeed));
    expect(commandsFor(baseSeed)).not.toEqual(commandsFor(baseSeed + 1));
    expect(new Set(commandsFor(baseSeed).map((command) => command.op)).size).toBeGreaterThan(4);
    controlsPassed++;
  });
  it('controls: each unmodified public slider satisfies an independent nontrivial model path', () => {
    const paths: Command[][] = [
      [
        { op: 0, value: 0, flag: false },
        { op: 1, value: 0, flag: false },
      ],
      [
        { op: 0, value: 0, flag: false },
        { op: 2, value: 2, flag: false },
      ],
      [
        { op: 0, value: 0, flag: false },
        { op: 0, value: 5, flag: false },
      ],
      [
        { op: 0, value: 0, flag: false },
        { op: 4, value: 0, flag: false },
      ],
      [
        { op: 0, value: 2, flag: false },
        { op: 5, value: 0, flag: false },
        { op: 0, value: 2, flag: false },
        { op: 6, value: 0, flag: false },
        { op: 0, value: 1, flag: false },
      ],
      [
        { op: 0, value: 3, flag: false },
        { op: 2, value: 0, flag: false },
        { op: 0, value: 0, flag: false },
      ],
    ];
    for (let family = 0; family < 6; family++) {
      const outcome = executeSequence(family, baseSeed, paths[family]!);
      expect(outcome.status, `positive family ${family}: ${JSON.stringify(outcome.failure)}`).toBe(
        'pass'
      );
      expect(outcome.verified).toBe(paths[family]!.length);
    }
    controlsPassed++;
  });
  it('controls: the cohort validator rejects missing/duplicate seeds and false pass accounting', () => {
    const commands: Command[] = [{ op: 0, value: 0, flag: false }];
    const record: SeedRecord = {
      family: 0,
      seed: baseSeed,
      commands,
      status: 'pass',
      attempted: 1,
      verified: 1,
      blocked: 0,
      cleanupErrors: [],
      durationMs: 1,
    };
    expect(validateSliderUnitCohort([record], 0, baseSeed, 1)).toEqual([]);
    expect(validateSliderUnitCohort([], 0, baseSeed, 1)).toContain(`missing-seed:0/${baseSeed}`);
    expect(validateSliderUnitCohort([record, record], 0, baseSeed, 1)).toContain(
      `duplicate-seed:0/${baseSeed}`
    );
    expect(validateSliderUnitCohort([{ ...record, verified: 0 }], 0, baseSeed, 1)).toContain(
      `false-pass:0/${baseSeed}`
    );
    expect(validateSliderUnitCohort([{ ...record, blocked: 1 }], 0, baseSeed, 1)).toContain(
      `invalid-accounting:0/${baseSeed}`
    );
    controlsPassed++;
  });

  for (let family = 0; family < 6; family++) {
    it.runIf(
      !controlsOnly && (selectedFamily === undefined || selectedFamily === family) && !replayPath
    )(`${familyNames[family]}: every fixed seed is attempted independently`, () => {
      const seedsFile = join(directory, `family-${family}.jsonl`);
      const report: FamilyReport = {
        family,
        name: familyNames[family]!,
        requestedSeeds,
        executedSeeds: 0,
        passed: 0,
        failures: 0,
        harnessErrors: 0,
        plannedCommands: 0,
        attemptedCommands: 0,
        verifiedCommands: 0,
        blockedTailCommands: 0,
        attemptedActions: {},
        seedsFile,
        firstFailures: [],
      };
      reports.push(report);
      for (let offset = 0; offset < requestedSeeds; offset++) {
        const seed = baseSeed + family * 100000 + seedOffset + offset;
        const commands = commandsFor(seed, family);
        const outcome = executeSequence(family, seed, commands);
        const record: SeedRecord = { family, seed, commands, ...outcome };
        appendFileSync(seedsFile, JSON.stringify(record) + '\n');
        report.executedSeeds++;
        report.plannedCommands += commands.length;
        report.attemptedCommands += outcome.attempted;
        report.verifiedCommands += outcome.verified;
        report.blockedTailCommands += outcome.blocked;
        if (outcome.status === 'pass') report.passed++;
        else if (outcome.status === 'harness-error') report.harnessErrors++;
        else report.failures++;
        for (const command of commands.slice(0, outcome.attempted)) {
          const action = actions[family]![command.op]!;
          report.attemptedActions[action] = (report.attemptedActions[action] ?? 0) + 1;
        }
        if (
          outcome.failure &&
          !report.firstFailures.some(
            (previous) => previous.failure!.oracle === outcome.failure!.oracle
          )
        )
          report.firstFailures.push(record);
        if ((offset + 1) % 50 === 0 || offset === requestedSeeds - 1) {
          persist(false);
          console.log(
            `slider-unit ${familyNames[family]} ${offset + 1}/${requestedSeeds}: ${report.passed} pass, ${report.failures} failures, ${report.harnessErrors} harness errors`
          );
        }
      }
      persist(false);
      expect(
        report.harnessErrors,
        `${report.name}: fixture/runtime errors; inspect ${seedsFile}`
      ).toBe(0);
      expect(report.failures, `${report.name}: public model violations; inspect ${seedsFile}`).toBe(
        0
      );
    });
  }
  it.runIf(Boolean(replayPath) && !controlsOnly)('replays saved concrete slider commands', () => {
    const replay = JSON.parse(readFileSync(replayPath!, 'utf8')) as {
      family: number;
      seed: number;
      commands: Command[];
    };
    if (
      !Number.isInteger(replay.family) ||
      replay.family < 0 ||
      replay.family > 5 ||
      !Number.isInteger(replay.seed) ||
      !Array.isArray(replay.commands) ||
      replay.commands.length > 200 ||
      replay.commands.some(
        (command) =>
          !Number.isInteger(command.op) ||
          command.op < 0 ||
          command.op > 7 ||
          !Number.isInteger(command.value) ||
          typeof command.flag !== 'boolean'
      )
    )
      throw new Error('Invalid slider replay artifact');
    const outcome = executeSequence(replay.family, replay.seed, replay.commands);
    replayRecord = { ...replay, ...outcome };
    writeFileSync(join(directory, 'replay.json'), JSON.stringify(replayRecord, null, 2));
    expect(outcome.status, JSON.stringify(outcome.failure)).toBe('pass');
  });
});
