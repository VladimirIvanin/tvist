import type { TvistOptions } from '../../src/core/types';

/** Finite audit levels. Coverage percentages apply to this declaration, not all possible inputs. */
export const domains = {
  count: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 17],
  perPage: [1, 1.5, 2, 2.5, 3, 4],
  group: [1, 2, 3, 4],
  loop: ['off', 'on', 'clones', 'auto'],
  center: ['off', 'active', 'focus', 'justify'],
  axis: ['horizontal', 'vertical'],
  gap: [0, 13.5, '1rem', '3%', 'calc(1rem + 2px)', 'clamp(8px,2vw,24px)'],
  peek: [0, 32, '10%', 'asymmetric'],
  drag: ['off', 'snap', 'free'],
  round: [true, false],
  sizing: ['page', 'auto', 'fixed', 'minimum'],
  effect: ['slide', 'fade', 'cube'],
  grid: ['off', '2x2', '2x3'],
} as const;
export type Row = Record<keyof typeof domains, number>;
export const triples: (keyof Row)[][] = [
  ['loop', 'count', 'group'],
  ['loop', 'sizing', 'center'],
  ['drag', 'loop', 'peek'],
  ['effect', 'axis', 'sizing'],
  ['grid', 'count', 'loop'],
];
export const matrixExclusions = [
  {
    id: 'effect-single-page',
    rule: 'effect != slide implies perPage = 1',
    reason: 'Effects normalize perPage to 1; normalization is covered separately.',
  },
  {
    id: 'grid-integer-page',
    rule: 'grid != off implies integer perPage',
    reason: 'The public API reference explicitly excludes fractional perPage for grid.',
  },
] as const;

type AnyRow = Record<string, number>;
type PartialRow = Partial<AnyRow>;
type Domain = Record<string, readonly unknown[]>;
interface Requirement {
  key: string;
  factors: string[];
  values: number[];
}
interface CoveringResult<R> {
  rows: R[];
  required: string[];
  covered: string[];
  excluded: string[];
}

const geometryFeasible = (row: PartialRow): boolean => {
  if (
    row.effect !== undefined &&
    row.effect !== 0 &&
    row.perPage !== undefined &&
    row.perPage !== 0
  )
    return false;
  if (
    row.grid !== undefined &&
    row.grid !== 0 &&
    row.perPage !== undefined &&
    [1, 3].includes(row.perPage)
  )
    return false;
  return true;
};
function inDomain(row: AnyRow, domain: Domain): boolean {
  return Object.keys(domain).every(
    (key) => Number.isInteger(row[key]) && row[key]! >= 0 && row[key]! < domain[key]!.length
  );
}
/** Full-row validator is intentionally separate from the generator's partial feasibility solver. */
export function valid(row: Row): boolean {
  if (!inDomain(row, domains)) return false;
  return (
    (domains.effect[row.effect] === 'slide' || domains.perPage[row.perPage] === 1) &&
    (domains.grid[row.grid] === 'off' || Number.isInteger(domains.perPage[row.perPage]))
  );
}
function interactionSets(domain: Domain, mandatoryTriples: readonly string[][]): string[][] {
  const factors = Object.keys(domain);
  return factors
    .flatMap((a, index) => factors.slice(index + 1).map((b) => [a, b]))
    .concat(mandatoryTriples);
}
function encode(factors: string[], values: number[]): string {
  return factors.map((factor, index) => `${factor}=${values[index]}`).join('|');
}
function enumerate(domain: Domain, sets: string[][], feasible: (row: PartialRow) => boolean) {
  const required: Requirement[] = [];
  const excluded: string[] = [];
  for (const factors of sets) {
    const visit = (position: number, values: number[]) => {
      if (position === factors.length) {
        const key = encode(factors, values);
        const partial = Object.fromEntries(factors.map((factor, index) => [factor, values[index]]));
        if (feasible(partial)) required.push({ key, factors, values });
        else excluded.push(key);
        return;
      }
      const factor = factors[position]!;
      for (let value = 0; value < domain[factor]!.length; value += 1)
        visit(position + 1, [...values, value]);
    };
    visit(0, []);
  }
  return { required, excluded };
}

