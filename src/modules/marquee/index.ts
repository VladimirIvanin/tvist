/**
 * Marquee Module
 * Auto-registration при импорте
 */

import { Tvist } from '../../core/Tvist'
import { MarqueeModule } from './MarqueeModule'

// Автоматическая регистрация модуля
Tvist.MODULES.set('marquee', MarqueeModule)

export { MarqueeModule }
