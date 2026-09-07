# ADR-0009: One catalog, two text sources, so both deliveries share one parse path

- **Status:** Accepted
- **Date:** 2026-09-07
- **Related:** ADR-0005, ADR-0006

## Context

ADR-0006 decided that patterns ship as plaintext `.cells` files, parsed by a pure domain function,
and left one question open on purpose: "fetching it from wherever it lives (an adapter concern CA-C
still owns)." CA-C is the story that has to answer it, twice over, because `PatternCatalog`
(ADR-0005) needs an implementation in the browser and a different one in the terminal.

The two runtimes cannot fetch a pattern's text the same way. `domain/reading-plaintext-patterns.test.ts`
already shows the working shape for the browser: `import glider from '../patterns/glider.cells?raw'`,
one static import per file, transformed by Vite into the file's text at build time. That transform
needs a literal specifier it can resolve without running any code: `?raw` cannot be applied to a
specifier built from a variable, so a single import cannot serve an arbitrary `PatternName` picked at
runtime. The CLI has the opposite problem: it runs under bare `node --experimental-strip-types`, with
no Vite in the loop at all, so a `?raw` import resolves to nothing there regardless.

Two runtimes needing genuinely different I/O is not itself a decision; it is a fact about the
platforms. The decision is where the seam between them goes. Putting it at the `PatternCatalog`
boundary (a `BrowserPatternCatalog` and a `CliPatternCatalog`, each composing `parseCells` with
`Pattern.of` for itself) would duplicate the one line that makes "one unchanged domain, two
deliveries" true rather than aspirational, and CA-B's parser (ADR-0006) exists specifically so that
composition has exactly one home.

## Decision

One class, `adapters/patterns/BundledPatternCatalog.ts`, implements `PatternCatalog` for both
deliveries. Its only constructor dependency is a `TextSource`:

```ts
export type TextSource = (name: PatternName) => Promise<string>;
```

`find` calls the source and composes the result with `parseCells` and `Pattern.of`: the single site
the CI "One place composes a pattern" step (ADR-0008) counts and pins at exactly one, in this file.
`TextSource` is declared beside the catalog, in `adapters/patterns/`, not in `application/ports.ts`:
the application layer has three ports and does not need to know a fourth, narrower seam exists
beneath one of them.

Two `TextSource` values exist, one per runtime, and neither is a `PatternCatalog`:

- **`bundledTextSource`** (browser): `import.meta.glob('../../patterns/*.cells', { query: '?raw',
  eager: true, import: 'default' })`. The glob's specifier is still a literal Vite can resolve
  statically, but it now enumerates every shipped pattern once, at build time, into a map. "Which
  pattern" becomes a runtime lookup into that map (`shipped[`../../patterns/${name.value}.cells`]`)
  instead of a per-call import specifier, which is what makes it parameterizable where a single
  `?raw` import is not.
- **`fileTextSource`** (CLI): `node:fs/promises.readFile`, resolved from `import.meta.dirname`
  (never `process.cwd()`, which would make the result depend on where the command happens to be run
  from), with an explicit containment check (`file.startsWith(SHIPPED_PATTERNS + sep)`) before any
  read, so a name the domain would never mint still cannot walk out of `patterns/` by accident.

Both suppliers are exercised against the same behavioural contract in
`adapters/finding-a-pattern-by-name.test.ts` (`it.each` over both), so "reads the glider this
repository ships" and "refuses a name this repository ships no pattern under" are pinned once, for
both, rather than twice, once per adapter-specific catalog.

## Consequences

**Positive**

- The composition of `parseCells` with `Pattern.of` exists in one place, and ADR-0008's CI step
  fails the build if a second one appears anywhere in `domain/`, `application/` or `adapters/`.
- A third delivery needs one more `TextSource` function, not a new catalog class, and it is checked
  against the same `it.each` contract for free.
- The unknown-pattern-name rejection (`RangeError`) and the path-containment guard are each written
  once, and both are exercised across both runtimes rather than assumed to hold for the untested one.

**Negative / accepted**

- The two suppliers are still tested through different mechanisms underneath the shared contract:
  `bundledTextSource` runs through Vitest's own Vite transform, `fileTextSource` through real Node
  I/O against `patterns/` on disk. The parameterized test pins that they agree on outcome, not that
  they agree on mechanism.
- `PatternName.of`'s structural validation (rejects `../../etc/passwd`, `..`, `a/../../b`, path
  separators generally) already runs before either `TextSource` is called: the CLI parses
  `--pattern` through it first. `fileTextSource`'s own containment check is therefore defense in
  depth, not the only guard, kept because the test suite states it should hold "even for a name the
  domain would never mint."

## Alternatives considered

- **A `BrowserPatternCatalog` and a `CliPatternCatalog`, one per delivery.** Rejected: each would
  compose `parseCells` with `Pattern.of` for itself, which is exactly the duplication ADR-0008's
  single-composition check exists to catch, and would still need the shared behavioural test to prove
  they agree.
- **A per-name `?raw` import, chosen dynamically.** Not viable, not merely undesirable: Vite requires
  the `?raw` specifier to be a static literal it can resolve without executing code, so a
  `PatternName` value picked at runtime cannot appear inside one. `import.meta.glob` is the
  parameterizable form of the same transform, which is why the browser supplier uses it instead.
- **One catalog reading text via an injected `fetch`-or-`readFile` chosen by a runtime flag.**
  Rejected: it would push an `if`/`else` into the catalog to pick the I/O, when the constructor
  argument already expresses that choice, and a boolean flag lets a caller wire the browser catalog
  to file I/O (or the reverse) with no compile-time signal that anything is wrong.
