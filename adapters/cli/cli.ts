import type { PatternCatalog } from '../../application/ports.ts';
import { RunSimulation } from '../../application/RunSimulation.ts';
import { PatternName, Position, Ruleset, Topology } from '../../domain/index.ts';
import { ConsoleView, type TextWindow, type WritesText } from './ConsoleView.ts';
import { DrainingTicker } from './DrainingTicker.ts';
import { RecordingView } from './RecordingView.ts';

const VERB = 'run';
const CONWAY = 'B3/S23';
const TICK_MS = 1;
const UNBOUNDED_WINDOW: TextWindow = { widthInCells: 24, heightInCells: 24 };
const LARGEST_EXTENT = 1_000;
const MOST_COUNT_DIGITS = 5;
const READS = new Set(['--pattern', '--topology', '--generations', '--expect-translation']);
const COUNT = /^\d{1,5}$/;
const SHAPE = /^(bounded|toroidal):(\d{1,4})x(\d{1,4})$/;
const TRANSLATION = /^(-?\d{1,7}),(-?\d{1,7})$/;

const RAN = 0;
const MISMATCHED = 1;
const REFUSED = 2;

export type Terminal = {
  readonly patterns: PatternCatalog;
  readonly out: WritesText;
  readonly err: WritesText;
};

type Translation = { readonly dx: number; readonly dy: number };

type Request = {
  readonly name: PatternName;
  readonly topology: Topology;
  readonly generations: number;
  readonly translation: Translation | null;
};

export async function main(argv: readonly string[], terminal: Terminal): Promise<number> {
  try {
    return await runOnce(argv, terminal);
  } catch (refusal) {
    terminal.err.write(`${messageOf(refusal)}\n`);
    return REFUSED;
  }
}

async function runOnce(argv: readonly string[], terminal: Terminal): Promise<number> {
  const request = requestFrom(argv);
  const view = new RecordingView(new ConsoleView(terminal.out, windowFor(request.topology)));
  const ticker = new DrainingTicker();
  await new RunSimulation(terminal.patterns, view, ticker).execute({
    name: request.name,
    topology: request.topology,
    rules: Ruleset.parse(CONWAY),
    generations: request.generations,
    everyMs: TICK_MS,
  });
  await ticker.finished;
  if (request.translation === null) {
    return RAN;
  }
  return report(view, request.translation, terminal.err);
}

function requestFrom(argv: readonly string[]): Request {
  const [verb, ...written] = argv;
  if (verb !== VERB) {
    throw new RangeError(`life runs one command, "${VERB}", and was asked for "${verb}"`);
  }
  const options = optionsFrom(written);
  return {
    name: PatternName.of(valueGivenFor(options, '--pattern')),
    topology: topologyFrom(options.get('--topology') ?? 'unbounded'),
    generations: countFrom(valueGivenFor(options, '--generations')),
    translation: translationFrom(options.get('--expect-translation')),
  };
}

function optionsFrom(written: readonly string[]): Map<string, string> {
  const options = new Map<string, string>();
  for (let index = 0; index < written.length; index += 2) {
    const flag = written[index];
    const value = written[index + 1];
    if (flag === undefined || !READS.has(flag)) {
      throw new RangeError(`"${flag}" is not an option life reads`);
    }
    if (value === undefined) {
      throw new RangeError(`${flag} is written with a value after it`);
    }
    options.set(flag, value);
  }
  return options;
}

function valueGivenFor(options: ReadonlyMap<string, string>, flag: string): string {
  const value = options.get(flag);
  if (value === undefined) {
    throw new RangeError(`${flag} is written with a value after it`);
  }
  return value;
}

function countFrom(written: string): number {
  if (!COUNT.test(written)) {
    throw new RangeError(
      `a run counts its generations in up to ${MOST_COUNT_DIGITS} digits, not "${written}"`,
    );
  }
  return Number(written);
}

function topologyFrom(written: string): Topology {
  if (written === 'unbounded') {
    return Topology.unbounded;
  }
  const shape = SHAPE.exec(written);
  if (shape === null) {
    throw new RangeError(
      `a universe is written unbounded, bounded:WxH or toroidal:WxH, not "${written}"`,
    );
  }
  const width = extentFrom(shape[2], written);
  const height = extentFrom(shape[3], written);
  return shape[1] === 'bounded'
    ? Topology.bounded(width, height)
    : Topology.toroidal(width, height);
}

function extentFrom(digits: string | undefined, written: string): number {
  const extent = Number(digits);
  if (!Number.isSafeInteger(extent) || extent < 1 || extent > LARGEST_EXTENT) {
    throw new RangeError(
      `a terminal draws a board 1 to ${LARGEST_EXTENT} cells on a side, and "${written}" asks otherwise`,
    );
  }
  return extent;
}

function translationFrom(written: string | undefined): Translation | null {
  if (written === undefined) {
    return null;
  }
  const offset = TRANSLATION.exec(written);
  if (offset === null) {
    throw new RangeError(
      `a translation is two whole offsets of up to seven digits, such as 1,1, not "${written}"`,
    );
  }
  return { dx: Number(offset[1]), dy: Number(offset[2]) };
}

function windowFor(topology: Topology): TextWindow {
  return topology.kind === 'unbounded'
    ? UNBOUNDED_WINDOW
    : { widthInCells: topology.width, heightInCells: topology.height };
}

function report(view: RecordingView, translation: Translation, err: WritesText): number {
  const seed = view.first;
  const ending = view.last;
  if (seed === null || ending === null) {
    throw new RangeError('the run drew no generation to compare against');
  }
  const expected = seed
    .livePositions()
    .map((cell) => Position.of(cell.x + translation.dx, cell.y + translation.dy).key)
    .sort();
  const reached = ending
    .livePositions()
    .map((cell) => cell.key)
    .sort();
  if (expected.length === reached.length && expected.every((key, at) => key === reached[at])) {
    return RAN;
  }
  err.write(
    `translated by ${translation.dx},${translation.dy} the seed lands on ${expected.join(' ')}, and the run ended on ${reached.join(' ')}\n`,
  );
  return MISMATCHED;
}

function messageOf(refusal: unknown): string {
  return refusal instanceof Error ? refusal.message : String(refusal);
}
