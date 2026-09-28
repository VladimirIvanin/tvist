/** Все дополнительные модули для tvist.core.min.js одним скриптом. */
import './styles/tvist.modules.scss'

import { registerBrowserModule } from './browser/registerModule'
import { ThumbsModule } from './modules/thumbs/ThumbsModule'
import { EffectModule } from './modules/effects/EffectModule'
import { GridModule } from './modules/grid/GridModule'
import { ScrollControlModule } from './modules/scroll-control/ScrollControlModule'
import { ScrollbarModule } from './modules/scrollbar/ScrollbarModule'
import { MarqueeModule } from './modules/marquee/MarqueeModule'
import { LazyLoadModule } from './modules/lazyload/LazyLoadModule'
import { VideoModule } from './modules/video/VideoModule'
registerBrowserModule('thumbs', ThumbsModule)
registerBrowserModule('effect', EffectModule)
registerBrowserModule('grid', GridModule)
registerBrowserModule('scroll-control', ScrollControlModule)
registerBrowserModule('scrollbar', ScrollbarModule)
registerBrowserModule('marquee', MarqueeModule)
registerBrowserModule('lazyload', LazyLoadModule)
registerBrowserModule('video', VideoModule)
