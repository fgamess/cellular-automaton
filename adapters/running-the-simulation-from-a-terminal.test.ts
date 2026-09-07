import { describe, expect, it } from 'vitest';
import { Generation, type PatternName, parseCells, Topology } from '../domain/index.ts';
import { ConsoleView, renderGeneration, type WritesText } from './cli/ConsoleView.ts';
import { main } from './cli/cli.ts';
import { BundledPatternCatalog, type TextSource } from './patterns/BundledPatternCatalog.ts';
import { fileTextSource } from './patterns/fileTextSource.ts';

type Transcript = WritesText & { readonly written: string[]; readonly text: string };

const transcript = (): Transcript => {
  const written: string[] = [];
  return {
    written,
    get text() {
      return written.join('');
    },
    write(text) {
      written.push(text);
    },
  };
};

type RecordingSource = TextSource & { readonly asked: string[] };

const recordingSource = (): RecordingSource => {
  const asked: string[] = [];
  const source: RecordingSource = Object.assign(
    (name: PatternName) => {
      asked.push(name.value);
      return fileTextSource(name);
    },
    { asked },
  );
  return source;
};

const shipped = (): BundledPatternCatalog => new BundledPatternCatalog(fileTextSource);

const runLife = async (
  argv: readonly string[],
  patterns: BundledPatternCatalog = shipped(),
): Promise<{ code: number; out: Transcript; err: Transcript }> => {
  const out = transcript();
  const err = transcript();
  const code = await main(argv, { patterns, out, err });
  return { code, out, err };
};

const GLIDER_RUN = [
  'run',
  '--pattern',
  'glider',
  '--topology',
  'unbounded',
  '--generations',
  '4',
] as const;

describe('running the simulation from a terminal', () => {
  it('draws a generation as a block of live and dead cells the size of the window', () => {
    const generation = Generation.seed(Topology.unbounded, parseCells('.O.\n..O\nOOO'));

    expect(renderGeneration(generation, { widthInCells: 4, heightInCells: 4 })).toBe(
      '.O..\n..O.\nOOO.\n....',
    );
  });

  it('writes one board per generation, the seed included', async () => {
    const out = transcript();
    const view = new ConsoleView(out, { widthInCells: 4, heightInCells: 4 });

    view.display(Generation.seed(Topology.unbounded, parseCells('.O.')));

    expect(out.text).toBe('.O..\n....\n....\n....\n\n');
  });

  it('exits zero when the glider ends up where the given translation says it will', async () => {
    const { code, err } = await runLife([...GLIDER_RUN, '--expect-translation', '1,1']);

    expect(code).toBe(0);
    expect(err.text).toBe('');
  });

  it('exits non-zero when the glider ends up somewhere the given translation did not predict', async () => {
    const { code, err } = await runLife([...GLIDER_RUN, '--expect-translation', '2,2']);

    expect(code).toBe(1);
    expect(err.text).toContain('2,2');
  });

  it('prints the seed and every generation after it', async () => {
    const { code, out } = await runLife(GLIDER_RUN);

    expect(code).toBe(0);
    expect(out.written).toHaveLength(5);
  });

  it('reads a pattern the shipped catalogue holds under exactly the name it was given', async () => {
    const source = recordingSource();

    const { code } = await runLife(GLIDER_RUN, new BundledPatternCatalog(source));

    expect(code).toBe(0);
    expect(source.asked).toEqual(['glider']);
  });

  it('never reaches for a file when the name it was given climbs out of the catalogue', async () => {
    const source = recordingSource();

    const { code, err } = await runLife(
      ['run', '--pattern', '../../etc/passwd', '--generations', '4'],
      new BundledPatternCatalog(source),
    );

    expect(source.asked).toEqual([]);
    expect(code).toBe(2);
    expect(err.text).toContain('../../etc/passwd');
  });

  it.each([
    { argv: ['walk', '--pattern', 'glider', '--generations', '4'], refusal: 'walk' },
    { argv: ['run', '--pattern', 'glider'], refusal: '--generations' },
    { argv: ['run', '--pattern', 'glider', '--generations'], refusal: '--generations' },
    { argv: ['run', '--pattern', 'glider', '--generations', 'four'], refusal: 'four' },
    { argv: ['run', '--pattern', 'glider', '--generations', '123456'], refusal: '123456' },
    { argv: [...GLIDER_RUN, '--topology', 'klein'], refusal: 'klein' },
    { argv: [...GLIDER_RUN, '--topology', 'bounded:1001x9'], refusal: 'bounded:1001x9' },
    { argv: [...GLIDER_RUN, '--expect-translation', '1;1'], refusal: '1;1' },
    { argv: [...GLIDER_RUN, '--expect-translation', '12345678,1'], refusal: '12345678,1' },
    { argv: [...GLIDER_RUN, '--wobble', 'yes'], refusal: '--wobble' },
  ])('refuses $refusal and says so rather than running', async ({ argv, refusal }) => {
    const { code, out, err } = await runLife(argv);

    expect(code).toBe(2);
    expect(err.text).toContain(refusal);
    expect(out.written).toEqual([]);
  });

  it('runs on the largest board it will draw', async () => {
    const { code } = await runLife([
      'run',
      '--pattern',
      'glider',
      '--topology',
      'bounded:1000x1000',
      '--generations',
      '1',
    ]);

    expect(code).toBe(0);
  });

  it('runs a pattern the catalogue does not hold no further than the refusal', async () => {
    const { code, out, err } = await runLife(['run', '--pattern', 'nowhere', '--generations', '4']);

    expect(code).toBe(2);
    expect(out.written).toEqual([]);
    expect(err.text).toContain('nowhere');
  });
});
