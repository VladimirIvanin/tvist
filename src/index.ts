/**
 * Velosiped - главная точка входа
 */

import './styles/velosiped.scss'

// Core
export { Velosiped } from './core/Velosiped'
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

// Types
export type { VelosipedOptions } from './core/types'
export type { Module, ModuleConstructor } from './modules/Module'

// Utils (опционально для расширенного использования)
export * from './utils'

// Экспорт модулей для расширенного использования
export * from './modules'

// Дефолтный экспорт
export { Velosiped as default } from './core/Velosiped'
