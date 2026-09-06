import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { Generation } from './Generation.ts';
import { Position } from './Position.ts';
import { Ruleset } from './Ruleset.ts';
import { Topology } from './Topology.ts';

const conway = (): Ruleset => Ruleset.parse('B3/S23');

type Cell = { x: number; y: number };

const keyOf = (cell: Cell): string => `${cell.x},${cell.y}`;

const toPositions = (cells: readonly Cell[]): Position[] =>
  cells.map((cell) => Position.of(cell.x, cell.y));

const keysOf = (cells: readonly Position[]): string[] => cells.map((cell) => cell.key);

const cellsWithin = (width: number, height: number) =>
  fc.uniqueArray(
    fc.record({
      x: fc.integer({ min: 0, max: width - 1 }),
      y: fc.integer({ min: 0, max: height - 1 }),
    }),
    { selector: keyOf, maxLength: width * height },
  );

const extent = fc.integer({ min: 1, max: 12 });

const anyCell = fc.record({
  x: fc.integer({ min: -20, max: 20 }),
  y: fc.integer({ min: -20, max: 20 }),
});

const crowdedCell = fc.record({
  x: fc.integer({ min: -4, max: 4 }),
  y: fc.integer({ min: -4, max: 4 }),
});

describe('the invariants a board keeps whatever life it holds', () => {
  it('reaches the same successor however its cells were seeded', () => {
    fc.assert(
      fc.property(
        fc
          .uniqueArray(crowdedCell, { selector: keyOf, minLength: 2, maxLength: 40 })
          .chain((cells) =>
            fc.tuple(
              fc.constant(cells),
              fc.shuffledSubarray(cells, { minLength: cells.length, maxLength: cells.length }),
            ),
          ),
        ([cells, reordered]) => {
          const one = Generation.seed(Topology.unbounded, toPositions(cells));
          const other = Generation.seed(Topology.unbounded, toPositions(reordered));

          expect(keysOf(one.livePositions())).toEqual(keysOf(other.livePositions()));
          expect(keysOf(one.next(conway()).livePositions())).toEqual(
            keysOf(other.next(conway()).livePositions()),
          );
          expect(one.next(conway()).equals(other.next(conway()))).toBe(true);
        },
      ),
    );
  });

  it('keeps every cell of every successor inside a bounded board', () => {
    fc.assert(
      fc.property(
        fc
          .tuple(extent, extent)
          .chain(([width, height]) =>
            fc.tuple(fc.constant(width), fc.constant(height), cellsWithin(width, height)),
          ),
        ([width, height, cells]) => {
          const successor = Generation.seed(
            Topology.bounded(width, height),
            toPositions(cells),
          ).next(conway());

          for (const cell of successor.livePositions()) {
            expect(cell.x).toBeGreaterThanOrEqual(0);
            expect(cell.x).toBeLessThan(width);
            expect(cell.y).toBeGreaterThanOrEqual(0);
            expect(cell.y).toBeLessThan(height);
          }
          expect(successor.population).toBeLessThanOrEqual(width * height);
        },
      ),
    );
  });

  it('keeps every cell of every successor inside a torus, wherever it was seeded', () => {
    fc.assert(
      fc.property(
        extent,
        extent,
        fc.uniqueArray(anyCell, { selector: keyOf, maxLength: 25 }),
        (width, height, cells) => {
          const successor = Generation.seed(
            Topology.toroidal(width, height),
            toPositions(cells),
          ).next(conway());

          for (const cell of successor.livePositions()) {
            expect(cell.x).toBeGreaterThanOrEqual(0);
            expect(cell.x).toBeLessThan(width);
            expect(cell.y).toBeGreaterThanOrEqual(0);
            expect(cell.y).toBeLessThan(height);
          }
          expect(successor.population).toBeLessThanOrEqual(width * height);
        },
      ),
    );
  });

  it('reads back from its own notation as the very rule it was', () => {
    const counts = fc.uniqueArray(fc.integer({ min: 0, max: 8 }), { maxLength: 9 });

    fc.assert(
      fc.property(counts, counts, (birth, survival) => {
        const rules = Ruleset.parse(`B${birth.join('')}/S${survival.join('')}`);

        const reparsed = Ruleset.parse(rules.toString());

        expect(reparsed.equals(rules)).toBe(true);
        expect(reparsed.toString()).toBe(rules.toString());
        for (let neighbours = 0; neighbours <= 8; neighbours += 1) {
          expect(rules.permits(false, neighbours)).toBe(birth.includes(neighbours));
          expect(rules.permits(true, neighbours)).toBe(survival.includes(neighbours));
        }
      }),
    );
  });
});
