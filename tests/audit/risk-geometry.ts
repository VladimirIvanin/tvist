import { expect, type Page } from '@playwright/test';
import type { TvistOptions } from '../../src/core/types';
import { mount, settle, type AuditWindow } from './browser-fixture';
import { coverageHoles, restoredOriginalErrors } from './dom-oracles';
import type { AuditCase } from './types';

type Factor = string | number | boolean;
type Factors = Record<string, Factor>;
type RiskFamily = {
  family: string;
  domains: Record<string, readonly Factor[]>;
  tuples: Array<{ id: string; factors: Factors }>;
};

/** Declared denominator, not a claim that any tuple or subsequent phase passed. */
function product(family: string, domains: RiskFamily['domains']): RiskFamily {
  const combinations = Object.entries(domains).reduce<Factors[]>(
    (rows, [name, values]) =>
      rows.flatMap((row) => values.map((value) => ({ ...row, [name]: value }))),
    [{}]
  );
  return {
    family,
    domains,
    tuples: combinations.map((factors, index) => ({
      id: `RISK-${family.slice(1)}-${String(index).padStart(3, '0')}`,
      factors,
    })),
  };
}

export const riskGeometryManifest: RiskFamily[] = [
  product('R02', {
    loop: ['off', 'ordinary', 'clones', 'auto'],
    sizing: ['auto', 'fixed'],
    alignment: ['center', 'peek', 'center-peek'],
  }),
  product('R06', {
    effect: ['slide', 'fade', 'cube'],
    axis: ['horizontal', 'vertical'],
    interruption: ['resize', 'reverse', 'disable'],
  }),
  product('R08', {
    grid: ['2x2', '2x3'],
    filter: ['none', 'hide-return'],
    loop: ['off', 'ordinary', 'clones'],
  }),
];

const sources: Record<string, string[]> = {
  R02: [
    'https://github.com/nolimits4web/swiper/issues/2942',
    'https://github.com/nolimits4web/swiper/commit/bc4a6588a81d3c5c2ea9ae345eba35fc3f1ed3d9',
    'https://github.com/Splidejs/splide/issues/1364',
  ],
  R06: [
    'https://github.com/nolimits4web/swiper/issues/7656',
    'https://github.com/nolimits4web/swiper/issues/8168',
  ],
  R08: [
    'https://github.com/nolimits4web/swiper/issues/7870',
    'https://github.com/nolimits4web/swiper/issues/8171',
  ],
};
export const riskGeometryCases: AuditCase[] = riskGeometryManifest.flatMap((group) =>
  group.tuples.map((tuple) => ({
    id: tuple.id,
    title: `${group.family} ${Object.entries(tuple.factors)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ')}`,
    family: group.family,
    priority: 'P0',
    sources: sources[group.family]!,
  }))
);

const loopOption = (mode: Factor): TvistOptions['loop'] =>
  mode === 'clones'
    ? { withClones: true }
    : mode === 'ordinary'
      ? true
      : mode === 'auto'
        ? 'auto'
        : false;

/** Wait through both container CSS transitions and effect/RAF activity; no timing-only pass. */
async function stable(page: Page): Promise<void> {
  await settle(page);
  await page.evaluate(async () => {
    const slider = (window as unknown as AuditWindow).auditSlider;
    let last = '';
    let equal = 0;
    const start = performance.now();
    await new Promise<void>((done, reject) => {
      const frame = () => {
        const signature = JSON.stringify(
          [slider.container, ...slider.slides].map((node) => {
            const rect = node.getBoundingClientRect();
            const css = getComputedStyle(node);
            return [
              rect.x,
              rect.y,
              rect.width,
              rect.height,
              css.transform,
              css.opacity,
              css.visibility,
            ];
          })
        );
        const running = slider.root
          .getAnimations({ subtree: true })
          .some((animation) => animation.pending || animation.playState === 'running');
        equal = signature === last && !running ? equal + 1 : 0;
        last = signature;
        if (equal >= 4) done();
        else if (performance.now() - start > 7000)
          reject(new Error('RISK_GEOMETRY_SETTLE_TIMEOUT'));
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  });
}

async function navigate(page: Page, action: number | 'next' | 'prev'): Promise<void> {
  await page.evaluate((action) => {
    const s = (window as unknown as AuditWindow).auditSlider;
    if (typeof action === 'number') s.scrollTo(action);
    else s[action]();
  }, action);
  await stable(page);
}

async function cards(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as AuditWindow;
    const s = w.auditSlider;
    const rect = (node: Element) => {
      const r = node.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      };
    };
    const css = getComputedStyle(s.track);
    return {
      index: s.realIndex,
      canNext: s.canScrollNext,
      track: rect(s.track),
      before: parseFloat(css.paddingLeft),
      after: parseFloat(css.paddingRight),
      originals: w.auditOriginals!.map((node) => ({
        id: node.dataset.caseId,
        connected: s.root.contains(node),
        width: rect(node).width,
      })),
      slides: s.slides.map((node) => ({
        ...rect(node),
        id: node.dataset.caseId,
        active: node.classList.contains(w.TvistV1.CLASSES.slideActive),
        text: node.textContent,
      })),
    };
  });
}

