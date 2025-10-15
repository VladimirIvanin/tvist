/**
 * Pagination Module
 * Auto-registration при импорте
 */

import { Tvist } from '../../core/Tvist'
import { PaginationModule } from './PaginationModule'

// Автоматическая регистрация модуля
Tvist.MODULES.set('pagination', PaginationModule)

export { PaginationModule }

