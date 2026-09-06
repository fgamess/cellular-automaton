import { Generation, type PatternName, type Topology } from '../domain/index.ts';
import type { GenerationView, PatternCatalog } from './ports.ts';

export class PreviewPattern {
  private readonly patterns: PatternCatalog;
  private readonly view: GenerationView;

  constructor(patterns: PatternCatalog, view: GenerationView) {
    this.patterns = patterns;
    this.view = view;
  }

  async execute(name: PatternName, topology: Topology): Promise<void> {
    const pattern = await this.patterns.find(name);
    this.view.display(Generation.seed(topology, pattern.centeredOn(topology)));
  }
}
