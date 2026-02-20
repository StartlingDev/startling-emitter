import { describe, it, expect, vi } from 'vitest';
import { createEmitter } from '../src/index';

type TestEvents = {
  ping: number;
  done: void;
  'user.created': { id: string };
  'user.deleted': { id: string };
  'user:login': { id: string };
};

describe('createEmitter', () => {
  it('emit calls handlers', () => {
    const emitter = createEmitter<TestEvents>();
    const calls: number[] = [];

    emitter.on('ping', (payload) => {
      calls.push(payload);
    });

    emitter.emit('ping', 42);
    expect(calls).toEqual([42]);
  });

  it('off removes handler', () => {
    const emitter = createEmitter<TestEvents>();
    const handler = vi.fn<(payload: number) => void>();

    emitter.on('ping', handler);
    emitter.off('ping', handler);
    emitter.emit('ping', 1);

    expect(handler).not.toHaveBeenCalled();
  });

  it('on returns an unsubscribe function', () => {
    const emitter = createEmitter<TestEvents>();
    const handler = vi.fn<(payload: number) => void>();

    const unsubscribe = emitter.on('ping', handler);
    expect(typeof unsubscribe).toBe('function');

    emitter.emit('ping', 1);
    unsubscribe();
    emitter.emit('ping', 2);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(1);
  });

  it('once calls handler only once', () => {
    const emitter = createEmitter<TestEvents>();
    const handler = vi.fn<(payload: number) => void>();

    emitter.once('ping', handler);
    emitter.emit('ping', 1);
    emitter.emit('ping', 2);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(1);
  });

  it('removing during emit does not break iteration', () => {
    const emitter = createEmitter<TestEvents>();
    const calls: string[] = [];

    // first handler pushes 'a' and removes other handler
    const a = () => {
      calls.push('a');
      emitter.off('ping', b);
    };
    // second handler pushes 'b'
    const b = () => {
      calls.push('b');
    };

    emitter.on('ping', a);
    emitter.on('ping', b);
    // First emit calls both handlers
    emitter.emit('ping', 1);

    // Since we snapshot the handlers, both should be called
    expect(calls).toEqual(['a', 'b']);
    calls.length = 0;

    // Second emit should only call 'a' since 'b' was removed
    emitter.emit('ping', 2);
    expect(calls).toEqual(['a']);
  });

  it('waitFor resolves with the next payload', async () => {
    const emitter = createEmitter<TestEvents>();
    const pending = emitter.waitFor('ping');

    emitter.emit('ping', 7);

    await expect(pending).resolves.toBe(7);
  });

  it('waitFor applies filter until payload matches', async () => {
    const emitter = createEmitter<TestEvents>();
    const pending = emitter.waitFor('ping', { filter: (payload) => payload > 10 });

    emitter.emit('ping', 5);
    emitter.emit('ping', 11);

    await expect(pending).resolves.toBe(11);
  });

  it('waitFor rejects on timeout', async () => {
    vi.useFakeTimers();
    try {
      const emitter = createEmitter<TestEvents>();
      const pending = emitter.waitFor('ping', { timeoutMs: 50 });
      const assertion = expect(pending).rejects.toThrow('Timed out');

      await vi.advanceTimersByTimeAsync(50);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('waitFor rejects on abort', async () => {
    const emitter = createEmitter<TestEvents>();
    const controller = new AbortController();
    const pending = emitter.waitFor('ping', { signal: controller.signal });
    const assertion = expect(pending).rejects.toThrow('Aborted');

    controller.abort();

    await assertion;
  });

  it('waitFor supports void payload events', async () => {
    const emitter = createEmitter<TestEvents>();
    const pending = emitter.waitFor('done');

    emitter.emit('done');

    await expect(pending).resolves.toBeUndefined();
  });

  it('listenerCount returns number of handlers for an event', () => {
    const emitter = createEmitter<TestEvents>();
    const a = vi.fn<(payload: number) => void>();
    const b = vi.fn<(payload: number) => void>();

    expect(emitter.listenerCount('ping')).toBe(0);

    const unsubscribeA = emitter.on('ping', a);
    emitter.on('ping', b);
    expect(emitter.listenerCount('ping')).toBe(2);

    unsubscribeA();
    expect(emitter.listenerCount('ping')).toBe(1);

    emitter.off('ping', b);
    expect(emitter.listenerCount('ping')).toBe(0);
  });

  it('eventNames returns registered events', () => {
    const emitter = createEmitter<TestEvents>();
    const pingHandler = vi.fn<(payload: number) => void>();
    const doneHandler = vi.fn<() => void>();

    expect(emitter.eventNames()).toEqual([]);

    emitter.on('ping', pingHandler);
    emitter.on('done', doneHandler);

    expect(emitter.eventNames()).toEqual(['ping', 'done']);

    emitter.off('ping', pingHandler);
    expect(emitter.eventNames()).toEqual(['done']);
  });

  it('clear removes all events and handlers', () => {
    const emitter = createEmitter<TestEvents>();
    const pingHandler = vi.fn<(payload: number) => void>();
    const doneHandler = vi.fn<() => void>();

    emitter.on('ping', pingHandler);
    emitter.on('done', doneHandler);
    expect(emitter.listenerCount('ping')).toBe(1);
    expect(emitter.listenerCount('done')).toBe(1);
    expect(emitter.eventNames()).toEqual(['ping', 'done']);

    emitter.clear();

    expect(emitter.listenerCount('ping')).toBe(0);
    expect(emitter.listenerCount('done')).toBe(0);
    expect(emitter.eventNames()).toEqual([]);

    emitter.emit('ping', 123);
    emitter.emit('done');
    expect(pingHandler).not.toHaveBeenCalled();
    expect(doneHandler).not.toHaveBeenCalled();
  });

  it('global wildcard receives event name and payload', () => {
    const emitter = createEmitter<TestEvents>();
    const wildcard = vi.fn<
      (event: keyof TestEvents, payload?: TestEvents[keyof TestEvents]) => void
    >();

    emitter.on('*', wildcard);
    emitter.emit('ping', 42);
    emitter.emit('done');

    expect(wildcard).toHaveBeenCalledTimes(2);
    expect(wildcard).toHaveBeenNthCalledWith(1, 'ping', 42);
    expect(wildcard).toHaveBeenNthCalledWith(2, 'done');
  });

  it('namespace dot wildcard only matches dot-prefixed events', () => {
    const emitter = createEmitter<TestEvents>();
    const ns = vi.fn<(payload: { id: string }) => void>();

    emitter.on('user.*', ns);
    emitter.emit('user.created', { id: 'a' });
    emitter.emit('user.deleted', { id: 'b' });
    emitter.emit('user:login', { id: 'c' });

    expect(ns).toHaveBeenCalledTimes(2);
    expect(ns).toHaveBeenNthCalledWith(1, { id: 'a' });
    expect(ns).toHaveBeenNthCalledWith(2, { id: 'b' });
  });

  it('namespace colon wildcard only matches colon-prefixed events', () => {
    const emitter = createEmitter<TestEvents>();
    const ns = vi.fn<(payload: { id: string }) => void>();

    emitter.on('user:*', ns);
    emitter.emit('user:login', { id: 'x' });
    emitter.emit('user.created', { id: 'y' });

    expect(ns).toHaveBeenCalledTimes(1);
    expect(ns).toHaveBeenCalledWith({ id: 'x' });
  });

  it('off and once work for wildcard handlers', () => {
    const emitter = createEmitter<TestEvents>();
    const star = vi.fn<
      (event: keyof TestEvents, payload?: TestEvents[keyof TestEvents]) => void
    >();
    const onceStar = vi.fn<
      (event: keyof TestEvents, payload?: TestEvents[keyof TestEvents]) => void
    >();

    emitter.on('*', star);
    expect(emitter.listenerCount('*')).toBe(1);
    emitter.off('*', star);
    expect(emitter.listenerCount('*')).toBe(0);

    emitter.emit('ping', 1);
    expect(star).not.toHaveBeenCalled();

    emitter.once('*', onceStar);
    emitter.emit('ping', 2);
    emitter.emit('done');
    expect(onceStar).toHaveBeenCalledTimes(1);
  });
});
