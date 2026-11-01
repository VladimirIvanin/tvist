import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// Node's ESM resolver needs extensions; require consumers need a CommonJS declaration graph.
const esmRoot = resolve('dist/types');
const cjsRoot = resolve('dist/types-cjs');
function build(directory: string): void {
  for (const entry of readdirSync(join(esmRoot, directory), { withFileTypes: true })) {
    const relative = join(directory, entry.name);
    if (entry.isDirectory()) {
      build(relative);
      continue;
    }
    if (!entry.name.endsWith('.d.ts')) continue;
    const input = readFileSync(join(esmRoot, relative), 'utf8')
      .replace(/^import ['"].*\.s[ac]ss['"];?\r?\n/gm, '')
      .replace(/\r?\n\/\/# sourceMappingURL=.*$/gm, '');
    for (const [root, extension, filename] of [
      [esmRoot, '.js', relative],
      [cjsRoot, '.cjs', relative.replace(/\.d\.ts$/, '.d.cts')],
    ]) {
      const output = input.replace(
        /(['"])(\.{1,2}\/[^'"\r\n]+)\1/g,
        (_match, quote: string, path: string) =>
          `${quote}${path.replace(/\.(?:js|cjs)$/, '')}${extension}${quote}`
      );
      const target = join(root!, filename!);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, output);
    }
  }
}
build('');
