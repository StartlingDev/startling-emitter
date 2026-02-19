import { describe, expect, it, vi } from 'vitest';
import { createEmitter } from '../src/index';

type TestEvents = {
  ping: number;
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
});
