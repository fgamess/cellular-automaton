import { describe, expect, it } from 'vitest';
import { Ruleset } from './Ruleset.ts';

const conway = (): Ruleset => Ruleset.parse('B3/S23');
const highLife = (): Ruleset => Ruleset.parse('B36/S23');

const OUTCOMES: readonly {
  isAlive: boolean;
  liveNeighbours: number;
  conway: boolean;
  highLife: boolean;
}[] = [
  { isAlive: true, liveNeighbours: 0, conway: false, highLife: false },
  { isAlive: true, liveNeighbours: 1, conway: false, highLife: false },
  { isAlive: true, liveNeighbours: 2, conway: true, highLife: true },
  { isAlive: true, liveNeighbours: 3, conway: true, highLife: true },
  { isAlive: true, liveNeighbours: 4, conway: false, highLife: false },
  { isAlive: true, liveNeighbours: 5, conway: false, highLife: false },
  { isAlive: true, liveNeighbours: 6, conway: false, highLife: false },
  { isAlive: true, liveNeighbours: 7, conway: false, highLife: false },
  { isAlive: true, liveNeighbours: 8, conway: false, highLife: false },
  { isAlive: false, liveNeighbours: 0, conway: false, highLife: false },
  { isAlive: false, liveNeighbours: 1, conway: false, highLife: false },
  { isAlive: false, liveNeighbours: 2, conway: false, highLife: false },
  { isAlive: false, liveNeighbours: 3, conway: true, highLife: true },
  { isAlive: false, liveNeighbours: 4, conway: false, highLife: false },
  { isAlive: false, liveNeighbours: 5, conway: false, highLife: false },
  { isAlive: false, liveNeighbours: 6, conway: false, highLife: true },
  { isAlive: false, liveNeighbours: 7, conway: false, highLife: false },
  { isAlive: false, liveNeighbours: 8, conway: false, highLife: false },
];

describe('a ruleset as data rather than control flow', () => {
  it.each(OUTCOMES)(
    'B3/S23 grants a cell that is alive=$isAlive with $liveNeighbours live neighbours a place in the next generation: $conway',
    ({ isAlive, liveNeighbours, conway: expected }) => {
      expect(conway().permits(isAlive, liveNeighbours)).toBe(expected);
    },
  );

  it.each(OUTCOMES)(
    'B36/S23 grants a cell that is alive=$isAlive with $liveNeighbours live neighbours a place in the next generation: $highLife',
    ({ isAlive, liveNeighbours, highLife: expected }) => {
      expect(highLife().permits(isAlive, liveNeighbours)).toBe(expected);
    },
  );

  it.each([
    { notation: 'B3/S23', canonical: 'B3/S23' },
    { notation: 'B036/S23', canonical: 'B036/S23' },
    { notation: 'B630/S32', canonical: 'B036/S23' },
    { notation: 'B33/S223', canonical: 'B3/S23' },
    { notation: 'B8/S08', canonical: 'B8/S08' },
    { notation: 'B/S', canonical: 'B/S' },
  ])('renders $notation in the one canonical form $canonical', ({ notation, canonical }) => {
    expect(Ruleset.parse(notation).toString()).toBe(canonical);
  });

  it.each([
    'B9/S23',
    'B3/S9',
    'B9/S9',
    '',
    'B3S23',
    'b3/s23',
    ' B3/S23',
    'B3/S23 ',
    'B3/S23/S23',
    'B-1/S23',
    'S23/B3',
    'B3/S2 3',
  ])('refuses %o, which is not a rule any cell could follow', (notation) => {
    expect(() => Ruleset.parse(notation)).toThrow(RangeError);
  });

  it.each([
    { left: 'B3/S23', right: 'B3/S23', same: true },
    { left: 'B32/S32', right: 'B23/S23', same: true },
    { left: 'B3/S23', right: 'B36/S23', same: false },
    { left: 'B3/S23', right: 'B3/S238', same: false },
    { left: 'B3/S23', right: 'B23/S3', same: false },
  ])('is the same rule as $right only when both halves agree ($same)', ({ left, right, same }) => {
    expect(Ruleset.parse(left).equals(Ruleset.parse(right))).toBe(same);
  });

  it('says what it could not read in a rejected notation', () => {
    expect(() => Ruleset.parse('B3S23')).toThrow(/B3S23/);
    expect(() => Ruleset.parse('B9/S23')).toThrow(/9/);
  });

  it('refuses tampering once parsed', () => {
    expect(() => {
      (conway() as unknown as { birth: unknown }).birth = new Set([1]);
    }).toThrow(TypeError);
  });
});
