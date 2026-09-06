# ADR-0003: pnpm and a pinned Node 22 toolchain (Vite, Vitest, Biome, Stryker)

- **Status:** Accepted
- **Date:** 2026-09-06
- **Related:** ADR-0001

## Context

ADR-0001 decided *where* the domain runs (the browser, no backend). It does not decide *how* the
domain gets built, tested, linted, or checked for test-suite strength, and the 2018 stack answered
none of that in a way worth keeping: Composer, PHPUnit, and Travis CI, already noted in ADR-0001 as
entirely EOL.

A greenfield TypeScript domain needs a package manager, a pinned runtime, a build tool, a test
runner, a lint/format tool, and (per ADR-0002's invariant list) something stronger than line
coverage to check that the tests actually pin the invariants they claim to.

## Decision

- **pnpm**, pinned via `packageManager: "pnpm@10.14.0"` in `package.json`.
- **Node 22**, pinned in three places that read consistently: `.npmrc` (`use-node-version=22.23.2`,
  so a pnpm-managed install resolves that exact patch), `.nvmrc` (`22`, for nvm users and for
  `actions/setup-node`'s `node-version-file` in CI), and `engines.node: ">=22.12.0"` in
  `package.json` as the floor.
- **Vite 7** as the dev server and build tool.
- **Vitest 3** as the test runner, with `@vitest/coverage-v8` for coverage.
- **Biome** as the single lint-and-format tool (`biome.json`), in place of a separate linter and
  formatter.
- **Stryker 9** (`@stryker-mutator/core`, `-vitest-runner`, `-typescript-checker`) for mutation
  testing, configured in `stryker.config.json` with thresholds `high: 100, low: 95, break: 90`, run
  as its own CI job (`mutation`, gated on `verify` passing first).

## Consequences

**Positive**

- One toolchain, one config file per concern, no cross-tool version drift to track.
- Node is pinned identically for every contributor and for CI: `actions/setup-node` reads
  `.nvmrc`, so the CI runtime and a local `nvm use` resolve the same version.
- Mutation score is a CI gate, not a review opinion: a test suite that only asserts the happy path
  fails the `break: 90` threshold mechanically.

**Negative / accepted**

- The mutation job re-runs `tsc` per surviving mutant (`typescript-checker`), which makes it the
  slowest step in CI. Accepted by running it as a separate job gated behind `verify`, so the fast
  lint/typecheck/test/build feedback loop is not held up by it.
- `pnpm-lock.yaml` ties both CI and every contributor to pnpm specifically; switching package
  managers later means regenerating the lockfile, not editing one field.

**Neutral**

- Biome's `recommended` preset is accepted as-is (`biome.json`) rather than hand-tuned rule by
  rule. Revisit if a specific rule proves wrong for this codebase rather than tuning preemptively.

## Alternatives considered

- **npm or yarn.** Rejected: pnpm's stricter `node_modules` (no phantom dependencies) matters more
  once CA-C adds adapter packages alongside the domain, and getting the isolation right from the
  first commit is cheaper than migrating a lockfile later.
- **ESLint + Prettier.** Rejected in favour of Biome's single Rust binary: one config, one
  command, faster on a codebase this size, at the cost of ESLint's larger plugin ecosystem, which
  this project does not yet need.
- **Skip mutation testing.** Rejected: a domain whose ADRs claim specific invariants (determinism,
  totality at the coordinate boundary, see ADR-0002) needs a check that can tell a vacuous
  assertion from a real one. Line coverage cannot; Stryker's mutation litmus can.
