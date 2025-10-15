/**
 * Autoplay Module
 * Auto-registration при импорте
 */

import { Tvist } from '../../core/Tvist'
import { AutoplayModule } from './AutoplayModule'

// Автоматическая регистрация модуля
Tvist.MODULES.set('autoplay', AutoplayModule)

export { AutoplayModule }

