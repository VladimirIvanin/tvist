import MarkdownIt from 'markdown-it';
import { entryId, type ApiEntry, type ApiMetadata } from './generate-options-meta';

export const apiModules = [
  { id: 'navigation', title: 'Стрелки', options: ['arrows'], events: ['navigation:mounted'] },
  {
    id: 'pagination',
    title: 'Пагинация',
    options: ['pagination'],
    events: ['pagination:mounted', 'autoplayProgress'],
  },
  {
    id: 'drag',
    title: 'Перетаскивание и удержание',
    options: ['holdToPause'],
    events: ['dragStart', 'drag', 'dragEnd', 'longPressStart', 'longPressEnd'],
  },
  {
    id: 'autoplay',
    title: 'Автопрокрутка',
    options: ['autoplay'],
    events: [
      'autoplayStart',
      'autoplayStop',
      'autoplayPause',
      'autoplayResume',
      'autoplayProgress',
    ],
  },
  {
    id: 'video',
    title: 'Видео',
    options: ['video'],
    events: ['videoReady', 'videoPlay', 'videoPause', 'videoEnded', 'videoProgress'],
  },
  {
    id: 'visibility',
    title: 'Видимость',
    options: ['visibility'],
    events: ['sliderVisible', 'sliderHidden'],
  },
  {
    id: 'loop',
    title: 'Бесконечная прокрутка',
    options: ['loop'],
    events: ['beforeLoopFix', 'loopFix'],
  },
  {
    id: 'marquee',
    title: 'Бегущая строка',
    options: ['marquee'],
    events: ['marqueeStart', 'marqueeStop', 'marqueePause', 'marqueeResume'],
  },
  {
    id: 'effects',
    title: 'Эффекты',
    options: ['fadeEffect', 'cubeEffect'],
    events: ['setTranslate'],
  },
  { id: 'grid', title: 'Сетка', options: ['grid'], events: [] },
  { id: 'thumbs', title: 'Миниатюры', options: ['thumbs'], events: ['navigation:click'] },
  {
    id: 'lazyload',
    title: 'Загрузка изображений',
    options: ['lazy', 'nativeLazyAdjacent'],
    events: ['lazyLoaded', 'lazyLoadError'],
  },
  {
    id: 'scroll-control',
    title: 'Колёсико и клавиатура',
    options: ['wheel', 'keyboard'],
    events: [],
  },
  { id: 'scrollbar', title: 'Скроллбар', options: ['scrollbar'], events: [] },
  { id: 'breakpoints', title: 'Адаптивность', options: ['breakpoints'], events: ['breakpoint'] },
  {
    id: 'slide-states',
    title: 'Состояния слайдов',
    options: [],
    events: ['visible', 'hidden', 'lock', 'unlock'],
  },
];

const supplementalEvents = new Set([
  'enabled',
  'disabled',
  'setTranslate',
  'beforeLoopFix',
  'loopFix',
  'navigation:mounted',
  'pagination:mounted',
  'navigation:click',
  'autoplayStart',
  'autoplayStop',
  'autoplayPause',
  'autoplayResume',
  'marqueeStart',
  'marqueeStop',
  'marqueePause',
  'marqueeResume',
  'lazyLoaded',
  'lazyLoadError',
]);

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Explicit section keys keep examples independent of generated types and signatures. */
export function parseApiFragments(source: string): Map<string, string> {
  const md = new MarkdownIt();
  const tokens = md.parse(source, {});
  const headings = tokens.flatMap((token, index) => {
    if (token.type !== 'heading_open' || token.tag !== 'h2' || !token.map) return [];
    return [{ key: tokens[index + 1]!.content, start: token.map[0], body: token.map[1] }];
  });
  const lines = source.split('\n');
  const result = new Map<string, string>();
  for (const [index, heading] of headings.entries()) {
    if (!/^(option|method|property|static|event|module|type):[^\s]+$/.test(heading.key))
      throw new Error(`Invalid API fragment key: ${heading.key}`);
    if (result.has(heading.key)) throw new Error(`Duplicate API fragment: ${heading.key}`);
    result.set(
      heading.key,
      lines
        .slice(heading.body, headings[index + 1]?.start ?? lines.length)
        .join('\n')
        .trim()
    );
  }
  return result;
}

export function flattenEntries(entries: ApiEntry[]): ApiEntry[] {
  return entries.flatMap((entry) => [entry, ...flattenEntries(entry.nested || [])]);
}

