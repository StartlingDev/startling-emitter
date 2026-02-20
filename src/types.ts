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
  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void;
  on(event: '*', handler: AnyEventHandler<Events>): () => void;
  on(event: `${string}.*` | `${string}:*`, handler: NamespaceWildcardHandler<Events>): () => void;

  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void;
  off(event: '*', handler: AnyEventHandler<Events>): void;
  off(event: `${string}.*` | `${string}:*`, handler: NamespaceWildcardHandler<Events>): void;

  listenerCount<K extends keyof Events>(event: K): number;
  listenerCount(event: WildcardKey): number;

  eventNames(): Array<keyof Events>;
  clear(): void;

  emit<K extends keyof Events>(...args: EmitArgs<Events, K>): void;

  once<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void;
  once(event: '*', handler: AnyEventHandler<Events>): void;
  once(event: `${string}.*` | `${string}:*`, handler: NamespaceWildcardHandler<Events>): void;

  waitFor<K extends keyof Events>(
    event: K,
    options?: {
      signal?: AbortSignal;
      timeoutMs?: number;
      filter?: (payload: Events[K]) => boolean;
    }
  ): Promise<Events[K]>;
}