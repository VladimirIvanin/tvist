import { TVIST_MODULE_REGISTRY } from '../../core/registry'
import { LazyLoadModule } from './LazyLoadModule'

TVIST_MODULE_REGISTRY.set('lazyload', LazyLoadModule)

export { LazyLoadModule }
