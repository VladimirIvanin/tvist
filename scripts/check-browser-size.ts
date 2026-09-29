import { readFileSync } from 'node:fs';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BROWSER_SIZE_LIMIT = 100_000;

/** Checks the complete file, including its license banner. */
export function checkBrowserSize(file = resolve('browser-build/tvist.min.js')): void {
  const code = readFileSync(file);
  console.log(
    `Tvist: ${code.length} bytes; gzip ${gzipSync(code).length}; Brotli ${brotliCompressSync(code).length}; limit ${BROWSER_SIZE_LIMIT}`
  );
  if (code.length > BROWSER_SIZE_LIMIT) {
    throw new Error(`Full browser bundle exceeds ${BROWSER_SIZE_LIMIT} bytes: ${code.length}`);
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  checkBrowserSize();
