# ADR-0007: A ticker hands back its cancel before it ticks

- **Status:** Accepted
- **Date:** 2026-09-07
- **Related:** ADR-0005

## Context

`RunSimulation.execute` (ADR-0005) registers a callback with the `Ticker` port and stops the run from
inside that callback:

```ts
const cancel = this.ticker.each(simulation.everyMs, () => {
  ...
  if (remaining === 0 || generation.isExtinct) {
    cancel();
  }
});
```

`cancel` is a `const` declared by the very statement that registers the callback, so it sits in the
temporal dead zone until `each` returns. CA-B left this as an open thread because no real ticker
existed. CA-C writes two, and the question stopped being theoretical.

Measured: a ticker that drains synchronously inside `each` makes `execute` throw
`ReferenceError: Cannot access 'cancel' before initialization` on the tick that ends the run, and the
clock it was supposed to stop is never cancelled.

## Decision

The `Ticker` port carries a documented precondition: **`each` must return before it first calls
`fn`.** Cadence remains entirely the adapter's business (ADR-0005); this constrains re-entrancy only.

Both adapters honour it structurally rather than by care. `RealTicker` only ever calls `fn` from
inside a frame callback, which the browser invokes later by construction. `DrainingTicker` defers
through `queueMicrotask` before its first tick, which is what makes it a legal ticker rather than a
loop; its name deliberately avoids "eager", which would name the forbidden shape.

Three tests enforce it, at two levels:

- `adapters/keeping-a-simulation-ticking.test.ts` runs one parameterized case over **both** tickers
  and asserts nothing has ticked when `each` returns.
- `application/driving-the-simulation.test.ts` drives `RunSimulation` with a deliberately eager
  ticker and asserts the observable damage: the run fails and the clock is never cancelled. It
  asserts neither the error class nor its message, so it does not couple to the dead zone as the
  mechanism.

## Consequences

**Positive**

- The constraint is on the smaller, newer side of the seam. Ports are contracts, and "do not call me
  back before I have returned" is an ordinary one to state.
- Both adapters satisfy it by construction, so nothing has to remember to.
- A third adapter written later fails a test on its first run rather than misbehaving in production.

**Negative / accepted**

- A future adapter author must read the port to learn the precondition. The doc comment on
  `Ticker.each` is where it is written, and the parameterized test is where a new ticker gets checked.

## Alternatives considered

- **Harden `RunSimulation` with `cancel?.()`.** Rejected, and it is worse than doing nothing: the
  optional call no-ops against an unassigned binding, so `each` hands back a cancel nobody holds and
  the ticker runs forever. Real robustness needs a `cancelled` flag the ticker must also respect,
  which spreads more contract across both sides than the precondition does, to buy an adapter shape
  nothing needs.
- **Hoist `let cancel` above the registration.** Same defect in a different spelling: the callback
  would read `undefined` rather than throw, so the run would silently never stop.
- **Give the port a completion signal so the application owns stopping.** Rejected for CA-C: no
  consumer needs it. The CLI keeps run completion adapter-local, on `DrainingTicker.finished`, which
  is outside the `Ticker` interface. A driving adapter with a wider surface than the port it
  satisfies is ordinary. Revisit when a third consumer needs completion, which is the signal that
  the concept belongs in `application/`.
