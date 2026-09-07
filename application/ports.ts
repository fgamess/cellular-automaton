import type { Generation, Pattern, PatternName } from '../domain/index.ts';

export type Cancel = () => void;

export interface PatternCatalog {
  find(name: PatternName): Promise<Pattern>;
}

export interface GenerationView {
  display(generation: Generation): void;
}

export interface Ticker {
  // `each` must return before it first calls `fn`: the run cancels itself from inside `fn`,
  // through the `Cancel` `each` has not handed back yet. ADR-0007.
  each(ms: number, fn: () => void): Cancel;
}
