export type EventMap = Record<string | symbol, any>;

export type Handler<T = unknown> = (payload: T) => void;

export interface Emitter<Events extends EventMap> {
  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void;
  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void;
  emit<K extends keyof Events>(event: K, payload: Events[K]): void;
}
