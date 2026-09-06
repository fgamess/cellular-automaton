# ADR-0004: Enforce domain isolation with a CI grep, not an architecture-testing library

- **Status:** Accepted
- **Date:** 2026-09-06
- **Related:** ADR-0001

## Context

ADR-0001 decided that `domain/` "depends on nothing: no framework, no I/O, no clock." A dependency
rule is only as good as what enforces it, and nothing in TypeScript's type system stops a future
import from reaching out of `domain/`: `tsconfig.json` scoping `include` to `domain` controls what
gets typechecked, not what a file inside it is allowed to `import`. The rule needed a mechanical
check before CA-C adds adapters that legitimately *do* import the domain from outside it, at which
point "nothing reaches in beyond position" and "domain reaches out to nothing" become two rules
that are easy to conflate.

## Decision

CI's `Domain isolation` step (`.github/workflows/ci.yml`) extracts every module specifier imported
by non-test files under `domain/`:

```bash
specifiers=$(grep -rhoE "(from|import)[[:space:]]+['\"][^'\"]+['\"]|import[[:space:]]*\([[:space:]]*['\"][^'\"]+['\"]" \
  domain --include='*.ts' --exclude='*.test.ts' \
  | sed -E "s/.*['\"]([^'\"]+)['\"].*/\1/")
```

and fails the build if any specifier is not a relative `./` path, or if the extraction found
nothing at all (an empty match exits 1 rather than passing vacuously, the same
`verification-must-be-falsifiable` discipline applied to a CI gate rather than a test).

This is the **sole** mechanism enforcing the ADR-0001 dependency rule. No `dependency-cruiser`, no
`eslint-plugin-boundaries` / import-restriction rule, no architecture-test library.

## Consequences

**Positive**

- Zero new dependency, about fifteen lines of shell, sub-second to run.
- Fails loud on drift: a `foreign` specifier or an empty extraction both exit non-zero with the
  offending list printed, rather than silently passing.
- Extending the boundary to a second layer later (an adapter that must not reach into another
  adapter) is the same block, re-scoped to a new directory, with no new tool to introduce.

**Negative / accepted**

- A grep over import specifiers is not static analysis. A domain file reaching outside itself via
  `globalThis`, a dynamic string built at runtime, or `require()` would not be caught. Accepted:
  the domain is pure functions over immutable values (ADR-0001, ADR-0002) with no such construct in
  it today, and introducing one would already be a design violation the check exists to make
  visible, not the only thing preventing it.
- The check can express exactly one rule, "everything in `domain/` is relative", not the general
  "layer A may depend on B but not C" graph a tool like `dependency-cruiser` models. Sufficient
  while the domain depends on nothing; would need revisiting if a second internal layer with its
  own allowed-dependency list appears inside `domain/`.

**Neutral**

- The check runs in CI only, not as a pre-commit hook or as part of `pnpm verify`, so a local build
  can still pass with a violation that only surfaces on push.

## Alternatives considered

- **`dependency-cruiser`.** Rejected: a devDependency and a rules file for a constraint that today
  has exactly one direction (`domain -> nothing`). Reconsider if the dependency graph grows past
  what a specifier prefix can express.
- **`eslint-plugin-boundaries` / `import/no-restricted-paths`.** Rejected for the same reason, and
  Biome's linter (ADR-0003) does not yet offer an equivalent path-boundary rule.
- **A Vitest test asserting the import graph.** Rejected: parsing or executing TypeScript's module
  resolution inside a test to re-derive the same specifier list is more code than the grep, for the
  same guarantee.
