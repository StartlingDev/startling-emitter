import type {
  Emitter,
  EventMap,
  EmitArgs,
  Handler,
  AnyEventHandler,
  NamespaceWildcardHandler,
  WildcardKey
} from './types';

/**
 * Returns whether a key uses supported namespace wildcard syntax.
 * Supported forms are `namespace.*` and `namespace:*`.
 */
function isNamespaceWildcardKey(key: string): key is `${string}.*` | `${string}:*` {
  return key.endsWith('.*') || key.endsWith(':*');
}

/**
 * Converts a wildcard key to its namespace prefix, preserving separator.
 * Example: `user.*` -> `user.`, `user:*` -> `user:`.
 */
function wildcardPrefixFromKey(key: `${string}.*` | `${string}:*`): string {
  return key.slice(0, -1);
}

/**
 * Builds all namespace prefixes for a string event key.
 * Example: `a.b:c` -> [`a.`, `a.b:`].
 */
function getNamespacePrefixes(event: string): string[] {
  const prefixes: string[] = [];
  for (let i = 0; i < event.length; i += 1) {
    const ch = event[i];
    if (ch === '.' || ch === ':') prefixes.push(event.slice(0, i + 1));
  }
  return prefixes;
}

/**
 * Creates a typed emitter with exact-key and wildcard subscriptions.
 */
export function createEmitter<Events extends EventMap>(): Emitter<Events> {
  /** Exact event handlers keyed by event name (string, number, or symbol). */
  const exact = new Map<PropertyKey, Set<Handler<any>>>();
  /** Namespace wildcard handlers keyed by prefixes ending in `.` or `:`. */
  const ns = new Map<string, Set<NamespaceWildcardHandler<Events>>>();
  /** Global wildcard handlers registered on `*`. */
  const star = new Set<AnyEventHandler<Events>>();

  /**
   * Returns an existing handler set for a key, or creates a new one.
   */
  function getSet<K, V>(map: Map<K, Set<V>>, key: K): Set<V> {
    let set = map.get(key);
    if (!set) {
      set = new Set<V>();
      map.set(key, set);
    }
    return set;
  }

  /**
   * Removes one handler from a keyed set and prunes empty sets.
   */
  function removeFromMap<K, V>(map: Map<K, Set<V>>, key: K, handler: V): void {
    const set = map.get(key);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) map.delete(key);
  }

  /**
   * Registers an event handler and returns an unsubscribe function.
   * Supports exact events, global wildcard `*`, and namespace wildcards.
   */
  function on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void;
  function on(event: '*', handler: AnyEventHandler<Events>): () => void;
  function on(event: `${string}.*` | `${string}:*`, handler: NamespaceWildcardHandler<Events>): () => void;
  function on(event: keyof Events | WildcardKey, handler: any): () => void {
    if (event === '*') {
      star.add(handler);
      return () => star.delete(handler);
    }

    if (typeof event === 'string' && isNamespaceWildcardKey(event)) {
      const prefix = wildcardPrefixFromKey(event);
      getSet(ns, prefix).add(handler);
      return () => removeFromMap(ns, prefix, handler);
    }

    getSet(exact, event).add(handler);
    return () => removeFromMap(exact, event, handler);
  }

  /**
   * Unregisters a previously added handler for an exact or wildcard key.
   */
  function off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void;
  function off(event: '*', handler: AnyEventHandler<Events>): void;
  function off(event: `${string}.*` | `${string}:*`, handler: NamespaceWildcardHandler<Events>): void;
  function off(event: keyof Events | WildcardKey, handler: any): void {
    if (event === '*') {
      star.delete(handler);
      return;
    }

    if (typeof event === 'string' && isNamespaceWildcardKey(event)) {
      const prefix = wildcardPrefixFromKey(event);
      removeFromMap(ns, prefix, handler);
      return;
    }

    removeFromMap(exact, event, handler);
  }

  /**
   * Registers a handler that is invoked at most once for the target key.
   */
  function once<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void;
  function once(event: '*', handler: AnyEventHandler<Events>): void;
  function once(event: `${string}.*` | `${string}:*`, handler: NamespaceWildcardHandler<Events>): void;
  function once(event: keyof Events | WildcardKey, handler: any): void {
    if (event === '*') {
      const wrapper: AnyEventHandler<Events> = (evt, payload) => {
        star.delete(wrapper);
        handler(evt, payload);
      };
      star.add(wrapper);
      return;
    }

    if (typeof event === 'string' && isNamespaceWildcardKey(event)) {
      const prefix = wildcardPrefixFromKey(event);

      const wrapper: NamespaceWildcardHandler<Events> = ((payload?: any) => {
        removeFromMap(ns, prefix, wrapper);
        (handler as any)(payload);
      }) as any;

      getSet(ns, prefix).add(wrapper);
      return;
    }

    const wrapper: Handler<any> = (payload?: any) => {
      removeFromMap(exact, event, wrapper);
      (handler as any)(payload);
    };

    getSet(exact, event).add(wrapper);
  }

  /**
   * Returns the number of listeners currently attached to a key.
   */
  function listenerCount<K extends keyof Events>(event: K): number;
  function listenerCount(event: WildcardKey): number;
  function listenerCount(event: keyof Events | WildcardKey): number {
    if (event === '*') return star.size;

    if (typeof event === 'string' && isNamespaceWildcardKey(event)) {
      const prefix = wildcardPrefixFromKey(event);
      return ns.get(prefix)?.size ?? 0;
    }

    return exact.get(event)?.size ?? 0;
  }

  /**
   * Returns all exact event keys that currently have at least one listener.
   */
  const eventNames = (): Array<keyof Events> => {
    return Array.from(exact.keys()) as Array<keyof Events>;
  };

  /**
   * Removes all exact, namespace-wildcard, and global wildcard listeners.
   */
  const clear = (): void => {
    exact.clear();
    ns.clear();
    star.clear();
  };

  /**
   * Emits an event to exact listeners, then namespace wildcards, then `*`.
   * Listener sets are snapshotted to tolerate mutation during iteration.
   */
  const emit = <K extends keyof Events>(...args: EmitArgs<Events, K>): void => {
    const event = args[0];
    const hasPayload = args.length === 2;
    const payload = (hasPayload ? (args as any)[1] : undefined) as Events[K];

    // 1) exact handlers
    const set = exact.get(event);
    if (set) {
      for (const fn of Array.from(set)) {
        if (!hasPayload) (fn as () => void)();
        else (fn as (p: Events[K]) => void)(payload);
      }
    }

    // 2) namespace wildcards
    if (typeof event === 'string') {
      const prefixes = getNamespacePrefixes(event);
      for (const prefix of prefixes) {
        const set2 = ns.get(prefix);
        if (!set2) continue;

        for (const fn of Array.from(set2)) {
          if (!hasPayload) (fn as () => void)();
          else (fn as (p: Events[K]) => void)(payload);
        }
      }
    }

    // 3) global wildcard
    if (star.size) {
      for (const fn of Array.from(star)) {
        if (!hasPayload) fn(event);
        else fn(event, payload as any);
      }
    }
  };

  /**
   * Resolves with the next emitted payload for an event key.
   * Can filter payloads and reject on timeout or abort signal.
   */
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
    waitFor,
  };
}
