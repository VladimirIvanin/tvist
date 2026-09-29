/** Extract API documentation with TypeScript. Importing this module never writes files. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export interface ApiEntry {
  key: string;
  id: string;
  name: string;
  type: string;
  description: string;
  default?: string;
  example?: string;
  deprecated?: string;
  readonly?: boolean;
  signature?: string;
  returns?: string;
  nested?: ApiEntry[];
}

export interface ApiMetadata {
  options: ApiEntry[];
  methods: ApiEntry[];
  properties: ApiEntry[];
  statics: ApiEntry[];
  events: ApiEntry[];
  moduleMethods: ApiEntry[];
  types: ApiEntry[];
}

export function entryId(key: string): string {
  return key.replace(':', '-').replace(/[.:]/g, '-');
}

function commentText(comment: string | ts.NodeArray<ts.JSDocComment> | undefined): string {
  if (typeof comment === 'string') return comment;
  return (
    comment
      ?.map((part) => {
        if (ts.isJSDocLink(part) || ts.isJSDocLinkCode(part) || ts.isJSDocLinkPlain(part)) {
          return part.text || part.name?.getText() || '';
        }
        return part.text;
      })
      .join('') || ''
  );
}

function documentation(
  node: ts.Node
): Pick<ApiEntry, 'description' | 'default' | 'example' | 'deprecated'> {
  const comments = (node as ts.Node & { jsDoc?: readonly ts.JSDoc[] }).jsDoc || [];
  const tags = ts.getJSDocTags(node);
  const tag = (name: string) => tags.find((item) => item.tagName.text === name);
  return {
    description: comments
      .map((item) => commentText(item.comment))
      .filter(Boolean)
      .join('\n\n'),
    ...(tag('default') ? { default: commentText(tag('default')!.comment) } : {}),
    ...(tag('example')
      ? {
          example: tags
            .filter((item) => item.tagName.text === 'example')
            .map((item) => commentText(item.comment))
            .join('\n\n'),
        }
      : {}),
    ...(tag('deprecated')
      ? { deprecated: commentText(tag('deprecated')!.comment) || 'Устарело' }
      : {}),
  };
}

function isDocumentedMember(node: ts.Node & { name?: ts.PropertyName }): boolean {
  const flags = ts.getCombinedModifierFlags(node as ts.Declaration);
  return (
    !(flags & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) &&
    !node.name?.getText().startsWith('_') &&
    !ts.getJSDocTags(node).some((tag) => tag.tagName.text === 'internal')
  );
}

/** Read option declarations, resolving configuration interfaces but never expanding recursive maps. */
export function extractOptions(source: ts.SourceFile): ApiEntry[] {
  const declarations = new Map(
    source.statements.flatMap((statement) =>
      ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)
        ? [[statement.name.text, statement] as const]
        : []
    )
  );
  const printer = ts.createPrinter({ removeComments: true });
  const typeText = (node: ts.Node) =>
    printer.printNode(ts.EmitHint.Unspecified, node, source).replace(/\s+/g, ' ').trim();

  function children(node: ts.TypeNode, parent: string, visited: Set<string>): ApiEntry[] {
    if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) {
      const merged = new Map<string, ApiEntry>();
      for (const branch of node.types)
        for (const entry of children(branch, parent, visited)) merged.set(entry.name, entry);
      return [...merged.values()];
    }
    if (ts.isParenthesizedTypeNode(node)) return children(node.type, parent, visited);
    if (ts.isTypeReferenceNode(node)) {
      const name = node.typeName.getText(source);
      if (visited.has(name) || name === 'TvistOptions' || node.typeArguments?.length) return [];
      const declaration = declarations.get(name);
      if (!declaration) return [];
      const next = new Set([...visited, name]);
      return ts.isInterfaceDeclaration(declaration)
        ? members(declaration.members, parent, next)
        : children(declaration.type, parent, next);
    }
    return ts.isTypeLiteralNode(node) ? members(node.members, parent, visited) : [];
  }

  function members(
    nodes: ts.NodeArray<ts.TypeElement>,
    parent: string,
    visited: Set<string>
  ): ApiEntry[] {
    return nodes.flatMap((node) => {
      if (!ts.isPropertySignature(node) || !node.type || !isDocumentedMember(node)) return [];
      const name = node.name.getText(source).replace(/^['"]|['"]$/g, '');
      const path = parent ? `${parent}.${name}` : name;
      const nested = children(node.type, path, visited);
      return [
        {
          key: `option:${path}`,
          id: entryId(`option:${path}`),
          name,
          type: typeText(node.type),
          ...documentation(node),
          ...(nested.length ? { nested } : {}),
        },
      ];
    });
  }
  const options = declarations.get('TvistOptions');
  if (!options || !ts.isInterfaceDeclaration(options))
    throw new Error('TvistOptions interface not found');
  return members(options.members, '', new Set(['TvistOptions']));
}

/** Read public declarations without importing the slider or touching DOM. */
export function generateApiMetadata(projectRoot = resolve('.')): ApiMetadata {
  const config = ts.readConfigFile(resolve(projectRoot, 'tsconfig.json'), ts.sys.readFile);
  if (config.error)
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, projectRoot);
  const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true });
  const checker = program.getTypeChecker();
  const typesFile = program.getSourceFile(resolve(projectRoot, 'src/core/types.ts'))!;
  const classFile = program.getSourceFile(resolve(projectRoot, 'src/core/Tvist.ts'))!;
  const slider = classFile.statements.find(
    (node) => ts.isClassDeclaration(node) && node.name?.text === 'Tvist'
  );
  if (!slider || !ts.isClassDeclaration(slider)) throw new Error('Tvist class not found');
  const flags =
    ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;
  const typeText = (type: ts.Type) => checker.typeToString(type, undefined, flags);
  const meta: ApiMetadata = {
    options: extractOptions(typesFile),
    methods: [],
    properties: [],
    statics: [],
    events: [],
    moduleMethods: [],
    types: [],
  };

  function method(node: ts.SignatureDeclaration, name: string, key: string): ApiEntry {
    const signature = checker.getSignatureFromDeclaration(node)!;
    return {
      key,
      id: entryId(key),
      name,
      type: typeText(checker.getTypeAtLocation(node)),
      signature: `${name}${checker.signatureToString(signature, node, flags)}`,
      returns: typeText(checker.getReturnTypeOfSignature(signature)),
      ...documentation(node),
    };
  }

  for (const node of slider.members) {
    if (!node.name || !isDocumentedMember(node)) continue;
    const name = node.name.getText(classFile);
    const isStatic = Boolean(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Static);
    const kind = isStatic ? 'static' : ts.isMethodDeclaration(node) ? 'method' : 'property';
    const key = `${kind}:${name}`;
    const entry: ApiEntry = ts.isMethodDeclaration(node)
      ? method(node, name, key)
      : {
          key,
          id: entryId(key),
          name,
          type:
            ts.isPropertyDeclaration(node) && node.initializer && ts.isIdentifier(node.initializer)
              ? `typeof ${node.initializer.text}`
              : typeText(checker.getTypeAtLocation(node)),
          ...documentation(node),
          readonly:
            ts.isGetAccessorDeclaration(node) ||
            Boolean(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Readonly),
        };
    if (isStatic) meta.statics.push(entry);
    else if (ts.isMethodDeclaration(node)) meta.methods.push(entry);
    else meta.properties.push(entry);
  }

  const root = classFile.statements.find(
    (node) => ts.isInterfaceDeclaration(node) && node.name.text === 'TvistRootElement'
  ) as ts.InterfaceDeclaration;
  const instance = root.members.find((node) => node.name?.getText(classFile) === 'tvistInstance')!;
  meta.properties.push({
    key: 'property:root.tvistInstance',
    id: entryId('property:root.tvistInstance'),
    name: 'root.tvistInstance',
    type: typeText(checker.getTypeAtLocation(instance)),
    description: 'Ссылка на экземпляр Tvist на корневом DOM-элементе.',
    readonly: false,
  });

  const options = typesFile.statements.find(
    (node) => ts.isInterfaceDeclaration(node) && node.name.text === 'TvistOptions'
  ) as ts.InterfaceDeclaration;
  const on = options.members.find(
    (node) => node.name?.getText(typesFile) === 'on'
  ) as ts.PropertySignature;
  if (on.type && ts.isTypeLiteralNode(on.type))
    for (const node of on.type.members) {
      if (!ts.isPropertySignature(node) || !node.type || !ts.isFunctionTypeNode(node.type))
        continue;
      const name = node.name.getText(typesFile).replace(/^['"]|['"]$/g, '');
      const entry = method(node.type, name, `event:${name}`);
      meta.events.push({
        ...entry,
        ...documentation(node),
        type: entry.signature!.slice(name.length).replace(/: void$/, ''),
      });
    }

  // Facades returned by public getters, rather than module lifecycle/implementation methods.
  for (const [interfaceName, facade] of [
    ['AutoplayControls', 'autoplay'],
    ['VideoControls', 'video'],
    ['MarqueeControls', 'marquee'],
  ]) {
    const declaration = typesFile.statements.find(
      (node) => ts.isInterfaceDeclaration(node) && node.name.text === interfaceName
    ) as ts.InterfaceDeclaration;
    for (const node of declaration.members) {
      if (ts.isMethodSignature(node)) {
        const name = `${facade}.${node.name.getText(typesFile)}`;
        meta.moduleMethods.push(method(node, name, `method:${name}`));
      }
    }
  }
  for (const facade of ['lazyload', 'visibility']) {
    const getter = slider.members.find(
      (node) => node.name?.getText(classFile) === facade
    ) as ts.GetAccessorDeclaration;
    const signature = checker.getSignatureFromDeclaration(getter)!;
    const result = checker.getNonNullableType(checker.getReturnTypeOfSignature(signature));
    for (const property of result.getProperties()) {
      const declaration = property.valueDeclaration || property.declarations?.[0];
      if (!declaration) continue;
      const type = checker.getTypeOfSymbolAtLocation(property, declaration);
      const call = type.getCallSignatures()[0];
      if (!call) continue;
      const name = `${facade}.${property.name}`;
      const key = `method:${name}`;
      meta.moduleMethods.push({
        key,
        id: entryId(key),
        name,
        type: typeText(type),
        signature: `${name}${checker.signatureToString(call, declaration, flags)}`,
        returns: typeText(checker.getReturnTypeOfSignature(call)),
        description: '',
      });
    }
  }

  for (const declaration of typesFile.statements)
    if (
      ts.isInterfaceDeclaration(declaration) &&
      !declaration.name.text.endsWith('ModuleAPI') &&
      declaration.name.text !== 'TvistOptions'
    ) {
      const name = declaration.name.text;
      meta.types.push({
        key: `type:${name}`,
        id: entryId(`type:${name}`),
        name,
        type: name,
        ...documentation(declaration),
        nested: declaration.members.flatMap((node) => {
          if (!ts.isPropertySignature(node)) return [];
          const key = `type:${name}.${node.name.getText(typesFile)}`;
          return [
            {
              key,
              id: entryId(key),
              name: node.name.getText(typesFile),
              type: node.type?.getText(typesFile) || typeText(checker.getTypeAtLocation(node)),
              ...documentation(node),
            },
          ];
        }),
      });
    }
  return meta;
}

/** Compatibility projection: the builder needs flat types to choose controls, not inline callbacks. */
export function optionsProjection(options: ApiEntry[]): {
  options: Array<{
    name: string;
    type: string;
    default: string;
    description: string;
    nested?: unknown[];
  }>;
} {
  const builderType = (entry: ApiEntry) =>
    entry.nested?.length
      ? entry.type.replace(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, 'object')
      : entry.type;
  return {
    options: options.map((entry) => ({
      name: entry.name,
      type: builderType(entry),
      default: entry.default ?? '—',
      description: entry.description,
      ...(entry.nested
        ? {
            nested: entry.nested.map((child) => ({
              name: child.name,
              type: builderType(child),
              description: child.description,
              ...(child.default !== undefined ? { default: child.default } : {}),
            })),
          }
        : {}),
    })),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = ts.createSourceFile(
    'types.ts',
    readFileSync(resolve('src/core/types.ts'), 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  const meta = optionsProjection(extractOptions(source));
  writeFileSync(resolve('docs/site/options-meta.json'), JSON.stringify(meta, null, 2) + '\n');
  console.log(`Generated metadata for ${meta.options.length} options`);
}
