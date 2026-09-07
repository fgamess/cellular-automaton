import { describe, expect, it } from 'vitest';
import { PatternName, type Position } from '../domain/index.ts';
import { BundledPatternCatalog } from './patterns/BundledPatternCatalog.ts';
import { bundledTextSource } from './patterns/bundledTextSource.ts';
import { fileTextSource } from './patterns/fileTextSource.ts';

const keysOf = (cells: readonly Position[]): string[] => cells.map((cell) => cell.key);

const spelled = (value: string): PatternName => ({
  value,
  equals: () => false,
  toString: () => value,
});

describe('finding a pattern by name', () => {
  it('reads the text a source holds under that name and hands back the pattern it draws', async () => {
    const catalog = new BundledPatternCatalog(() => Promise.resolve('.O.\n..O\nOOO'));

    const pattern = await catalog.find(PatternName.of('glider'));

    expect(pattern.name.value).toBe('glider');
    expect(keysOf(pattern.cells())).toEqual(['1,0', '2,1', '0,2', '1,2', '2,2']);
  });

  it.each([
    { supplier: 'the bundled source', source: bundledTextSource },
    { supplier: 'the file source', source: fileTextSource },
  ])('$supplier reads the glider this repository ships', async ({ source }) => {
    const catalog = new BundledPatternCatalog(source);

    const pattern = await catalog.find(PatternName.of('glider'));

    expect(keysOf(pattern.cells())).toEqual(['1,0', '2,1', '0,2', '1,2', '2,2']);
  });

  it.each([
    { supplier: 'the bundled source', source: bundledTextSource },
    { supplier: 'the file source', source: fileTextSource },
  ])('$supplier refuses a name this repository ships no pattern under', async ({ source }) => {
    const catalog = new BundledPatternCatalog(source);

    const refusal = catalog.find(PatternName.of('nowhere'));

    await expect(refusal).rejects.toThrow(RangeError);
    await expect(refusal).rejects.toThrow('no pattern is published under the name nowhere');
  });

  it('lets a source say it holds nothing under that name rather than answering for it', async () => {
    const catalog = new BundledPatternCatalog(() =>
      Promise.reject(new RangeError('no pattern is published under the name absent')),
    );

    await expect(catalog.find(PatternName.of('absent'))).rejects.toThrow(
      'no pattern is published under the name absent',
    );
  });

  it('refuses to read outside the shipped patterns even for a name the domain would never mint', async () => {
    const climbing = spelled('../../etc/passwd');

    await expect(fileTextSource(climbing)).rejects.toThrow(
      'leaves the patterns this repository ships',
    );
  });

  it('says a pattern file it could not read is unreadable, not that nobody published it', async () => {
    const refusal = await fileTextSource(spelled('a'.repeat(300))).catch((cause: unknown) => cause);

    expect((refusal as { code?: unknown }).code).toBe('ENAMETOOLONG');
    expect(refusal).not.toBeInstanceOf(RangeError);
  });
});
