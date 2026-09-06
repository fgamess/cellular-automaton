import type { Generation, Pattern, PatternName } from '../domain/index.ts';

export type Cancel = () => void;

export interface PatternCatalog {
  find(name: PatternName): Promise<Pattern>;
}

export interface GenerationView {
  display(generation: Generation): void;
}

export interface Ticker {
  each(ms: number, fn: () => void): Cancel;
}
