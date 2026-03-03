/**
 * Сборка split-бандлов для браузера:
 *   browser-build/tvist.min.js          — полный бандл (как раньше)
 *   browser-build/tvist.core.min.js     — core + тяжёлые модули (~58 KB)
 *   browser-build/tvist.modules.min.js  — остальные модули (~50 KB)
 *   browser-build/tvist.css             — стили (общие для всех вариантов)
 */

import { execSync } from 'node:child_process'

const targets: Array<{ buildTarget?: string; label: string }> = [
  { label: 'full bundle (tvist.min.js)' },
  { buildTarget: 'core', label: 'core bundle (tvist.core.min.js)' },
  { buildTarget: 'modules', label: 'modules bundle (tvist.modules.min.js)' },
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
