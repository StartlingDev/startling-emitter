import type { Emitter, EventMap, Handler } from './types';

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

  return {
    on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
      getSet(event).add(handler as Handler<any>);
    },
    off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
      const set = handlers.get(event);
      if (!set) return;

      set.delete(handler as Handler<any>);
      if (set.size === 0) handlers.delete(event);
    },
    emit<K extends keyof Events>(event: K, payload: Events[K]): void {
      const set = handlers.get(event);
      if (!set) return;

      // Create a copy to prevent issues if handlers are removed during iteration
      for (const fn of Array.from(set)) {
        (fn as Handler<any>)(payload);
      }
    }
  };
}
