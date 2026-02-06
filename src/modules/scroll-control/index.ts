/**
 * ScrollControl Module - управление слайдером через скролл
 * Автоматически регистрируется при импорте
 */

import { Tvist } from '../../core/Tvist'
import { ScrollControlModule } from './ScrollControlModule'

// Регистрируем модуль
Tvist.registerModule('scroll-control', ScrollControlModule)

export { ScrollControlModule }
