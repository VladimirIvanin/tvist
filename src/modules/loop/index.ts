/**
 * Loop Module
 * Auto-registration при импорте
 */

import { Tvist } from '../../core/Tvist'
import { LoopModule } from './LoopModule'

// Автоматическая регистрация модуля
Tvist.MODULES.set('loop', LoopModule)

export { LoopModule }
