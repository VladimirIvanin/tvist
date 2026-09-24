import pkg from '../../package.json' with { type: 'json' }
import type { ModuleConstructor } from '../modules/Module'

const versionMajor = parseInt(pkg.version.split('.')[0] ?? '0', 10) || 0
const globalName = `TvistV${versionMajor}`
const queueName = `__tvistV${versionMajor}Queue`

interface BrowserTvist {
  MODULES: Map<string, ModuleConstructor>
  registerModule(name: string, constructor: ModuleConstructor): void
}

/** Регистрирует модуль независимо от порядка загрузки скриптов до создания слайдера. */
export function registerBrowserModule(name: string, constructor: ModuleConstructor): void {
  if (typeof window === 'undefined') return

  const browser = window as unknown as Record<string, unknown>
  const core = browser[globalName] as BrowserTvist | undefined
  if (core && typeof core.registerModule === 'function') {
    if (!core.MODULES.has(name)) core.registerModule(name, constructor)
    return
  }

  const queue = (browser[queueName] as [string, ModuleConstructor][] | undefined) ?? []
  if (!queue.some(([queuedName]) => queuedName === name)) queue.push([name, constructor])
  browser[queueName] = queue
}
