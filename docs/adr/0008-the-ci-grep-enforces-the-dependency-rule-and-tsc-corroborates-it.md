# ADR-0008: The CI grep enforces the dependency rule; `tsc` corroborates and cannot enforce

- **Status:** Accepted
- **Date:** 2026-09-07
- **Related:** ADR-0001, ADR-0004, ADR-0005

## Context

CA-C's first acceptance criterion asked for the dependency rule to be verified rather than claimed,
and named the mechanism: compile `domain/` and `application/` through a `tsconfig.domain.json` that
excludes `adapters/` entirely, and fail if either layer needs a file from it.

Measured before writing any code: **`tsc` cannot express that.** A tsconfig's `include` seeds the
program, it does not bound it. An `application/` file importing `../adapters/browser/CanvasView.ts`
is compiled anyway, because the compiler follows imports out of the include set, and exits 0.
`exclude` and `rootDir` do not change it. The second half of the criterion, `vitest run domain
application`, passes for the same reason: Vite resolves the import and runs the test.

So the criterion as written could not fail, which makes it worth nothing, and it also contradicted
ADR-0004, which had already declared the CI grep the sole enforcement.

## Decision

The two mechanisms are given the jobs they can actually do, and the split is written down.

**The CI grep enforces.** `.github/workflows/ci.yml`'s `Layer isolation` step now runs six
extractions rather than two: `domain`, `application` and `adapters`, each over source files and over
test files separately, each with its own positive allow-list. Test files are policed because an
adapter import planted in `application/driving-the-simulation.test.ts` was measured to pass every
other check in the repository. The allow-lists are positive (what a layer may import) rather than
negative (what it may not), so a new kind of foreign import fails rather than slipping through a
deny-list that encodes only the answers already known.

The specifier regex recognises all three JavaScript string delimiters, `'`, `"` and the backtick, on
both the static (`from` / `import`) form and the dynamic (`import(...)`) one. The backtick was added
after a template-literal specifier planted in `application/RunSimulation.ts`,
``await import(`../adapters/browser/CanvasView.ts`)``, was measured to pass every gate in this
workflow. The empty-extraction guard cannot cover that hole: the file's own quoted imports keep the
extraction non-empty, so the guard never fires and the escape is simply never seen.

The dynamic alternative also accepts `import.meta.glob(`, which is Vite's own glob form and the one
way a file can name a set of modules without writing a specifier the plain form would catch. It was
added after a review measured `import.meta.glob('../adapters/cli/*.ts')` planted in
`application/driving-the-simulation.test.ts` leaving this step at exit 0 and `pnpm check:hexagon`
at exit 0 with 270 tests passing, the adapter modules genuinely resolved. `tsconfig.domain.json`
catches the same plant in a *source* file with TS2339 (`Property 'glob' does not exist on type
'ImportMeta'`, because `types: []` strips `vite/client`) but excludes `**/*.test.ts`, so the
corroborating half never saw the test-file case.

Line comments are stripped before extraction, because the regex reads any quoted token following the
words `from` or `import` anywhere on a line, and prose uses both. That was measured on a draft of the
`Ticker` comment in `application/ports.ts`, which named ``from `each` `` and failed the step with a
module specifier `each` that does not exist. The comment has since been reworded and no longer holds
that shape, so it is the control fixture below, not the tree, that keeps the strip honest.

The strip is quote-state-aware. An `awk` pass walks each line character by character, tracks which of
`'`, `"` and the backtick is open, honours a backslash escape inside one, and cuts at the first `//`
it meets *outside* a string. A `https://` specifier therefore survives because it sits inside its own
quotes, not because of a special case for the colon, and a specifier carrying a `//` of its own
survives with it.

That second property is why the strip was rewritten. The earlier line-wide
`sed -E 's@(^|[^:])//.*@\1@'` cut from the first `//` not preceded by a colon to the end of the line,
so a specifier holding a `//` lost its closing delimiter before the regex ran, and the regex, every
alternative of which needs a closing `'`, `"` or backtick, then matched nothing at all on that line.
The foreign specifier was not rejected by an allow-list; it never reached one. Measured:
`export { BundledPatternCatalog as Leaked } from '../adapters//patterns/BundledPatternCatalog.ts';`
appended to `application/ports.ts` left this step, Biome, `tsc`, `pnpm check:hexagon`, `pnpm test` and
`pnpm build` all at exit 0, with the module genuinely resolving under both Node and Vite. The same
import written with a single slash reds the step, which is what shows the doubled slash was hidden
rather than allowed. Under the quote-state strip the doubled-slash import reds it too, at exit 1,
naming `../adapters//patterns/BundledPatternCatalog.ts`.