async function authoredHeight(page: Page, height: number, widths?: number[]): Promise<void> {
  await page.evaluate(
    ({ height, widths }) => {
      const s = (window as unknown as AuditWindow).auditSlider;
      document.getElementById('risk-geometry-authored-style')?.remove();
      const style = document.createElement('style');
      style.id = 'risk-geometry-authored-style';
      s.root.style.setProperty('--risk-authored-height', `${height}px`);
      style.textContent =
        '#audit-slider .tvist-v1__slide { height:var(--risk-authored-height); }' +
        (widths ?? [])
          .map(
            (width, index) => `#audit-slider [data-case-id="card-${index}"] { width:${width}px; }`
          )
          .join('\n');
      document.head.append(style);
      s.update();
    },
    { height, widths }
  );
  await stable(page);
}

function assertCards(state: Awaited<ReturnType<typeof cards>>, phase: string, expected: number) {
  expect(state.track.width > 0 && state.track.height > 0, `${phase}_POSITIVE_VIEWPORT`).toBe(true);
  expect(
    state.originals.map((card) => card.connected),
    `${phase}_ORIGINALS_CONNECTED`
  ).toEqual(Array(state.originals.length).fill(true));
  expect(
    state.slides.every((slide) =>
      [slide.left, slide.top, slide.width, slide.height].every(Number.isFinite)
    ),
    `${phase}_FINITE_RECTS`
  ).toBe(true);
  const active = state.slides.filter((slide) => slide.active);
  expect(
    active.map((slide) => slide.id),
    `${phase}_ACTIVE_ORIGINAL_ID`
  ).toEqual([`card-${expected}`]);
  expect(state.index, `${phase}_PUBLIC_INDEX`).toBe(expected);
  const card = active[0]!;
  expect(
    card.right > state.track.left &&
      card.left < state.track.right &&
      card.bottom > state.track.top &&
      card.top < state.track.bottom,
    `${phase}_ACTIVE_VISIBLE`
  ).toBe(true);
  return card;
}

function assertRequiredCoverage(
  state: Awaited<ReturnType<typeof cards>>,
  phase: string,
  finiteCentered: boolean
) {
  const viewport = {
    ...state.track,
    left: state.track.left + state.before,
    right: state.track.right - state.after,
  };
  if (finiteCentered) {
    // Intentionally centered finite endpoints can leave exterior space. Interior gaps still count.
    viewport.left = Math.max(viewport.left, Math.min(...state.slides.map((card) => card.left)));
    viewport.right = Math.min(viewport.right, Math.max(...state.slides.map((card) => card.right)));
  }
  expect(viewport.right > viewport.left, `${phase}_POSITIVE_REQUIRED_SPAN`).toBe(true);
  expect(coverageHoles(viewport, state.slides, 'horizontal', 12, 1), `${phase}_COVERAGE`).toEqual(
    []
  );
}