/** Seeded greedy completion + local improvement; unrelated factors are never zero-filled witnesses. */
function cover<R extends AnyRow>(
  domain: Domain,
  sets: string[][],
  feasible: (row: PartialRow) => boolean,
  isValid: (row: R) => boolean,
  seed: number
): CoveringResult<R> {
  const factors = Object.keys(domain);
  const { required, excluded } = enumerate(domain, sets, feasible);
  const indices = new Map(required.map((requirement, index) => [requirement.key, index]));
  const uncovered = new Set(required.map((_, index) => index));
  const ids = (row: R) =>
    sets
      .map((set) =>
        indices.get(
          encode(
            set,
            set.map((key) => row[key]!)
          )
        )
      )
      .filter((index): index is number => index !== undefined);
  const score = (row: R) => ids(row).reduce((sum, index) => sum + Number(uncovered.has(index)), 0);
  let randomState = seed >>> 0;
  const random = () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  const shuffled = <T>(values: readonly T[]): T[] => {
    const copy = [...values];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const other = Math.floor(random() * (index + 1));
      [copy[index], copy[other]] = [copy[other]!, copy[index]!];
    }
    return copy;
  };
  const rows: R[] = [];
  while (uncovered.size) {
    let target = required[uncovered.values().next().value!]!;
    for (const index of uncovered) {
      const candidate = required[index]!;
      if (candidate.factors.length > target.factors.length) {
        target = candidate;
        break;
      }
    }
    let best: R | undefined;
    let bestScore = -1;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const partial: PartialRow = Object.fromEntries(
        target.factors.map((factor, index) => [factor, target.values[index]])
      );
      for (const factor of shuffled(factors.filter((key) => !(key in partial)))) {
        const allowed = Array.from({ length: domain[factor]!.length }, (_, index) => index).filter(
          (value) => feasible({ ...partial, [factor]: value })
        );
        if (!allowed.length) throw new Error(`No completion for declared tuple ${target.key}`);
        partial[factor] = allowed[Math.floor(random() * allowed.length)]!;
      }
      const row = partial as R;
      for (let pass = 0; pass < 2; pass += 1) {
        let improved = false;
        for (const factor of shuffled(factors.filter((key) => !target.factors.includes(key)))) {
          let chosen = row[factor]!;
          let highest = score(row);
          for (const value of shuffled(
            Array.from({ length: domain[factor]!.length }, (_, index) => index)
          )) {
            (row as AnyRow)[factor] = value;
            if (!isValid(row)) continue;
            const candidateScore = score(row);
            if (candidateScore > highest) {
              highest = candidateScore;
              chosen = value;
              improved = true;
            }
          }
          (row as AnyRow)[factor] = chosen;
        }
        if (!improved) break;
      }
      if (!isValid(row)) throw new Error('Covering array emitted invalid row');
      const candidateScore = score(row);
      if (candidateScore > bestScore) {
        bestScore = candidateScore;
        best = { ...row };
      }
    }
    if (!best || bestScore <= 0)
      throw new Error(`Covering array made no progress at ${target.key}`);
    rows.push(best);
    ids(best).forEach((index) => uncovered.delete(index));
  }
  const counts = new Map<number, number>();
  rows.forEach((row) => ids(row).forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1)));
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const covered = ids(rows[index]!);
    if (covered.every((id) => counts.get(id)! > 1)) {
      covered.forEach((id) => counts.set(id, counts.get(id)! - 1));
      rows.splice(index, 1);
    }
  }
  return {
    rows,
    required: required.map((item) => item.key),
    covered: required.filter((_, index) => counts.has(index)).map((item) => item.key),
    excluded,
  };
}
export function generateMatrix(): CoveringResult<Row> {
  return cover<Row>(domains, interactionSets(domains, triples), geometryFeasible, valid, 20261031);
}

