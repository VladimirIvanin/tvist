/**
 * Navigation Module
 * Auto-registration при импорте
 */

import { Tvist } from '../../core/Tvist'
import { NavigationModule } from './NavigationModule'

// Автоматическая регистрация модуля
Tvist.MODULES.set('navigation', NavigationModule)

export { NavigationModule }

