/** Обычная карусель одним скриптом: drag, breakpoints, стрелки и пагинация. */
import Tvist from './index.browser-core'
import { NavigationModule } from './modules/navigation/NavigationModule'
import { PaginationModule } from './modules/pagination/PaginationModule'
import { SlideStatesModule } from './modules/slide-states/SlideStatesModule'

Tvist.registerModule('navigation', NavigationModule)
Tvist.registerModule('pagination', PaginationModule)
Tvist.registerModule('slide-states', SlideStatesModule)

export { Tvist as default }
