import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  extractOptions,
  generateApiMetadata,
  optionsProjection,
  type ApiMetadata,
} from '../../scripts/generate-options-meta';
import {
  flattenEntries,
  legacyAnchorMap,
  parseApiFragments,
  prepareApiReference,
} from '../../scripts/api-reference';

function source(path: string): ts.SourceFile {
  return ts.createSourceFile(
    path,
    readFileSync(resolve(path), 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
}

describe('API metadata extraction', () => {
  const options = extractOptions(source('tests/fixtures/api-types.ts.fixture'));

  it('keeps union branches, referenced configurations and nested function signatures', () => {
    const peek = options.find((entry) => entry.name === 'peek')!;
    expect(peek.type).toContain('number | string | {');
    expect(peek.nested?.map((entry) => entry.name)).toEqual(['left', 'right', 'top', 'bottom']);
    expect(peek.example).toContain('const options');
    const autoplay = options.find((entry) => entry.name === 'autoplay')!;
    expect(autoplay.type).toBe('boolean | Alias');
    expect(autoplay.nested?.find((entry) => entry.name === 'enabled')).toMatchObject({
      default: 'true',
      description: expect.stringContaining('{ braces }'),
    });
    expect(autoplay.nested?.find((entry) => entry.name === 'delay')?.default).toBe('1200');
    expect(
      autoplay.nested
        ?.find((entry) => entry.name === 'nested')
        ?.nested?.find((entry) => entry.name === 'callback')?.type
    ).toContain('(index: number, options: { active: boolean; }) => string');
  });

  it('does not recursively expand breakpoints or invent defaults', () => {
    expect(options.find((entry) => entry.name === 'breakpoints')).toMatchObject({
      type: 'Record<number, Partial<TvistOptions> & { enabled?: boolean; }>',
    });
    expect(options.find((entry) => entry.name === 'breakpoints')?.nested).toBeUndefined();
    expect(options.find((entry) => entry.name === 'unset')?.default).toBeUndefined();
    expect(options.find((entry) => entry.name === 'unset')?.description).toContain('Tvist.destroy');
    expect(options.some((entry) => entry.name === 'hidden')).toBe(false);
    expect(
      options.find((entry) => entry.name === 'grid')?.nested?.[0]?.type.replace(/\s/g, '')
    ).toBe('[number,number][]');
  });
});

describe('Tvist reference contract', () => {
  let metadata: ApiMetadata;
  const fragments = parseApiFragments(readFileSync(resolve('docs/api/reference.md'), 'utf8'));
  beforeAll(() => {
    metadata = generateApiMetadata();
  }, 30000);

  it('documents all current options, real defaults and public signatures', () => {
    expect(metadata.options).toHaveLength(53);
    expect(metadata.options.find((entry) => entry.name === 'arrows')?.type).toContain(
      'boolean | {'
    );
    expect(metadata.options.find((entry) => entry.name === 'pagination')?.type).toContain(
      'renderBullet?: (index: number, className: string) => string'
    );
    expect(
      metadata.options
        .find((entry) => entry.name === 'autoplay')
        ?.nested?.find((entry) => entry.name === 'delay')?.default
    ).toBe('3000');
    expect(
      metadata.options
        .find((entry) => entry.name === 'holdToPause')
        ?.nested?.find((entry) => entry.name === 'threshold')?.default
    ).toBe('100');
    expect(
      metadata.options
        .find((entry) => entry.name === 'scrollbar')
        ?.nested?.find((entry) => entry.name === 'hideDelay')?.default
    ).toBe('1000');
    expect(metadata.methods.find((entry) => entry.name === 'scrollTo')?.signature).toBe(
      'scrollTo(index: number, instant?: boolean): this'
    );
    expect(metadata.methods.some(entry => entry.name === 'getModule')).toBe(false);
    expect(metadata.properties.some(entry => entry.name === 'marquee')).toBe(true);
    expect(metadata.properties.find((entry) => entry.name === 'activeIndex')?.readonly).toBe(true);
    expect(metadata.statics.find((entry) => entry.name === 'CSS_PREFIX')?.deprecated).toBeTruthy();
    expect(
      metadata.methods.some(
        (entry) =>
          entry.name === 'syncModules' ||
          entry.name === 'updateSlidesList' ||
          entry.name === 'hasPositionListeners'
      )
    ).toBe(false);
    expect(
      metadata.properties.some((entry) => entry.name.startsWith('_') || entry.name === 'allowClick')
    ).toBe(false);
  });

  it('keeps the builder projection compatible with mode controls and numeric defaults', () => {
    const projected = optionsProjection(metadata.options).options;
    expect(projected.find((entry) => entry.name === 'pagination')?.type).toBe('boolean | object');
    expect(projected.find((entry) => entry.name === 'arrows')?.type).toBe('boolean | object');
    expect(projected.find((entry) => entry.name === 'speed')?.default).toBe('300');
    expect(projected.find((entry) => entry.name === 'fixedWidth')?.default).toBe('—');
    expect(projected.find((entry) => entry.name === 'autoplay')?.nested).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'delay', default: '3000' })])
    );
  });

  it('retains documented module events and maps old deep links', () => {
    const meta = structuredClone(metadata);
    prepareApiReference(meta, fragments);
    expect(meta.events.find((entry) => entry.name === 'lazyLoaded')?.type).toBe(
      '(img: HTMLImageElement, slideIndex: number)'
    );
    expect(meta.events.find((entry) => entry.name === 'setTranslate')?.type).toBe(
      '(tvist: Tvist, position: number)'
    );
    expect(meta.events.find((entry) => entry.name === 'navigation:mounted')?.type).toBe('()');
    expect(legacyAnchorMap(meta, 'event').navigationmounted).toBe('event-navigation-mounted');
    expect(legacyAnchorMap(meta, 'option')['native-lazy-adjacent']).toBe(
      'option-nativeLazyAdjacent'
    );
    expect(legacyAnchorMap(meta, 'property').tvistinstance).toBe('property-root-tvistInstance');
    const entries = flattenEntries(Object.values(meta).flat());
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
  });

  it('rejects unknown fragments, duplicate keys and duplicate anchors', () => {
    expect(() => parseApiFragments('## option:gap\nA\n## option:gap\nB')).toThrow(
      'Duplicate API fragment'
    );
    const badFragments = new Map([...fragments, ['option:typo', 'Wrong key']]);
    expect(() => prepareApiReference(structuredClone(metadata), badFragments)).toThrow(
      'Unknown API fragment: option:typo'
    );
    const duplicate = structuredClone(metadata);
    duplicate.options[1]!.id = duplicate.options[0]!.id;
    expect(() => prepareApiReference(duplicate, fragments)).toThrow('Duplicate API anchor');
    // A heading inside a code example is content, not another fragment.
    expect(parseApiFragments('## option:gap\n```markdown\n## option:fake\n```').size).toBe(1);
  });
});
