# ADR-0002: Represent a generation as a sparse live-set, not a dense grid

- **Status:** Accepted
- **Date:** 2026-09-06
- **Related:** ADR-0001

## Context

The obvious representation of a Life board is a dense `width x height` array of booleans, and that
is what the 2018 implementation used: a 38 x 38 nested array, iterated in full on every tick.

Two problems follow from it.

**It cannot express an unbounded universe.** Conway defined Life on an *infinite plane with finitely
many live cells*. A dense array forces a finite board, which forces a choice about edges, and the
2018 code made that choice implicitly, hard-coding non-wrapping edges inside the neighbour-counting
loop. A glider therefore smears into the wall instead of flying, which is the most visible way the
2018 demo differs from Life as defined.

**It makes cost proportional to the board, not the life on it.** A 38 x 38 board with a 5-cell
glider does 1444 neighbour counts per tick to move five cells.

The natural counter-argument is that a bitset is compact and cache-friendly, and for a dense board
it is faster. Life boards, however, are overwhelmingly sparse in the interesting cases (gliders,
guns, spaceships), and the patterns this project ships are all sparse.

## Decision

`Generation` stores an immutable **set of live positions**, not a grid of cells.

The transition computes its candidate set as `live cells union their neighbours`, evaluates the
ruleset over those candidates only, and returns a new `Generation`. Cost is `O(live x 9)` rather
than `O(width x height)`.

Boundary behaviour becomes an explicit domain concept rather than an implicit loop detail:

```ts
type Topology =
  | { kind: 'bounded';   width: number; height: number }
  | { kind: 'toroidal';  width: number; height: number }
  | { kind: 'unbounded' }
```

`unbounded` is representable only because the storage is sparse.

## Consequences

**Positive**

- The `unbounded` topology becomes possible, so a glider flies forever. This is the single most
  visible improvement over the 2018 demo.
- Cost tracks population, not board area.
- Immutability makes the simultaneity invariant structural: the transition reads `this` and writes
  a new set, so it is not *possible* to write into the grid being read. The 2018 code honoured that
  invariant by convention (a kill queue and a born queue applied after the scan) with nothing
  enforcing it.
- A generation on the wire is the live positions, not the board. A glider is 5 positions.

**Negative / accepted**

- Worse than a bitset for very dense boards (say, >40% live). Accepted: not the case this project
  optimises for, and no shipped pattern approaches it.
- Requires a position key encoding to give the set value-equality semantics.
- Iteration order over a `Set` must be normalised wherever it could leak into output, or
  determinism (see invariant 6 in story CA-A) is not guaranteed. This is a real hazard and is
  covered by a property test, not by inspection.
- `unbounded` means no *edges*, not an infinite address space: a coordinate is a JavaScript number,
  so the plane is addressable only over the safe-integer range. A cell at that extreme therefore has
  fewer than eight neighbours, exactly as a cell against a `bounded` wall does, and the transition
  treats the uncountable side as dead rather than throwing. Keeping `next()` total was preferred to
  narrowing the accepted coordinate range, which cannot be closed under adjacency at any bound and
  so would only move the throw one cell inward. Pinned by `domain/boundaries.test.ts` -> "treats what
  lies beyond the furthest countable coordinate as dead rather than refusing to evolve".
- An extent is refused above the safe-integer range for the same reason a coordinate is, so a torus
  can never be described wider than the coordinates that would have to address its seam. Pinned by
  `domain/universes.test.ts` -> the rejection table's two `MAX_SAFE_INTEGER + 1` rows, and, from
  below, "measures a universe as wide as the furthest countable coordinate".
- A `toroidal` universe may legally be as wide as that same safe-integer range, so the wrap must not
  compute an intermediate value outside it. The usual `((c % e) + e) % e` does: at an extent near
  `Number.MAX_SAFE_INTEGER` the addition rounds, and a cell lands one column from where it was seeded
  while two distinct cells collapse onto one, silently. The fold therefore corrects only a negative
  remainder rather than adding the extent unconditionally. Pinned by `domain/boundaries.test.ts` ->
  "leaves the far columns of a torus as wide as the furthest countable coordinate where they are",
  which is the only input that separates the two forms.

## Alternatives considered

- **Dense `Uint8Array` / bitset.** Faster on dense boards, simpler indexing, cannot express
  `unbounded`. Rejected on the topology ground, which is a domain requirement rather than a
  performance preference.
- **Dense array now, sparse later behind a port.** Rejected as speculative generality: the two
  representations differ in what they can *express*, not merely in how fast they are, so they are
  not substitutable behind one interface.
