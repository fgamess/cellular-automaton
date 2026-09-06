import { describe, expect, it } from 'vitest';
import exploder from '../patterns/exploder.cells?raw';
import glider from '../patterns/glider.cells?raw';
import gliderGun from '../patterns/glider_gun.cells?raw';
import lightweightSpaceship from '../patterns/lightweight_spaceship.cells?raw';
import tumbler from '../patterns/tumbler.cells?raw';
import { parseCells } from './cells.ts';
import { Generation } from './Generation.ts';
import { Position } from './Position.ts';
import { GLIDER } from './patterns.fixture.ts';
import { Ruleset } from './Ruleset.ts';
import { Topology } from './Topology.ts';

const keysOf = (cells: readonly Position[]): string[] => cells.map((cell) => cell.key);

const at = (...cells: readonly (readonly [number, number])[]): Position[] =>
  cells.map(([x, y]) => Position.of(x, y));

const conway = (): Ruleset => Ruleset.parse('B3/S23');

const seeded = (text: string): Generation => Generation.seed(Topology.unbounded, parseCells(text));

const advanced = (generations: number, start: Generation): Generation => {
  let generation = start;
  for (let step = 0; step < generations; step += 1) {
    generation = generation.next(conway());
  }
  return generation;
};

const EXPLODER = [
  [0, 0],
  [2, 0],
  [4, 0],
  [0, 1],
  [4, 1],
  [0, 2],
  [4, 2],
  [0, 3],
  [4, 3],
  [0, 4],
  [2, 4],
  [4, 4],
] as const;

const GOSPER_GLIDER_GUN = [
  [24, 0],
  [22, 1],
  [24, 1],
  [12, 2],
  [13, 2],
  [20, 2],
  [21, 2],
  [34, 2],
  [35, 2],
  [11, 3],
  [15, 3],
  [20, 3],
  [21, 3],
  [34, 3],
  [35, 3],
  [0, 4],
  [1, 4],
  [10, 4],
  [16, 4],
  [20, 4],
  [21, 4],
  [0, 5],
  [1, 5],
  [10, 5],
  [14, 5],
  [16, 5],
  [17, 5],
  [22, 5],
  [24, 5],
  [10, 6],
  [16, 6],
  [24, 6],
  [11, 7],
  [15, 7],
  [12, 8],
  [13, 8],
] as const;

const LIGHTWEIGHT_SPACESHIP = [
  [1, 0],
  [2, 0],
  [3, 0],
  [4, 0],
  [0, 1],
  [4, 1],
  [4, 2],
  [0, 3],
  [3, 3],
] as const;

const TUMBLER = [
  [1, 0],
  [2, 0],
  [4, 0],
  [5, 0],
  [1, 1],
  [2, 1],
  [4, 1],
  [5, 1],
  [2, 2],
  [4, 2],
  [0, 3],
  [2, 3],
  [4, 3],
  [6, 3],
  [0, 4],
  [2, 4],
  [4, 4],
  [6, 4],
  [0, 5],
  [1, 5],
  [5, 5],
  [6, 5],
] as const;

describe('reading a pattern written in plaintext', () => {
  it('reads a live cell wherever the text says O and nothing where it says a dot', () => {
    expect(keysOf(parseCells('.O.\n..O\nOOO'))).toEqual(['1,0', '2,1', '0,2', '1,2', '2,2']);
  });

  it('lets comment lines name a pattern without any of them occupying a row', () => {
    expect(keysOf(parseCells('!Name: a single cell\n!Author: nobody\nO'))).toEqual(['0,0']);
  });

  it('counts a blank line between two rows as a row of dead cells', () => {
    expect(keysOf(parseCells('O\n\nO'))).toEqual(['0,0', '0,2']);
  });

  it('reads a row whose trailing dead cells were left off the line', () => {
    expect(keysOf(parseCells('..O\nO'))).toEqual(['2,0', '0,1']);
  });

  it('reads a pattern whose lines end in a carriage return', () => {
    expect(keysOf(parseCells('.O\r\nO.\r\n'))).toEqual(['1,0', '0,1']);
  });

  it('refuses a space, so a pattern that was never converted cannot pass for a converted one', () => {
    expect(() => parseCells('O O')).toThrow(RangeError);
    expect(() => parseCells('O O')).toThrow(/" " at \(1, 0\)/);
  });

  it('refuses any character that is neither a live cell nor a dead one', () => {
    expect(() => parseCells('..\n.3')).toThrow(RangeError);
    expect(() => parseCells('..\n.3')).toThrow(/"3" at \(1, 1\)/);
  });
});

describe('reading the patterns the repository ships', () => {
  it.each([
    { name: 'exploder', text: exploder, drawing: EXPLODER },
    { name: 'glider', text: glider, drawing: GLIDER },
    { name: 'glider_gun', text: gliderGun, drawing: GOSPER_GLIDER_GUN },
    { name: 'lightweight_spaceship', text: lightweightSpaceship, drawing: LIGHTWEIGHT_SPACESHIP },
    { name: 'tumbler', text: tumbler, drawing: TUMBLER },
  ])(
    'reads $name, drawing every cell of it exactly where the pattern puts it',
    ({ text, drawing }) => {
      expect(keysOf(parseCells(text))).toEqual(keysOf(at(...drawing)));
    },
  );

  it('draws the shipped glider exactly where the evolution tests expect a glider to be', () => {
    expect(keysOf(parseCells(glider))).toEqual(keysOf(at(...GLIDER)));
  });
});

describe('the patterns the repository ships behaving as the patterns they are named after', () => {
  it('fires a glider out of the gun every thirty generations and leaves the gun standing', () => {
    const gun = seeded(gliderGun);
    const oneGliderLater = advanced(30, gun);

    expect(gun.population).toBe(36);
    expect(oneGliderLater.population).toBe(41);
    expect(advanced(60, gun).population).toBe(46);
    expect(gun.livePositions().filter((cell) => !oneGliderLater.isAlive(cell))).toEqual([]);
  });

  it('returns the tumbler to its opening shape after fourteen generations, not after seven', () => {
    const tumbling = seeded(tumbler);
    const halfway = advanced(7, tumbling);

    expect(advanced(14, tumbling).equals(tumbling)).toBe(true);
    expect(halfway.equals(tumbling)).toBe(false);
    expect(halfway.population).toBe(tumbling.population);
  });

  it('flies the lightweight spaceship two cells sideways every four generations', () => {
    const spaceship = seeded(lightweightSpaceship);

    expect(keysOf(advanced(4, spaceship).livePositions())).toEqual(
      keysOf(spaceship.livePositions().map((cell) => Position.of(cell.x + 2, cell.y))),
    );
  });

  it('settles the exploder into a pulsar, forty-eight cells returning every third generation', () => {
    const pulsar = advanced(26, seeded(exploder));

    expect(pulsar.population).toBe(48);
    expect(advanced(3, pulsar).equals(pulsar)).toBe(true);
    expect(advanced(1, pulsar).equals(pulsar)).toBe(false);
  });
});
