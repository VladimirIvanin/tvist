/**
 * Breakpoints Module
 * Auto-registration при импорте
 */

import { Velosiped } from '../../core/Velosiped'
import { BreakpointsModule } from './BreakpointsModule'

// Автоматическая регистрация модуля
Velosiped.MODULES.set('breakpoints', BreakpointsModule)

export { BreakpointsModule }

