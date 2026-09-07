# ADR-0010: Stryker's checker retargeted to the domain tsconfig, break threshold raised to 98

- **Status:** Accepted
- **Date:** 2026-09-07
- **Related:** ADR-0003, ADR-0008
- **Amends:** ADR-0003's `break: 90` and `tsconfigFile: "tsconfig.json"`

## Context

ADR-0003 set up Stryker with `tsconfigFile: "tsconfig.json"` and `thresholds.break: 90`, against a
tree that had no `adapters/`. `mutate` was, and stays, scoped to `domain/**/*.ts` only: Stryker's
own `typescript-checker` uses `tsconfigFile` to compile the *whole* program a mutant is dropped into,
not just the files being mutated.

CA-C widens `tsconfig.json` to include `adapters` and adds `"types": ["node", "vite/client"]`
(ADR-0008), because the main program now has to typecheck the browser and CLI deliveries too.
Pointing Stryker's checker at that same, now-wider file would make every mutation run typecheck
`adapters/` on every mutant, for a directory `mutate` never touches and a runtime concern (DOM
globals, Node globals, Vite's glob types) domain code has no business depending on. ADR-0008 had
already built the tool for the narrower job, `tsconfig.domain.json`, which compiles only `domain/`
and `application/` with `lib: ["ES2022"]` and `types: []`, but had not yet said whether Stryker
should use it, and left it as an open, load-bearing question: "Still UNVERIFIED, to settle during
implementation: that Stryker's typescript-checker behaves correctly with `tsconfigFile` pointed at
`tsconfig.domain.json` (Stryker rewrites tsconfigs inside its sandbox)."

Separately, ADR-0003's `break: 90` was set against a measured ceiling that has since moved. CA-B's
suite reached 99.15% (233 killed / 235 valid, 2 survivors), and CA-C's own review confirmed both
survivors are genuinely equivalent mutants, not coverage gaps: `cell.x + dx -> cell.x - dx` and the
same for `dy` at `domain/Generation.ts:89`, where `OFFSETS` is symmetric about the origin, so negating
either component permutes the set onto itself and no reachable input can tell the mutant from the
original. `break: 90` left eleven points of the ceiling below 90 unguarded: a real regression to,
say, 92% would still pass CI green.

## Decision

`stryker.config.json` changes two fields together, because the second only reads honestly once the
first is verified:

- `tsconfigFile`: `"tsconfig.json"` -> `"tsconfig.domain.json"`. Verified rather than assumed, per the
  open question above: `pnpm mutation` was run against the retargeted config and exited 0, generating
  114 compile-kill mutants (mutants Stryker's checker itself rules out before a test ever runs), with
  no change in behaviour attributable to the narrower program.
- `thresholds.break`: `90` -> `98`. Set against the measured 99.15% ceiling with roughly one point of
  slack for the two known-equivalent survivors and about one further point of headroom; `99` would
  leave zero slack for either. Falsified rather than asserted: a deliberate `describe.skip` on a
  `domain/` test dropped the score to 94.04%, which sits *above* the old `break: 90` (so the old
  threshold would have passed it silently) and *below* the new `break: 98` (so the new one fails the
  build).

## Consequences

**Positive**

- Mutation testing no longer typechecks a directory (`adapters/`) it never mutates, against types
  (`vite/client`, `node`) that a mutant in `domain/` has no way to reach.
- The threshold now tracks the suite's real strength: a regression of the size that mattered before
  (dropping to 94%) is now caught; previously it was not.
- The two known-equivalent survivors are named and explained in one place (this ADR), so a future
  reviewer does not have to re-derive why they cannot be killed before trusting the threshold.

**Negative / accepted**

- `break: 98` has roughly one point of slack beyond the two equivalent mutants. A single new,
  genuinely-killable mutant introduced by future domain code and left uncovered can fail the build at
  a score that `break: 90` would have waved through; that is the threshold doing its job, but it means
  future domain changes carry a tighter mutation budget than before.
- The two equivalent mutants are pinned to today's `OFFSETS` symmetry in `domain/Generation.ts`. If
  that symmetry is ever broken deliberately (an asymmetric neighbourhood rule), the two survivors may
  become killable or may be joined by new ones, and the 98 figure would need re-measuring rather than
  carried forward by habit.

## Alternatives considered

- **Leave `tsconfigFile` at `tsconfig.json`.** Rejected: it would make every mutation run pay for
  typechecking `adapters/`, and couple a domain-only mutation score to whether the browser and CLI
  deliveries happen to typecheck that day, a concern `mutate`'s own scope says should not matter.
- **A dedicated `tsconfig.mutation.json`, separate from `tsconfig.domain.json`.** This was the
  plan's stated fallback if Stryker misbehaved under a shared, sandbox-rewritten tsconfig. Not
  needed: the verification run showed no misbehaviour, and a third tsconfig would be one more file to
  keep in sync with the other two for no measured benefit.
- **Raise `break` to `99`.** Rejected: it would leave no room at all for the two confirmed-equivalent
  survivors, so the gate would fail on green code the moment it ran, for a reason with no fix.
- **Leave `break` at `90`.** Rejected on the same measurement that motivated the change: the
  `describe.skip` probe showed a regression to 94.04%, a real loss of coverage, passing silently
  under the old number.
