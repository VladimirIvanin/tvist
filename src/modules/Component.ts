import type { TvistRuntime } from '../core/runtime';
import type { TvistOptions } from '../core/types';
import { TVIST_CLASSES } from '../core/constants';
import { Resources } from '../utils/resources';

/** Lifecycle of a built-in component. This is not a public extension API. */
export interface Component {
  name: string;
  init(): void;
  destroy(): void;
  shouldBeActive(): boolean;
  onUpdate?(): void;
  onScroll?(): void;
  onResize?(): void;
  onSlideChange?(index: number): void;
  onOptionsUpdate?(options: Partial<TvistOptions>): void;
}

export type ComponentFactory = (tvist: TvistRuntime, options: TvistOptions) => Component;

/** Shared subscriptions belong to an individual activation, never to the global slider. */
class ComponentResources extends Resources {
  constructor(private readonly __tvistInternal_tvist: TvistRuntime) {
    super();
  }

  get __tvistInternal_resources(): Resources {
    return this;
  }

  __tvistInternal_shouldBeActive(this: void): boolean {
    return true;
  }

  __tvistInternal_findOwnElement(selector: string): HTMLElement | null {
    const root = this.__tvistInternal_tvist.__tvistInternal_root;
    return (
      Array.from(root.querySelectorAll<HTMLElement>(selector)).find(
        (element) => element.closest(`.${TVIST_CLASSES.block}`) === root
      ) ?? null
    );
  }

  // Event arguments are defined by TvistOptions.on.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  __tvistInternal_emit(event: string, ...args: any[]): void {
    this.__tvistInternal_tvist.__tvistInternal_emit(event, ...args);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  __tvistInternal_on(event: string, handler: (...args: any[]) => void): void {
    const tvist = this.__tvistInternal_tvist;
    tvist.__tvistInternal_on(event, handler);
    this.__tvistInternal_add(() => tvist.__tvistInternal_off(event, handler));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  __tvistInternal_off(event: string, handler?: (...args: any[]) => void): void {
    this.__tvistInternal_tvist.__tvistInternal_off(event, handler);
  }

  __tvistInternal_dispose(): void {
    this.__tvistInternal_clear();
  }
}

export function createComponent(tvist: TvistRuntime, _options: TvistOptions) {
  return new ComponentResources(tvist);
}
