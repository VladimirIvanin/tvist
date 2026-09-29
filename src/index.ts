/** Complete Tvist slider. Built-in features are activated through options. */
import './styles/tvist.scss';
export { Tvist, Tvist as TvistV1, Tvist as default, type TvistRootElement } from './core/Tvist';
export {
  TVIST_CSS_PREFIX,
  TVIST_CLASSES,
  TVIST_DOM_EVENTS,
  HOLD_TO_PAUSE_DEFAULT_THRESHOLD_MS,
} from './core/constants';
export type {
  AutoplayControls,
  VideoControls,
  MarqueeControls,
  LazyloadControls,
  VisibilityControls,
  TvistOptions,
  CenterOptions,
  TvistDestroyOptions,
  TvistLongPressDomEventDetail,
  AutoplayOptions,
  VideoOptions,
  VideoEvent,
  VideoProgressEvent,
  AutoplayProgressEvent,
  NativeLazyAdjacentOptions,
  HoldToPauseOptions,
  VisibilityOptions,
  BrowserFixesOptions,
  LoopOptions,
} from './core/types';
