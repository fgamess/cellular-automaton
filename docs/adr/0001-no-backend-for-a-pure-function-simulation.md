# ADR-0001: No backend for a pure-function simulation

- **Status:** Accepted
- **Date:** 2026-09-06
- **Supersedes:** the 2018 client/server split (PHP API + XHR polling)

## Context

The 2018 implementation split the simulation across an HTTP boundary: the browser held the
authoritative grid, and each generation was computed by POSTing the entire grid to a PHP endpoint
and rendering the response.

Measurements taken against that implementation:

| Fact | Value |
|---|---|
| Grid size | 38 x 38 = 1444 cells |
| Serialized grid (`Cell::jsonSerialize`) | **73,661 bytes** |
| Bytes per generation (request + response) | ~144 KB |
| Poll interval | 50 ms |
| Generations per run | 100 |
| Total transfer for one ~5 s animation | **~14 MB, and 100 PHP processes** |
| Information content of the same grid | 1444 bits = **181 bytes** |

Roughly 64% of those bytes were `coordinateX` / `coordinateY` fields, which are derivable from the
array index.

Conway's Game of Life is a **closed pure function**, `grid -> grid`. It has:

- no persisted state
- no shared state between users
- no secret or credential to protect
- no resource the client should be denied
- no authority the server holds

The server was therefore stateless, and the arrangement amounted to a remote procedure call for
~30 lines of arithmetic. Every reason a server normally exists was absent.

The backend's *existence* was not the design error. The 2018 code was written to a PHP technical
assessment, where server-side domain logic was the deliverable. The error was **where the seam was
cut**: a fine-grained boundary (one round trip per generation) across a function that should never
have been remote at all.

## Decision

**No backend.** The domain runs in the browser. The application is a static site.

The domain layer is delivery-agnostic and depends on nothing: no framework, no I/O, no clock. If a
server is ever wanted, it arrives as an *adapter* over the unchanged domain, not as a boundary
running through the middle of it.

## Consequences

**Positive**

- Generations are computed in microseconds instead of a network round trip.
- Nothing to host, patch, or pay for; no runtime to containerize (Docker is removed).
- No server-side rot. The 2018 stack (PHP 7.2, Travis CI, `php:7.2-apache`) is entirely EOL; a
  static bundle has no equivalent decay.
- Deployment is a static artifact on GitHub Pages, published by CI.

**Negative / accepted**

- No server-side persistence of runs, and no shared multiplayer state. Neither is a requirement.
- Very large grids are bounded by the client's CPU. Accepted; mitigated by ADR-0002.

**Neutral**

- An HTTP adapter remains addable in ~40 lines over the unchanged domain. That this is *cheap* is
  the point of the architecture, and demonstrating it is an explicit goal of story CA-C.
- For that to hold, the domain has to load under a bare Node runtime, which has no bundler to guess
  at a missing file extension. Relative specifiers inside `domain/` therefore carry an explicit
  `.ts`, and `allowImportingTsExtensions` lets the typechecker accept what Node requires. Emitting
  `.js` specifiers instead would have suited a compiled consumer and broken the type-stripping
  consumers this project is heading for: `pnpm smoke:domain` today, and the CLI and HTTP adapters
  CA-C adds later. Pinned by `pnpm smoke:domain`, run in CI: no test can catch
  this, because Vite's resolver accepts extensionless specifiers that Node rejects.

## Alternatives considered

- **Keep the backend, coarsen the seam.** One request returning N generations, grid encoded as a
  bitmask. This would have fixed the performance defect (one request instead of a hundred, ~200
  bytes instead of 72 KB) while preserving server-side domain logic. Rejected because the
  assessment constraint that motivated a server no longer applies.
- **Server-side rendering of frames.** Rejected: strictly more transfer than sending the rules.
