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

  return {
    on<K extends keyof Events>( event: K, handler: Handler<Events[K]>): () => void {
      getSet(event).add(handler as Handler<any>);
      
      return () => remove(event, handler as Handler<any>);
    },
    off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
      remove(event, handler as Handler<any>);
    },
    emit<K extends keyof Events>(...args: EmitArgs<Events, K>): void {
      const [event, payload] = args as [K, Events[K]];
      const set = handlers.get(event);
      if (!set) return;

      // Create a copy to prevent issues if handlers are removed during iteration
      for (const fn of Array.from(set)) {
        (fn as Handler<any>)(payload);
      }
    },
    once<K extends keyof Events>( event: K, handler: Handler<Events[K]>): void {
      const wrapper = (payload: Events[K]) => {
        handler(payload);
        remove(event, wrapper as Handler<any>);
      };
      getSet(event).add(wrapper as Handler<any>);
    }
  };
}
