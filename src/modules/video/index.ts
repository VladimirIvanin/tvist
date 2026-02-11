/**
 * Video Module
 * Auto-registration при импорте
 */

import { Tvist } from '../../core/Tvist'
import { VideoModule } from './VideoModule'

// Автоматическая регистрация модуля
Tvist.MODULES.set('video', VideoModule)

export { VideoModule }
