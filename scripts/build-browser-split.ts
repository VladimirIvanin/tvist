/** Браузерные сборки core, modules и full с соответствующими CSS в browser-build/. */
import { execSync } from 'node:child_process'

for (const buildTarget of ['core', 'modules', 'full']) {
  console.log(`\n▶ Building: ${buildTarget}`)
  execSync('npx vite build --config vite.browser.config.ts', {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, BUILD_TARGET: buildTarget },
  })
}

console.log('\n✓ Browser build complete')
