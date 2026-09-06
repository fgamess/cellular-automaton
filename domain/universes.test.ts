import { describe, expect, it } from 'vitest';
import { Topology } from './Topology.ts';

type Described =
  | { kind: 'unbounded' }
  | { kind: 'bounded' | 'toroidal'; width: number; height: number };

const universe = (described: Described): Topology => {
  if (described.kind === 'unbounded') {
    return Topology.unbounded;
  }
  return described.kind === 'bounded'
    ? Topology.bounded(described.width, described.height)
    : Topology.toroidal(described.width, described.height);
};

const square = (kind: 'bounded' | 'toroidal', width: number, height: number): Described => ({
  kind,
  width,
  height,
});

const nowhere: Described = { kind: 'unbounded' };

describe('the universe a board lives in', () => {
  it('comes in three kinds, one of which has no edges to describe', () => {
    expect(Topology.bounded(4, 5)).toEqual({ kind: 'bounded', width: 4, height: 5 });
    expect(Topology.toroidal(4, 5)).toEqual({ kind: 'toroidal', width: 4, height: 5 });
    expect(Topology.unbounded).toEqual({ kind: 'unbounded' });
  });

  it('is as small as a single cell when asked to be', () => {
    expect(Topology.bounded(1, 1)).toEqual({ kind: 'bounded', width: 1, height: 1 });
    expect(Topology.toroidal(1, 1)).toEqual({ kind: 'toroidal', width: 1, height: 1 });
  });

  it.each([
    { width: 0, height: 3 },
    { width: 3, height: 0 },
    { width: -1, height: 3 },
    { width: 3, height: -1 },
    { width: 2.5, height: 3 },
    { width: 3, height: Number.NaN },
    { width: Number.POSITIVE_INFINITY, height: 3 },
    { width: Number.MAX_SAFE_INTEGER + 1, height: 3 },
    { width: 3, height: Number.MAX_SAFE_INTEGER + 1 },
  ])(
    'cannot measure ($width x $height), which is not a whole positive extent',
    ({ width, height }) => {
      expect(() => Topology.bounded(width, height)).toThrow(RangeError);
      expect(() => Topology.toroidal(width, height)).toThrow(RangeError);
    },
  );

  it('measures a universe as wide as the furthest countable coordinate', () => {
    const edge = Number.MAX_SAFE_INTEGER;

    expect(Topology.toroidal(edge, 10)).toEqual({ kind: 'toroidal', width: edge, height: 10 });
    expect(Topology.bounded(10, edge)).toEqual({ kind: 'bounded', width: 10, height: edge });
  });

  it('says which extent it could not accept', () => {
    expect(() => Topology.bounded(0, 3)).toThrow(/0 x 3/);
  });

  it('cannot be reshaped once described', () => {
    const board = Topology.bounded(4, 5);

    expect(() => {
      (board as unknown as { width: number }).width = 99;
    }).toThrow(TypeError);
  });

  it.each([
    { left: nowhere, right: nowhere, same: true },
    { left: square('bounded', 3, 3), right: square('bounded', 3, 3), same: true },
    { left: square('toroidal', 3, 3), right: square('toroidal', 3, 3), same: true },
    { left: nowhere, right: square('bounded', 3, 3), same: false },
    { left: square('bounded', 3, 3), right: nowhere, same: false },
    { left: square('bounded', 3, 3), right: square('toroidal', 3, 3), same: false },
    { left: square('bounded', 3, 3), right: square('bounded', 4, 3), same: false },
    { left: square('bounded', 3, 3), right: square('bounded', 3, 4), same: false },
    { left: square('toroidal', 3, 3), right: square('toroidal', 3, 4), same: false },
  ])(
    'calls a $left.kind $left.width x $left.height and a $right.kind $right.width x $right.height the same universe: $same',
    ({ left, right, same }) => {
      expect(Topology.equals(universe(left), universe(right))).toBe(same);
    },
  );

  const frozen: Record<string, Topology> = {
    unbounded: Topology.unbounded,
    bounded: Topology.bounded(4, 5),
    toroidal: Topology.toroidal(4, 5),
  };

  const comparisons = ['equals'];

  it('leaves none of the universes it can describe out of the table frozen below', () => {
    expect(
      Object.keys(Topology)
        .filter((name) => !comparisons.includes(name))
        .sort(),
    ).toEqual(Object.keys(frozen).sort());
  });

  it.each(Object.entries(frozen))('cannot turn a %s universe into another kind', (_name, kept) => {
    expect(() => {
      (kept as unknown as { kind: string }).kind = 'elsewhere';
    }).toThrow(TypeError);
  });

  it('cannot have its own catalogue of universes rewritten', () => {
    expect(() => {
      (Topology as unknown as { unbounded: unknown }).unbounded = null;
    }).toThrow(TypeError);
  });
});