/** Rebuild the whole denominator by mixed-radix enumeration and exhaustive constraint completions. */
function independentlyRequired<R extends AnyRow>(
  domain: Domain,
  sets: string[][],
  constrained: string[],
  isValid: (row: R) => boolean
): string[] {
  const base = Object.fromEntries(Object.keys(domain).map((key) => [key, 0])) as R;
  const completions: R[] = [];
  const expand = (position: number, row: R) => {
    if (position === constrained.length) {
      if (isValid(row)) completions.push(row);
      return;
    }
    const factor = constrained[position]!;
    for (let value = 0; value < domain[factor]!.length; value += 1)
      expand(position + 1, { ...row, [factor]: value });
  };
  expand(0, base);
  const denominator: string[] = [];
  for (const set of sets) {
    const radices = set.map((factor) => domain[factor]!.length);
    const size = radices.reduce((product, radix) => product * radix, 1);
    for (let ordinal = 0; ordinal < size; ordinal += 1) {
      let remainder = ordinal;
      const values = radices.map((radix) => {
        const value = remainder % radix;
        remainder = Math.floor(remainder / radix);
        return value;
      });
      if (
        completions.some((completion) =>
          set.every(
            (factor, index) => !constrained.includes(factor) || completion[factor] === values[index]
          )
        )
      )
        denominator.push(encode(set, values));
    }
  }
  return denominator;
}
function verify<R extends AnyRow>(
  rows: R[],
  suppliedRequired: string[],
  domain: Domain,
  sets: string[][],
  constrained: string[],
  isValid: (row: R) => boolean
): string[] {
  const required = independentlyRequired(domain, sets, constrained, isValid);
  const complete = new Set(required);
  const supplied = new Set(suppliedRequired);
  const errors = rows.flatMap((row, index) => (isValid(row) ? [] : [`invalid-row:${index}`]));
  for (const key of required) {
    if (!supplied.has(key)) errors.push(`denominator-missing:${key}`);
    const terms = key.split('|').map((term) => {
      const [factor, value] = term.split('=');
      return [factor!, Number(value)] as const;
    });
    if (!rows.some((row) => terms.every(([factor, value]) => row[factor] === value)))
      errors.push(`uncovered:${key}`);
  }
  for (const key of supplied) if (!complete.has(key)) errors.push(`denominator-unexpected:${key}`);
  if (supplied.size !== suppliedRequired.length) errors.push('denominator-duplicates');
  return errors;
}
export function verifyMatrix(rows: Row[], required: string[]): string[] {
  return verify(
    rows,
    required,
    domains,
    interactionSets(domains, triples),
    ['effect', 'grid', 'perPage'],
    valid
  );
}
export function optionsFor(row: Row): TvistOptions {
  const d = domains;
  return {
    perPage: d.perPage[row.perPage],
    slidesPerGroup: d.group[row.group],
    loop:
      row.loop === 0
        ? false
        : row.loop === 1
          ? true
          : row.loop === 2
            ? { withClones: true }
            : 'auto',
    center:
      row.center === 0
        ? false
        : row.center === 1
          ? true
          : row.center === 2
            ? { focus: true }
            : { justify: true },
    direction: d.axis[row.axis],
    gap: d.gap[row.gap],
    peek:
      row.peek === 3
        ? row.axis
          ? { top: 16, bottom: 64 }
          : { left: 16, right: 64 }
        : (d.peek[row.peek] as number | string),
    drag: row.drag === 0 ? false : row.drag === 1 ? true : 'free',
    roundLengths: d.round[row.round],
    autoWidth: row.sizing === 1 && !row.axis,
    autoHeight: row.sizing === 1 && !!row.axis,
    ...(row.sizing === 2 ? (row.axis ? { fixedHeight: 120 } : { fixedWidth: 180 }) : {}),
    ...(row.sizing === 3 ? { slideMinSize: 160 } : {}),
    effect: d.effect[row.effect],
    ...(row.grid ? { grid: { rows: 2, cols: row.grid === 1 ? 2 : 3 } } : {}),
    speed: 0,
    visibility: false,
  };
}
/** Explicit relative-count boundaries supplement pairwise interactions. */
export function boundaryCases(): Array<{
  id: string;
  count: number;
  perPage: number;
  relation: string;
  options: TvistOptions;
}> {
  return [1, 2, 3, 4].flatMap((perPage) =>
    [
      ['P-1', perPage - 1],
      ['P', perPage],
      ['P+1', perPage + 1],
      ['2P-1', 2 * perPage - 1],
      ['2P', 2 * perPage],
      ['2P+1', 2 * perPage + 1],
    ].map(([relation, count]) => ({
      id: `BOUNDARY-P${perPage}-${relation}`,
      count: Number(count),
      perPage,
      relation: String(relation),
      options: { perPage, loop: true, gap: 13.5, speed: 0, visibility: false },
    }))
  );
}

