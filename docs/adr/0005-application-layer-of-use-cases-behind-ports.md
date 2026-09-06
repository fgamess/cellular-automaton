# ADR-0005: An application layer of use cases, behind ports, isolation extended by CI

- **Status:** Accepted
- **Date:** 2026-09-06
- **Related:** ADR-0001, ADR-0004

## Context

ADR-0001 put the domain in the browser and kept it delivery-agnostic: no framework, no I/O, no
clock. ADR-0004 enforced that with a CI grep and, in its own consequences, already named what would
come next: "extending the boundary to a second layer later (an adapter that must not reach into
another adapter) is the same block, re-scoped to a new directory."

Story CA-B needed exactly that second layer. Driving a simulation from a named pattern needs three
things the domain must not depend on: a way to look a pattern up by name, a way to schedule and
cancel repeated work, and somewhere to send each generation once it is computed. None of that is a
domain concern, but writing it straight into an adapter would duplicate the same orchestration in
every adapter CA-C adds (a CLI first, a browser later), and would blur exactly the seam ADR-0004
protects: an adapter reaching for the clock and the catalog itself, rather than through a boundary
that can be checked.

## Decision

A new `application/` layer holds one class per use case: `RunSimulation`, `StepGeneration`,
`PreviewPattern`. Each depends only on the domain's public surface and on three ports it declares
for the adapters to implement:

```ts
interface PatternCatalog { find(name: PatternName): Promise<Pattern>; }
interface GenerationView { display(generation: Generation): void; }
interface Ticker { each(ms: number, fn: () => void): Cancel; }
```

CI's isolation step is generalised from a single `only_these` check into a function taking a layer
and its allowed specifiers, then applied twice:

```bash
only_these domain '^\./'
only_these application '^(\./|\.\./domain/index\.ts$)'
```

`domain/` keeps ADR-0004's rule unchanged. `application/` may reach into `domain/` only through its
`index.ts`, not through any of the domain's internal files, so the public surface is the only
contract the use cases can lean on. `tsconfig.json`, `vite.config.ts` and `package.json`'s
`smoke:domain` widen to match.

## Consequences

**Positive**

- Every use case is unit-testable with no I/O at all: an in-memory `PatternCatalog`, a spy
  `GenerationView`, a fake `Ticker` that runs its callback on demand instead of on a timer
  (`application/driving-the-simulation.test.ts`).
- CA-C's adapters share this orchestration instead of each reimplementing "seed a pattern, tick,
  stop at extinction or the generation limit." Domain's new `Generation.isExtinct` exists for
  exactly this: `RunSimulation.execute` is the only caller that needed it.
- The isolation net widens with no new tool, exactly as ADR-0004 anticipated: the same `grep`, run
  twice with a different allow-list.

**Negative / accepted**

- `application/` can now reach the domain only through what `domain/index.ts` deliberately exports.
  A concept the use cases need but the domain has not chosen to publish is unreachable by
  construction, not by convention. Accepted: this is the same discipline ADR-0004 already applies to
  adapters, now applied one layer earlier.
- `PatternCatalog.find` returns a `Promise` even though CA-B's own fixtures resolve synchronously.
  Accepted: CA-C's real catalog reads a bundled asset or the filesystem, both legitimately
  asynchronous, and narrowing the port to synchronous now would only mean widening it later.
- Ticker ownership (`setInterval`/`clearInterval` versus `requestAnimationFrame`, or a manual
  `advance()` in tests) is entirely the adapter's decision. The application layer only knows "some
  fixed cadence exists and can be cancelled." Accepted as the point of the port.

## Alternatives considered

- **Orchestration inline in each adapter.** Rejected: it is the CLI-and-browser duplication this
  layer exists to avoid, and it puts a clock and a pattern lookup one `import` away from the domain
  with nothing to stop it.
- **Fold the use cases into `domain/`.** Rejected: they depend on things to look up, render to, and
  schedule against, which is precisely the dependency ADR-0001 removed from the domain. Moving them
  in would recreate that mistake one layer over rather than undo it.
- **A generic event bus between domain and adapters instead of named ports.** Rejected for the same
  reason ADR-0004 chose a specific grep over a general architecture-testing library: `PatternCatalog`,
  `GenerationView` and `Ticker` name the three actual seams, and a generic mechanism would hide them
  behind indirection this project does not need yet.
