import { describe, expect, it } from 'vitest';
import { Generation } from './Generation.ts';
import { Position } from './Position.ts';
import { Ruleset } from './Ruleset.ts';
import { Topology } from './Topology.ts';

const conway = (): Ruleset => Ruleset.parse('B3/S23');

const at = (...cells: readonly (readonly [number, number])[]): Position[] =>
  cells.map(([x, y]) => Position.of(x, y));

const keysOf = (cells: readonly Position[]): string[] => cells.map((cell) => cell.key);

type Reshaping = { described: Topology; reshape: () => void; cell: Position };

const describedUniverses: Record<Topology['kind'], () => Reshaping> = {
  unbounded: () => {
    const described: { kind: string; width?: number; height?: number } = { kind: 'unbounded' };
    return {
      described: described as Topology,
      reshape: () => {
        described.kind = 'bounded';
        described.width = 1;
        described.height = 1;
      },
      cell: Position.of(-1000, 5000),
    };
  },
  bounded: () => {
    const described: { kind: 'bounded'; width: number; height: number } = {
      kind: 'bounded',
      width: 10,
      height: 10,
    };
    return {
      described,
      reshape: () => {
        described.width = 2;
      },
      cell: Position.of(9, 9),
    };
  },
  toroidal: () => {
    const described: { kind: 'toroidal'; width: number; height: number } = {
      kind: 'toroidal',
      width: 10,
      height: 10,
    };
    return {
      described,
      reshape: () => {
        described.width = 2;
      },
      cell: Position.of(9, 9),
    };
  },
};

const kinds = Object.keys(describedUniverses) as Topology['kind'][];