export const moduleDomains = {
  autoplay: ['off', 'timer', 'waitForVideo'],
  lazy: ['off', 'module', 'native'],
  visibility: [false, true],
  scrollbar: [false, true],
  arrows: [false, true],
  pagination: ['off', 'bullets', 'fraction'],
  video: [false, true],
  grid: ['off', '2x2'],
  effect: ['slide', 'fade', 'cube'],
  loop: ['off', 'on', 'clones'],
  axis: ['horizontal', 'vertical'],
} as const;
export type ModuleRow = Record<keyof typeof moduleDomains, number>;
export const moduleTriples: (keyof ModuleRow)[][] = [
  ['autoplay', 'video', 'visibility'],
  ['loop', 'grid', 'effect'],
  ['effect', 'autoplay', 'lazy'],
  ['pagination', 'loop', 'scrollbar'],
];
export const moduleExclusions: { id: string; rule: string; reason: string }[] = [];
const moduleFeasible = (_row: PartialRow) => true;
export function validModuleRow(row: ModuleRow): boolean {
  return inDomain(row, moduleDomains);
}
export function generateModuleMatrix(): CoveringResult<ModuleRow> {
  return cover<ModuleRow>(
    moduleDomains,
    interactionSets(moduleDomains, moduleTriples),
    moduleFeasible,
    validModuleRow,
    20261101
  );
}
export function verifyModuleMatrix(rows: ModuleRow[], required: string[]): string[] {
  return verify(
    rows,
    required,
    moduleDomains,
    interactionSets(moduleDomains, moduleTriples),
    ['effect', 'grid', 'autoplay', 'video'],
    validModuleRow
  );
}
export function optionsForModule(row: ModuleRow): TvistOptions {
  return {
    perPage: 1,
    speed: 0,
    direction: moduleDomains.axis[row.axis],
    autoplay:
      row.autoplay === 0
        ? false
        : {
            delay: 80,
            pauseOnHover: false,
            pauseOnFocus: false,
            pauseOnInteraction: false,
            waitForVideo: row.autoplay === 2,
          },
    lazy: row.lazy === 1 ? { preloadPrevNext: 1 } : false,
    nativeLazyAdjacent: row.lazy === 2 ? { onInit: true, onTransitionStart: true } : false,
    visibility: moduleDomains.visibility[row.visibility],
    scrollbar: moduleDomains.scrollbar[row.scrollbar],
    arrows: moduleDomains.arrows[row.arrows],
    pagination:
      row.pagination === 0 ? false : { type: row.pagination === 1 ? 'bullets' : 'fraction' },
    video: moduleDomains.video[row.video],
    ...(row.grid === 1 ? { grid: { rows: 2, cols: 2 } } : {}),
    effect: moduleDomains.effect[row.effect],
    loop: row.loop === 0 ? false : row.loop === 1 ? true : { withClones: true },
  };
}
