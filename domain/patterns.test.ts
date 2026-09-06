import { describe, expect, it } from 'vitest';
import { Generation } from './Generation.ts';
import { Position } from './Position.ts';
import { GLIDER } from './patterns.fixture.ts';
import { Ruleset } from './Ruleset.ts';
import { Topology } from './Topology.ts';

const conway = (): Ruleset => Ruleset.parse('B3/S23');

const at = (...cells: readonly (readonly [number, number])[]): Position[] =>
  cells.map(([x, y]) => Position.of(x, y));

const keysOf = (cells: readonly Position[]): string[] => cells.map((cell) => cell.key);

const rowThenColumn = (a: Position, b: Position): number => a.y - b.y || a.x - b.x;

const shifted = (dx: number, dy: number): Position[] =>
  at(...GLIDER.map(([x, y]) => [x + dx, y + dy] as const));

describe('the patterns that make Life worth watching', () => {
  it('holds a block still forever', () => {
    const block = at([0, 0], [1, 0], [0, 1], [1, 1]);
    const generation0 = Generation.seed(Topology.unbounded, block);

    const generation1 = generation0.next(conway());
    const generation2 = generation1.next(conway());

    expect(keysOf(generation1.livePositions())).toEqual(keysOf(block));
    expect(keysOf(generation2.livePositions())).toEqual(keysOf(block));
  });

  it('swings a blinker between two shapes and back', () => {
    const horizontal = at([0, 1], [1, 1], [2, 1]);
    const generation0 = Generation.seed(Topology.unbounded, horizontal);

    const generation1 = generation0.next(conway());
    const generation2 = generation1.next(conway());

    expect(keysOf(generation1.livePositions())).toEqual(keysOf(at([1, 0], [1, 1], [1, 2])));
    expect(generation1.equals(generation0)).toBe(false);
    expect(generation2.equals(generation0)).toBe(true);
  });

  it('flies a glider one cell diagonally every four generations', () => {
    const generation0 = Generation.seed(Topology.unbounded, shifted(0, 0));

    const generation1 = generation0.next(conway());
    const generation2 = generation1.next(conway());
    const generation3 = generation2.next(conway());
    const generation4 = generation3.next(conway());

    expect(keysOf(generation1.livePositions())).toEqual(
      keysOf(at([0, 1], [2, 1], [1, 2], [2, 2], [1, 3])),
    );
    expect(keysOf(generation2.livePositions())).toEqual(
      keysOf(at([2, 1], [0, 2], [2, 2], [1, 3], [2, 3])),
    );
    expect(keysOf(generation3.livePositions())).toEqual(
      keysOf(at([1, 1], [2, 2], [3, 2], [1, 3], [2, 3])),
    );
    expect(keysOf(generation4.livePositions())).toEqual(keysOf(shifted(1, 1)));
  });

  it('lets a glider leave one edge of a torus and reappear on the opposite one', () => {
    const torus = Topology.toroidal(10, 10);

    let generation = Generation.seed(torus, shifted(7, 7));
    for (let step = 0; step < 4; step += 1) {
      generation = generation.next(conway());
    }

    const wrapped = at(...GLIDER.map(([x, y]) => [(x + 8) % 10, (y + 8) % 10] as const)).sort(
      rowThenColumn,
    );
    expect(keysOf(generation.livePositions())).toEqual(keysOf(wrapped));
    expect(generation.isAlive(Position.of(0, 0))).toBe(true);
  });
});
