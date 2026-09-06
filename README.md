# Cellular Automaton (Conway's Game of Life)

A **Conway's Game of Life** engine written as a pure, dependency-free TypeScript domain.

The domain owns the rules and nothing else: no framework, no I/O, no clock, no network. A board is a
sparse set of live cells, so an unbounded universe is representable and a glider flies forever
instead of smearing into a wall.

## Status

This repository is being rewritten. The 2018 implementation it replaces stays permanently browsable
under the `v1.0-php` tag.

What is here today is the domain layer and its test suite. **The browser application arrives in a
later story**, which is why `index.html` is a placeholder and `pnpm dev` currently serves an empty
page. Until then the development loop is `pnpm test:watch`.

## Requirements

- Node 22 (pinned by `.nvmrc` and `.npmrc`; `pnpm run` selects it for you)
- pnpm 10

```bash
pnpm install
```

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
| `pnpm verify` | `lint && typecheck && test && smoke:domain && build`, the local quality gate |
| `pnpm smoke:domain` | loads `domain/` under bare Node and asserts its public surface, which no test can do (the suite resolves through Vite) |
| `pnpm preview` | serve the production build (needs the application, a later story) |
| `pnpm check:hexagon` | the domain in isolation (a later story) |
| `pnpm life` | the command-line adapter (a later story) |

Run `pnpm verify` before pushing.

## Layout

```
domain/          the rules: Position, Topology, Ruleset, Generation, and the surface index.ts offers
docs/adr/        the decisions and the measurements behind them
templates/       pattern data, kept for the pattern-loading story that consumes it next
```

`domain/` imports nothing outside `domain/`, and CI fails if that ever stops being true.

## Rules

Birth and survival are data, written in the usual `B3/S23` notation: a dead cell with three live
neighbours is born, a live cell with two or three survives, everything else dies. Other rulesets are
a parse away, so HighLife (`B36/S23`) needs no code.

A board lives in one of three universes: `bounded` (edges are dead), `toroidal` (edges wrap) or
`unbounded` (no edges at all).

## License

[MIT](LICENSE)
