/** Owns subscriptions and scheduled work for a single activation. */
export function createResources() {
  const cleanups = new Set<() => void>();
  const listeners: {
    target: EventTarget;
    event: string;
    handler: EventListener;
    capture: boolean;
    off: () => void;
  }[] = [];
  const timers = new Map<number, () => void>();
  const frames = new Map<number, () => void>();
  function add(cleanup: () => void): () => void {
    cleanups.add(cleanup);
    return () => {
      if (cleanups.delete(cleanup)) cleanup();
    };
  }
  function capture(options?: boolean | AddEventListenerOptions): boolean {
    return typeof options === 'boolean' ? options : (options?.capture ?? false);
  }
  function unlisten<T extends Event>(
    target: EventTarget,
    event: string,
    handler: (event: T) => unknown,
    options?: boolean | AddEventListenerOptions
  ): void {
    const entry = listeners.find(
      (item) =>
        item.target === target &&
        item.event === event &&
        item.handler === (handler as EventListener) &&
        item.capture === capture(options)
    );
    entry?.off();
  }
  function listen<T extends Event>(
    target: EventTarget,
    event: string,
    handler: (event: T) => unknown,
    options?: boolean | AddEventListenerOptions
  ): () => void {
    unlisten(target, event, handler, options);
    const listener = handler as EventListener;
    target.addEventListener(event, listener, options);
    const entry = {
      target,
      event,
      handler: listener,
      capture: capture(options),
      off: () => target.removeEventListener(event, listener, options),
    };
    entry.off = add(() => {
      target.removeEventListener(event, listener, options);
      listeners.splice(listeners.indexOf(entry), 1);
    });
    listeners.push(entry);
    return entry.off;
  }
  function timeout(callback: () => void, delay: number): number {
    const id = window.setTimeout(() => {
      off();
      callback();
    }, delay);
    const off = add(() => {
      window.clearTimeout(id);
      timers.delete(id);
    });
    timers.set(id, off);
    return id;
  }
  function frame(callback: FrameRequestCallback): number {
    const id = requestAnimationFrame((time) => {
      off();
      callback(time);
    });
    const off = add(() => {
      cancelAnimationFrame(id);
      frames.delete(id);
    });
    frames.set(id, off);
    return id;
  }
  function cancelTimeout(id: number): void {
    timers.get(id)?.();
  }
  function cancelFrame(id: number): void {
    frames.get(id)?.();
  }
  function clear(): void {
    Array.from(cleanups).forEach((cleanup) => cleanup());
    cleanups.clear();
  }
  return { add, listen, unlisten, timeout, frame, cancelTimeout, cancelFrame, clear };
}
