import { Tvist } from '../../core/Tvist'
import { LazyLoadModule } from './LazyLoadModule'

export { LazyLoadModule } from './LazyLoadModule'

/**
 * Регистрация модуля LazyLoad
 */
Tvist.MODULES.set('lazyload', LazyLoadModule)
