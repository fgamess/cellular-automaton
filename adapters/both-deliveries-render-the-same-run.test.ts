import { describe, expect, it } from 'vitest';
import type { GenerationView } from '../application/ports.ts';
import { RunSimulation, type Simulation } from '../application/RunSimulation.ts';
import { type Generation, PatternName, Ruleset, Topology } from '../domain/index.ts';
import { CanvasView, type FillsRectangles, type Viewport } from './browser/CanvasView.ts';
import { ConsoleView, type TextWindow, type WritesText } from './cli/ConsoleView.ts';
import { DrainingTicker } from './cli/DrainingTicker.ts';
import { BundledPatternCatalog } from './patterns/BundledPatternCatalog.ts';
import { bundledTextSource } from './patterns/bundledTextSource.ts';
import { fileTextSource } from './patterns/fileTextSource.ts';

const SIDE = 12;
const CELL_SIZE = 7;
const LIVE = 'O';

const VIEWPORT: Viewport = { widthInCells: SIDE, heightInCells: SIDE, cellSize: CELL_SIZE };
const WINDOW: TextWindow = { widthInCells: SIDE, heightInCells: SIDE };

const simulation = (): Simulation => ({
  name: PatternName.of('glider'),
  topology: Topology.bounded(SIDE, SIDE),
  rules: Ruleset.parse('B3/S23'),
  generations: 6,
  everyMs: 1,
});

type Capturing = GenerationView & { readonly shown: Generation[] };

const capturing = (onward: GenerationView): Capturing => {
  const shown: Generation[] = [];
  return {
    shown,
    display(generation) {
      shown.push(generation);
      onward.display(generation);
    },
  };
};

type FramingSurface = FillsRectangles & { readonly frames: string[][] };

const framingSurface = (): FramingSurface => {
  const frames: string[][] = [];
  return {
    frames,
    clearRect() {
      frames.push([]);
    },
    fillRect(x, y) {
      frames.at(-1)?.push(`${x / CELL_SIZE},${y / CELL_SIZE}`);
    },
  };
};

type BlockWriter = WritesText & { readonly blocks: string[] };

const blockWriter = (): BlockWriter => {
  const blocks: string[] = [];
  return {
    blocks,
    write(text) {
      blocks.push(text);
    },
  };
};

const cellsDrawnIn = (block: string): string[] => {
  const keys: string[] = [];
  block
    .trimEnd()
    .split('\n')
    .forEach((row, y) => {
      [...row].forEach((glyph, x) => {
        if (glyph === LIVE) {
          keys.push(`${x},${y}`);
        }
      });
    });
  return keys;
};

const liveKeysOf = (generations: readonly Generation[]): string[][] =>
  generations.map((generation) =>
    generation
      .livePositions()
      .map((cell) => cell.key)
      .sort(),
  );

const runToCompletion = async (
  view: GenerationView,
  source: typeof fileTextSource,
): Promise<void> => {
  const ticker = new DrainingTicker();
  await new RunSimulation(new BundledPatternCatalog(source), view, ticker).execute(simulation());
  await ticker.finished;
};

describe('rendering one run through both deliveries', () => {
  it('draws the same cells on a canvas and in a terminal, generation for generation', async () => {
    const surface = framingSurface();
    const painted = capturing(new CanvasView(surface, VIEWPORT));
    const written = blockWriter();
    const printed = capturing(new ConsoleView(written, WINDOW));

    await runToCompletion(painted, bundledTextSource);
    await runToCompletion(printed, fileTextSource);

    const expected = liveKeysOf(painted.shown);
    expect(expected).toHaveLength(7);
    expect(liveKeysOf(printed.shown)).toEqual(expected);
    expect(surface.frames.map((frame) => [...frame].sort())).toEqual(expected);
    expect(written.blocks.map((block) => cellsDrawnIn(block).sort())).toEqual(expected);
  });
});
