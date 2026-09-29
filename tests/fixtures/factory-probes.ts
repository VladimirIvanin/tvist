import ts from 'typescript';
import MagicString from 'magic-string';
import type { Plugin } from 'vite';

/** Unit tests can inspect closure state without shipping inspection hooks in the library. */
export function factoryProbes(): Plugin {
  return {
    name: 'tvist-test-factory-probes',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('/src/') || !id.endsWith('.ts') || !code.includes('const component:'))
        return;
      const source = ts.createSourceFile(id, code, ts.ScriptTarget.Latest, true);
      const edits: { start: number; end: number; text: string }[] = [];
      for (const factory of source.statements) {
        if (
          !ts.isFunctionDeclaration(factory) ||
          !factory.body ||
          !factory.name?.text.startsWith('create')
        )
          continue;
        const fields = new Map<string, string>();
        const functions = new Set<string>();
        const mutable = new Set<string>();
        let component: ts.VariableStatement | undefined;
        for (const statement of factory.body.statements) {
          if (ts.isVariableStatement(statement)) {
            for (const declaration of statement.declarationList.declarations) {
              const name = declaration.name.getText(source);
              if (name === 'component') component = statement;
              if (name.startsWith('local_')) {
                fields.set(name.slice(6), name);
                if (!(statement.declarationList.flags & ts.NodeFlags.Const)) mutable.add(name);
              }
            }
          } else if (ts.isFunctionDeclaration(statement) && statement.name) {
            const name = statement.name.text;
            if (name.startsWith('local_')) {
              fields.set(name.slice(6), name);
              functions.add(name);
              mutable.add(name);
            }
          }
        }
        if (!component) continue;
        const declaration = component.declarationList.declarations.find(
          (item) => item.name.getText(source) === 'component'
        );
        const runtimeKeys = new Set(
          id.endsWith('/core/runtime.ts') &&
          declaration?.initializer &&
          ts.isObjectLiteralExpression(declaration.initializer)
            ? declaration.initializer.properties
                .filter((property) => property.name && ts.isIdentifier(property.name))
                .map((property) => property.name!.getText(source))
            : []
        );
        const descriptors = Array.from(
          fields,
          ([key, name]) =>
            `${JSON.stringify(key)}: { configurable: true, get: () => ${name}, ${mutable.has(name) ? `set: value => { ${name} = value }` : ''} }`
        ).join(',\n');
        const parts = factory.body.statements
          .filter(ts.isVariableStatement)
          .flatMap((statement) => statement.declarationList.declarations)
          .filter((declaration) => ['motion', 'layout'].includes(declaration.name.getText(source)))
          .map((declaration) => declaration.name.getText(source));
        const merge = parts
          .map(
            (part) =>
              `Object.defineProperties(component, Object.fromEntries(Object.entries(Object.getOwnPropertyDescriptors(${part})).filter(([key]) => !(key in component))));`
          )
          .join('\n');
        edits.push({
          start: component.end,
          end: component.end,
          text: `\nObject.defineProperties(component, Object.fromEntries(Object.entries({${descriptors}}).flatMap(([key, descriptor]) => [['__tvistInternal_' + key, descriptor], ...(key in component ? [] : [[key, descriptor]])]).filter(([key]) => typeof key === 'string' && (!key.startsWith('__tvistInternal_') || key in component))));\n${merge}\nObject.defineProperties(component, Object.fromEntries(Object.entries(Object.getOwnPropertyDescriptors(component)).filter(([key]) => key.startsWith('__tvistInternal_') && !(key.slice(16) in component)).map(([key, descriptor]) => [key.slice(16), descriptor])));\n`,
        });
        function visit(node: ts.Node): void {
          if (
            ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            functions.has(node.expression.text)
          ) {
            edits.push({
              start: node.expression.getStart(source),
              end: node.expression.end,
              text: `component.${runtimeKeys.has('__tvistInternal_' + node.expression.text.slice(6)) ? '__tvistInternal_' : ''}${node.expression.text.slice(6)}`,
            });
          }
          ts.forEachChild(node, visit);
        }
        factory.body.statements.filter((statement) => statement !== component).forEach(visit);
      }
      const transformed = new MagicString(code);
      for (const edit of edits) {
        if (edit.start === edit.end) transformed.appendLeft(edit.start, edit.text);
        else transformed.overwrite(edit.start, edit.end, edit.text);
      }
      return {
        code: transformed.toString(),
        map: transformed.generateMap({ hires: true, source: id, includeContent: true }),
      };
    },
  };
}
