import { Generation, type PatternName, type Ruleset, type Topology } from '../domain/index.ts';
import type { GenerationView, PatternCatalog, Ticker } from './ports.ts';

const LEAST_GENERATIONS = 1;
const MOST_GENERATIONS = 10_000;
const LEAST_INTERVAL_MS = 1;
const MOST_INTERVAL_MS = 60_000;

export type Simulation = {
  readonly name: PatternName;
  readonly topology: Topology;
  readonly rules: Ruleset;
  readonly generations: number;
  readonly everyMs: number;
};

export class RunSimulation {
  private readonly patterns: PatternCatalog;
  private readonly view: GenerationView;
  private readonly ticker: Ticker;

  constructor(patterns: PatternCatalog, view: GenerationView, ticker: Ticker) {
    this.patterns = patterns;
    this.view = view;
    this.ticker = ticker;
  }

  async execute(simulation: Simulation): Promise<void> {
    requireRunnable(simulation);
    const pattern = await this.patterns.find(simulation.name);
    let generation = Generation.seed(simulation.topology, pattern.centeredOn(simulation.topology));
    let remaining = simulation.generations;
    this.view.display(generation);
    const cancel = this.ticker.each(simulation.everyMs, () => {
      generation = generation.next(simulation.rules);
      this.view.display(generation);
      remaining -= 1;
      if (remaining === 0 || generation.isExtinct) {
        cancel();
      }
    });
  }
}

function requireRunnable(simulation: Simulation): void {
  if (!isWithin(simulation.generations, LEAST_GENERATIONS, MOST_GENERATIONS)) {
    throw new RangeError(
      `a simulation runs from ${LEAST_GENERATIONS} to ${MOST_GENERATIONS} generations, not ${simulation.generations}`,
    );
  }
  if (!isWithin(simulation.everyMs, LEAST_INTERVAL_MS, MOST_INTERVAL_MS)) {
    throw new RangeError(
      `a simulation ticks every ${LEAST_INTERVAL_MS} to ${MOST_INTERVAL_MS} milliseconds, not ${simulation.everyMs}`,
    );
  }
}

function isWithin(value: number, least: number, most: number): boolean {
  return Number.isSafeInteger(value) && value >= least && value <= most;
}
