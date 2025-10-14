/**
 * Drag Module
 * Auto-registration при импорте
 */

import { Velosiped } from '../../core/Velosiped'
import { DragModule } from './DragModule'

// Автоматическая регистрация модуля
Velosiped.MODULES.set('drag', DragModule)

export { DragModule }

