import { describe, expect, it } from 'vitest';
import { Generation, Position, parseCells, Ruleset, Topology } from '../domain/index.ts';
import { CanvasView, type FillsRectangles, type Viewport } from './browser/CanvasView.ts';

type Rectangle = { x: number; y: number; width: number; height: number };

type RecordingSurface = FillsRectangles & {
  readonly filled: Rectangle[];
  readonly cleared: Rectangle[];
};

const recordingSurface = (): RecordingSurface => {
  const filled: Rectangle[] = [];
  const cleared: Rectangle[] = [];
  return {
    filled,
    cleared,
    clearRect(x, y, width, height) {
      cleared.push({ x, y, width, height });
    },
    fillRect(x, y, width, height) {
      filled.push({ x, y, width, height });
    },
  };
};

const viewport = (overrides: Partial<Viewport> = {}): Viewport => ({
  widthInCells: 8,
  heightInCells: 8,
  cellSize: 10,
  ...overrides,
});

const drawnCells = (surface: RecordingSurface, size: number): string[] =>
  surface.filled.map((rectangle) => `${rectangle.x / size},${rectangle.y / size}`).sort();

describe('drawing a generation on a canvas', () => {
  it('paints one square per live cell, and the squares decode back to those cells', () => {
    const surface = recordingSurface();
    const view = new CanvasView(surface, viewport());
    const generation = Generation.seed(Topology.unbounded, parseCells('.O.\n..O\nOOO'));

    view.display(generation);

    expect(drawnCells(surface, 10)).toEqual(['0,2', '1,0', '1,2', '2,1', '2,2']);
    expect(
      surface.filled.every((rectangle) => rectangle.width === 10 && rectangle.height === 10),
    ).toBe(true);
  });

  it('paints nothing for a cell that has travelled off the visible area', () => {
    const surface = recordingSurface();
    const view = new CanvasView(surface, viewport());

    view.display(
      Generation.seed(Topology.unbounded, [
        Position.of(-1, 3),
        Position.of(3, -1),
        Position.of(8, 3),
        Position.of(3, 8),
        Position.of(4, 4),
      ]),
    );

    expect(drawnCells(surface, 10)).toEqual(['4,4']);
  });

  it('wipes the whole visible area before it paints the generation it was given', () => {
    const surface = recordingSurface();
    const view = new CanvasView(surface, viewport({ widthInCells: 9, heightInCells: 5 }));
    const generation = Generation.seed(Topology.unbounded, [Position.of(1, 1)]);
    const wholeArea = { x: 0, y: 0, width: 90, height: 50 };

    view.display(generation);
    view.display(generation.next(Ruleset.parse('B3/S23')));

    expect(surface.cleared).toEqual([wholeArea, wholeArea]);
    expect(drawnCells(surface, 10)).toEqual(['1,1']);
  });
});
