import { describe, expect, it } from 'vitest';
import {
  type Generation,
  Pattern,
  PatternName,
  type Position,
  parseCells,
  Ruleset,
  Topology,
} from '../domain/index.ts';
import { PreviewPattern } from './PreviewPattern.ts';
import type { Cancel, GenerationView, PatternCatalog, Ticker } from './ports.ts';
import { RunSimulation, type Simulation } from './RunSimulation.ts';
import { StepGeneration } from './StepGeneration.ts';

const keysOf = (cells: readonly Position[]): string[] => cells.map((cell) => cell.key);

const shownKeys = (view: SpyView): string[][] =>
  view.shown.map((generation) => keysOf(generation.livePositions()));

const conway = (): Ruleset => Ruleset.parse('B3/S23');

const glider = (): Pattern => Pattern.of(PatternName.of('glider'), parseCells('.O.\n..O\nOOO'));

const dwindling = (): Pattern =>
  Pattern.of(PatternName.of('dwindling'), parseCells('O..\n.O.\n..O'));

type SpyView = GenerationView & { readonly shown: Generation[] };

const spyView = (): SpyView => {
  const shown: Generation[] = [];
  return {
    shown,
    display(generation) {
      shown.push(generation);
    },
  };
};

const catalogOf = (...patterns: readonly Pattern[]): PatternCatalog => {
  const held = new Map(patterns.map((pattern) => [pattern.name.value, pattern] as const));
  return {
    find(name) {
      const found = held.get(name.value);
      return found === undefined
        ? Promise.reject(new RangeError(`no pattern is published under the name ${name}`))
        : Promise.resolve(found);
    },
  };
};

type FakeTicker = Ticker & {
  readonly intervals: number[];
  cancelled: boolean;
  advance(times: number): void;
};

const fakeTicker = (): FakeTicker => {
  let tick: (() => void) | null = null;
  const ticker: FakeTicker = {
    intervals: [],
    cancelled: false,
    each(ms, fn): Cancel {
      ticker.intervals.push(ms);
      tick = fn;
      return () => {
        ticker.cancelled = true;
        tick = null;
      };
    },
    advance(times) {
      for (let step = 0; step < times; step += 1) {
        tick?.();
      }
    },
  };
  return ticker;
};

const simulationOf = (overrides: Partial<Simulation> = {}): Simulation => ({
  name: PatternName.of('glider'),
  topology: Topology.unbounded,
  rules: conway(),
  generations: 4,
  everyMs: 100,
  ...overrides,
});

