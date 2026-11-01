import ts from 'typescript';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  auditCatalogueSuites,
  catalogueProjects,
  assertAuditCatalogue,
  validateAuditCatalogue,
  type AuditCatalogue,
  type CatalogueEntry,
  type CatalogueExpression,
  type CatalogueJson,
  type CatalogueStep,
} from '../tests/audit/catalogue';

const UNKNOWN = Symbol('not-statically-evaluated');
type StaticValue = CatalogueJson | typeof UNKNOWN;
type Environment = Map<string, StaticValue>;
const hash = (text: string) => createHash('sha256').update(text).digest('hex');

/** Read AST only: never eval/transpile expressions, instantiate Tvist or run browser callbacks. */
export function buildAuditCatalogue(root = process.cwd()): AuditCatalogue {
  const config = ts.readConfigFile(resolve(root, 'tsconfig.audit.json'), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const program = ts.createProgram(
    auditCatalogueSuites.map((suite) => resolve(root, suite.file)),
    parsed.options
  );
  const checker = program.getTypeChecker();
  const catalogue: AuditCatalogue = {
    schemaVersion: 1,
    generatedBy:
      'scripts/audit-catalogue.ts: TypeScript AST plus actual exported case/runner bindings',
    semantics: [
      'This is a catalogue of registered fixed scenarios and risk tuples; generated geometry/module rows, stateful commands and soak campaigns have separate denominators.',
      'Expressions and bodies are exact source, not a second test implementation. UTF-16 offsets and file hashes make every anchor verifiable.',
      'Static id/number dispatch is pruned where safely decidable. Unknown conditions, callback timing, loops and helper parameters remain partial source programs.',
      'Actions are in source order, not an expanded execution trace. Reached helper definitions are over-approximations when their arguments are runtime values.',
      'Factory defaults and DOM construction are linked to actual definitions. Omitted arguments mean use those defaults; no guessed serialized fixture values.',
      'Configured browser projects express runner availability, not confirmed feature support or physical-device coverage. Execution findings live in separate run artifacts.',
      'Contract mappings are reviewed coverage references, not complete coverage or a declaration that an uncertain feature is supported.',
    ],
    files: {},
    snippets: {},
    cases: [],
    counts: {
      cases: 0,
      suites: auditCatalogueSuites.length,
      factories: 0,
      assertions: 0,
      partial: 0,
    },
  };
  const fileName = (file: ts.SourceFile) => relative(root, file.fileName).replace(/\\/g, '/');
  const isAuditSource = (node: ts.Node) =>
    fileName(node.getSourceFile()).startsWith('tests/audit/');
  const ref = (node: ts.Node, symbol?: string): string => {
    const source = node.getSourceFile();
    const file = fileName(source);
    const start = node.getStart(source);
    const end = node.getEnd();
    const key = `${file}@${start}:${end}`;
    catalogue.files[file] ??= hash(source.text);
    catalogue.snippets[key] ??= {
      file,
      start,
      end,
      line: source.getLineAndCharacterOfPosition(start).line + 1,
      endLine: source.getLineAndCharacterOfPosition(Math.max(start, end - 1)).line + 1,
      fileSha256: catalogue.files[file]!,
      ...(symbol ? { symbol } : {}),
      text: source.text.slice(start, end),
    };
    return key;
  };
  const declaration = (node: ts.Node): ts.Declaration | undefined => {
    let symbol = checker.getSymbolAtLocation(node);
    if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    return symbol?.valueDeclaration ?? symbol?.declarations?.[0];
  };
  const unwrap = (node: ts.Node): ts.Node => {
    if (
      ts.isAsExpression(node) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isParenthesizedExpression(node) ||
      ts.isNonNullExpression(node) ||
      ts.isSatisfiesExpression(node)
    )
      return unwrap(node.expression);
    return node;
  };
  const staticValue = (input: ts.Node, env: Environment, depth = 0): StaticValue => {
    const node = unwrap(input);
    if (depth > 12) return UNKNOWN;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (node.kind === ts.SyntaxKind.NullKeyword) return null;
    if (ts.isIdentifier(node)) {
      if (env.has(node.text)) return env.get(node.text)!;
      const definition = declaration(node);
      if (
        definition &&
        ts.isVariableDeclaration(definition) &&
        ts.isVariableDeclarationList(definition.parent) &&
        definition.parent.flags & ts.NodeFlags.Const &&
        definition.initializer &&
        definition.initializer !== input
      )
        return staticValue(definition.initializer, env, depth + 1);
    }
    if (ts.isPrefixUnaryExpression(node)) {
      const value = staticValue(node.operand, env, depth + 1);
      if (value === UNKNOWN) return UNKNOWN;
      if (node.operator === ts.SyntaxKind.ExclamationToken) return !value;
      if (node.operator === ts.SyntaxKind.MinusToken && typeof value === 'number') return -value;
      if (node.operator === ts.SyntaxKind.PlusToken && typeof value === 'number') return value;
    }
    if (ts.isBinaryExpression(node)) {
      const left = staticValue(node.left, env, depth + 1);
      const right = staticValue(node.right, env, depth + 1);
      if (left === UNKNOWN || right === UNKNOWN) return UNKNOWN;
      switch (node.operatorToken.kind) {
        case ts.SyntaxKind.EqualsEqualsEqualsToken:
          return left === right;
        case ts.SyntaxKind.ExclamationEqualsEqualsToken:
          return left !== right;
        case ts.SyntaxKind.AmpersandAmpersandToken:
          return left ? right : left;
        case ts.SyntaxKind.BarBarToken:
          return left ? left : right;
        case ts.SyntaxKind.LessThanToken:
          return typeof left === 'number' && typeof right === 'number' ? left < right : UNKNOWN;
        case ts.SyntaxKind.LessThanEqualsToken:
          return typeof left === 'number' && typeof right === 'number' ? left <= right : UNKNOWN;
        case ts.SyntaxKind.GreaterThanToken:
          return typeof left === 'number' && typeof right === 'number' ? left > right : UNKNOWN;
        case ts.SyntaxKind.GreaterThanEqualsToken:
          return typeof left === 'number' && typeof right === 'number' ? left >= right : UNKNOWN;
      }
    }
    if (ts.isConditionalExpression(node)) {
      const condition = staticValue(node.condition, env, depth + 1);
      if (condition !== UNKNOWN)
        return staticValue(condition ? node.whenTrue : node.whenFalse, env, depth + 1);
    }
    if (ts.isArrayLiteralExpression(node)) {
      const values = node.elements.map((child) => staticValue(child, env, depth + 1));
      return values.includes(UNKNOWN) ? UNKNOWN : (values as CatalogueJson[]);
    }
    if (ts.isObjectLiteralExpression(node)) {
      const value: Record<string, CatalogueJson> = {};
      for (const property of node.properties) {
        if (
          !ts.isPropertyAssignment(property) ||
          !property.name ||
          ts.isComputedPropertyName(property.name)
        )
          return UNKNOWN;
        const result = staticValue(property.initializer, env, depth + 1);
        if (result === UNKNOWN) return UNKNOWN;
        value[property.name.getText().replace(/^['"]|['"]$/g, '')] = result;
      }
      return value;
    }
    return UNKNOWN;
  };
  const contractsPath = resolve(root, 'tests/audit/contracts.json');
  const contracts = JSON.parse(readFileSync(contractsPath, 'utf8')) as Record<string, unknown>;
  catalogue.files['tests/audit/contracts.json'] = hash(readFileSync(contractsPath, 'utf8'));
  // The source of browser availability is independently hash-checked by --check.
  catalogue.files['scripts/audit.ts'] = hash(
    readFileSync(resolve(root, 'scripts/audit.ts'), 'utf8')
  );
  for (const file of ['scripts/audit-catalogue.ts', 'tests/audit/catalogue.ts'])
    catalogue.files[file] = hash(readFileSync(resolve(root, file), 'utf8'));

  for (const suite of auditCatalogueSuites) {
    const source = program.getSourceFile(resolve(root, suite.file));
    if (!source) throw new Error(`Cannot parse ${suite.file}`);
    const runner = source.statements.find(
      (node) => ts.isFunctionDeclaration(node) && node.name?.text === suite.runnerExport
    ) as ts.FunctionDeclaration | undefined;
    if (!runner?.body) throw new Error(`Missing actual runner ${suite.file}:${suite.runnerExport}`);
    for (const metadata of suite.cases) {
      const env: Environment = new Map([['id', metadata.id]]);
      if (suite.casesExport === 'mediaCases') env.set('number', Number(metadata.id.slice(-3)));
      const entry: CatalogueEntry = {
        ...metadata,
        execution: {
          suiteFile: suite.file,
          casesExport: suite.casesExport,
          runnerExport: suite.runnerExport,
          runnerRef: ref(runner, suite.runnerExport),
          definitionRefs: [],
          selector: {
            id: metadata.id,
            ...(env.has('number') ? { number: env.get('number') as number } : {}),
          },
          extraction: 'source-backed-partial',
          limitations: [
            'Runtime loops, DOM values, callbacks and asynchronous order are not normalized; use the linked executable definition.',
            'Helper definitions retain their own source parameters and defaults. A source expression is not a precomputed option value.',
          ],
        },
        factories: [],
        optionUpdates: [],
        helperRefs: [],
        actions: [],
        callbacks: [],
        assertions: [],
        contractRefs: [],
        support: {
          assessment: 'not-evaluated',
          configuredProjects: [...catalogueProjects],
          defaultProjects: ['chromium', 'firefox', 'webkit'],
          realDevices: false,
          signalRefs: [],
        },
      };
      for (const [section, rows] of Object.entries(contracts))
        if (Array.isArray(rows))
          for (const row of rows) {
            if (row?.cases?.includes(metadata.id))
              entry.contractRefs.push({
                section,
                name: row.name,
                status: row.status,
                ...(row.source ? { source: row.source, line: row.line } : {}),
                ...(row.note ? { note: row.note } : {}),
              });
          }
      const visitedHelpers = new Set<string>();
      const exits = (node: ts.Node, environment: Environment): boolean => {
        if (ts.isReturnStatement(node) || ts.isThrowStatement(node) || ts.isBreakStatement(node))
          return true;
        if (ts.isBlock(node))
          return node.statements.some((statement) => exits(statement, environment));
        if (ts.isIfStatement(node)) {
          const condition = staticValue(node.expression, environment);
          if (condition !== UNKNOWN)
            return condition
              ? exits(node.thenStatement, environment)
              : !!node.elseStatement && exits(node.elseStatement, environment);
        }
        return false;
      };
      const expression = (
        node: ts.Node | undefined,
        environment: Environment
      ): CatalogueExpression => {
        if (!node) return { representation: 'omitted-use-factory-default', dependencyRefs: [] };
        const dependencies = new Set<string>();
        const collect = (child: ts.Node) => {
          if (ts.isIdentifier(child)) {
            const definition = declaration(child);
            if (
              definition &&
              isAuditSource(definition) &&
              !ts.isParameter(definition) &&
              (ts.isVariableDeclaration(definition) || ts.isFunctionDeclaration(definition))
            )
              dependencies.add(ref(definition, child.text));
          }
          ts.forEachChild(child, collect);
        };
        collect(node);
        const value = staticValue(node, environment);
        return {
          sourceRef: ref(node),
          representation: value === UNKNOWN ? 'source-expression' : 'literal-json',
          ...(value === UNKNOWN ? {} : { literal: value }),
          dependencyRefs: [...dependencies],
        };
      };
      const scan = (
        node: ts.Node,
        origin: 'case' | 'helper',
        contextRefs: string[],
        environment: Environment
      ): void => {
        const step = (): CatalogueStep => ({ sourceRef: ref(node), origin, contextRefs });
        if (ts.isBlock(node)) {
          for (const statement of node.statements) {
            scan(statement, origin, contextRefs, environment);
            if (exits(statement, environment)) break;
          }
          return;
        }
        if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
          const callbackEnv = new Map(environment);
          node.parameters.forEach((parameter) => {
            if (ts.isIdentifier(parameter.name)) callbackEnv.set(parameter.name.text, UNKNOWN);
          });
          scan(node.body, origin, contextRefs, callbackEnv);
          return;
        }
        if (ts.isIfStatement(node)) {
          scan(node.expression, origin, contextRefs, environment);
          const condition = staticValue(node.expression, environment);
          const context = [...contextRefs, ref(node.expression)];
          if (condition === UNKNOWN) {
            scan(node.thenStatement, origin, context, environment);
            if (node.elseStatement) scan(node.elseStatement, origin, context, environment);
          } else if (condition) scan(node.thenStatement, origin, context, environment);
          else if (node.elseStatement) scan(node.elseStatement, origin, context, environment);
          return;
        }
        if (ts.isSwitchStatement(node)) {
          const selector = staticValue(node.expression, environment);
          if (selector !== UNKNOWN) {
            let index = node.caseBlock.clauses.findIndex(
              (clause) =>
                ts.isCaseClause(clause) && staticValue(clause.expression, environment) === selector
            );
            if (index < 0) index = node.caseBlock.clauses.findIndex(ts.isDefaultClause);
            if (index >= 0) {
              while (index < node.caseBlock.clauses.length) {
                const clause = node.caseBlock.clauses[index]!;
                if (origin === 'case') entry.execution.definitionRefs.push(ref(clause));
                clause.statements.forEach((statement) =>
                  scan(statement, origin, [...contextRefs, ref(node.expression)], environment)
                );
                // Existing shared labels CMT03/CMT04 are empty fallthrough clauses.
                if (clause.statements.length) break;
                index++;
              }
            }
            return;
          }
        }
        if (
          ts.isForStatement(node) ||
          ts.isForOfStatement(node) ||
          ts.isForInStatement(node) ||
          ts.isWhileStatement(node) ||
          ts.isDoStatement(node)
        ) {
          const context = [...contextRefs, ref(node)];
          ts.forEachChild(node, (child) => scan(child, origin, context, environment));
          return;
        }
        if (ts.isThrowStatement(node)) {
          const error = node.expression;
          const label = ts.isNewExpression(error) ? error.arguments?.[0] : undefined;
          entry.assertions.push({
            ...step(),
            kind: 'throw',
            ...(label ? { label: expression(label, environment) } : {}),
          });
          if (/CONTRACT_GAP|UNSUPPORTED|FIXTURE|ENVIRONMENT/.test(error.getText()))
            entry.support.signalRefs.push(ref(node));
        }
        if (
          ts.isBinaryExpression(node) &&
          node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          (ts.isPropertyAccessExpression(node.left) || ts.isElementAccessExpression(node.left))
        )
          entry.actions.push(step());
        if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
          const callee = node.expression.getText();
          const args = node.arguments ?? [];
          const targetNode = ts.isIdentifier(node.expression)
            ? node.expression
            : ts.isPropertyAccessExpression(node.expression)
              ? node.expression.name
              : undefined;
          const target = targetNode ? declaration(targetNode) : undefined;
          const localTarget = target && isAuditSource(target) ? target : undefined;
          const calledDefinitionRef = localTarget
            ? ref(localTarget, targetNode?.getText())
            : undefined;
          const callStep = { ...step(), ...(calledDefinitionRef ? { calledDefinitionRef } : {}) };
          const fixtureHelper =
            ts.isIdentifier(node.expression) && node.expression.text === 'mount' && localTarget;
          const sliderConstructor =
            ts.isNewExpression(node) && /(?:\b|\.)(?:TvistV1|Tvist)$/.test(callee);
          if (fixtureHelper || sliderConstructor)
            entry.factories.push({
              ...callStep,
              kind: fixtureHelper ? 'fixture-helper' : 'slider-constructor',
              callee,
              options: expression(args[1], environment),
              fixture: expression(fixtureHelper ? args[2] : args[0], environment),
              fixtureModel: fixtureHelper ? 'mount-argument' : 'opaque-dom-construction',
            });
          if (
            ts.isPropertyAccessExpression(node.expression) &&
            node.expression.name.text === 'updateOptions'
          )
            entry.optionUpdates.push({ ...callStep, options: expression(args[0], environment) });
          if (ts.isCallExpression(node) && callee === 'expect') {
            let assertion: ts.Node = node;
            while (
              assertion.parent &&
              (ts.isPropertyAccessExpression(assertion.parent) ||
                ts.isCallExpression(assertion.parent))
            )
              assertion = assertion.parent;
            entry.assertions.push({
              ...callStep,
              sourceRef: ref(assertion),
              kind: 'expect',
              ...(args[1] ? { label: expression(args[1], environment) } : {}),
            });
          } else if (
            !ts.isNewExpression(node) &&
            ((node.parent && ts.isAwaitExpression(node.parent)) ||
              /\.(?:next|prev|scrollTo|updateOptions|update|destroy|enable|disable|add|remove|dispatchEvent|click|focus|blur|start|stop|pause|play|resume|setViewportSize|setContent|route|fulfill|move|down|up|wheel|press|runFor|install|append|appendChild|replaceChildren|setAttribute|removeAttribute)$/.test(
                callee
              ))
          )
            entry.actions.push(callStep);
          args.forEach((argument) => {
            if (ts.isArrowFunction(argument) || ts.isFunctionExpression(argument))
              entry.callbacks.push({
                sourceRef: ref(argument, argument.name?.text),
                origin,
                contextRefs: [...contextRefs, ref(node)],
                ...(calledDefinitionRef ? { calledDefinitionRef } : {}),
              });
          });
          if (
            localTarget &&
            (ts.isFunctionDeclaration(localTarget) || ts.isVariableDeclaration(localTarget))
          ) {
            const fn = ts.isFunctionDeclaration(localTarget)
              ? localTarget
              : localTarget.initializer && unwrap(localTarget.initializer);
            if (
              fn &&
              (ts.isFunctionDeclaration(fn) ||
                ts.isArrowFunction(fn) ||
                ts.isFunctionExpression(fn)) &&
              fn.body
            ) {
              entry.helperRefs.push(ref(localTarget, targetNode?.getText()));
              // Do not specialize a shared helper: its own source remains explicit and opaque.
              const helperKey = ref(localTarget);
              if (!visitedHelpers.has(helperKey)) {
                visitedHelpers.add(helperKey);
                const helperEnv = new Map(environment);
                fn.parameters.forEach((parameter) => {
                  if (ts.isIdentifier(parameter.name)) helperEnv.set(parameter.name.text, UNKNOWN);
                });
                scan(fn.body, 'helper', [ref(localTarget)], helperEnv);
              }
              if (/\bexpect\s*\(|throw new (?:AuditFailure|Error)/.test(fn.body.getText()))
                entry.assertions.push({
                  ...callStep,
                  kind: 'assertion-helper',
                  ...(args.find(
                    (argument) =>
                      ts.isStringLiteral(argument) &&
                      /[A-Z_:-]|identity|coverage/.test(argument.text)
                  )
                    ? {
                        label: expression(
                          args.find(
                            (argument) =>
                              ts.isStringLiteral(argument) &&
                              /[A-Z_:-]|identity|coverage/.test(argument.text)
                          ),
                          environment
                        ),
                      }
                    : {}),
                });
            }
          }
        }
        ts.forEachChild(node, (child) => scan(child, origin, contextRefs, environment));
      };
      // Geometry stores the real scenario as an object method; the exported runner only dispatches.
      let scenario: ts.Node | undefined;
      if (suite.casesExport === 'geometryCases') {
        const find = (node: ts.Node) => {
          if (
            ts.isObjectLiteralExpression(node) &&
            node.properties.some(
              (property) =>
                ts.isPropertyAssignment(property) &&
                property.name.getText() === 'id' &&
                staticValue(property.initializer, env) === metadata.id
            )
          )
            scenario = node.properties.find(
              (property) => ts.isMethodDeclaration(property) && property.name.getText() === 'run'
            );
          if (!scenario) ts.forEachChild(node, find);
        };
        find(source);
        if (!scenario || !ts.isMethodDeclaration(scenario) || !scenario.body)
          throw new Error(`No actual run method for ${metadata.id}`);
        entry.execution.definitionRefs.push(ref(scenario, 'run'));
        scan(scenario.body, 'case', [], env);
      } else {
        scan(runner.body, 'case', [], env);
        if (!entry.execution.definitionRefs.length)
          entry.execution.definitionRefs.push(ref(runner, suite.runnerExport));
      }
      for (const key of ['helperRefs'] as const) entry[key] = [...new Set(entry[key])];
      entry.execution.definitionRefs = [...new Set(entry.execution.definitionRefs)];
      entry.support.signalRefs = [...new Set(entry.support.signalRefs)];
      // An identical source expression can be visited via several helper paths; retain one anchor.
      for (const key of [
        'factories',
        'optionUpdates',
        'actions',
        'callbacks',
        'assertions',
      ] as const) {
        const seen = new Set<string>();
        (entry[key] as CatalogueStep[]) = entry[key].filter((item) => {
          const key = item.sourceRef;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      catalogue.cases.push(entry);
    }
  }
  catalogue.counts.cases = catalogue.cases.length;
  catalogue.counts.partial = catalogue.cases.length;
  catalogue.counts.factories = catalogue.cases.reduce(
    (sum, entry) => sum + entry.factories.length,
    0
  );
  catalogue.counts.assertions = catalogue.cases.reduce(
    (sum, entry) => sum + entry.assertions.length,
    0
  );
  assertAuditCatalogue(catalogue, {
    readSource: (file) => {
      const text = readFileSync(resolve(root, file), 'utf8');
      return { text, sha256: hash(text) };
    },
  });
  return catalogue;
}

/** Negative controls exercise the same validator the audit CLI can import. */
export function runCatalogueValidatorControls(
  catalogue: AuditCatalogue,
  root = process.cwd()
): number {
  const reject = (name: string, change: (copy: AuditCatalogue) => void, pattern: RegExp) => {
    const copy = JSON.parse(JSON.stringify(catalogue)) as AuditCatalogue;
    change(copy);
    const errors = validateAuditCatalogue(copy);
    if (!errors.some((error) => pattern.test(error)))
      throw new Error(`CATALOGUE_CONTROL_FAILED: ${name}: ${errors.join('; ')}`);
  };
  reject(
    'missing case',
    (copy) => {
      copy.cases.pop();
      copy.counts.cases--;
    },
    /missing registered case|denominator mismatch/
  );
  reject(
    'missing source',
    (copy) => {
      delete copy.snippets[copy.cases[0]!.factories[0]!.sourceRef];
    },
    /missing source ref/
  );
  reject(
    'wrong runner',
    (copy) => {
      copy.cases[0]!.execution.runnerExport = 'inventedFactory';
    },
    /executable binding mismatch/
  );
  reject(
    'unsupported support claim',
    (copy) => {
      (copy.cases[0]!.support as { assessment: string }).assessment = 'confirmed';
    },
    /browser\/support claim/
  );
  reject(
    'missing factory',
    (copy) => {
      copy.cases[0]!.factories = [];
    },
    /no actual fixture/
  );
  reject(
    'no expression source',
    (copy) => {
      delete copy.cases[0]!.factories[0]!.options.sourceRef;
    },
    /expression has no source/
  );
  const stale = validateAuditCatalogue(catalogue, {
    readSource: (file) => ({
      text: readFileSync(resolve(root, file), 'utf8'),
      sha256: '0'.repeat(64),
    }),
  });
  if (!stale.some((error) => /stale source hash/.test(error)))
    throw new Error('CATALOGUE_CONTROL_FAILED: stale sources');
  return 7;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = process.cwd();
  const output = resolve(root, 'docs/audit/catalogue.json');
  const catalogue = buildAuditCatalogue(root);
  const controls = process.argv.includes('--self-test')
    ? runCatalogueValidatorControls(catalogue, root)
    : undefined;
  const serialized = JSON.stringify(catalogue, null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (!existsSync(output) || readFileSync(output, 'utf8') !== serialized)
      throw new Error('AUDIT_CATALOGUE_STALE: run npx tsx scripts/audit-catalogue.ts');
  } else {
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, serialized);
  }
  console.log(
    JSON.stringify({
      output,
      mode: process.argv.includes('--check') ? 'check' : 'write',
      ...catalogue.counts,
      ...(controls ? { validatorControls: controls } : {}),
    })
  );
}