async function runR02(page: Page, f: Factors): Promise<void> {
  const widths = [140, 210, 170, 250, 190, 230, 160, 220, 180];
  const centered = f.alignment !== 'peek';
  const peek = f.alignment !== 'center';
  const finite = f.loop === 'off' || f.loop === 'auto';
  await mount(
    page,
    {
      loop: loopOption(f.loop),
      perPage: 1,
      ...(f.sizing === 'auto' ? { autoWidth: true } : { fixedWidth: 170 }),
      center: centered,
      peek: peek ? { left: 24, right: 48 } : 0,
      gap: 12,
      speed: 80,
      roundLengths: false,
    },
    { count: 9, width: 600, height: 240, ...(f.sizing === 'auto' ? { widths } : {}) }
  );
  await authoredHeight(page, 240, f.sizing === 'auto' ? widths : undefined);
  const initial = await cards(page);
  expect(
    initial.originals.map((card) => card.id),
    'R02_FIXTURE_AUTHOR_IDS'
  ).toEqual(widths.map((_, index) => `card-${index}`));
  for (const [index, original] of initial.originals.entries())
    expect(
      Math.abs(original.width - (f.sizing === 'auto' ? widths[index]! : 170)),
      'R02_AUTHORED_CARD_WIDTH'
    ).toBeLessThanOrEqual(1);
  assertCards(initial, 'R02_INITIAL', 0);
  assertRequiredCoverage(initial, 'R02_INITIAL', finite && centered);
  await navigate(page, 3);
  const middle = await cards(page);
  const selected = assertCards(middle, 'R02_MIDDLE', 3);
  assertRequiredCoverage(middle, 'R02_MIDDLE', finite && centered);
  if (centered)
    expect(
      Math.abs(
        (selected.left + selected.right) / 2 -
          (middle.track.left + middle.before + middle.track.right - middle.after) / 2
      ),
      'R02_MIDDLE_CENTER'
    ).toBeLessThanOrEqual(1);
  await navigate(page, 8);
  const end = await cards(page);
  // Multi-card finite trim may select the final reachable snap **before** card 8.
  // The last card must reach the viewport edge; the snap number is not prescribed.
  const finiteTrim = finite && !centered && !end.canNext;
  assertCards(end, 'R02_LAST', finiteTrim ? end.index : 8);
  if (finiteTrim) {
    const last = end.slides.find((card) => card.id === 'card-8')!;
    expect(
      Math.abs(last.right - end.track.right),
      'R02_FINITE_TRIM_LAST_CARD_EDGE'
    ).toBeLessThanOrEqual(1);
  }
  assertRequiredCoverage(end, 'R02_LAST', finite && centered);
  await navigate(page, 'next');
  const seam = await cards(page);
  if (f.loop === 'auto' && seam.index === end.index && !seam.canNext)
    throw new Error(
      'CONTRACT_GAP: R02 loop:auto is declared, but nine originals with more than two viewport widths stay finite at the last->next boundary; automatic selection policy is unspecified.'
    );
  const expected = f.loop === 'off' ? end.index : 0;
  assertCards(seam, 'R02_FORWARD_BOUNDARY', expected);
  assertRequiredCoverage(seam, 'R02_FORWARD_BOUNDARY', finite && centered);
  await navigate(page, 'prev');
  const back = await cards(page);
  assertCards(back, 'R02_REVERSE_BOUNDARY', f.loop === 'off' ? expected - 1 : 8);
  assertRequiredCoverage(back, 'R02_REVERSE_BOUNDARY', finite && centered);
}

