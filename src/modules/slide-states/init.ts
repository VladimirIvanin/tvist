/**
 * Автоматическая регистрация SlideStatesModule
 */

import { Tvist } from '../../core/Tvist'
import { SlideStatesModule } from './SlideStatesModule'

// Регистрируем модуль глобально
Tvist.registerModule('slide-states', SlideStatesModule)
