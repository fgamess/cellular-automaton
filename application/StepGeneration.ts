import type { Generation, Ruleset } from '../domain/index.ts';
import type { GenerationView } from './ports.ts';

export class StepGeneration {
  private readonly view: GenerationView;

  constructor(view: GenerationView) {
    this.view = view;
  }

  execute(generation: Generation, rules: Ruleset): Generation {
    const next = generation.next(rules);
    this.view.display(next);
    return next;
  }
}