The step therefore opens on a control of its own. It writes a fixture holding all six delimiter
shapes (three delimiters times two forms), an `import.meta.glob` call, a comment carrying a
``from `each` `` shape and a quoted phantom path, a real import trailing a comment that also names
that phantom, a `https://` specifier whose own `//` must survive the strip, a relative specifier
holding a `//` that must survive it too, a real import following a string literal that itself holds a
`//`, and an import inside a block comment. It asserts the extractor reads exactly the twelve
specifiers those lines put in front of it. Set equality, not a pattern match.

It then replaces that fixture with two imports, one named by the allow-list and one holding a `//`,
and asserts that `only_these` refuses while naming that second specifier. Two things make that
assertion able to fail, and they are not equal in weight. The load-bearing one is that the assertion
matches the refusal's own MESSAGE rather than its exit status, because a refusal for some other
reason is indistinguishable from the right one by status alone. The admitted import is the lesser
one: once the message is matched it buys diagnostic clarity rather than falsifiability, since a
refusal arriving from the empty guard already fails the needle match with or without it. Under the
weaker exit-status form it was genuinely load-bearing, which is why it is here. Finally it deletes that fixture too and
asserts that `only_these` over the now-empty directory refuses with the empty-extraction message.

Every one of those properties was measured to red it: narrowing the static alternative to single
quotes loses three shapes; dropping `\.meta\.glob` loses the glob; neutralising the strip gains `each`
and three phantoms; discarding the whole line at the cut rather than only its tail loses the two real
imports that trail a comment; never entering string state loses the `https://`, the doubled-slash and
the after-a-string specifiers; restoring the old line-wide `sed` loses the doubled-slash and the
after-a-string ones; adding a block-comment strip loses the block-commented one; widening the second
fixture's allow-list to name the doubled-slash specifier makes the rejection control fire; and
restoring the old line-wide `sed` while also removing the admitted import makes the rejection control
fire on the wrong reason rather than passing quietly. That last one is deliberately stated as the
COMPOUND mutation. Removing the admitted import alone does not red the step, because the shipped
strip extracts the doubled-slash specifier correctly and the refusal then carries the right message;
an earlier revision listed it as a standalone killer, which was measured false and is corrected here.
A false entry in a list headed "every one of these was measured" is the expensive direction of that
mistake, not the cheap one.

The same idiom polices one more structural claim the repository makes about itself. A `One place
composes a pattern` step counts every `Pattern.of(` occurrence in the non-test sources of all three
layers and fails unless there is exactly one, in `adapters/patterns/BundledPatternCatalog.ts`. That
single composition of `parseCells` with `Pattern.of` is what makes both deliveries share one parse
path rather than drifting onto two, and it was previously asserted only by the README. Zero
occurrences fails as loudly as two, for ADR-0004's empty-extraction reason. It strips line comments
for the reason above, and it opens on its own control: a fixture holding two real compositions on
one line and a third inside a comment, which must count 2. Neutralising the comment truncation
counts 3 and reds it; counting lines rather than occurrences counts 1 and reds it too.

**`tsconfig.domain.json` corroborates.** It compiles the source files of `domain/` and
`application/` with `lib: ["ES2022"]` and `types: []`, which is a real and falsifiable claim: neither
layer touches a DOM global, a Node global, or any ambient `@types` package. Measured both ways: a
planted `document.title` reds it with TS2584, a planted `process.exitCode` with TS2591, and the tree
as shipped exits 0. That is worth having, and it is not the dependency rule. `pnpm check:hexagon`
runs it together with `vitest run domain application`, and is wired into both `pnpm verify` and CI.

It excludes `**/*.test.ts`, and the exclusion is what makes it able to fail. With test files in, a
test's `import ... from 'vitest'` pulls Vitest's own declarations, which reference `@types/node`,
which puts the Node globals back into scope for every file in the program. Measured: the same
planted `process.exitCode` exited 0. The tests still run, under the `vitest run domain application`
half of the same script, but that half only runs them: it does not assert that they reach for no
ambient global. Measured: appending `if (globalThis) { process.exitCode = 0; }` to a domain test
leaves all three legs green. So the no-ambient-global claim covers the source files of `domain/` and
`application/` and nothing covers their test files, which is the residual this exclusion buys. What
it buys is that the compiler half now asserts something it can be wrong about.

