/**
 * Breakpoints Module
 * Auto-registration при импорте
 */

import { Tvist } from '../../core/Tvist'
import { BreakpointsModule } from './BreakpointsModule'

// Автоматическая регистрация модуля
Tvist.MODULES.set('breakpoints', BreakpointsModule)

export { BreakpointsModule }

