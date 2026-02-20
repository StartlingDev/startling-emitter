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
  - Registers an event handler. 
- `off(event, handler): void`
  - Unregisters an event handler. 
- `once(event, handler): void`
  - Registers an event handler that unregisters itself after being called once.
- `on('*', (event, payload?) => {})`
  - Registers a global wildcard matching all registered events.
- `on('namespace.*', (payload) => {})`
  - Registers a namespace wildcard using a dot (example: `user.*` -> `user.created`)
- `on('namespace:*', (payload) => {})`
  - Registers a namespace wildcard using a colon (example: `user:*` -> `user:created`)
- `emit(event, payload?): void`
  - Emit an event with an payload. (`void` events emit with no payload)
- `waitFor(event, options?): Promise<payload>`
  - Waits for an event to be fired. Includes optional timeout, filters, and abort signal.
- `listenerCount(event): number`
  - Gets the number of listeners for a specified event.
- `eventNames(): Array<event>`
  - Gets the list of events being listened for. Does _not_ include wildcard patterns.
- `clear(): void`
  - Unregisters all event handlers.

## Wildcard examples

```ts
emitter.on('*', (event, payload) => {
  console.log('any event:', event, payload);
});

emitter.on('user.*', (payload) => {
  console.log('dot namespace payload:', payload);
});

emitter.on('user:*', (payload) => {
  console.log('colon namespace payload:', payload);
});

emitter.emit('user.created', { id: '1' }); // matches "*" and "user.*"
emitter.emit('user:login', { id: '1' });   // matches "*" and "user:*"
```

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
