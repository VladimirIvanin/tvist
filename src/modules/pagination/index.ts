/**
 * Pagination Module
 * Auto-registration при импорте
 */

import { Velosiped } from '../../core/Velosiped'
import { PaginationModule } from './PaginationModule'

// Автоматическая регистрация модуля
Velosiped.MODULES.set('pagination', PaginationModule)

export { PaginationModule }

