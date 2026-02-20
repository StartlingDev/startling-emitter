import { describe, it, expect, vi } from 'vitest';
import { createEmitter } from '../src/index';

type TestEvents = {
  ping: number;
  done: void;
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
});
