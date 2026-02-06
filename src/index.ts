/**
 * Tvist - главная точка входа
 */

import './styles/tvist.scss'

// Core
export { Tvist, Tvist as TvistV0 } from './core/Tvist'
export { TVIST_CSS_PREFIX, TVIST_CLASSES } from './core/constants'
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
import './modules/slide-states'
import './modules/thumbs'
import './modules/effects'
import './modules/grid'
import './modules/scroll-control'
import './modules/scrollbar'
import './modules/marquee'


// Types
export type { TvistOptions } from './core/types'
export type { Module, ModuleConstructor } from './modules/Module'

// Utils (опционально для расширенного использования)
export * from './utils'

// Экспорт модулей для расширенного использования
export * from './modules'

// Дефолтный экспорт
export { Tvist as default } from './core/Tvist'

// Для браузера: TvistV0 и TVIST_CSS_PREFIX позволяют использовать несколько версий на одной странице без конфликтов
