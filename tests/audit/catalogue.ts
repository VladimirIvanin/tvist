import { geometryCases, runGeometryCase } from './geometry';
import { inputCases, runInputCase } from './input';
import { mediaCases, runMediaCase } from './media';
import { commitCases, runCommitCase } from './commits';
import { nativeMediaCases, runNativeMediaCase } from './native-media';
import { nativeInputCases, runNativeInputCase } from './native-input';
import { unitRegressionCases, runUnitRegressionCase } from './unit-regressions';
import { eventRegressionCases, runEventRegressionCase } from './event-regressions';
import { riskGeometryCases, runRiskGeometryCase } from './risk-geometry';
import { riskInputCases, runRiskInputCase } from './risk-input';
import { riskMediaCases, runRiskMediaCase } from './risk-media';
import { sourceGeometryCases, runSourceGeometryCase } from './source-geometry';
import { sourceLifecycleCases, runSourceLifecycleCase } from './source-lifecycle';
import { sourceMediaCases, runSourceMediaCase } from './source-media';
import type { AuditCase, CaseRunner } from './types';

/** Real executable exports, not replacement factories or a second implementation. */
export const auditCatalogueSuites: ReadonlyArray<{
  file: string;
  casesExport: string;
  runnerExport: string;
  cases: AuditCase[];
  run: CaseRunner;
}> = [
  {
    file: 'tests/audit/geometry.ts',
    casesExport: 'geometryCases',
    runnerExport: 'runGeometryCase',
    cases: geometryCases,
    run: runGeometryCase,
  },
  {
    file: 'tests/audit/input.ts',
    casesExport: 'inputCases',
    runnerExport: 'runInputCase',
    cases: inputCases,
    run: runInputCase,
  },
  {
    file: 'tests/audit/media.ts',
    casesExport: 'mediaCases',
    runnerExport: 'runMediaCase',
    cases: mediaCases,
    run: runMediaCase,
  },
  {
    file: 'tests/audit/commits.ts',
    casesExport: 'commitCases',
    runnerExport: 'runCommitCase',
    cases: commitCases,
    run: runCommitCase,
  },
  {
    file: 'tests/audit/native-media.ts',
    casesExport: 'nativeMediaCases',
    runnerExport: 'runNativeMediaCase',
    cases: nativeMediaCases,
    run: runNativeMediaCase,
  },
  {
    file: 'tests/audit/native-input.ts',
    casesExport: 'nativeInputCases',
    runnerExport: 'runNativeInputCase',
    cases: nativeInputCases,
    run: runNativeInputCase,
  },
  {
    file: 'tests/audit/unit-regressions.ts',
    casesExport: 'unitRegressionCases',
    runnerExport: 'runUnitRegressionCase',
    cases: unitRegressionCases,
    run: runUnitRegressionCase,
  },
  {
    file: 'tests/audit/event-regressions.ts',
    casesExport: 'eventRegressionCases',
    runnerExport: 'runEventRegressionCase',
    cases: eventRegressionCases,
    run: runEventRegressionCase,
  },
  {
    file: 'tests/audit/risk-geometry.ts',
    casesExport: 'riskGeometryCases',
    runnerExport: 'runRiskGeometryCase',
    cases: riskGeometryCases,
    run: runRiskGeometryCase,
  },
  {
    file: 'tests/audit/risk-input.ts',
    casesExport: 'riskInputCases',
    runnerExport: 'runRiskInputCase',
    cases: riskInputCases,
    run: runRiskInputCase,
  },
  {
    file: 'tests/audit/risk-media.ts',
    casesExport: 'riskMediaCases',
    runnerExport: 'runRiskMediaCase',
    cases: riskMediaCases,
    run: runRiskMediaCase,
  },
  {
    file: 'tests/audit/source-geometry.ts',
    casesExport: 'sourceGeometryCases',
    runnerExport: 'runSourceGeometryCase',
    cases: sourceGeometryCases,
    run: runSourceGeometryCase,
  },
  {
    file: 'tests/audit/source-lifecycle.ts',
    casesExport: 'sourceLifecycleCases',
    runnerExport: 'runSourceLifecycleCase',
    cases: sourceLifecycleCases,
    run: runSourceLifecycleCase,
  },
  {
    file: 'tests/audit/source-media.ts',
    casesExport: 'sourceMediaCases',
    runnerExport: 'runSourceMediaCase',
    cases: sourceMediaCases,
    run: runSourceMediaCase,
  },
];

export const catalogueProjects = [
  'chromium',
  'firefox',
  'webkit',
  'chromium-mobile',
  'webkit-mobile',
] as const;
export type CatalogueProject = (typeof catalogueProjects)[number];
export type CatalogueJson =
  | null
  | boolean
  | number
  | string
  | CatalogueJson[]
  | { [key: string]: CatalogueJson };

