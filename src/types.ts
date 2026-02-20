export type EventMap = Record<string | symbol, any>;

export type Handler<T = unknown> = T extends void ? () => void : (payload: T) => void;

export type EmitArgs<Events extends EventMap, K extends keyof Events> =
  Events[K] extends void ? [event: K] : [event: K, payload: Events[K]];

export interface Emitter<Events extends EventMap> {
  on<K extends keyof Events>(
    event: K,
    handler: Handler<Events[K]>
  ): () => void;
  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void;
  emit<K extends keyof Events>(...args: EmitArgs<Events, K>): void;
  once<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void;
  waitFor<K extends keyof Events>(
    event: K,
    options?: {
      signal?: AbortSignal;
      timeoutMs?: number;
      filter?: (payload: Events[K]) => boolean;
    }
  ): Promise<Events[K]>;
}