The story file's acceptance criterion 1 was amended to say this rather than the thing that cannot
fail.

## Consequences

**Positive**

- Every claim the tooling makes is one it can break on. The grep's empty-extraction guard (ADR-0004)
  is inherited by all six invocations, so a mis-scoped layer fails loudly rather than measuring
  nothing.
- `tsconfig.domain.json` catches a class the grep cannot see: a global reached without an import,
  which ADR-0004 explicitly listed as its blind spot.
- Adding `adapters/` needed no new tool, exactly as ADR-0004 predicted.

**Negative / accepted**

- Six allow-lists are more shell than two, and each is a regex that has to be widened when a layer
  legitimately gains a new import shape. Accepted: a too-loose regex makes the step vacuous, and the
  cost of widening it deliberately is the price of that not happening by accident.
- The browser text source's glob is now visible to the step, and the adapters source allow-list had
  to gain `../../patterns/\*\.cells` to admit it: the extraction went from 16 distinct specifiers to
  17, and the seventeenth is that glob. Distinct, not total: the step reads 31 occurrences over that
  layer's sources. Admitting it by name is the deliberate cost of seeing it at all.
  Deleting the entry reds the step, which is what makes the admission a decision rather than a
  silence.
- A block comment is not stripped at all, so `/* import "../adapters/x.ts" */` still reds the step.
  Accepted rather than fixed, and the reason is that this one fails closed: a commented-out import
  is reported as a real one, which is noise a reader resolves in seconds, not an escape. A strip
  that spanned lines would have to carry block-comment state across them, which is a larger risk in
  shell than the noise it removes. The control pins the behaviour, so changing it has to be
  deliberate.
- The strip reads one line at a time, so its string state does not span lines, and it does not tell
  a regular-expression literal from a division. **Both consequences can fail OPEN**, and an earlier
  revision of this bullet claimed the first of them failed closed. That was measured false and is
  corrected here, because this paragraph is where a maintainer would look before deciding whether
  the class needs hardening.
  - **A multi-line template literal.** The scanner resets its string state per line, so it enters
    the template's *closing* line outside string state. That line carries the template's tail and
    then ordinary code, so a `//` inside the template's own text cuts away everything after it,
    including a real import on the same line. Measured end to end: with
    ``export const n = `a\nb // c` + typeof (await import('../adapters/patterns/BundledPatternCatalog.ts'));``
    planted in `application/ports.ts`, all eight gates exit 0 while the adapter module genuinely
    resolves under bare Node. The shape is formatter-stable: `biome check --write` produces it and
    `pnpm lint` then exits 0. The narrower phrasing "no *import declaration* can share such a line"
    was also false on its own terms: `` const n = `a\nb`; import { X } from '../adapters/x.ts'; ``
    puts a static declaration there, and the wording did not cover the dynamic `import()` expression
    this step's specifier pattern was widened to catch.
  - **A regex literal ending in `//`.** An import written after it on the same line is cut away with
    it.
  Both are **accepted, not fixed**, at the same price already paid for the block comment above:
  closing them needs cross-line string state in shell, which is a larger risk than the escape it
  removes. Currently **inert**: measured, `domain/`, `application/` and `adapters/` contain zero
  lines with an odd backtick count, so no multi-line template literal exists in the tree, and the
  strip cuts exactly six lines across the three layers, all of them ordinary line comments.
  This is the floor of scanning JavaScript with shell, and it is why the grep is scoped to being
  the *enforcement* rather than a proof.

**Neutral**

- The grep still runs in CI only. `pnpm verify` now runs `check:hexagon`, so the corroborating half
  is available locally while the enforcing half is not.

## Alternatives considered

- **Widen `tsconfig.json` and rely on a project-references graph.** Rejected: it would make the
  claim look enforced while `tsc` still follows imports out of the seeded set, which is the exact
  illusion this ADR exists to remove.
- **Drop `tsconfig.domain.json` entirely.** Rejected: it proves the no-ambient-global claim, which
  nothing else in the repository does, and `pnpm check:hexagon` already existed as a promise.
- **Bring in a dependency graph tool.** Rejected again, for ADR-0004's reasons, which the extension
  to a third directory did not change.