async function runR06(page: Page, f: Factors): Promise<void> {
  const effect = f.effect as 'slide' | 'fade' | 'cube';
  const direction = f.axis as 'horizontal' | 'vertical';
  await mount(
    page,
    {
      effect,
      direction,
      perPage: 1,
      speed: 1200,
      gap: 0,
      roundLengths: false,
      cubeEffect: { slideShadows: true, perspective: 900 },
    },
    {
      count: 5,
      width: 480,
      height: 300,
      contents: Array.from(
        { length: 5 },
        (_, i) =>
          `<button data-risk-face="${i}" style="display:block;width:100%;height:100%;background:hsl(${i * 60} 70% 60%)">Face ${i}</button>`
      ),
    }
  );
  await authoredHeight(page, 300);
  const frames = await page.evaluate(
    async ({ effect, interruption }) => {
      const s = (window as unknown as AuditWindow).auditSlider;
      const started = performance.now();
      const sample = () => {
        const track = s.track.getBoundingClientRect();
        const x = (track.left + track.right) / 2;
        const y = (track.top + track.bottom) / 2;
        const faces = s.slides.map((slide) => {
          const rect = slide.getBoundingClientRect();
          const css = getComputedStyle(slide);
          const opacity = Number(css.opacity);
          return {
            id: slide.dataset.caseId,
            opacity,
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            transform: css.transform,
            center:
              css.display !== 'none' &&
              css.visibility !== 'hidden' &&
              rect.left <= x &&
              rect.right >= x &&
              rect.top <= y &&
              rect.bottom >= y,
            finite:
              [rect.x, rect.y, rect.width, rect.height, opacity].every(Number.isFinite) &&
              !/NaN|Infinity/.test(css.transform),
          };
        });
        const hit = document.elementFromPoint(x, y)?.closest('.tvist-v1__slide');
        return {
          elapsedMs: performance.now() - started,
          transform: getComputedStyle(s.container).transform,
          faces,
          index: s.realIndex,
          enabled: s.isEnabled,
          width: track.width,
          height: track.height,
          hit: !!hit && s.root.contains(hit),
          shadows: [...s.root.querySelectorAll('.tvist-v1-slide-shadow-cube')].map((node) =>
            Number(getComputedStyle(node).opacity)
          ),
        };
      };
      const collect = async (count: number) => {
        const rows = [];
        for (let i = 0; i < count; i++) {
          await new Promise<void>((done) => requestAnimationFrame(() => done()));
          rows.push(sample());
        }
        return rows;
      };
      const initial = sample();
      if (
        initial.width <= 0 ||
        initial.height <= 0 ||
        !initial.faces.some((face) => face.center && face.opacity > 0.05)
      )
        throw new Error(
          'AUDIT_FIXTURE_ERROR: R06 authored initial face does not cover the sampled viewport center'
        );
      s.next();
      const before: ReturnType<typeof sample>[] = [];
      const observedMiddle = (frame: ReturnType<typeof sample>) => {
        if (effect === 'fade')
          return (
            frame.faces.filter((face) => face.opacity > 0.05 && face.opacity < 0.95).length >= 2
          );
        if (effect === 'cube')
          return (
            frame.transform !== initial.transform &&
            frame.shadows.some((opacity) => opacity > 0.05 && opacity < 0.95)
          );
        const vertical = s.options.direction === 'vertical';
        const distance = Math.abs(
          vertical
            ? frame.faces[0]!.top - initial.faces[0]!.top
            : frame.faces[0]!.left - initial.faces[0]!.left
        );
        return distance > 1 && distance < (vertical ? initial.height : initial.width) - 1;
      };
      // Interrupt only after measuring actual intermediate geometry/opacity on this browser.
      // A skipped sampling window under load cannot establish a production animation defect.
      while (performance.now() - started < 2000) {
        const delivered = await new Promise<boolean>((done) => {
          const request = requestAnimationFrame(() => {
            clearTimeout(deadline);
            done(true);
          });
          const deadline = setTimeout(
            () => {
              cancelAnimationFrame(request);
              done(false);
            },
            Math.max(0, 2000 - (performance.now() - started))
          );
        });
        if (!delivered) break;
        const frame = sample();
        before.push(frame);
        if (observedMiddle(frame)) break;
      }
      if (!before.length || !observedMiddle(before[before.length - 1]!))
        throw new Error(
          `AUDIT_FIXTURE_ERROR: R06 intermediate phase not observed before interruption; effect=${effect}; elapsedMs=${Math.round(performance.now() - started)}; samplesMs=${before.map((frame) => Math.round(frame.elapsedMs)).join(',')}`
        );
      if (interruption === 'resize') {
        s.root.style.width = '360px';
        s.root.style.height = '240px';
        s.track.style.height = '240px';
        s.root.style.setProperty('--risk-authored-height', '240px');
        s.update();
      } else if (interruption === 'reverse') s.prev();
      else s.disable();
      const after = await collect(12);
      if (interruption === 'disable') s.enable();
      return { initial, before, after, effect };
    },
    { effect, interruption: f.interruption }
  );
  const all = [...frames.before, ...frames.after];
  expect(
    all.every(
      (frame) => frame.faces.every((face) => face.finite) && !/NaN|Infinity/.test(frame.transform)
    ),
    'R06_FINITE_INTERMEDIATE_DOM'
  ).toBe(true);
  const enabledFrames = all.filter((frame) => frame.enabled);
  const blankFrames = enabledFrames.filter(
    (frame) => !frame.faces.some((face) => face.center && face.opacity > 0.05)
  );
  expect(
    blankFrames.map((frame) => ({
      elapsedMs: frame.elapsedMs,
      index: frame.index,
      faces: frame.faces,
    })),
    'R06_ENABLED_CENTER_HAS_RENDERED_FACE'
  ).toEqual([]);
  if (effect === 'cube') {
    expect(
      enabledFrames.every((frame) => frame.hit),
      'R06_CUBE_CENTER_HIT_FACE'
    ).toBe(true);
    expect(
      frames.before.some((frame) =>
        frame.shadows.some((opacity) => opacity > 0.05 && opacity < 0.95)
      ),
      'R06_CUBE_INTERMEDIATE_SHADOW'
    ).toBe(true);
    expect(
      enabledFrames.every((frame) =>
        frame.shadows.every((opacity) => Number.isFinite(opacity) && opacity >= 0 && opacity <= 1)
      ),
      'R06_CUBE_SHADOW_RANGE'
    ).toBe(true);
  }
  if (f.interruption === 'disable')
    expect(
      frames.after.every((frame) => !frame.enabled),
      'R06_DISABLED_THROUGH_OBSERVATION'
    ).toBe(true);
  if (f.interruption === 'resize') {
    expect(
      Math.abs(frames.after[frames.after.length - 1]!.width - 360),
      'R06_RESIZE_WIDTH'
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(frames.after[frames.after.length - 1]!.height - 240),
      'R06_RESIZE_HEIGHT'
    ).toBeLessThanOrEqual(1);
  }
  await stable(page);
  if (f.interruption !== 'disable') {
    const settled = await cards(page);
    // Resize policy may preserve the origin or the pending target. Either must be coherent.
    if (f.interruption === 'resize')
      expect([0, 1], 'R06_RESIZE_RELEVANT_SELECTION').toContain(settled.index);
    assertCards(
      settled,
      'R06_SETTLED_INTERRUPTION',
      f.interruption === 'reverse' ? 0 : settled.index
    );
  }
  await navigate(page, 2);
  const recovered = await cards(page);
  const active = assertCards(recovered, 'R06_RECOVERY', 2);
  expect(active.text, 'R06_RECOVERED_AUTHOR_CONTENT').toBe('Face 2');
}

