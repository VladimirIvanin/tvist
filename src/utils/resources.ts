interface Listener {
  __tvistInternal_target: EventTarget;
  __tvistInternal_event: string;
  __tvistInternal_handler: EventListener;
  __tvistInternal_capture: boolean;
  __tvistInternal_off: () => void;
}

function capture(options?: boolean | AddEventListenerOptions): boolean {
  return typeof options === 'boolean' ? options : (options?.capture ?? false);
}

/** Shared methods; each activation owns only its resource records. */
export class Resources {
  private readonly __tvistInternal_cleanups = new Set<() => void>();
  private readonly __tvistInternal_listeners: Listener[] = [];
  private __tvistInternal_timers?: Map<number, () => void>;
  private __tvistInternal_frames?: Map<number, () => void>;

  __tvistInternal_add(cleanup: () => void): () => void {
    this.__tvistInternal_cleanups.add(cleanup);
    return () => {
      if (this.__tvistInternal_cleanups.delete(cleanup)) cleanup();
    };
  }

  __tvistInternal_unlisten<T extends Event>(
    target: EventTarget,
    event: string,
    handler: (event: T) => unknown,
    options?: boolean | AddEventListenerOptions
  ): void {
    const entry = this.__tvistInternal_listeners.find(
      (item) =>
        item.__tvistInternal_target === target &&
        item.__tvistInternal_event === event &&
        item.__tvistInternal_handler === (handler as EventListener) &&
        item.__tvistInternal_capture === capture(options)
    );
    entry?.__tvistInternal_off();
  }

  __tvistInternal_listen<T extends Event>(
    target: EventTarget,
    event: string,
    handler: (event: T) => unknown,
    options?: boolean | AddEventListenerOptions
  ): () => void {
    this.__tvistInternal_unlisten(target, event, handler, options);
    const listener = handler as EventListener;
    target.addEventListener(event, listener, options);
    const entry: Listener = {
      __tvistInternal_target: target,
      __tvistInternal_event: event,
      __tvistInternal_handler: listener,
      __tvistInternal_capture: capture(options),
      __tvistInternal_off: this.__tvistInternal_add(() => {
        target.removeEventListener(event, listener, options);
        this.__tvistInternal_listeners.splice(this.__tvistInternal_listeners.indexOf(entry), 1);
      }),
    };
    this.__tvistInternal_listeners.push(entry);
    return entry.__tvistInternal_off;
  }

  __tvistInternal_timeout(callback: () => void, delay: number): number {
    const timers = (this.__tvistInternal_timers ??= new Map());
    const id = window.setTimeout(() => {
      off();
      callback();
    }, delay);
    const off = this.__tvistInternal_add(() => {
      window.clearTimeout(id);
      timers.delete(id);
    });
    timers.set(id, off);
    return id;
  }

  __tvistInternal_frame(callback: FrameRequestCallback): number {
    const frames = (this.__tvistInternal_frames ??= new Map());
    const id = requestAnimationFrame((time) => {
      off();
      callback(time);
    });
    const off = this.__tvistInternal_add(() => {
      cancelAnimationFrame(id);
      frames.delete(id);
    });
    frames.set(id, off);
    return id;
  }

  __tvistInternal_cancelTimeout(id: number): void {
    this.__tvistInternal_timers?.get(id)?.();
  }

  __tvistInternal_cancelFrame(id: number): void {
    this.__tvistInternal_frames?.get(id)?.();
  }

  __tvistInternal_clear(): void {
    Array.from(this.__tvistInternal_cleanups).forEach((cleanup) => cleanup());
    this.__tvistInternal_cleanups.clear();
  }
}

/** Owns subscriptions and scheduled work for a single activation. */
export function createResources(): Resources {
  return new Resources();
}