/** Validate once, before writing pages. Additional event signatures live in explicit Markdown records. */
export function prepareApiReference(meta: ApiMetadata, fragments: Map<string, string>): void {
  const on = meta.options.find((entry) => entry.name === 'on');
  if (on) delete on.nested; // Its children are documented as events, not duplicate option rows.
  for (const [key, body] of fragments) {
    const name = key.slice('event:'.length);
    if (
      !key.startsWith('event:') ||
      !supplementalEvents.has(name) ||
      meta.events.some((entry) => entry.key === key)
    )
      continue;
    const argumentsLine = body.match(/^Аргументы: `([^`]+)`\s*$/m);
    if (!argumentsLine) throw new Error(`Missing arguments for supplemental event: ${key}`);
    meta.events.push({ key, id: entryId(key), name, type: argumentsLine[1]!, description: '' });
  }
  const entries = flattenEntries(Object.values(meta).flat());
  const keys = new Set(entries.map((entry) => entry.key));
  for (const module of apiModules) keys.add(`module:${module.id}`);
  for (const key of fragments.keys())
    if (!keys.has(key)) throw new Error(`Unknown API fragment: ${key}`);
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new Error(`Duplicate API anchor: ${entry.id}`);
    ids.add(entry.id);
  }
  for (const module of apiModules) {
    for (const name of module.options)
      if (!meta.options.some((entry) => entry.name === name))
        throw new Error(`Unknown module option: ${name}`);
    for (const name of module.events)
      if (!meta.events.some((entry) => entry.name === name))
        throw new Error(`Unknown module event: ${name}`);
  }
}

type RenderMarkdown = (source: string) => string;

export function renderApiReference(
  meta: ApiMetadata,
  fragments: Map<string, string>,
  introduction: string,
  render: RenderMarkdown,
  base: string
): string {
  const types = new Map(meta.types.map((entry) => [entry.name, entry.id]));
  types.set('TvistOptions', 'options');
  types.set('Tvist', 'methods');
  const optionModules = new Map(
    apiModules.flatMap((module) => module.options.map((name) => [name, module.id] as const))
  );
  const sorted = (entries: ApiEntry[]) =>
    [...entries].sort((a, b) => a.name.localeCompare(b.name, 'en'));
  const renderType = (text: string) =>
    `<code>${text
      .split(/(\b[A-Za-z_$][\w$]*\b)/)
      .map((part) => {
        const id = types.get(part);
        return id ? `<a href="#${id}">${escapeHtml(part)}</a>` : escapeHtml(part);
      })
      .join('')}</code>`;
  const description = (entry: ApiEntry) => {
    const body =
      fragments
        .get(entry.key)
        ?.replace(/^Аргументы: `[^`]+`\s*$/m, '')
        .trim() || '';
    const docs = entry.description.replace(/\{@link ([^}]+)\}/g, '`$1`');
    return `${entry.deprecated ? `<p class="api-deprecated">Устарело: ${escapeHtml(entry.deprecated)}</p>` : ''}${render(docs)}${entry.example ? render('```typescript\n' + entry.example + '\n```') : ''}${render(body)}`;
  };
  const nameCell = (entry: ApiEntry) =>
    `<th scope="row"><a class="api-entry-link" href="#${entry.id}"><code>${escapeHtml(entry.name)}</code><span aria-hidden="true">#</span></a></th>`;
  const table = (headings: string[], rows: string, label: string) =>
    `<div class="table-scroll api-table-scroll" tabindex="0" role="region" aria-label="${escapeHtml(label)}"><table class="api-table"><thead><tr>${headings.map((heading) => `<th scope="col">${heading}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
  const optionTable = (entries: ApiEntry[], label: string) =>
    table(
      ['Опция', 'Тип', 'По умолчанию', 'Описание'],
      sorted(entries)
        .map((entry) => {
          const module =
            entry.key === `option:${entry.name}` ? optionModules.get(entry.name) : undefined;
          const settingsId = `settings-${entry.key.slice(7).replace(/\./g, '-')}`;
          const nested = entry.nested?.length
            ? `<p><a href="#${module ? `module-${module}` : settingsId}">Вложенные настройки →</a></p>`
            : '';
          const type =
            entry.name === 'on' && entry.key === 'option:on'
              ? '<a href="#events"><code>object</code></a>'
              : renderType(entry.type);
          return `<tr id="${entry.id}" data-api-key="${entry.key}">${nameCell(entry)}<td class="api-type">${type}</td><td class="api-default">${entry.default === undefined ? '—' : renderType(entry.default)}</td><td class="api-description">${description(entry)}${nested}</td></tr>`;
        })
        .join(''),
      label
    );
  const methodTable = (entries: ApiEntry[], label: string) =>
    table(
      ['Метод', 'Возвращает', 'Описание'],
      entries
        .map(
          (entry) =>
            `<tr id="${entry.id}" data-api-key="${entry.key}"><th scope="row"><a class="api-entry-link" href="#${entry.id}">${renderType(entry.signature || entry.name)}</a></th><td class="api-type">${renderType(entry.returns || entry.type)}</td><td class="api-description">${description(entry)}</td></tr>`
        )
        .join(''),
      label
    );
  const properties = table(
    ['Свойство', 'Тип', 'Описание'],
    meta.properties
      .map(
        (entry) =>
          `<tr id="${entry.id}" data-api-key="${entry.key}">${nameCell(entry)}<td class="api-type">${renderType(entry.type)}${entry.readonly ? '<small class="api-readonly">Только чтение</small>' : ''}</td><td class="api-description">${description(entry)}</td></tr>`
      )
      .join(''),
    'Свойства экземпляра'
  );
  const events = table(
    ['Событие', 'Аргументы', 'Когда вызывается'],
    meta.events
      .map(
        (entry) =>
          `<tr id="${entry.id}" data-api-key="${entry.key}">${nameCell(entry)}<td class="api-type">${renderType(entry.type)}</td><td class="api-description">${description(entry)}</td></tr>`
      )
      .join(''),
    'События'
  );

  function nestedSettings(entry: ApiEntry): string {
    if (!entry.nested?.length) return '';
    return (
      optionTable(entry.nested, `Настройки ${entry.name}`) +
      entry.nested
        .filter((child) => child.nested?.length)
        .map(
          (child) =>
            `<h4 id="settings-${child.key.slice(7).replace(/\./g, '-')}">${escapeHtml(child.key.slice(7))}</h4>${nestedSettings(child)}`
        )
        .join('')
    );
  }
  const modules = apiModules
    .map((module) => {
      const entries = module.options.map(
        (name) => meta.options.find((entry) => entry.name === name)!
      );
      const methods = meta.moduleMethods.filter((entry) => entry.name.startsWith(`${module.id}.`));
      return `<section class="api-module" id="module-${module.id}"><h3>${escapeHtml(module.title)}</h3>${render(fragments.get(`module:${module.id}`) || '')}
      ${entries.map((entry) => `<p>Опция: <a href="#${entry.id}"><code>${escapeHtml(entry.name)}</code></a>.</p>${nestedSettings(entry)}`).join('')}
      ${methods.length ? methodTable(methods, `Методы ${module.title}`) : ''}
      ${module.events.length ? `<p>События: ${module.events.map((name) => `<a href="#${entryId(`event:${name}`)}"><code>${escapeHtml(name)}</code></a>`).join(', ')}.</p>` : ''}</section>`;
    })
    .join('');
  const settings = meta.options
    .filter((entry) => entry.nested?.length && !optionModules.has(entry.name))
    .map(
      (entry) =>
        `<section id="settings-${entry.name}"><h3>${escapeHtml(entry.name)}</h3>${nestedSettings(entry)}</section>`
    )
    .join('');
  const typeSections = meta.types
    .map(
      (entry) =>
        `<section id="${entry.id}"><h3><code>${escapeHtml(entry.name)}</code></h3>${description(entry)}${table(
          ['Поле', 'Тип', 'Описание'],
          (entry.nested || [])
            .map(
              (child) =>
                `<tr id="${child.id}">${nameCell(child)}<td class="api-type">${renderType(child.type)}</td><td class="api-description">${description(child)}${child.default === undefined ? '' : `<p>По умолчанию: ${renderType(child.default)}.</p>`}</td></tr>`
            )
            .join(''),
          entry.name
        )}</section>`
    )
    .join('');

  const sections = [
    ['initialization', 'Инициализация'],
    ['options', 'Опции'],
    ['methods', 'Методы'],
    ['properties', 'Свойства'],
    ['events', 'События'],
    ['static', 'Статический API'],
    ['settings', 'Вложенные настройки'],
    ['modules', 'Модули'],
    ['types', 'Типы'],
  ];
  const nav =
    sections.map(([id, title]) => `<a href="#${id}">${title}</a>`).join('') +
    '<span class="api-nav-label">Модули</span>' +
    apiModules
      .map(
        (module) =>
          `<a class="api-nav-module" href="#module-${module.id}">${escapeHtml(module.title)}</a>`
      )
      .join('');
  return `<div class="doc-shell api-shell page-wrap"><aside class="api-sidebar"><span class="eyebrow">Справочник API</span><button class="api-menu-toggle" type="button" aria-expanded="false" aria-controls="api-nav">Оглавление <span aria-hidden="true">⌄</span></button><nav id="api-nav" class="api-nav" aria-label="Оглавление API">${nav}</nav></aside>
    <article class="doc-content markdown-body api-content">${introduction}
    <section id="options"><h2>Опции</h2><p>Параметры конструктора <code>new Tvist(target, options)</code>. Вложенные настройки включённого модуля приведены в его разделе.</p>${optionTable(meta.options, 'Опции слайдера')}</section>
    <section id="methods"><h2>Методы</h2>${methodTable(meta.methods, 'Методы экземпляра')}</section>
    <section id="properties"><h2>Свойства</h2>${properties}</section>
    <section id="events"><h2>События</h2><p>Передавайте обработчики в <a href="#option-on"><code>on</code></a> или подписывайтесь через <a href="#method-on"><code>slider.on()</code></a>. Аргументы зависят от события; экземпляр слайдера не добавляется автоматически.</p>${events}</section>
    <section id="static"><h2>Статический API</h2>${methodTable(
      meta.statics.filter((entry) => entry.signature),
      'Статические методы'
    )}${table(
      ['Свойство', 'Тип', 'Описание'],
      meta.statics
        .filter((entry) => !entry.signature)
        .map(
          (entry) =>
            `<tr id="${entry.id}">${nameCell(entry)}<td class="api-type">${renderType(entry.type)}${entry.readonly ? '<small class="api-readonly">Только чтение</small>' : ''}</td><td class="api-description">${description(entry)}</td></tr>`
        )
        .join(''),
      'Статические свойства'
    )}</section>
    <section id="settings"><h2>Вложенные настройки</h2>${settings}</section>
    <section id="modules"><h2>Модули</h2><p>Настройки, управление и события встроенных модулей. <a href="${base}api/modules.html">Подключение и создание собственных модулей →</a></p>${modules}</section>
    <section id="types"><h2>Типы</h2><p><a href="${base}api/typescript.html">Использование TypeScript →</a></p>${typeSections}</section></article></div>`;
}