describe('where a board ends', () => {
  it.each([
    { kind: 'bounded' as const, width: 0, height: 3 },
    { kind: 'toroidal' as const, width: 3, height: 0 },
    { kind: 'bounded' as const, width: -2, height: 3 },
    { kind: 'toroidal' as const, width: 2.5, height: 3 },
  ])('refuses to seed a board into a $kind universe measuring $width x $height', (malformed) => {
    expect(() => Generation.seed(malformed, at([0, 0]))).toThrow(RangeError);
  });

  it('seeds a board into a universe that was described properly', () => {
    expect(Generation.seed({ kind: 'bounded', width: 3, height: 3 }, at([0, 0])).population).toBe(
      1,
    );
  });

  it.each([
    { x: -1, y: 0 },
    { x: 0, y: -1 },
    { x: 3, y: 0 },
    { x: 0, y: 3 },
    { x: 3, y: 3 },
  ])('refuses to seed ($x, $y) beyond the edge of a bounded board', ({ x, y }) => {
    const board = Topology.bounded(3, 3);

    expect(() => Generation.seed(board, at([x, y]))).toThrow(RangeError);
  });

  it('names the cell it refuses to place', () => {
    expect(() => Generation.seed(Topology.bounded(3, 3), at([3, 0]))).toThrow(/\(3, 0\)/);
  });

  it('seeds every cell a bounded board does have room for', () => {
    const board = Generation.seed(Topology.bounded(3, 3), at([0, 0], [2, 2]));

    expect(board.population).toBe(2);
    expect(board.isAlive(Position.of(2, 2))).toBe(true);
  });

  it.each([
    { x: 3, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 3 },
    { x: 0, y: -1 },
  ])('counts ($x, $y) as dead rather than unknown on a bounded board', ({ x, y }) => {
    const board = Generation.seed(Topology.bounded(3, 3), at([0, 0], [1, 1], [2, 2]));

    expect(board.isAlive(Position.of(x, y))).toBe(false);
  });

  it.each([
    { x: 10, y: 3, foldedX: 0, foldedY: 3 },
    { x: -1, y: 3, foldedX: 9, foldedY: 3 },
    { x: 3, y: -1, foldedX: 3, foldedY: 9 },
    { x: 13, y: -7, foldedX: 3, foldedY: 3 },
    { x: -10, y: -10, foldedX: 0, foldedY: 0 },
    { x: -11, y: 25, foldedX: 9, foldedY: 5 },
    { x: -1, y: -1, foldedX: 9, foldedY: 9 },
  ])(
    'folds ($x, $y) onto ($foldedX, $foldedY) instead of refusing it on a torus',
    ({ x, y, foldedX, foldedY }) => {
      const torus = Topology.toroidal(10, 10);

      const board = Generation.seed(torus, at([x, y]));

      expect(board.population).toBe(1);
      expect(board.isAlive(Position.of(foldedX, foldedY))).toBe(true);
      expect(keysOf(board.livePositions())).toEqual(keysOf(at([foldedX, foldedY])));
    },
  );

  it('leaves the far columns of a torus as wide as the furthest countable coordinate where they are', () => {
    const edge = Number.MAX_SAFE_INTEGER;
    const torus = Topology.toroidal(edge, 10);

    const board = Generation.seed(torus, at([edge - 1, 5], [edge - 2, 5]));

    expect(board.population).toBe(2);
    expect(keysOf(board.livePositions())).toEqual([`${edge - 2},5`, `${edge - 1},5`]);
  });

  it('holds one cell, not two, when a torus is seeded with both names of one place', () => {
    const torus = Topology.toroidal(10, 10);

    const board = Generation.seed(torus, at([0, 3], [10, 3], [-10, 3]));

    expect(board.population).toBe(1);
  });

  it('holds a cell far from the origin when the universe has no edges', () => {
    const board = Generation.seed(Topology.unbounded, at([-1000, 5000]));

    expect(board.population).toBe(1);
    expect(board.isAlive(Position.of(-1000, 5000))).toBe(true);
  });

  it('treats what lies beyond a bounded edge as dead when counting neighbours', () => {
    const againstTheWall = at([0, 0], [0, 1], [0, 2]);

    const walled = Generation.seed(Topology.bounded(3, 3), againstTheWall).next(conway());
    const open = Generation.seed(Topology.unbounded, againstTheWall).next(conway());

    expect(keysOf(walled.livePositions())).toEqual(keysOf(at([0, 1], [1, 1])));
    expect(keysOf(open.livePositions())).toEqual(keysOf(at([-1, 1], [0, 1], [1, 1])));
  });

  it('drops the children a bounded board has no room for instead of refusing to evolve', () => {
    const board = Topology.bounded(2, 2);
    const block = at([0, 0], [1, 0], [0, 1], [1, 1]);

    expect(keysOf(Generation.seed(board, block).next(conway()).livePositions())).toEqual(
      keysOf(block),
    );
    expect(() => Generation.seed(board, at([-1, -1]))).toThrow(RangeError);
  });

  it.each(kinds)(
    'keeps a %s universe as it was described when the caller reshapes its own copy',
    (kind) => {
      const { described, reshape, cell } = describedUniverses[kind]();
      const board = Generation.seed(described, [cell]);

      reshape();

      expect(board.isAlive(cell)).toBe(true);
      expect(keysOf(board.livePositions())).toEqual([cell.key]);
    },
  );

  it.each(kinds)('refuses to have the %s universe it kept reshaped', (kind) => {
    const { described, cell } = describedUniverses[kind]();
    const board = Generation.seed(described, [cell]);

    expect(() => {
      (board.topology as unknown as { kind: string }).kind = 'elsewhere';
    }).toThrow(TypeError);
  });

  it('treats what lies beyond the furthest countable coordinate as dead rather than refusing to evolve', () => {
    const edge = Number.MAX_SAFE_INTEGER;
    const board = Generation.seed(Topology.unbounded, at([edge, 0], [edge, 1], [edge, 2]));

    expect(keysOf(board.next(conway()).livePositions())).toEqual([`${edge - 1},1`, `${edge},1`]);
  });
});
