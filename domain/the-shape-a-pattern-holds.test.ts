import { describe, expect, it } from 'vitest';
import { Pattern } from './Pattern.ts';
import { PatternName } from './PatternName.ts';
import { Position } from './Position.ts';

const at = (...cells: readonly (readonly [number, number])[]): Position[] =>
  cells.map(([x, y]) => Position.of(x, y));

const keysOf = (cells: readonly Position[]): string[] => cells.map((cell) => cell.key);

const named = (value: string): PatternName => PatternName.of(value);

const glider = (): Pattern =>
  Pattern.of(named('glider'), at([1, 0], [2, 1], [0, 2], [1, 2], [2, 2]));

describe('the name a pattern answers to', () => {
  it.each(['glider', 'glider_gun', 'exploder', 'lightweight_spaceship', 'tumbler'])(
    'accepts %s, the way the repository spells the patterns it ships',
    (value) => {
      expect(named(value).value).toBe(value);
    },
  );

  it.each([
    '',
    '../../etc/passwd',
    'patterns/glider',
    'glider.cells',
    'glider-gun',
    'glider gun',
    'Glider',
    '1glider',
    '_glider',
    'a'.repeat(65),
  ])('refuses %j, which could not safely become a file of its own', (value) => {
    expect(() => named(value)).toThrow(RangeError);
  });

  it('accepts a name of exactly the greatest length it allows', () => {
    expect(named('a'.repeat(64)).value).toHaveLength(64);
  });

  it('says which name it refused', () => {
    expect(() => named('../../etc/passwd')).toThrow(
      'a pattern is named in up to 64 lowercase letters, digits and underscores, not "../../etc/passwd"',
    );
  });

  it('holds two patterns spelled the same way to be the same name', () => {
    expect(named('glider').equals(named('glider'))).toBe(true);
    expect(named('glider').equals(named('tumbler'))).toBe(false);
  });

  it('reads back as the plain name it was given', () => {
    expect(`${named('glider_gun')}`).toBe('glider_gun');
  });

  it('cannot be renamed once it is made', () => {
    const name = named('glider');

    expect(() => {
      (name as unknown as { value: string }).value = 'tumbler';
    }).toThrow(TypeError);
  });
});

describe('the shape a pattern holds', () => {
  it('draws the cells it was given, ordered row by row', () => {
    expect(keysOf(glider().cells())).toEqual(['1,0', '2,1', '0,2', '1,2', '2,2']);
  });

  it('measures its bounding box across every cell it draws', () => {
    expect(glider().width).toBe(3);
    expect(glider().height).toBe(3);
  });

  it('slides a pattern drawn away from the origin back into the corner, on both axes', () => {
    const drawnLow = Pattern.of(named('domino'), at([4, 7], [4, 8]));

    expect(keysOf(drawnLow.cells())).toEqual(['0,0', '0,1']);
    expect(drawnLow.width).toBe(1);
    expect(drawnLow.height).toBe(2);
  });

  it('measures a single cell as one column by one row', () => {
    const dot = Pattern.of(named('dot'), at([9, 9]));

    expect(dot.width).toBe(1);
    expect(dot.height).toBe(1);
  });

  it('refuses a pattern that draws no cells at all, having no shape to hold', () => {
    expect(() => Pattern.of(named('nothing'), [])).toThrow(RangeError);
    expect(() => Pattern.of(named('nothing'), [])).toThrow(/nothing/);
  });

  it('ignores a cell drawn twice rather than counting it twice', () => {
    const domino = Pattern.of(named('domino'), at([0, 0], [0, 1], [0, 1]));

    expect(keysOf(domino.cells())).toEqual(['0,0', '0,1']);
  });

  it('draws its cells row by row however jumbled the order it was given them in', () => {
    const jumbled = Pattern.of(named('glider'), at([2, 2], [0, 2], [2, 1], [1, 2], [1, 0]));

    expect(keysOf(jumbled.cells())).toEqual(['1,0', '2,1', '0,2', '1,2', '2,2']);
  });

  it('hands out a list of cells that no caller can use to change it', () => {
    const pattern = glider();

    pattern.cells().push(Position.of(9, 9));

    expect(keysOf(pattern.cells())).toEqual(['1,0', '2,1', '0,2', '1,2', '2,2']);
  });

  it('is the same pattern as another drawn identically under the same name', () => {
    expect(glider().equals(glider())).toBe(true);
  });

  it('is not the same pattern as one drawn differently or named differently', () => {
    const sameCells = Pattern.of(named('tumbler'), at([1, 0], [2, 1], [0, 2], [1, 2], [2, 2]));
    const sameName = Pattern.of(named('glider'), at([0, 0], [1, 0], [0, 1], [1, 1], [2, 2]));
    const shorter = Pattern.of(named('glider'), at([1, 0], [2, 1]));

    expect(glider().equals(sameCells)).toBe(false);
    expect(glider().equals(sameName)).toBe(false);
    expect(glider().equals(shorter)).toBe(false);
  });

  it('is not the same pattern as one that draws everything it draws and more besides', () => {
    const domino = Pattern.of(named('domino'), at([0, 0], [0, 1]));
    const triomino = Pattern.of(named('domino'), at([0, 0], [0, 1], [0, 2]));

    expect(domino.equals(triomino)).toBe(false);
    expect(triomino.equals(domino)).toBe(false);
  });

  it('cannot be redrawn once it is made', () => {
    const pattern = glider();

    expect(() => {
      (pattern as unknown as { name: unknown }).name = named('tumbler');
    }).toThrow(TypeError);
  });
});
