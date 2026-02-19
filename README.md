# startling-emitter

A tiny TypeScript event emitter library scaffold, currently a work in progress.

## Install

```bash
npm install startling-emitter
```

## Usage

```ts
import { createEmitter, type EventMap } from 'startling-emitter';

type Events = EventMap;

const emitter = createEmitter<Events>();

// Work in progress: runtime behavior is not implemented yet.
console.log(typeof emitter.on, typeof emitter.off, typeof emitter.emit);
```
