/** Браузерная сборка для каруселей, включая autoplay, loop и visibility. */
import './styles/tvist.core.scss'

import { Tvist } from './core/Tvist'
import { DragModule } from './modules/drag/DragModule'
import { BreakpointsModule } from './modules/breakpoints/BreakpointsModule'
import { NavigationModule } from './modules/navigation/NavigationModule'
import { PaginationModule } from './modules/pagination/PaginationModule'
import { AutoplayModule } from './modules/autoplay/AutoplayModule'
import { LoopModule } from './modules/loop/LoopModule'
import { SlideStatesModule } from './modules/slide-states/SlideStatesModule'
import { VisibilityModule } from './modules/visibility/VisibilityModule'

Tvist.registerModule('drag', DragModule)
Tvist.registerModule('navigation', NavigationModule)
Tvist.registerModule('pagination', PaginationModule)
Tvist.registerModule('autoplay', AutoplayModule)
Tvist.registerModule('breakpoints', BreakpointsModule)
Tvist.registerModule('loop', LoopModule)
Tvist.registerModule('slide-states', SlideStatesModule)
Tvist.registerModule('visibility', VisibilityModule)

export { Tvist as default }
