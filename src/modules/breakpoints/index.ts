import { TVIST_MODULE_REGISTRY } from '../../core/registry'
import { BreakpointsModule } from './BreakpointsModule'

TVIST_MODULE_REGISTRY.set('breakpoints', BreakpointsModule)

export { BreakpointsModule }
