# startling-emitter

A tiny, fully-typed event emitter with exact keys, namespace wildcards, and Promise-based event waiting.

✨ ~1 kB gzipped  
🚫 Zero dependencies  
📦 ESM-first  

---

## Install

```bash
npm install @startling/emitter
```

---

## Why startling-emitter?

- Strongly typed event maps
- Exact-key subscriptions
- Namespace wildcards (`user.*`, `user:*`)
- Global wildcard (`*`)
- Promise-based `waitFor`
- AbortSignal + timeout support
- Safe against listener mutation during emit
- Zero dependencies

---

## Quick Start (TypeScript)

```ts
import { createEmitter } from '@startling/emitter';

type Events = {
  connected: { id: string };
  message: { from: string; text: string };
  closed: void;
};

const emitter = createEmitter<Events>();

const unsubscribe = emitter.on('message', (payload) => {
  console.log(payload.from, payload.text);
});

emitter.emit('message', { from: 'system', text: 'hello' });
unsubscribe();
```

Events typed as `void` must be emitted without a payload:

```ts
emitter.emit('closed'); // ✅
```

---

## Quick Start (JavaScript)

```js
import { createEmitter } from '@startling/emitter';

const emitter = createEmitter();

emitter.on('message', (payload) => {
  console.log(payload);
});

emitter.emit('message', { from: 'system', text: 'hello' });
```

Type declarations are included for editor IntelliSense.

---

# Wildcards

### Global wildcard

```ts
emitter.on('*', (event, payload) => {
  console.log('event:', event, 'payload:', payload);
});
```

Matches all emitted events.

---

### Namespace wildcards

Supports both dot (`.`) and colon (`:`) separators.

```ts
emitter.on('user.*', (payload) => {
  console.log('dot namespace:', payload);
});

emitter.on('user:*', (payload) => {
  console.log('colon namespace:', payload);
});
```

Examples:

```ts
emitter.emit('user.created', { id: '1' }); // matches "user.*"
emitter.emit('user:login', { id: '1' });   // matches "user:*"
```

Namespace matching is prefix-based and evaluated at emit time.

---

# waitFor

Wait for the next matching event.

```ts
const payload = await emitter.waitFor('message');

emitter.emit('message', { from: 'ops', text: 'ready' });
```

### With filtering

```ts
const adminMessage = await emitter.waitFor('message', {
  filter: (p) => p.from === 'admin'
});
```

### With timeout and AbortSignal

```ts
const controller = new AbortController();

await emitter.waitFor('message', {
  timeoutMs: 1000,
  signal: controller.signal
});
```

Rejects with:

- `Error('Timed out')`
- `Error('Aborted')`

---

# once

Registers a handler that runs at most once:

```ts
emitter.once('connected', (payload) => {
  console.log('connected:', payload.id);
});
```

Works with exact keys and wildcards.

---

# Introspection

```ts
emitter.on('connected', () => {});
emitter.on('closed', () => {});

console.log(emitter.listenerCount('connected')); // 1
console.log(emitter.eventNames()); // ['connected', 'closed']

emitter.clear();
console.log(emitter.eventNames()); // []
```

- `listenerCount(event)` — number of listeners attached
- `eventNames()` — exact event keys currently registered
- `clear()` — removes all listeners

Wildcard registrations are not included in `eventNames()`.

---

# API Summary

| Method | Description |
|--------|------------|
| `on(event, handler)` | Register a listener. Returns unsubscribe function. |
| `off(event, handler)` | Remove a specific listener. |
| `once(event, handler)` | Register a listener that auto-unregisters. |
| `emit(event, payload?)` | Emit an event. |
| `waitFor(event, options?)` | Resolve when event fires. |
| `listenerCount(event)` | Number of listeners for a key. |
| `eventNames()` | List of exact event keys. |
| `clear()` | Remove all listeners. |

---

# Design Notes

- Listener sets are snapshotted during `emit`, allowing safe mutation during iteration.
- Namespace wildcards are prefix-based and support both `.` and `:` separators.
- All APIs are strongly typed when using a typed event map.

---

# Development

```bash
npm test
npm run typecheck
npm run build
```