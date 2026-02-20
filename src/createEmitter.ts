import type { Emitter, EventMap, EmitArgs, Handler } from './types';

export function createEmitter<Events extends EventMap>(): Emitter<Events> {
  const handlers = new Map<keyof Events, Set<Handler<any>>>();

  function getSet(event: keyof Events): Set<Handler<any>> {
    let set = handlers.get(event);
    if (!set) {
      set = new Set();
      handlers.set(event, set);
    }
    return set;
  }

  function remove(event: keyof Events, handler: Handler<any>): void {
    const set = handlers.get(event);
    if (!set) return;

    set.delete(handler);
    if (set.size === 0) handlers.delete(event);
  }

  const on = <K extends keyof Events>(
    event: K,
    handler: Handler<Events[K]>
  ): () => void => {
    getSet(event).add(handler as Handler<any>);
    return () => remove(event, handler as Handler<any>);
  };

  const off = <K extends keyof Events>(event: K, handler: Handler<Events[K]>): void => {
    remove(event, handler as Handler<any>);
  };

  const listenerCount = <K extends keyof Events>(event: K): number => {
    return handlers.get(event)?.size ?? 0;
  };

  const eventNames = (): Array<keyof Events> => {
    return Array.from(handlers.keys());
  };

  const clear = (): void => {
    handlers.clear();
  };

  const emit = <K extends keyof Events>(...args: EmitArgs<Events, K>): void => {
    const [event, payload] = args as [K, Events[K]];
    const set = handlers.get(event);
    if (!set) return;

    // Create a copy to prevent issues if handlers are removed during iteration
    for (const fn of Array.from(set)) {
      (fn as Handler<any>)(payload);
    }
  };

  const once = <K extends keyof Events>(event: K, handler: Handler<Events[K]>): void => {
    const wrapper = (payload: Events[K]) => {
      handler(payload);
      remove(event, wrapper as Handler<any>);
    };
    getSet(event).add(wrapper as Handler<any>);
  };

  const waitFor = <K extends keyof Events>(
    event: K,
    options?: {
      signal?: AbortSignal;
      timeoutMs?: number;
      filter?: (payload: Events[K]) => boolean;
    }
  ): Promise<Events[K]> => {
    return new Promise<Events[K]>((resolve, reject) => {
      const teardowns: Array<() => void> = [];
      let cleanup = () => {
        for (let i = teardowns.length - 1; i >= 0; i -= 1) teardowns[i]();
        teardowns.length = 0;
        cleanup = () => {};
      };

      const listener = ((payload: Events[K]) => {
        try {
          if (options?.filter && !options.filter(payload)) return;
          cleanup();
          resolve(payload);
        } catch (error) {
          cleanup();
          reject(error);
        }
      }) as Handler<Events[K]>;

      teardowns.push(on(event, listener));

      if (options?.timeoutMs !== undefined) {
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('Timed out'));
        }, options.timeoutMs);
        teardowns.push(() => clearTimeout(timeout));
      }

      if (options?.signal) {
        if (options.signal.aborted) {
          cleanup();
          reject(new Error('Aborted'));
          return;
        }
        const onAbort = () => {
          cleanup();
          reject(new Error('Aborted'));
        };
        options.signal.addEventListener('abort', onAbort);
        teardowns.push(() => options.signal?.removeEventListener('abort', onAbort));
      }
    });
  };

  return {
    on,
    off,
    listenerCount,
    eventNames,
    clear,
    emit,
    once,
    waitFor
  };
}
