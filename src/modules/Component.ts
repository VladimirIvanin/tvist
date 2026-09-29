import type { TvistRuntime } from '../core/runtime';
import type { TvistOptions } from '../core/types';
import { TVIST_CLASSES } from '../core/constants';
import { createResources } from '../utils/resources';

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
export function createComponent(tvist: TvistRuntime, _options: TvistOptions) {
  const resources = createResources();
  return {
    resources,
    shouldBeActive: () => true,
    findOwnElement(selector: string): HTMLElement | null {
      return (
        Array.from(tvist.root.querySelectorAll<HTMLElement>(selector)).find(
          (element) => element.closest(`.${TVIST_CLASSES.block}`) === tvist.root
        ) ?? null
      );
    },
    // Event arguments are defined by TvistOptions.on.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emit(event: string, ...args: any[]): void {
      tvist.emit(event, ...args);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, handler: (...args: any[]) => void): void {
      tvist.on(event, handler);
      resources.add(() => tvist.off(event, handler));
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    off(event: string, handler?: (...args: any[]) => void): void {
      tvist.off(event, handler);
    },
    dispose(): void {
      resources.clear();
    },
  };
}