/** Offsets are TypeScript UTF-16 offsets; lines are one-based. Hash covers the whole file. */
export interface CatalogueSource {
  file: string;
  line: number;
  endLine: number;
  start: number;
  end: number;
  fileSha256: string;
  symbol?: string;
  text: string;
}
export interface CatalogueExpression {
  sourceRef?: string;
  representation: 'literal-json' | 'source-expression' | 'omitted-use-factory-default';
  literal?: CatalogueJson;
  /** Exact declarations referenced by this expression; never eagerly invoke callbacks. */
  dependencyRefs: string[];
}
export interface CatalogueStep {
  sourceRef: string;
  origin: 'case' | 'helper';
  /** Source order only: loops and callbacks do not imply a flattened runtime trace. */
  contextRefs: string[];
  calledDefinitionRef?: string;
}
export interface CatalogueFactory extends CatalogueStep {
  kind: 'fixture-helper' | 'slider-constructor';
  callee: string;
  options: CatalogueExpression;
  fixture: CatalogueExpression;
  /** Only mount helpers expose a normalized fixture argument. Constructor DOM stays opaque. */
  fixtureModel: 'mount-argument' | 'opaque-dom-construction';
}
export interface CatalogueAssertion extends CatalogueStep {
  kind: 'expect' | 'throw' | 'assertion-helper';
  label?: CatalogueExpression;
}
export interface CatalogueContract {
  section: string;
  name: string;
  status: string;
  source?: string;
  line?: number;
  note?: string;
}
export interface CatalogueEntry extends AuditCase {
  execution: {
    suiteFile: string;
    casesExport: string;
    runnerExport: string;
    runnerRef: string;
    definitionRefs: string[];
    selector: { id: string; number?: number };
    extraction: 'source-backed-partial';
    limitations: string[];
  };
  factories: CatalogueFactory[];
  optionUpdates: Array<CatalogueStep & { options: CatalogueExpression }>;
  /** Includes definitions reached through real local helpers, deduplicated by source location. */
  helperRefs: string[];
  actions: CatalogueStep[];
  callbacks: CatalogueStep[];
  assertions: CatalogueAssertion[];
  contractRefs: CatalogueContract[];
  support: {
    assessment: 'not-evaluated';
    configuredProjects: CatalogueProject[];
    defaultProjects: CatalogueProject[];
    realDevices: false;
    signalRefs: string[];
  };
}
export interface AuditCatalogue {
  schemaVersion: 1;
  generatedBy: string;
  /** No timestamp: identical input sources produce byte-identical catalogues. */
  semantics: string[];
  files: Record<string, string>;
  snippets: Record<string, CatalogueSource>;
  cases: CatalogueEntry[];
  counts: { cases: number; suites: number; factories: number; assertions: number; partial: number };
}

/** Portable structural schema. Cross references, source spans and denominator use the validator below. */
export const auditCatalogueSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Tvist source-backed audit catalogue',
  type: 'object',
  required: ['schemaVersion', 'generatedBy', 'semantics', 'files', 'snippets', 'cases', 'counts'],
  properties: {
    schemaVersion: { const: 1 },
    generatedBy: { type: 'string' },
    semantics: { type: 'array', items: { type: 'string' } },
    files: { type: 'object', additionalProperties: { type: 'string', pattern: '^[a-f0-9]{64}$' } },
    snippets: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        required: ['file', 'line', 'endLine', 'start', 'end', 'fileSha256', 'text'],
      },
    },
    cases: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'id',
          'title',
          'family',
          'priority',
          'sources',
          'execution',
          'factories',
          'optionUpdates',
          'helperRefs',
          'actions',
          'callbacks',
          'assertions',
          'contractRefs',
          'support',
        ],
        properties: {
          id: { type: 'string', minLength: 1 },
          title: { type: 'string' },
          family: { type: 'string' },
          priority: { enum: ['P0', 'P1', 'P2'] },
          sources: { type: 'array', items: { type: 'string', format: 'uri' } },
          execution: {
            type: 'object',
            required: [
              'suiteFile',
              'casesExport',
              'runnerExport',
              'runnerRef',
              'definitionRefs',
              'selector',
              'extraction',
              'limitations',
            ],
            properties: { extraction: { const: 'source-backed-partial' } },
          },
          support: {
            type: 'object',
            required: [
              'assessment',
              'configuredProjects',
              'defaultProjects',
              'realDevices',
              'signalRefs',
            ],
            properties: { assessment: { const: 'not-evaluated' }, realDevices: { const: false } },
          },
        },
      },
    },
    counts: { type: 'object', required: ['cases', 'suites', 'factories', 'assertions', 'partial'] },
  },
} as const;

