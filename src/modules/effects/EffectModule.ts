import { createComponent, type Component } from '../Component';
import { TVIST_CLASSES } from '../../core/constants';
import type { TvistRuntime as Tvist } from '../../core/runtime';
import type { TvistOptions } from '../../core/types';
import { setFadeEffect } from './fade';
import { setCubeEffect } from './cube';

/** Internal component; state lives in this factory's closure. */
export interface EffectModule extends Component {
  name: string;

  shouldBeActive(): boolean;

  init(): void;

  destroy(): void;

  onOptionsUpdate(): void;
}

export function createEffectModule(tvist: Tvist, options: TvistOptions): EffectModule {
  const base = createComponent(tvist, options);

  let local_name = 'effect';

  const local_slideProgress: WeakMap<HTMLElement, number> = new WeakMap<HTMLElement, number>();

  let local_currentEffect: TvistOptions['effect'] = 'slide';

  const local_setTranslateHandler: (_tvist: Tvist, translate: number) => void =
    local_onSetTranslate;

  function local_shouldBeActive(): boolean {
    return options.effect === 'fade' || options.effect === 'cube';
  }

  function local_init(): void {
    if (!local_shouldBeActive()) {
      return;
    }
    local_currentEffect = options.effect;
    // Effects require perPage: 1
    if (options.perPage !== 1) {
      if (options.debug) {
        console.warn('Tvist: Effects work only with perPage: 1. Automatically setting perPage: 1');
      }
      options.perPage = 1;
      tvist.__tvistInternal_update();
    }
    // Set container styles for 3D
    if (options.effect === 'cube') {
      local_applyCubeRootStyles();
    }
    tvist.__tvistInternal_on('setTranslate', local_setTranslateHandler);
  }

  function local_destroy(): void {
    tvist.__tvistInternal_off('setTranslate', local_setTranslateHandler);
    local_cleanupEffectStyles(local_currentEffect);
    local_currentEffect = 'slide';
  }

  function local_onOptionsUpdate(): void {
    const nextEffect = options.effect ?? 'slide';
    if (nextEffect !== local_currentEffect) {
      local_cleanupEffectStyles(local_currentEffect);
      local_currentEffect = nextEffect;
      if (nextEffect === 'cube') {
        local_applyCubeRootStyles();
      }
    }
  }

  function local_onSetTranslate(_tvist: Tvist, translate: number): void {
    const { __tvistInternal_slides: slides } = tvist;
    const slideSize = tvist.__tvistInternal_engine.__tvistInternal_slideSizeValue;
    slides.forEach((slide, i) => {
      const slidePosition = tvist.__tvistInternal_engine.__tvistInternal_getSlidePosition(i);
      // translate is negative location
      const offset = translate + slidePosition;
      const progress = offset / slideSize;
      local_slideProgress.set(slide, progress);
      if (options.effect === 'fade') {
        setFadeEffect(slide, progress, options);
      }
    });
    if (options.effect === 'cube') {
      setCubeEffect(tvist, translate, options);
    }
  }

  function local_applyCubeRootStyles(): void {
    tvist.__tvistInternal_container.style.transformStyle = 'preserve-3d';
    tvist.__tvistInternal_root.classList.add(TVIST_CLASSES.cube);
    const padding = options.cubeEffect?.viewportPadding ?? 10;
    tvist.__tvistInternal_track.style.padding = `${padding}px`;
    tvist.__tvistInternal_track.style.boxSizing = 'border-box';
  }

  function local_cleanupEffectStyles(effect: TvistOptions['effect']): void {
    tvist.__tvistInternal_slides.forEach((slide) => {
      slide.style.opacity = '';
      slide.style.transform = '';
      slide.style.zIndex = '';
      slide.style.backfaceVisibility = '';
      slide.style.contentVisibility = '';
      slide.style.visibility = '';
      slide.querySelectorAll(`.${TVIST_CLASSES.block}-slide-shadow-cube`).forEach((shadow) => {
        shadow.remove();
      });
    });
    if (effect === 'cube') {
      tvist.__tvistInternal_container.style.transformStyle = '';
      tvist.__tvistInternal_container.style.width = '';
      tvist.__tvistInternal_container.style.height = '';
      tvist.__tvistInternal_container.style.transformOrigin = '';
      tvist.__tvistInternal_track.style.removeProperty('perspective');
      tvist.__tvistInternal_track.style.removeProperty('-webkit-perspective');
      tvist.__tvistInternal_track.style.removeProperty('perspective-origin');
      tvist.__tvistInternal_track.style.removeProperty('overflow');
      tvist.__tvistInternal_track.style.removeProperty('padding');
      tvist.__tvistInternal_track.style.removeProperty('box-sizing');
      tvist.__tvistInternal_root.classList.remove(TVIST_CLASSES.cube);
    }
  }
  const component: EffectModule = {
    get name() {
      return local_name;
    },
    set name(value) {
      local_name = value;
    },
    shouldBeActive: local_shouldBeActive,
    init: local_init,
    destroy: () => {
      try {
        local_destroy();
      } finally {
        base.__tvistInternal_dispose();
      }
    },
    onOptionsUpdate: local_onOptionsUpdate,
  };

  return component;
}
