/**
 * Tvist - главная точка входа
 */

import './styles/tvist.scss'

// Core
export { Tvist } from './core/Tvist'
export { Engine } from './core/Engine'
export { Vector1D } from './core/Vector1D'
export { Counter } from './core/Counter'
export { EventEmitter } from './core/EventEmitter'
export { Animator, easings, throttle } from './core/Animator'

// Modules (автоматическая регистрация при импорте)
import './modules/drag'
import './modules/navigation'
import './modules/pagination'
import './modules/autoplay'
import './modules/breakpoints'
import './modules/loop'
import './modules/thumbs'
import './modules/effects'

// Types
export type { TvistOptions } from './core/types'
export type { Module, ModuleConstructor } from './modules/Module'

// Utils (опционально для расширенного использования)
export * from './utils'

// Экспорт модулей для расширенного использования
export * from './modules'

// Дефолтный экспорт
export { Tvist as default } from './core/Tvist'
