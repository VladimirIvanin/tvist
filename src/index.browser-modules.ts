/** Все дополнительные модули для tvist.core.min.js одним скриптом. */
import { registerBrowserModule } from './browser/registerModule'
import { NavigationModule } from './modules/navigation/NavigationModule'
import { PaginationModule } from './modules/pagination/PaginationModule'
import { AutoplayModule } from './modules/autoplay/AutoplayModule'
import { LoopModule } from './modules/loop/LoopModule'
import { SlideStatesModule } from './modules/slide-states/SlideStatesModule'
import { ThumbsModule } from './modules/thumbs/ThumbsModule'
import { EffectModule } from './modules/effects/EffectModule'
import { GridModule } from './modules/grid/GridModule'
import { ScrollControlModule } from './modules/scroll-control/ScrollControlModule'
import { ScrollbarModule } from './modules/scrollbar/ScrollbarModule'
import { MarqueeModule } from './modules/marquee/MarqueeModule'
import { LazyLoadModule } from './modules/lazyload/LazyLoadModule'
import { VideoModule } from './modules/video/VideoModule'
import { VisibilityModule } from './modules/visibility/VisibilityModule'

registerBrowserModule('navigation', NavigationModule)
registerBrowserModule('pagination', PaginationModule)
registerBrowserModule('autoplay', AutoplayModule)
registerBrowserModule('loop', LoopModule)
registerBrowserModule('slide-states', SlideStatesModule)
registerBrowserModule('thumbs', ThumbsModule)
registerBrowserModule('effect', EffectModule)
registerBrowserModule('grid', GridModule)
registerBrowserModule('scroll-control', ScrollControlModule)
registerBrowserModule('scrollbar', ScrollbarModule)
registerBrowserModule('marquee', MarqueeModule)
registerBrowserModule('lazyload', LazyLoadModule)
registerBrowserModule('video', VideoModule)
registerBrowserModule('visibility', VisibilityModule)
