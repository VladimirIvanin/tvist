import { TVIST_MODULE_REGISTRY } from '../../core/registry'
import { VideoModule } from './VideoModule'

TVIST_MODULE_REGISTRY.set('video', VideoModule)

export { VideoModule }
