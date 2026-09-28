/** Полная браузерная сборка: core и все дополнительные модули. */
import Tvist from './index.browser-core'
import './styles/tvist.modules.scss'

import { ThumbsModule } from './modules/thumbs/ThumbsModule'
import { EffectModule } from './modules/effects/EffectModule'
import { GridModule } from './modules/grid/GridModule'
import { ScrollControlModule } from './modules/scroll-control/ScrollControlModule'
import { ScrollbarModule } from './modules/scrollbar/ScrollbarModule'
import { MarqueeModule } from './modules/marquee/MarqueeModule'
import { LazyLoadModule } from './modules/lazyload/LazyLoadModule'
import { VideoModule } from './modules/video/VideoModule'

Tvist.registerModule('thumbs', ThumbsModule)
Tvist.registerModule('effect', EffectModule)
Tvist.registerModule('grid', GridModule)
Tvist.registerModule('scroll-control', ScrollControlModule)
Tvist.registerModule('scrollbar', ScrollbarModule)
Tvist.registerModule('marquee', MarqueeModule)
Tvist.registerModule('lazyload', LazyLoadModule)
Tvist.registerModule('video', VideoModule)

export { Tvist as default }
