/**
 * Drag Module
 * Auto-registration при импорте
 */

import { Tvist } from '../../core/Tvist'
import { DragModule } from './DragModule'

// Автоматическая регистрация модуля
Tvist.MODULES.set('drag', DragModule)

export { DragModule }

