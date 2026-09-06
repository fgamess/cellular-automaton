# ADR-0006: Patterns shipped as plaintext `.cells` files, parsed by a pure domain function

- **Status:** Accepted
- **Date:** 2026-09-06
- **Related:** ADR-0001, ADR-0005

## Context

`templates/*.txt` held five patterns since the domain's first commit, drawn in a spacing that
matched nothing a parser could read back (blank leading lines, runs of spaces standing for dead
cells, no fixed alphabet), kept only "for the pattern-loading story that consumes it next." CA-B is
that story: `RunSimulation` and `PreviewPattern` (ADR-0005) need a named pattern turned into live
cells before a generation can be seeded.

Two questions had to be answered together: what text format a pattern is written in, and where the
line is drawn between reading that text (a domain concern, since the result is just positions) and
fetching it from wherever it lives (an adapter concern CA-C still owns, per ADR-0001).

## Decision

Patterns are stored under `patterns/` in the plaintext format the wider Life community already
uses: `!`-prefixed comment lines, `O` for a live cell, `.` for a dead one, a line's missing trailing
dead cells left implicit. `domain/cells.ts` exports one pure function, `parseCells(text): Position[]`,
added to the domain's public surface alongside `Pattern` and `PatternName`. It takes a string and
returns positions; it opens nothing and reads nothing from disk.

Getting that string into the browser is a build-time concern, not a domain one: tests import a
pattern file with Vite's `?raw` suffix (`import glider from '../patterns/glider.cells?raw'`), and
`raw-cells.d.ts` declares what that import produces so `tsc` accepts it:

```ts
declare module '*.cells?raw' {
  const content: string;
  export default content;
}
```

`Pattern.of(name, cells)` (domain) then turns those positions into a named, boundable shape:
cropped to its own bounding box, placeable at an origin, centreable on a `Topology`. CA-C's real
`PatternCatalog` (ADR-0005) is expected to compose `parseCells` with whatever fetch or read gets the
text there; CA-B stops at the parser and the format it parses.

## Consequences

**Positive**

- The parser is a pure function over a string, so it needs no fake filesystem or fetch to test:
  `domain/reading-plaintext-patterns.test.ts` drives it directly and, separately, decodes every
  shipped `.cells` file and asserts each cell lands where a hand-written coordinate list says it
  should.
- Choosing a format the Life community already uses means the five shipped patterns (glider, gun,
  spaceship, tumbler, exploder) needed no invented encoding, only a rewrite from the old
  `templates/*.txt` spacing into the `O`/`.` alphabet.
- `?raw` keeps the fetch mechanism out of the domain and the tests both: nothing here decides yet
  how the browser adapter will actually retrieve a pattern by name, only that once it has the text,
  `parseCells` is what turns it into positions.

**Negative / accepted**

- The format's comment lines (`!Name: ...`, `!Author: ...`) are read past, not read: `parseCells`
  extracts no metadata from them. A pattern's displayed name still comes from `PatternName`, decided
  by the catalog, not from the file's own `!Name:` line. Accepted for CA-B; revisit if a later story
  wants the file to be the single source of a pattern's display name.
- A stray space is refused rather than treated as a dead cell. The old `templates/*.txt` files this
  ADR replaces drew dead cells as blank space, so a leftover file in that shape fails loudly on the
  first parse instead of silently drawing nothing. Deliberate: cheaper to fix a source file once
  than to debug a pattern that quietly parsed as empty, and every pattern this repository ships was
  rewritten against the `O`/`.` alphabet specifically.
- `?raw` is a Vite-specific import suffix. `raw-cells.d.ts` and the `?raw` specifier both assume a
  Vite-driven bundler is what ships the browser adapter; a non-Vite adapter would need its own way
  to get the file's text to `parseCells`, not a new parser.

## Alternatives considered

- **RLE (`.rle`), the other format the Life community standards on.** Rejected for this story: RLE
  packs run-lengths and is harder to hand-verify against a coordinate list in a test; the plaintext
  format's cells are visible in the file exactly as `parseCells` will read them, which is what the
  shipped-pattern tests lean on.
- **A bespoke JSON array of coordinates.** Rejected: it would have thrown away the point of shipping
  recognisable community patterns, replaced a format anyone can read and draw by eye with one only
  this codebase understands, and gained nothing `parseCells` does not already give for free.
- **Read the file from within the domain.** Rejected outright by ADR-0001: the domain depends on
  nothing, and a `readFile` or `fetch` inside `domain/` is exactly the dependency that ADR would
  refuse, and ADR-0004's CI grep would fail on.
