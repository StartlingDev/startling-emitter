export type EventMap = Record<PropertyKey, any>;

export type Handler<T = unknown> = T extends void ? () => void : (payload: T) => void;

export type EmitArgs<Events extends EventMap, K extends keyof Events> =
  Events[K] extends void ? [event: K] : [event: K, payload: Events[K]];

export type WildcardKey = '*' | `${string}.*` | `${string}:*`;

export type AnyEventHandler<Events extends EventMap> = (
  event: keyof Events,
  payload?: Events[keyof Events]
) => void;

// For namespace wildcards, you usually only want payloads, not event names.
// Payload is optional for void events.
export type NamespaceWildcardHandler<Events extends EventMap> =
  Handler<Events[keyof Events]> | (() => void);

export interface Emitter<Events extends EventMap> {
  /**
   * Registers an event handler and returns an unsubscribe function.
   */
  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void;
  /**
   * Registers a global wildcard event handler and returns an unsubscribe function.
   */
  on(event: '*', handler: AnyEventHandler<Events>): () => void;
  /**
   * Registers a namespaced wildcard event handler and returns an unsubscribe function.
   */
  on(event: `${string}.*` | `${string}:*`, handler: NamespaceWildcardHandler<Events>): () => void;

  /**
   * Unregisters a previously added handler for a key.
   */
  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void;
  /**
   * Unregisters a previously added handler for a global wildcard key.
   */
  off(event: '*', handler: AnyEventHandler<Events>): void;
  /**
   * Unregisters a previously added handler for a namespaced wildcard key.
   */
  off(event: `${string}.*` | `${string}:*`, handler: NamespaceWildcardHandler<Events>): void;

  /**
   * Returns the number of listeners currently attached to a key.
   */
  listenerCount<K extends keyof Events>(event: K): number;
  /**
   * Returns the number of listeners currently attached to a wildcard key.
   */
  listenerCount(event: WildcardKey): number;

  /**
   * Returns all exact event keys that currently have at least one listener.
   */
  eventNames(): Array<keyof Events>;
  /**
   * Removes all exact, namespace-wildcard, and global wildcard listeners.
   */
  clear(): void;

  /**
   * Emits an event to exact listeners, then namespace wildcards, then `*`.
   * Listener sets are snapshotted to tolerate mutation during iteration.
   */
  emit<K extends keyof Events>(...args: EmitArgs<Events, K>): void;

  /**
   * Registers a handler that is invoked at most once for the target key.
   */
  once<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void;
  /**
   * Registers a handler that is invoked at most once for the next event.
   */
  once(event: '*', handler: AnyEventHandler<Events>): void;
  /**
   * Registers a handler that is invoked at most once for the next namespaced event.
   */
  once(event: `${string}.*` | `${string}:*`, handler: NamespaceWildcardHandler<Events>): void;

  /**
   * Resolves with the next emitted payload for an event key.
   * Can filter payloads and reject on timeout or abort signal.
   */
  waitFor<K extends keyof Events>(
    event: K,
    options?: {
      signal?: AbortSignal;
      timeoutMs?: number;
      filter?: (payload: Events[K]) => boolean;
    }
  ): Promise<Events[K]>;
}