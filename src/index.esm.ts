/**
 * Tvist — ESM entry point с динамической загрузкой опциональных модулей.
 * Используйте Tvist.create() вместо new Tvist() для корректной загрузки модулей.
 */

import './styles/tvist.scss'

// Core
export { Tvist, Tvist as TvistV1, type TvistRootElement } from './core/Tvist'
export { TVIST_CSS_PREFIX, TVIST_CLASSES } from './core/constants'
export { Engine } from './core/Engine'
export { Vector1D } from './core/Vector1D'
export { Counter } from './core/Counter'
export { EventEmitter } from './core/EventEmitter'
export { Animator, easings, throttle } from './core/Animator'

// Ядро — регистрируем синхронно (всегда нужны)
import './modules/drag'         // drag: true по умолчанию
import './modules/breakpoints'  // всегда нужен
import './modules/slide-states' // всегда нужен
import './modules/visibility'   // visibility: true по умолчанию

// Опциональные модули НЕ импортируем — они грузятся динамически через Tvist.create()

// Types
export type { TvistOptions, AutoplayOptions, VideoOptions, VideoEvent, VideoProgressEvent } from './core/types'
export type { ModuleConstructor } from './modules/Module'

// Utils
export * from './utils'

// Экспорт только ядровых модулей (опциональные не экспортируем — они в отдельных чанках)
export { Module } from './modules/Module'
export { DragModule } from './modules/drag/DragModule'
export { BreakpointsModule } from './modules/breakpoints/BreakpointsModule'
export { SlideStatesModule } from './modules/slide-states/SlideStatesModule'
export { VisibilityModule } from './modules/visibility/VisibilityModule'

// Дефолтный экспорт
export { Tvist as default } from './core/Tvist'
