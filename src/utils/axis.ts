import type { TvistOptions } from '../core/types';
import { getOuterHeight, getOuterWidth } from './dom';

/** Resolves the current axis after option and breakpoint changes. */
export function createAxis(options: () => TvistOptions) {
  const vertical = () => options().direction === 'vertical';
  return {
    get __tvistInternal_dimension(): 'height' | 'width' {
      return vertical() ? 'height' : 'width';
    },
    get __tvistInternal_margin(): 'marginBottom' | 'marginRight' {
      return vertical() ? 'marginBottom' : 'marginRight';
    },
    get __tvistInternal_start(): 'top' | 'left' {
      return vertical() ? 'top' : 'left';
    },
    get __tvistInternal_end(): 'bottom' | 'right' {
      return vertical() ? 'bottom' : 'right';
    },
    __tvistInternal_measure(element: HTMLElement): number {
      return vertical() ? getOuterHeight(element) : getOuterWidth(element);
    },
  };
}
