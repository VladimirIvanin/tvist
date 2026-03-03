/**
 * Tvist — core-бандл для браузера.
 * Содержит ядро библиотеки и самые тяжёлые модули (~57 KB min).
 * Подключать ВМЕСТЕ с tvist.modules.min.js (порядок не важен).
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

// Тяжёлые модули (~43 KB вместе): drag, pagination, autoplay
import './modules/drag'
import './modules/pagination'
import './modules/autoplay'
import './modules/breakpoints'

// Types
export type { TvistOptions, AutoplayOptions, VideoOptions, VideoEvent, VideoProgressEvent } from './core/types'
export type { Module, ModuleConstructor } from './modules/Module'

// Дефолтный экспорт
export { Tvist as default } from './core/Tvist'
