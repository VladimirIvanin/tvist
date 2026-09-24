/** Лёгкая браузерная сборка: ядро, drag и breakpoints. */
import './styles/tvist.scss'

import { Tvist } from './core/Tvist'
import { DragModule } from './modules/drag/DragModule'
import { BreakpointsModule } from './modules/breakpoints/BreakpointsModule'

Tvist.registerModule('drag', DragModule)
Tvist.registerModule('breakpoints', BreakpointsModule)

export { Tvist as default }
