/**
 * Autoplay Module
 * Auto-registration при импорте
 */

import { Velosiped } from '../../core/Velosiped'
import { AutoplayModule } from './AutoplayModule'

// Автоматическая регистрация модуля
Velosiped.MODULES.set('autoplay', AutoplayModule)

export { AutoplayModule }