describe('driving the simulation through its use cases', () => {
  it('advancing the simulation N times displays N+1 generations', async () => {
    const view = spyView();
    const ticker = fakeTicker();
    const run = new RunSimulation(catalogOf(glider()), view, ticker);

    await run.execute(simulationOf({ generations: 4 }));
    ticker.advance(4);

    expect(shownKeys(view)).toEqual([
      ['1,0', '2,1', '0,2', '1,2', '2,2'],
      ['0,1', '2,1', '1,2', '2,2', '1,3'],
      ['2,1', '0,2', '2,2', '1,3', '2,3'],
      ['1,1', '2,2', '3,2', '1,3', '2,3'],
      ['2,1', '3,2', '1,3', '2,3', '3,3'],
    ]);
  });

  it('stops the clock once it has run for as many generations as it was asked for', async () => {
    const view = spyView();
    const ticker = fakeTicker();
    const run = new RunSimulation(catalogOf(glider()), view, ticker);

    await run.execute(simulationOf({ generations: 4 }));
    ticker.advance(10);

    expect(view.shown).toHaveLength(5);
    expect(ticker.cancelled).toBe(true);
  });

  it('the simulation halts when the population reaches extinction', async () => {
    const view = spyView();
    const ticker = fakeTicker();
    const run = new RunSimulation(catalogOf(dwindling()), view, ticker);

    await run.execute(simulationOf({ name: PatternName.of('dwindling'), generations: 10 }));
    ticker.advance(10);

    expect(view.shown.map((generation) => generation.population)).toEqual([3, 1, 0]);
    expect(ticker.cancelled).toBe(true);
  });

  it('ticks at the interval the caller chose rather than at one of its own', async () => {
    const ticker = fakeTicker();
    const run = new RunSimulation(catalogOf(glider()), spyView(), ticker);

    await run.execute(simulationOf({ everyMs: 250 }));

    expect(ticker.intervals).toEqual([250]);
  });

  it('centres the pattern on the board it was asked to run it on', async () => {
    const view = spyView();
    const run = new RunSimulation(catalogOf(glider()), view, fakeTicker());

    await run.execute(simulationOf({ topology: Topology.bounded(9, 9), generations: 1 }));

    expect(shownKeys(view)).toEqual([['4,3', '5,4', '3,5', '4,5', '5,5']]);
  });

  it('seeding from an unknown pattern name is rejected', async () => {
    const view = spyView();
    const ticker = fakeTicker();
    const run = new RunSimulation(catalogOf(glider()), view, ticker);

    await expect(run.execute(simulationOf({ name: PatternName.of('nowhere') }))).rejects.toThrow(
      RangeError,
    );

    expect(view.shown).toHaveLength(0);
    expect(ticker.intervals).toEqual([]);
  });

  it.each([
    { generations: 0, everyMs: 100 },
    { generations: -1, everyMs: 100 },
    { generations: 10001, everyMs: 100 },
    { generations: 1.5, everyMs: 100 },
    { generations: 4, everyMs: 0 },
    { generations: 4, everyMs: -1 },
    { generations: 4, everyMs: 60001 },
    { generations: 4, everyMs: 16.7 },
  ])(
    'refuses to run for $generations generations every $everyMs milliseconds',
    async ({ generations, everyMs }) => {
      const view = spyView();
      const ticker = fakeTicker();
      const run = new RunSimulation(catalogOf(glider()), view, ticker);

      await expect(run.execute(simulationOf({ generations, everyMs }))).rejects.toThrow(RangeError);

      expect(view.shown).toHaveLength(0);
      expect(ticker.intervals).toEqual([]);
    },
  );

  it.each([
    { generations: 1, everyMs: 1 },
    { generations: 10000, everyMs: 60000 },
  ])(
    'runs for $generations generations every $everyMs milliseconds, the far end of what it allows',
    async ({ generations, everyMs }) => {
      const run = new RunSimulation(catalogOf(glider()), spyView(), fakeTicker());

      await expect(run.execute(simulationOf({ generations, everyMs }))).resolves.toBeUndefined();
    },
  );

  it('says what it refused when the run it was given makes no sense', async () => {
    const run = new RunSimulation(catalogOf(glider()), spyView(), fakeTicker());

    await expect(run.execute(simulationOf({ generations: 0 }))).rejects.toThrow(
      'a simulation runs from 1 to 10000 generations, not 0',
    );
    await expect(run.execute(simulationOf({ everyMs: 0 }))).rejects.toThrow(
      'a simulation ticks every 1 to 60000 milliseconds, not 0',
    );
  });

  it('refuses a run it cannot make sense of before it goes looking for the pattern', async () => {
    const run = new RunSimulation(catalogOf(), spyView(), fakeTicker());

    await expect(run.execute(simulationOf({ generations: 0 }))).rejects.toThrow(
      'a simulation runs from 1 to 10000 generations, not 0',
    );
  });

  it('previewing a pattern displays exactly one generation', async () => {
    const view = spyView();
    const preview = new PreviewPattern(catalogOf(glider()), view);

    await preview.execute(PatternName.of('glider'), Topology.bounded(9, 9));

    expect(shownKeys(view)).toEqual([['4,3', '5,4', '3,5', '4,5', '5,5']]);
  });

  it('previewing an unknown pattern name is rejected without anything being displayed', async () => {
    const view = spyView();
    const preview = new PreviewPattern(catalogOf(glider()), view);

    await expect(preview.execute(PatternName.of('nowhere'), Topology.unbounded)).rejects.toThrow(
      RangeError,
    );

    expect(view.shown).toHaveLength(0);
  });

  it('stepping a generation displays the one that follows it and hands it back', async () => {
    const view = spyView();
    const preview = new PreviewPattern(catalogOf(glider()), view);
    const step = new StepGeneration(view);
    await preview.execute(PatternName.of('glider'), Topology.unbounded);
    const shown = view.shown[0];
    if (shown === undefined) {
      throw new Error('the preview displayed nothing to step from');
    }

    const stepped = step.execute(shown, conway());

    expect(keysOf(stepped.livePositions())).toEqual(['0,1', '2,1', '1,2', '2,2', '1,3']);
    expect(shownKeys(view)).toEqual([
      ['1,0', '2,1', '0,2', '1,2', '2,2'],
      ['0,1', '2,1', '1,2', '2,2', '1,3'],
    ]);
  });
});
