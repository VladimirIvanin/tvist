import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const root = process.cwd();
mkdirSync(resolve('.tmp'), { recursive: true });
const directory = mkdtempSync(resolve('.tmp/package-consumer-'));
const npm = process.env.npm_execpath;
assert(npm, 'Run this check through npm run test:package');
const packed = JSON.parse(
  execFileSync(process.execPath, [npm, 'pack', '--json', '--pack-destination', directory], {
    encoding: 'utf8',
  })
) as { filename: string }[];
const archive = join(directory, packed[0]!.filename);
const consumer = join(directory, 'consumer');
mkdirSync(consumer);
writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
execFileSync(
  process.execPath,
  [
    npm,
    'install',
    '--offline',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--no-package-lock',
    archive,
  ],
  { cwd: consumer, stdio: 'pipe' }
);
const consumers = {
  'consumer.mts':
    'import Tvist, { type TvistOptions } from "tvist"; const options: TvistOptions = { loop: true }; new Tvist(document.body, options);',
  'consumer.cts':
    'import Tvist = require("tvist"); const options: Tvist.TvistOptions = { loop: true }; new Tvist.Tvist(document.body, options);',
};
for (const [name, code] of Object.entries(consumers)) writeFileSync(join(consumer, name), code);
for (const resolution of [ts.ModuleResolutionKind.Node16, ts.ModuleResolutionKind.NodeNext]) {
  const program = ts.createProgram(
    Object.keys(consumers).map((name) => join(consumer, name)),
    {
      module:
        resolution === ts.ModuleResolutionKind.Node16
          ? ts.ModuleKind.Node16
          : ts.ModuleKind.NodeNext,
      moduleResolution: resolution,
      target: ts.ScriptTarget.ES2020,
      strict: true,
      skipLibCheck: false,
      noEmit: true,
      types: [],
    }
  );
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(
    diagnostics.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => root,
      getCanonicalFileName: (name) => name,
      getNewLine: () => '\n',
    })
  );
}
const require = createRequire(join(consumer, 'consumer.cjs'));
assert.equal(typeof require('tvist').Tvist, 'function');
const esmEntry = join(consumer, 'runtime.mjs');
writeFileSync(
  esmEntry,
  'import Tvist from "tvist"; if (typeof Tvist !== "function") throw new Error("ESM export");'
);
execFileSync(process.execPath, [esmEntry]);
const installed = JSON.parse(
  readFileSync(join(consumer, 'node_modules/tvist/package.json'), 'utf8')
);
assert(installed.exports['.'].require.types.endsWith('.d.cts'));
console.log('Packed consumers: Node16 + NodeNext × ESM/CJS types; ESM/CJS runtime passed.');
