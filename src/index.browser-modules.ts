/**
 * Tvist — modules-бандл для браузера.
 * Содержит дополнительные модули (~50 KB min).
 * Подключать ВМЕСТЕ с tvist.core.min.js. Порядок подключения не важен.
 *
 * Если этот файл загружается ДО core-бандла, модули попадают в глобальную
 * очередь window.__tvistV{major}Queue и регистрируются автоматически при первом
 * создании экземпляра Tvist.
 *
 * Импортируем классы напрямую из файлов модулей (минуя index.ts),
 * чтобы избежать side-effect авторегистрации через Tvist.MODULES.set().
 */

import pkg from '../package.json' with { type: 'json' }
import type { ModuleConstructor } from './modules/Module'

import { NavigationModule } from './modules/navigation/NavigationModule'
import { LoopModule } from './modules/loop/LoopModule'
import { ScrollbarModule } from './modules/scrollbar/ScrollbarModule'
import { VideoModule } from './modules/video/VideoModule'
import { MarqueeModule } from './modules/marquee/MarqueeModule'
import { GridModule } from './modules/grid/GridModule'
import { EffectModule } from './modules/effects/EffectModule'
import { LazyLoadModule } from './modules/lazyload/LazyLoadModule'
import { SlideStatesModule } from './modules/slide-states/SlideStatesModule'
import { ScrollControlModule } from './modules/scroll-control/ScrollControlModule'
import { ThumbsModule } from './modules/thumbs/ThumbsModule'
import { VisibilityModule } from './modules/visibility/VisibilityModule'

const EXTRA_MODULES: [string, ModuleConstructor][] = [
  ['navigation', NavigationModule],
  ['loop', LoopModule],
  ['scrollbar', ScrollbarModule],
  ['video', VideoModule],
  ['marquee', MarqueeModule],
  ['grid', GridModule],
  ['effects', EffectModule],
  ['lazyload', LazyLoadModule],
  ['slide-states', SlideStatesModule],
  ['scroll-control', ScrollControlModule],
  ['thumbs', ThumbsModule],
  ['visibility', VisibilityModule],
]

const versionMajor = parseInt(pkg.version.split('.')[0] ?? '0', 10) || 0

// Ключ очереди и имя глобала совпадают с тем, что генерирует vite.browser.config.ts (umdName)
// и читает Tvist.flushModuleQueue() — все три источника используют major из package.json.
const QUEUE_KEY = `__tvistV${versionMajor}Queue`
const GLOBAL_NAME = `TvistV${versionMajor}` as const

interface TvistStatic {
  registerModule(name: string, ctor: ModuleConstructor): void
}

if (typeof window !== 'undefined') {
  const win = window as unknown as Record<string, unknown>
  const tvistCore = win[GLOBAL_NAME] as TvistStatic | undefined

  if (tvistCore && typeof tvistCore.registerModule === 'function') {
    // Core уже загружен — регистрируем сразу
    EXTRA_MODULES.forEach(([name, ctor]) => {
      tvistCore.registerModule(name, ctor)
    })
  } else {
    // Core ещё не загружен — кладём в очередь
    const queue = win[QUEUE_KEY] as [string, ModuleConstructor][] | undefined
    win[QUEUE_KEY] = queue ?? []
    EXTRA_MODULES.forEach((entry) => {
      ;(win[QUEUE_KEY] as [string, ModuleConstructor][]).push(entry)
    })
  }
}
