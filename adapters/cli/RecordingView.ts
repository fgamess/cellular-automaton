import type { GenerationView } from '../../application/ports.ts';
import type { Generation } from '../../domain/index.ts';

export class RecordingView implements GenerationView {
  private readonly onward: GenerationView;
  private firstShown: Generation | null;
  private lastShown: Generation | null;

  constructor(onward: GenerationView) {
    this.onward = onward;
    this.firstShown = null;
    this.lastShown = null;
  }

  get first(): Generation | null {
    return this.firstShown;
  }

  get last(): Generation | null {
    return this.lastShown;
  }

  display(generation: Generation): void {
    this.firstShown ??= generation;
    this.lastShown = generation;
    this.onward.display(generation);
  }
}
