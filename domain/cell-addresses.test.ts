import { describe, expect, it } from 'vitest';
import { fromKey, Position } from './Position.ts';

describe('a cell address', () => {
  it('names the same cell when both coordinates match', () => {
    expect(Position.of(2, 3).equals(Position.of(2, 3))).toBe(true);
  });

  it('names a different cell when either coordinate differs', () => {
    const cell = Position.of(2, 3);

    expect(cell.equals(Position.of(9, 3))).toBe(false);
    expect(cell.equals(Position.of(2, 9))).toBe(false);
  });

  it('tells a column apart from a row', () => {
    expect(Position.of(1, 2).equals(Position.of(2, 1))).toBe(false);
  });

  it('keeps two coordinates apart even when their digits would run together', () => {
    expect(Position.of(1, 23).equals(Position.of(12, 3))).toBe(false);
  });

  it('treats negative zero as the origin it is', () => {
    expect(Position.of(-0, -0).equals(Position.of(0, 0))).toBe(true);
  });

  it('reaches far from the origin in every direction', () => {
    expect(Position.of(-1_000_000, 2_000_000).equals(Position.of(-1_000_000, 2_000_000))).toBe(
      true,
    );
    expect(Position.of(-1_000_000, 2_000_000).equals(Position.of(1_000_000, 2_000_000))).toBe(
      false,
    );
  });

  it.each([
    { x: 1.5, y: 0 },
    { x: 0, y: 1.5 },
    { x: Number.NaN, y: 0 },
    { x: 0, y: Number.POSITIVE_INFINITY },
  ])('cannot sit between coordinates, as ($x, $y) would', ({ x, y }) => {
    expect(() => Position.of(x, y)).toThrow(RangeError);
  });

  it.each([
    { x: Number.MAX_SAFE_INTEGER + 1, y: 0 },
    { x: 0, y: -Number.MAX_SAFE_INTEGER - 1 },
  ])('cannot sit at ($x, $y), a coordinate too large to count with', ({ x, y }) => {
    expect(() => Position.of(x, y)).toThrow(RangeError);
  });

  it('sits at the largest coordinate that can still be counted with', () => {
    const edge = Position.of(Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER);

    expect(edge.x).toBe(Number.MAX_SAFE_INTEGER);
    expect(edge.y).toBe(-Number.MAX_SAFE_INTEGER);
  });

  it('says which coordinate it could not accept', () => {
    expect(() => Position.of(1.5, 0)).toThrow(/1\.5/);
    expect(() => fromKey('nowhere')).toThrow(/nowhere/);
  });

  it('refuses tampering once built', () => {
    const cell = Position.of(1, 2);

    expect(() => {
      (cell as unknown as { x: number }).x = 99;
    }).toThrow(TypeError);
  });

  it('survives a round trip through the key a generation stores it under', () => {
    const cell = Position.of(-7, 12);

    expect(fromKey(cell.key).equals(cell)).toBe(true);
  });

  it.each(['1', '1,2,3', 'a,b', '', ',', '1,', 'x1,2', '1,2x', ' 1,2', '1,2 '])(
    'refuses %o as a position key',
    (key) => {
      expect(() => fromKey(key)).toThrow(RangeError);
    },
  );
});