async function gridState(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as AuditWindow;
    const s = w.auditSlider;
    const classes = w.TvistV1.CLASSES;
    const rect = (node: Element) => {
      const r = node.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      };
    };
    return {
      track: rect(s.track),
      originals: w.auditOriginals!.map((node) => ({
        id: node.dataset.caseId!,
        connected: s.root.contains(node),
        shown: getComputedStyle(node).display !== 'none',
        ...rect(node),
      })),
      pages: s.slides.map((node) => ({
        ...rect(node),
        active: node.classList.contains(classes.slideActive),
        ids: [...node.querySelectorAll<HTMLElement>('[data-case-id]')].map(
          (card) => card.dataset.caseId!
        ),
        rows: [...node.querySelectorAll(`.${classes.gridRow}`)].map((row) =>
          [...row.querySelectorAll<HTMLElement>(`.${classes.gridCol}`)].map((cell) => rect(cell))
        ),
      })),
    };
  });
}

function assertGrid(
  state: Awaited<ReturnType<typeof gridState>>,
  phase: string,
  columns: number,
  hidden: boolean
) {
  const ids = Array.from({ length: 7 }, (_, index) => `card-${index}`);
  expect(state.track.width > 0 && state.track.height > 0, `${phase}_POSITIVE_VIEWPORT`).toBe(true);
  expect(
    state.originals.filter((card) => card.connected).map((card) => card.id),
    `${phase}_AUTHOR_NODE_MEMBERSHIP`
  ).toEqual(ids);
  expect(
    state.originals.filter((card) => card.shown).map((card) => card.id),
    `${phase}_FILTERED_AUTHOR_MEMBERSHIP`
  ).toEqual(ids.filter((id) => !hidden || id !== 'card-2'));
  expect(
    state.originals
      .filter((card) => card.shown)
      .every(
        (card) =>
          Number.isFinite(card.left) &&
          Number.isFinite(card.top) &&
          card.width > 0 &&
          card.height > 0
      ),
    `${phase}_VISIBLE_ORIGINAL_RECTS`
  ).toBe(true);
  const active = state.pages.filter((view) => view.active);
  expect(active.length, `${phase}_ONE_ACTIVE_PHYSICAL_PAGE`).toBe(1);
  expect(
    active[0]!.right > state.track.left &&
      active[0]!.left < state.track.right &&
      active[0]!.bottom > state.track.top &&
      active[0]!.top < state.track.bottom,
    `${phase}_ACTIVE_PAGE_INTERSECTS_VIEWPORT`
  ).toBe(true);
  expect(
    active[0]!.ids.some((id) => ids.includes(id) && (!hidden || id !== 'card-2')),
    `${phase}_ACTIVE_PAGE_HAS_AUTHOR_CONTENT`
  ).toBe(true);
  for (const view of state.pages) {
    expect(view.rows.length, `${phase}_GRID_ROWS`).toBe(2);
    expect(
      view.rows.every((row) => row.length <= columns),
      `${phase}_GRID_COLUMN_LIMIT`
    ).toBe(true);
    expect(
      view.ids.length <= columns * 2 && view.ids.every((id) => ids.includes(id)),
      `${phase}_KNOWN_PAGE_CONTENT`
    ).toBe(true);
    for (const row of view.rows)
      for (let i = 1; i < row.length; i++)
        expect(row[i]!.left >= row[i - 1]!.right - 1, `${phase}_CELLS_DO_NOT_OVERLAP`).toBe(true);
  }
  return active[0]!.ids.join('|');
}

