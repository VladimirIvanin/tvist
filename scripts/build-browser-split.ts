/**
 * Сборка split-бандлов для браузера:
 *   browser-build/tvist.min.js          — полный бандл (как раньше)
 *   browser-build/tvist.core.min.js     — ядро + drag + breakpoints
 *   browser-build/tvist.standard.min.js — обычная карусель одним файлом
 *   browser-build/tvist.modules.min.js  — все дополнительные модули
 *   browser-build/modules/*.min.js      — каждый дополнительный модуль отдельно
 *   browser-build/tvist.css             — стили (общие для всех вариантов)
 */

import { execSync } from 'node:child_process'
import { OPTIONAL_BROWSER_MODULES } from '../src/browser/moduleNames'

const targets: Array<{ buildTarget?: string; label: string }> = [
  { label: 'full bundle (tvist.min.js)' },
  { buildTarget: 'core', label: 'core bundle (tvist.core.min.js)' },
  { buildTarget: 'standard', label: 'standard bundle (tvist.standard.min.js)' },
  { buildTarget: 'modules', label: 'modules bundle (tvist.modules.min.js)' },
  ...OPTIONAL_BROWSER_MODULES.map((name) => ({
    buildTarget: `module:${name}`,
    label: `module (${name})`,
  })),
]

for (const { buildTarget, label } of targets) {
  console.log(`\n▶ Building: ${label}`)
  execSync('npx vite build --config vite.browser.config.ts', {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      ...(buildTarget ? { BUILD_TARGET: buildTarget } : {}),
    },
  })
}

console.log('\n✓ Split build complete')
