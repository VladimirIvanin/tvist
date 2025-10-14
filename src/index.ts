/**
 * Velosiped - главная точка входа
 */

// Core
export { Velosiped } from './core/Velosiped'
export { Engine } from './core/Engine'
export { Vector1D } from './core/Vector1D'
export { Counter } from './core/Counter'
export { EventEmitter } from './core/EventEmitter'
export { Animator, easings, throttle } from './core/Animator'

// Types
export type {
  VelosipedOptions,
  Module,
  ModuleConstructor,
} from './core/types'

// Utils (опционально для расширенного использования)
export * from './utils'

// Дефолтный экспорт
export { Velosiped as default } from './core/Velosiped'
