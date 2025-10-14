/**
 * Navigation Module
 * Auto-registration при импорте
 */

import { Velosiped } from '../../core/Velosiped'
import { NavigationModule } from './NavigationModule'

// Автоматическая регистрация модуля
Velosiped.MODULES.set('navigation', NavigationModule)

export { NavigationModule }

