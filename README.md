# startling-emitter

A tiny event emitter for TypeScript and JavaScript projects.

## Install

```bash
npm install startling-emitter
```

## Quick start (TypeScript)

```ts
import { createEmitter } from 'startling-emitter';

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

## Quick start (JavaScript)

```js
import { createEmitter } from 'startling-emitter';

const emitter = createEmitter();

const unsubscribe = emitter.on('message', (payload) => {
  console.log(payload.from, payload.text);
});

emitter.emit('message', { from: 'system', text: 'hello' });
unsubscribe();
```

The package ships type declarations, so JavaScript users can still get IntelliSense in editors that support it.

## API

- `on(event, handler): () => void`
- `off(event, handler): void`
- `once(event, handler): void`
- `emit(event, payload?): void` (`void` events emit with no payload)
- `waitFor(event, options?): Promise<payload>`
- `listenerCount(event): number`
- `eventNames(): Array<event>`
- `clear(): void`

## waitFor examples

```ts
const nextMessage = emitter.waitFor('message');
emitter.emit('message', { from: 'ops', text: 'ready' });
const payload = await nextMessage;
```

```ts
const controller = new AbortController();
const filtered = emitter.waitFor('message', {
  signal: controller.signal,
  timeoutMs: 1_000,
  filter: (p) => p.from === 'admin'
});
```

## Introspection and cleanup

```ts
emitter.on('connected', () => {});
emitter.on('closed', () => {});

console.log(emitter.listenerCount('connected')); // 1
console.log(emitter.eventNames()); // ['connected', 'closed']

emitter.clear();
console.log(emitter.eventNames()); // []
```

## Development

```bash
npm test
npm run typecheck
npm run build
```
