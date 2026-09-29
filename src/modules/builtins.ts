import type { ComponentFactory } from './Component';
import { createDragModule } from './drag/DragModule';
import { createNavigationModule } from './navigation/NavigationModule';
import { createPaginationModule } from './pagination/PaginationModule';
import { createAutoplayModule } from './autoplay/AutoplayModule';
import { createBreakpointsModule } from './breakpoints/BreakpointsModule';
import { createLoopModule } from './loop/LoopModule';
import { createSlideStatesModule } from './slide-states/SlideStatesModule';
import { createVisibilityModule } from './visibility/VisibilityModule';
import { createThumbsModule } from './thumbs/ThumbsModule';
import { createEffectModule } from './effects/EffectModule';
import { createGridModule } from './grid/GridModule';
import { createScrollControlModule } from './scroll-control/ScrollControlModule';
import { createScrollbarModule } from './scrollbar/ScrollbarModule';
import { createMarqueeModule } from './marquee/MarqueeModule';
import { createLazyLoadModule } from './lazyload/LazyLoadModule';
import { createVideoModule } from './video/VideoModule';

/** Fixed initialization order preserves lifecycle and catch-up events. */
export const BUILTINS = new Map<string, ComponentFactory>([
  ['drag', createDragModule],
  ['navigation', createNavigationModule],
  ['pagination', createPaginationModule],
  ['autoplay', createAutoplayModule],
  ['breakpoints', createBreakpointsModule],
  ['loop', createLoopModule],
  ['slide-states', createSlideStatesModule],
  ['visibility', createVisibilityModule],
  ['thumbs', createThumbsModule],
  ['effect', createEffectModule],
  ['grid', createGridModule],
  ['scroll-control', createScrollControlModule],
  ['scrollbar', createScrollbarModule],
  ['marquee', createMarqueeModule],
  ['lazyload', createLazyLoadModule],
  ['video', createVideoModule],
]);

const ACTIVATION_OPTIONS: Readonly<Record<string, keyof import('../core/types').TvistOptions>> = {
  navigation: 'arrows',
  pagination: 'pagination',
  autoplay: 'autoplay',
  breakpoints: 'breakpoints',
  visibility: 'visibility',
  grid: 'grid',
  'scroll-control': 'wheel',
  scrollbar: 'scrollbar',
  marquee: 'marquee',
  lazyload: 'lazy',
  video: 'video',
};

/** Skip inactive factories before allocating their closures and resource owners. */
export function isBuiltinEnabled(
  name: string,
  options: import('../core/types').TvistOptions
): boolean {
  if (name === 'drag') return options.drag !== false;
  if (name === 'effect') return options.effect === 'fade' || options.effect === 'cube';
  const key = ACTIVATION_OPTIONS[name];
  return !key || (options[key] !== false && options[key] !== undefined);
}