export const legacyApiPages: Record<string, { section: string; kind: string }> = {
  'api/options.html': { section: 'options', kind: 'option' },
  'api/methods.html': { section: 'methods', kind: 'method' },
  'api/properties.html': { section: 'properties', kind: 'property' },
  'api/events.html': { section: 'events', kind: 'event' },
  'api/static.html': { section: 'static', kind: 'static' },
};

export function legacyAnchorMap(meta: ApiMetadata, kind: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of flattenEntries(Object.values(meta).flat()).filter((entry) =>
    entry.key.startsWith(`${kind}:`)
  )) {
    const name = entry.key.slice(kind.length + 1);
    for (const alias of [
      name,
      name.toLowerCase(),
      name.replace(/[^\w-]/g, '').toLowerCase(),
      entry.id,
    ])
      map[alias] = entry.id;
  }
  if (kind === 'option') {
    map['native-lazy-adjacent'] = 'option-nativeLazyAdjacent';
    map['динамическое-изменение-опций'] = 'method-updateOptions';
    map.updateoptions = 'method-updateOptions';
    map['приоритет-опций'] = 'option-breakpoints';
  }
  if (kind === 'property') {
    map.tvistinstance = 'property-root-tvistInstance';
    map['классы-состояний-на-root'] = 'property-root';
  }
  if (kind === 'event') {
    for (const [alias, name] of [
      ['transitionstart-transitionend', 'transitionStart'],
      ['reachbeginning-reachend', 'reachBeginning'],
      ['visible-hidden', 'visible'],
      ['slidervisible-sliderhidden', 'sliderVisible'],
    ])
      map[alias!] = entryId(`event:${name}`);
    map['подписка-на-события'] = 'method-on';
    map['отписка-от-событий'] = 'method-off';
    map['подписка-на-одно-срабатывание'] = 'method-once';
  }
  return map;
}

export function renderLegacyRedirect(
  target: string,
  anchors: Record<string, string>,
  section: string
): string {
  const serialized = JSON.stringify(anchors).replace(/</g, '\\u003c');
  return `<article class="page-wrap markdown-body"><h1>Справочник API</h1><p>Раздел перенесён в единый справочник. <a href="${target}#${section}">Открыть раздел →</a></p></article><script>const anchors=${serialized};let hash=location.hash.slice(1);try{hash=decodeURIComponent(hash)}catch{}location.replace(${JSON.stringify(target)}+'#'+(anchors[hash]||anchors[hash.toLowerCase()]||${JSON.stringify(section)}));</script>`;
}
