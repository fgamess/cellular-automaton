import { describe, expect, it } from 'vitest';
import * as domain from './index.ts';

describe('the surface the domain deliberately offers', () => {
  it('exposes exactly the seven concepts and nothing that would let a caller reach inside', () => {
    expect(Object.keys(domain).sort()).toEqual([
      'Generation',
      'Pattern',
      'PatternName',
      'Position',
      'Ruleset',
      'Topology',
      'parseCells',
    ]);
  });

  it('offers exactly three universes and a way to compare them', () => {
    expect(Object.keys(domain.Topology).sort()).toEqual([
      'bounded',
      'equals',
      'toroidal',
      'unbounded',
    ]);
  });
});
