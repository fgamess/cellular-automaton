import { describe, expect, it } from 'vitest';
import { Generation } from './Generation.ts';
import { Position } from './Position.ts';
import { Ruleset } from './Ruleset.ts';
import { Topology } from './Topology.ts';

const conway = (): Ruleset => Ruleset.parse('B3/S23');
const highLife = (): Ruleset => Ruleset.parse('B36/S23');

const at = (...cells: readonly (readonly [number, number])[]): Position[] =>
  cells.map(([x, y]) => Position.of(x, y));

const keysOf = (cells: readonly Position[]): string[] => cells.map((cell) => cell.key);

const seedOf = (...cells: readonly (readonly [number, number])[]): Generation =>
  Generation.seed(Topology.unbounded, at(...cells));

describe('how a generation gives way to the next one', () => {
  it('lets a lone live cell die of underpopulation while a block elsewhere lives on', () => {
    const board = seedOf([0, 0], [10, 10], [11, 10], [10, 11], [11, 11]);

    expect(keysOf(board.next(conway()).livePositions())).toEqual(
      keysOf(at([10, 10], [11, 10], [10, 11], [11, 11])),
    );
  });

  it('lets a live cell with two live neighbours survive, closing an L into a block', () => {
    const board = seedOf([0, 0], [1, 0], [0, 1]);

    expect(keysOf(board.next(conway()).livePositions())).toEqual(
      keysOf(at([0, 0], [1, 0], [0, 1], [1, 1])),
    );
  });

  it('lets a live cell with three live neighbours survive, opening a T into a ring', () => {
    const board = seedOf([0, 0], [1, 0], [2, 0], [1, 1]);

    expect(keysOf(board.next(conway()).livePositions())).toEqual(
      keysOf(at([1, -1], [0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1])),
    );
  });

  it('kills a live cell with four live neighbours by overcrowding while its arms survive', () => {
    const board = seedOf([1, 0], [0, 1], [1, 1], [2, 1], [1, 2]);

    const successor = board.next(conway());

    expect(keysOf(successor.livePositions())).toEqual(
      keysOf(at([0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2])),
    );
    expect(successor.isAlive(Position.of(1, 1))).toBe(false);
  });

  it('gives birth in a dead cell with exactly three live neighbours', () => {
    const board = seedOf([0, 0], [2, 0], [1, 1]);

    const successor = board.next(conway());

    expect(keysOf(successor.livePositions())).toEqual(keysOf(at([1, 0], [1, 1])));
    expect(successor.isAlive(Position.of(1, 0))).toBe(true);
  });

  it('gives birth in a dead cell with six live neighbours only where the rules say so', () => {
    const hexagon = seedOf([0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2]);

    expect(keysOf(hexagon.next(highLife()).livePositions())).toEqual(
      keysOf(at([1, -1], [1, 0], [1, 1], [1, 2], [1, 3])),
    );
    expect(keysOf(hexagon.next(conway()).livePositions())).toEqual(
      keysOf(at([1, -1], [1, 0], [1, 2], [1, 3])),
    );
  });

  it('still weighs a live cell that has no live neighbours at all', () => {
    const hermitsThrive = (): Ruleset => Ruleset.parse('B3/S023');
    const board = seedOf([0, 0]);

    expect(keysOf(board.next(hermitsThrive()).livePositions())).toEqual(keysOf(at([0, 0])));
    expect(board.next(conway()).population).toBe(0);
  });

  it('knows itself extinct when nothing on it is alive', () => {
    expect(Generation.seed(Topology.unbounded, []).isExtinct).toBe(true);
  });

  it('knows itself alive while a single cell holds out', () => {
    expect(seedOf([0, 0]).isExtinct).toBe(false);
  });

  it('becomes extinct as the last of its cells dies out', () => {
    const dwindling = seedOf([0, 0], [1, 1], [2, 2]);

    expect(dwindling.isExtinct).toBe(false);
    expect(dwindling.next(conway()).isExtinct).toBe(false);
    expect(dwindling.next(conway()).next(conway()).isExtinct).toBe(true);
  });

  it('leaves an empty board empty', () => {
    const board = Generation.seed(Topology.unbounded, []);

    expect(board.next(conway()).population).toBe(0);
    expect(board.next(conway()).livePositions()).toEqual([]);
  });

  it('leaves the generation it came from untouched', () => {
    const blinker = at([0, 1], [1, 1], [2, 1]);
    const board = seedOf([0, 1], [1, 1], [2, 1]);

    board.next(conway());

    expect(keysOf(board.livePositions())).toEqual(keysOf(blinker));
    expect(board.population).toBe(3);
  });

  it('hands out its live cells as a copy rather than as the list it keeps', () => {
    const board = seedOf([0, 1], [1, 1], [2, 1]);

    const handedOut = board.livePositions();
    handedOut.pop();

    expect(board.livePositions()).toHaveLength(3);
    expect(board.livePositions()).not.toBe(handedOut);
  });

  it('refuses tampering once built', () => {
    const board = seedOf([0, 0]);

    expect(() => {
      (board as unknown as { topology: Topology }).topology = Topology.bounded(2, 2);
    }).toThrow(TypeError);
  });

  it('hands its universe on to its successor', () => {
    const torus = Topology.toroidal(6, 6);
    const board = Generation.seed(torus, at([1, 1], [2, 1], [3, 1]));

    expect(Topology.equals(board.next(conway()).topology, torus)).toBe(true);
  });
});

describe('when two generations describe the same board', () => {
  it('does not care in what order the cells were seeded', () => {
    const one = seedOf([0, 0], [1, 0], [5, 4]);
    const other = seedOf([5, 4], [1, 0], [0, 0]);

    expect(one.equals(other)).toBe(true);
  });

  it('refuses to call a board equal to one that holds more life', () => {
    const smaller = seedOf([0, 0], [1, 0]);
    const larger = seedOf([0, 0], [1, 0], [2, 0]);

    expect(smaller.equals(larger)).toBe(false);
    expect(larger.equals(smaller)).toBe(false);
  });

  it('refuses to call two boards equal when the same amount of life sits elsewhere', () => {
    expect(seedOf([0, 0], [1, 0]).equals(seedOf([0, 0], [2, 0]))).toBe(false);
  });

  it('refuses to call the same cells in different universes the same board', () => {
    const cells = at([0, 0], [1, 0]);

    expect(
      Generation.seed(Topology.bounded(4, 4), cells).equals(
        Generation.seed(Topology.toroidal(4, 4), cells),
      ),
    ).toBe(false);
  });
});
