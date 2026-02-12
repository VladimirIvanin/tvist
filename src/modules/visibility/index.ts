/**
 * Visibility Module
 * Отслеживание видимости слайдера для приостановки autoplay/marquee
 */

import { Tvist } from '../../core/Tvist'
import { VisibilityModule } from './VisibilityModule'

// Автоматическая регистрация модуля
Tvist.MODULES.set('visibility', VisibilityModule)

export { VisibilityModule }