export interface CatalogueValidationOptions {
  /** Pass the runner's own registry to independently check the denominator. */
  expectedCases?: readonly AuditCase[];
  /** Optional live source verification; return raw text and SHA-256 of the exact UTF-8 file. */
  readSource?: (file: string) => { text: string; sha256: string };
}

/** Validate loaded JSON without executing a fixture, browser callback or test runner. */
export function validateAuditCatalogue(
  value: unknown,
  options: CatalogueValidationOptions = {}
): string[] {
  const errors: string[] = [];
  const object = (v: unknown): v is Record<string, any> =>
    !!v && typeof v === 'object' && !Array.isArray(v);
  if (
    !object(value) ||
    value.schemaVersion !== 1 ||
    !Array.isArray(value.cases) ||
    !object(value.snippets) ||
    !object(value.files) ||
    !object(value.counts)
  )
    return ['catalogue: invalid root shape'];
  const expected = options.expectedCases ?? auditCatalogueSuites.flatMap((suite) => suite.cases);
  const expectedMap = new Map(expected.map((entry) => [entry.id, entry]));
  if (expectedMap.size !== expected.length) errors.push('registry: duplicate case IDs');
  const snippets = value.snippets as Record<string, CatalogueSource>;
  const seen = new Set<string>();
  const verifyRef = (ref: unknown, owner: string) => {
    if (typeof ref !== 'string' || !Object.prototype.hasOwnProperty.call(snippets, ref))
      errors.push(`${owner}: missing source ref ${String(ref)}`);
  };
  const visitRefs = (node: unknown, owner: string) => {
    if (Array.isArray(node)) {
      node.forEach((item) => visitRefs(item, owner));
      return;
    }
    if (!object(node)) return;
    for (const [key, child] of Object.entries(node)) {
      if (key.endsWith('Ref') && child !== undefined) verifyRef(child, owner);
      else if (key.endsWith('Refs') && key !== 'contractRefs') {
        if (!Array.isArray(child)) errors.push(`${owner}: ${key} must be an array`);
        else child.forEach((ref) => verifyRef(ref, owner));
      } else visitRefs(child, owner);
    }
  };
  const sourceCache = new Map<string, { text: string; sha256: string }>();
  for (const [file, sha256] of Object.entries(value.files)) {
    if (typeof sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(sha256))
      errors.push(`${file}: invalid manifest hash`);
    if (options.readSource) {
      try {
        const source = options.readSource(file);
        sourceCache.set(file, source);
        if (source.sha256 !== sha256) errors.push(`${file}: stale source hash`);
      } catch (error) {
        errors.push(`${file}: cannot read source: ${String(error)}`);
      }
    }
  }
  for (const [ref, snippet] of Object.entries(snippets)) {
    if (
      !object(snippet) ||
      typeof snippet.file !== 'string' ||
      typeof snippet.text !== 'string' ||
      !Number.isInteger(snippet.start) ||
      !Number.isInteger(snippet.end) ||
      snippet.start < 0 ||
      snippet.end < snippet.start ||
      !Number.isInteger(snippet.line) ||
      snippet.line < 1 ||
      !Number.isInteger(snippet.endLine) ||
      snippet.endLine < snippet.line
    ) {
      errors.push(`${ref}: invalid source span`);
      continue;
    }
    if (ref !== `${snippet.file}@${snippet.start}:${snippet.end}`)
      errors.push(`${ref}: source key disagrees with span`);
    if (value.files[snippet.file] !== snippet.fileSha256)
      errors.push(`${ref}: file hash disagrees with manifest`);
    if (options.readSource) {
      try {
        let source = sourceCache.get(snippet.file);
        if (!source) {
          source = options.readSource(snippet.file);
          sourceCache.set(snippet.file, source);
        }
        if (source.sha256 !== snippet.fileSha256) errors.push(`${snippet.file}: stale source hash`);
        if (source.text.slice(snippet.start, snippet.end) !== snippet.text)
          errors.push(`${ref}: stale source text`);
        if (source.text.slice(0, snippet.start).split('\n').length !== snippet.line)
          errors.push(`${ref}: stale source line`);
        if (
          source.text.slice(0, Math.max(snippet.start, snippet.end - 1)).split('\n').length !==
          snippet.endLine
        )
          errors.push(`${ref}: stale source end line`);
      } catch (error) {
        errors.push(`${ref}: cannot read source: ${String(error)}`);
      }
    }
  }
  for (const entry of value.cases) {
    if (!object(entry) || typeof entry.id !== 'string') {
      errors.push('case: missing ID');
      continue;
    }
    if (seen.has(entry.id)) errors.push(`${entry.id}: duplicate case`);
    seen.add(entry.id);
    const metadata = expectedMap.get(entry.id);
    if (!metadata) errors.push(`${entry.id}: not registered in runner`);
    else
      for (const key of ['title', 'family', 'priority', 'sources'] as const)
        if (JSON.stringify(entry[key]) !== JSON.stringify(metadata[key]))
          errors.push(`${entry.id}: metadata mismatch ${key}`);
    for (const key of [
      'factories',
      'optionUpdates',
      'helperRefs',
      'actions',
      'callbacks',
      'assertions',
      'contractRefs',
    ])
      if (!Array.isArray(entry[key])) errors.push(`${entry.id}: missing ${key}`);
    for (const key of ['factories', 'optionUpdates', 'actions', 'callbacks', 'assertions']) {
      if (!Array.isArray(entry[key])) continue;
      for (const step of entry[key]) {
        if (
          !object(step) ||
          typeof step.sourceRef !== 'string' ||
          !['case', 'helper'].includes(step.origin) ||
          !Array.isArray(step.contextRefs)
        ) {
          errors.push(`${entry.id}: invalid ${key} step`);
          continue;
        }
        for (const expression of [step.options, step.fixture, step.label].filter(
          (item) => item !== undefined
        )) {
          if (
            !object(expression) ||
            !['literal-json', 'source-expression', 'omitted-use-factory-default'].includes(
              expression.representation
            ) ||
            !Array.isArray(expression.dependencyRefs)
          )
            errors.push(`${entry.id}: invalid ${key} expression`);
          else if (
            expression.representation !== 'omitted-use-factory-default' &&
            typeof expression.sourceRef !== 'string'
          )
            errors.push(`${entry.id}: expression has no source`);
        }
        if (
          key === 'factories' &&
          (!['fixture-helper', 'slider-constructor'].includes(step.kind) ||
            !['mount-argument', 'opaque-dom-construction'].includes(step.fixtureModel) ||
            !object(step.options) ||
            !object(step.fixture))
        )
          errors.push(`${entry.id}: invalid factory contract`);
        if (key === 'assertions' && !['expect', 'throw', 'assertion-helper'].includes(step.kind))
          errors.push(`${entry.id}: invalid assertion kind`);
      }
    }
    if (!entry.factories?.length)
      errors.push(`${entry.id}: no actual fixture factory or constructor`);
    if (!entry.assertions?.length) errors.push(`${entry.id}: no assertion anchor`);
    if (
      !object(entry.execution) ||
      entry.execution.selector?.id !== entry.id ||
      entry.execution.extraction !== 'source-backed-partial' ||
      !entry.execution.definitionRefs?.length ||
      !entry.execution.limitations?.length
    )
      errors.push(`${entry.id}: invalid execution provenance`);
    const binding = auditCatalogueSuites.find((suite) =>
      suite.cases.some((candidate) => candidate.id === entry.id)
    );
    if (
      binding &&
      (entry.execution?.suiteFile !== binding.file ||
        entry.execution?.runnerExport !== binding.runnerExport ||
        entry.execution?.casesExport !== binding.casesExport)
    )
      errors.push(`${entry.id}: executable binding mismatch`);
    if (
      !object(entry.support) ||
      entry.support.assessment !== 'not-evaluated' ||
      entry.support.realDevices !== false ||
      JSON.stringify(entry.support.configuredProjects) !== JSON.stringify(catalogueProjects)
    )
      errors.push(`${entry.id}: invalid browser/support claim`);
    visitRefs(entry, entry.id);
  }
  for (const id of expectedMap.keys())
    if (!seen.has(id)) errors.push(`${id}: missing registered case`);
  if (value.counts.cases !== value.cases.length || value.cases.length !== expected.length)
    errors.push('counts: case denominator mismatch');
  if (value.counts.suites !== auditCatalogueSuites.length)
    errors.push('counts: suite denominator mismatch');
  for (const [count, field] of [
    ['factories', 'factories'],
    ['assertions', 'assertions'],
  ] as const)
    if (
      value.counts[count] !==
      value.cases.reduce(
        (sum: number, entry: any) => sum + (Array.isArray(entry[field]) ? entry[field].length : 0),
        0
      )
    )
      errors.push(`counts: ${count} mismatch`);
  if (value.counts.partial !== value.cases.length)
    errors.push('counts: extraction partial denominator mismatch');
  return [...new Set(errors)];
}

/** CLI integration: call before launching browsers; stale or incomplete catalogues fail closed. */
export function assertAuditCatalogue(
  value: unknown,
  options: CatalogueValidationOptions = {}
): asserts value is AuditCatalogue {
  const errors = validateAuditCatalogue(value, options);
  if (errors.length) throw new Error(`AUDIT_CATALOGUE_INVALID:\n${errors.join('\n')}`);
}