async function runR08(page: Page, f: Factors): Promise<void> {
  const columns = f.grid === '2x2' ? 2 : 3;
  await mount(
    page,
    { grid: { rows: 2, cols: columns }, loop: loopOption(f.loop), perPage: 1, gap: 12, speed: 80 },
    {
      count: 7,
      width: 600,
      height: 300,
      contents: Array.from(
        { length: 7 },
        (_, i) => `<div data-risk-grid-card="${i}" style="height:60px">Grid card ${i}</div>`
      ),
    }
  );
  await stable(page);
  const initial = await gridState(page);
  // Assert while the corresponding DOM still exists so failure screenshots/snapshots are usable.
  const firstIds = assertGrid(initial, 'R08_INIT', columns, false);
  // A per-cell hide/reveal is not a contract for compacting/repacking grid pages.
  const filter = async (hide: boolean) => {
    await page.evaluate((hide) => {
      const s = (window as unknown as AuditWindow).auditSlider;
      document.getElementById('risk-grid-author-filter')?.remove();
      if (hide) {
        const style = document.createElement('style');
        style.id = 'risk-grid-author-filter';
        style.textContent = '#audit-slider [data-case-id="card-2"] { display:none !important; }';
        document.head.append(style);
      }
      s.update();
    }, hide);
    await stable(page);
    return gridState(page);
  };
  await navigate(page, 'next');
  const next = await gridState(page);
  expect(
    assertGrid(next, 'R08_AFTER_NEXT', columns, false),
    'R08_NEXT_REACHES_DIFFERENT_CONTENT'
  ).not.toBe(firstIds);
  if (f.filter === 'hide-return') {
    assertGrid(await filter(true), 'R08_HIDDEN', columns, true);
    assertGrid(await filter(false), 'R08_RESTORED', columns, false);
    // Do not assume a selection-preservation policy across filtering: reselect page 1 first.
    await navigate(page, 1);
  }
  await navigate(page, 'prev');
  const back = await gridState(page);
  expect(assertGrid(back, 'R08_BACK', columns, false), 'R08_PREV_RETURNS_ORIGINAL_PAGE').toBe(
    firstIds
  );
  const authorOrder = await page.evaluate(() => {
    const w = window as unknown as AuditWindow;
    const s = w.auditSlider;
    s.destroy();
    return [...s.root.querySelectorAll<HTMLElement>('[data-case-id]')].map(
      (node) => node.dataset.caseId!
    );
  });
  expect(
    restoredOriginalErrors(
      Array.from({ length: 7 }, (_, i) => `card-${i}`),
      authorOrder
    ),
    'R08_DESTROY_AUTHOR_ORDER'
  ).toEqual([]);
}

export async function runRiskGeometryCase(page: Page, id: string): Promise<void> {
  for (const group of riskGeometryManifest) {
    const tuple = group.tuples.find((item) => item.id === id);
    if (!tuple) continue;
    if (group.family === 'R02') return runR02(page, tuple.factors);
    if (group.family === 'R06') return runR06(page, tuple.factors);
    if (group.family === 'R08') return runR08(page, tuple.factors);
  }
  throw new Error(`Unknown risk geometry case ${id}`);
}
