/**
 * Scrollbar Module - кастомный скроллбар для слайдера
 * Автоматически регистрируется при импорте
 */

import { Tvist } from '../../core/Tvist'
import { ScrollbarModule } from './ScrollbarModule'

// Регистрируем модуль
Tvist.registerModule('scrollbar', ScrollbarModule)

export { ScrollbarModule }
