import { describe, expect, it } from 'vitest';
import { Generation } from './Generation.ts';
import { Pattern, PatternDoesNotFit } from './Pattern.ts';
import { PatternName } from './PatternName.ts';
import { Position } from './Position.ts';
import { Topology } from './Topology.ts';

const at = (...cells: readonly (readonly [number, number])[]): Position[] =>
  cells.map(([x, y]) => Position.of(x, y));

const keysOf = (cells: readonly Position[]): string[] => cells.map((cell) => cell.key);

const named = (value: string): PatternName => PatternName.of(value);

const glider = (): Pattern =>
  Pattern.of(named('glider'), at([1, 0], [2, 1], [0, 2], [1, 2], [2, 2]));

const rowOf = (width: number): Pattern =>
  Pattern.of(named('row'), at(...Array.from({ length: width }, (_, x) => [x, 0] as const)));

const origin = (): Position => Position.of(0, 0);

describe('placing a pattern at a chosen origin', () => {
  it('moves every cell by the origin it is placed at', () => {
    expect(keysOf(glider().placedAt(Position.of(10, 4), Topology.unbounded))).toEqual([
      '11,4',
      '12,5',
      '10,6',
      '11,6',
      '12,6',
    ]);
  });

  it('leaves a pattern where it was drawn when the origin is the corner of the world', () => {
    expect(keysOf(glider().placedAt(origin(), Topology.unbounded))).toEqual(
      keysOf(glider().cells()),
    );
  });

  it('places a pattern at a negative origin in a world that has no edges', () => {
    expect(keysOf(glider().placedAt(Position.of(-5, -5), Topology.unbounded))).toEqual([
      '-4,-5',
      '-3,-4',
      '-5,-3',
      '-4,-3',
      '-3,-3',
    ]);
  });

  it('accepts a pattern whose box is exactly the size of the board', () => {
    expect(keysOf(glider().placedAt(origin(), Topology.bounded(3, 3)))).toEqual(
      keysOf(glider().cells()),
    );
  });

  it('refuses to hang a pattern over the right edge of a bounded board', () => {
    expect(() => glider().placedAt(Position.of(1, 0), Topology.bounded(3, 3))).toThrow(
      PatternDoesNotFit,
    );
  });

  it('refuses to hang a pattern over the bottom edge of a bounded board', () => {
    expect(() => glider().placedAt(Position.of(0, 1), Topology.bounded(3, 3))).toThrow(
      PatternDoesNotFit,
    );
  });

  it('refuses an origin to the left of a bounded board', () => {
    expect(() => glider().placedAt(Position.of(-1, 0), Topology.bounded(10, 10))).toThrow(
      PatternDoesNotFit,
    );
  });

  it('refuses an origin above a bounded board', () => {
    expect(() => glider().placedAt(Position.of(0, -1), Topology.bounded(10, 10))).toThrow(
      PatternDoesNotFit,
    );
  });

  it('refuses to hang a pattern over the edge of a torus, where its cells would silently collide', () => {
    expect(() => glider().placedAt(Position.of(1, 0), Topology.toroidal(3, 3))).toThrow(
      PatternDoesNotFit,
    );
  });

  it('names both the pattern it could not place and the world it could not place it in', () => {
    expect(() => glider().placedAt(Position.of(1, 0), Topology.bounded(3, 4))).toThrow(
      'glider measures 3 x 3 and does not fit at (1, 0) in a bounded 3x4 universe',
    );
  });

  it('is refused as a range error, so callers that only know about ranges still catch it', () => {
    expect(() => glider().placedAt(Position.of(9, 9), Topology.bounded(3, 3))).toThrow(RangeError);
  });
});

describe('centring a pattern on a board', () => {
  it('leaves a pattern that exactly fills the board in the corner', () => {
    expect(keysOf(glider().centeredOn(Topology.bounded(3, 3)))).toEqual(keysOf(glider().cells()));
  });

  it('shares the leftover columns evenly rather than centring the pattern on the middle column', () => {
    expect(keysOf(rowOf(3).centeredOn(Topology.bounded(10, 1)))).toEqual(['3,0', '4,0', '5,0']);
  });

  it('leaves a pattern one column off centre when the leftover space is odd', () => {
    expect(keysOf(rowOf(4).centeredOn(Topology.bounded(10, 1)))).toEqual([
      '3,0',
      '4,0',
      '5,0',
      '6,0',
    ]);
  });

  it('centres a pattern on a torus the same way it centres one on a bounded board', () => {
    expect(keysOf(glider().centeredOn(Topology.toroidal(9, 9)))).toEqual([
      '4,3',
      '5,4',
      '3,5',
      '4,5',
      '5,5',
    ]);
  });

  it('draws a pattern at the origin of a world that has no centre because it has no edges', () => {
    expect(keysOf(glider().centeredOn(Topology.unbounded))).toEqual(keysOf(glider().cells()));
  });

  it('refuses a pattern wider than the board it would be centred on', () => {
    expect(() => rowOf(11).centeredOn(Topology.bounded(10, 10))).toThrow(PatternDoesNotFit);
  });

  it('refuses a pattern wider than the torus it would be centred on, rather than folding it onto itself', () => {
    expect(() => rowOf(4).centeredOn(Topology.toroidal(3, 3))).toThrow(PatternDoesNotFit);
  });

  it('seeds a torus with every cell it was centred with, none of them folded onto another', () => {
    const board = Generation.seed(
      Topology.toroidal(9, 9),
      glider().centeredOn(Topology.toroidal(9, 9)),
    );

    expect(board.population).toBe(5);
  });
});
