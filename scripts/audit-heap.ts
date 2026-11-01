import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Tvist } from '../src/core/Tvist';
const latest = JSON.parse(readFileSync('.tmp/audit/latest.json', 'utf8')) as {
  runDir: string;
  buildHash: string;
};
const owner = await chromium.launchServer();
const browser = await chromium.connect(owner.wsEndpoint());
const observations: unknown[] = [];
try {
  const page = await browser.newPage();
  await page.addInitScript('globalThis.__name = (fn) => fn;');
  await page.goto('about:blank');
  await page.addStyleTag({ path: join(latest.runDir, 'snapshot/browser-build/tvist.css') });
  await page.addScriptTag({ path: join(latest.runDir, 'snapshot/browser-build/tvist.min.js') });
  const cdp = await page.context().newCDPSession(page);
  for (let batch = -5; batch < 5; batch++) {
    const cycles = batch < 0 ? 10 : 100;
    await page.evaluate((cycles) => {
      const w = window as unknown as {
        TvistV1: typeof Tvist;
        auditWeakRoots: WeakRef<HTMLElement>[];
      };
      w.auditWeakRoots = [];
      for (let i = 0; i < cycles; i++) {
        const root = document.createElement('div');
        root.className = 'tvist-v1';
        root.style.cssText = 'width:720px;height:360px';
        root.innerHTML =
          '<div class="tvist-v1__track"><div class="tvist-v1__container">' +
          Array.from(
            { length: 7 },
            (_, index) => `<div class="tvist-v1__slide" style="height:360px">${index}</div>`
          ).join('') +
          '</div></div>';
        document.body.append(root);
        const s = new w.TvistV1(root, {
          speed: 0,
          visibility: false,
          arrows: true,
          pagination: true,
          loop: i % 2 === 0,
          perPage: 2,
        });
        s.next();
        s.disable();
        s.enable();
        s.destroy();
        root.remove();
        w.auditWeakRoots.push(new WeakRef(root));
      }
    }, cycles);
    await page.waitForTimeout(100);
    await cdp.send('HeapProfiler.collectGarbage');
    await cdp.send('HeapProfiler.collectGarbage');
    const retainedRoots = await page.evaluate(() => {
      const w = window as unknown as { auditWeakRoots: WeakRef<HTMLElement>[] };
      const alive = w.auditWeakRoots.filter((ref) => ref.deref() !== undefined).length;
      w.auditWeakRoots = [];
      return alive;
    });
    const dom = await cdp.send('Memory.getDOMCounters');
    const heap = await cdp.send('Runtime.getHeapUsage');
    if (batch >= 0) observations.push({ batch, cycles, retainedRoots, dom, heap });
  }
} finally {
  await Promise.race([browser.close(), new Promise((resolve) => setTimeout(resolve, 5000))]);
  if (owner.process().exitCode === null) owner.process().kill('SIGKILL');
}
mkdirSync('docs/audit', { recursive: true });
writeFileSync(
  'docs/audit/heap-results.json',
  JSON.stringify(
    {
      buildHash: latest.buildHash,
      engine: 'chromium',
      warmupBatches: 5,
      measuredBatches: 5,
      observations,
      interpretation:
        'WeakRefs are cleared each batch. Nonzero retained roots or heap growth require retaining-path investigation; no universal zero-heap assertion.',
    },
    null,
    2
  )
);
console.log(JSON.stringify(observations));
