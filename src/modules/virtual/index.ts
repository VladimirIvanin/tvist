/**
 * Регистрация модуля Virtual
 */

import { Tvist } from '../../core/Tvist'
import { VirtualModule } from './VirtualModule'

export { VirtualModule } from './VirtualModule'

Tvist.MODULES.set('virtual', VirtualModule)
