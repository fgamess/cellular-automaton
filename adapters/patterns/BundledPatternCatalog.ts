import type { PatternCatalog } from '../../application/ports.ts';
import { Pattern, type PatternName, parseCells } from '../../domain/index.ts';

export type TextSource = (name: PatternName) => Promise<string>;

export class BundledPatternCatalog implements PatternCatalog {
  private readonly read: TextSource;

  constructor(read: TextSource) {
    this.read = read;
  }

  async find(name: PatternName): Promise<Pattern> {
    return Pattern.of(name, parseCells(await this.read(name)));
  }
}
