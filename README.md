# Cellular Automaton (Conway's Game of Life)

A **Conway's Game of Life** engine written as a pure, dependency-free TypeScript domain, driven by
two deliveries that share it without either one owning it: a browser canvas and a terminal command.

The domain owns the rules and nothing else: no framework, no I/O, no clock, no network. A board is a
sparse set of live cells, so an unbounded universe is representable and a glider flies forever
instead of smearing into a wall.

## Architecture

Three layers, and the arrows only ever point inwards.

```
domain/          the rules. Depends on nothing at all.
application/     the use cases, and the three ports they reach the outside world through.
adapters/        the two deliveries and the pattern catalogue behind them.
```

`domain/` is a set of pure functions over immutable values: `Position`, `Topology`, `Ruleset`,
`Generation`, `Pattern`, `PatternName`, and the plaintext parser. It is the only place a rule is
written. See [ADR-0001](docs/adr/0001-no-backend-for-a-pure-function-simulation.md) for why there is
no server, and [ADR-0002](docs/adr/0002-sparse-live-set-over-dense-grid.md) for why a board is a set
of live cells rather than a grid of booleans.

`application/` holds three use cases (`RunSimulation`, `PreviewPattern`, `StepGeneration`) and three
ports. `PatternCatalog` finds a pattern by name, `GenerationView` shows a generation, `Ticker` keeps
time. None of them is implemented in that directory.

`adapters/` implements all three, twice over where it matters:

| Port | Browser | Terminal |
|---|---|---|
| `GenerationView` | `CanvasView`, one square per live cell | `ConsoleView`, one block of `O` and `.` |
| `Ticker` | `RealTicker`, over `requestAnimationFrame` | `DrainingTicker`, over `queueMicrotask` |
| `PatternCatalog` | `BundledPatternCatalog` over a Vite `import.meta.glob` | the same catalogue over `fs.readFile` |

The catalogue is one class taking a text source, so exactly one place in the repository composes
`parseCells` with `Pattern.of`. Both deliveries pass through it, which is what makes "one unchanged
domain" a fact about the code rather than a claim about it.

Two deliveries, not one, because nothing distinguishes a hexagon from an ordinary application until
a second delivery mechanism drives the same core. The command line is not decoration: it runs in CI
as a smoke test, so it earns its place twice.

## Requirements

- Node 22 (pinned by `.nvmrc` and `.npmrc`; `pnpm run` selects it for you)
- pnpm 10

```bash
git clone https://github.com/fgamess/cellular-automaton.git
cd cellular-automaton
pnpm install
```

## Running it

In a browser, on `http://localhost:5173`:

```bash
pnpm dev
```

A Gosper glider gun on an unbounded board. The gliders it fires leave the visible area and keep
going; nothing piles up against an edge, because there is no edge.

The page runs that one pattern and offers no way to change it. It takes no options, and the pattern,
the board size and the speed are all fixed in `adapters/browser/main.ts`. To watch any of the other
four patterns, use the terminal delivery below. A pattern selector, a generation counter and speed
controls are planned, not shipped.

In a terminal:

```bash
pnpm life run --pattern glider --topology unbounded --generations 4
```

`run` is the only command, and there is no `--help`.

| Option | Required | Takes |
|---|---|---|
| `--pattern` | yes | the stem of any file under `patterns/`: `glider`, `glider_gun`, `exploder`, `tumbler`, `lightweight_spaceship` |
| `--generations` | yes | 1 to 10000 |
| `--topology` | no, defaults to `unbounded` | `unbounded`, `bounded:WxH` or `toroidal:WxH`, up to 1000 cells on a side |
| `--expect-translation` | no | `dx,dy`, described below |

Each generation prints as a block of `O` for a live cell and `.` for a dead one, oldest first, so a
run of two generations prints the seed and two more blocks after it:

```bash
pnpm life run --pattern glider --topology bounded:8x6 --generations 2
```

```
........
...O....
....O...
..OOO...
........
........

........
........
..O.O...
...OO...
...O....
........
```

The exit code says what happened, so the command composes into a script:

| Code | Meaning |
|---|---|
| 0 | the run completed |
| 1 | `--expect-translation` was given, and the final generation was not the seed shifted by it |
| 2 | the command was refused: an unknown option, a missing value, or a value out of range |

`--expect-translation dx,dy` turns the same command into an assertion: it exits zero only if the
last generation is the seed shifted by that offset, and non-zero otherwise. A glider moves one cell
diagonally every four generations, so this exits zero,

```bash
pnpm life run --pattern glider --topology unbounded --generations 4 --expect-translation 1,1
```

and the same command with `2,2` exits one. CI runs both directions, so the check is falsifiable
rather than merely green.

## Commands

| Command | What it runs |
|---|---|
| `pnpm dev` | Vite dev server on `http://localhost:5173` |
| `pnpm build` | `tsc -b && vite build` into `dist/` |
| `pnpm test` | `vitest run`, single pass, what CI calls |
| `pnpm test:watch` | `vitest`, watch mode |
| `pnpm coverage` | `vitest run --coverage` |
| `pnpm mutation` | `stryker run` over `domain/` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | `biome check .` |
| `pnpm lint:fix` | `biome check --write .` |
| `pnpm verify` | `lint && typecheck && test && check:hexagon && smoke:domain && build`, the local quality gate |
| `pnpm smoke:domain` | loads `domain/` under bare Node and asserts its public surface, which no test can do (the suite resolves through Vite) |
| `pnpm check:hexagon` | compiles `domain/` and `application/` with no DOM and no ambient types, and runs their tests |
| `pnpm life` | the command-line delivery |
| `pnpm preview` | serve the production build |

Run `pnpm verify` before pushing.

## How the layering is enforced

`domain/` imports nothing outside `domain/`. `application/` imports nothing outside `domain/` and
itself. `adapters/` may reach inwards and sideways, and nothing may reach into an adapter.

CI's `Layer isolation` step extracts every module specifier from every layer, source files and test
files separately, and fails the build if one is not on that layer's allow-list. It also fails if the
extraction found nothing at all, so a mis-scoped check cannot pass by measuring nothing.
[ADR-0004](docs/adr/0004-enforce-domain-isolation-with-a-ci-grep.md) chose that mechanism and
[ADR-0008](docs/adr/0008-the-ci-grep-enforces-the-dependency-rule-and-tsc-corroborates-it.md)
records why `tsc` corroborates it but cannot replace it.

## Rules

Birth and survival are data, written in the usual `B3/S23` notation: a dead cell with three live
neighbours is born, a live cell with two or three survives, everything else dies. Other rulesets are
a parse away, so HighLife (`B36/S23`) needs no code.

A board lives in one of three universes: `bounded` (edges are dead), `toroidal` (edges wrap) or
`unbounded` (no edges at all).

Patterns ship under `patterns/` in the plaintext `.cells` format the wider Life community uses, and
are parsed by a pure domain function. See
[ADR-0006](docs/adr/0006-patterns-shipped-as-plaintext-cells-parsed-in-the-domain.md).

## History

This repository replaces a 2018 PHP and jQuery implementation, which stays permanently browsable
under the `v1.0-php` tag. That version removed and recreated 1444 DOM nodes every 50 milliseconds
over a fixed 38 by 38 grid; this one draws one canvas frame per generation over a set of live cells
with no fixed size at all.

## License

[MIT](LICENSE)
