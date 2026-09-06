import { fromKey, Position } from './Position.ts';
import type { Ruleset } from './Ruleset.ts';
import { canonical, sealed, Topology } from './Topology.ts';

const OFFSETS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const;

export class Generation {
  readonly topology: Topology;
  private readonly live: ReadonlySet<string>;

  private constructor(topology: Topology, live: ReadonlySet<string>) {
    this.topology = topology;
    this.live = live;
    Object.freeze(this);
  }

  static seed(topology: Topology, cells: Iterable<Position>): Generation {
    const universe = sealed(topology);
    const live = new Set<string>();
    for (const cell of cells) {
      const placed = canonical(universe, cell);
      if (placed === null) {
        throw new RangeError(`${cell} lies outside a ${universe.kind} universe`);
      }
      live.add(placed.key);
    }
    return new Generation(universe, live);
  }

  get population(): number {
    return this.live.size;
  }

  isAlive(cell: Position): boolean {
    const placed = canonical(this.topology, cell);
    return placed !== null && this.live.has(placed.key);
  }

  livePositions(): Position[] {
    return [...this.live].map(fromKey).sort((a, b) => a.y - b.y || a.x - b.x);
  }

  next(rules: Ruleset): Generation {
    const survivors = new Set<string>();
    for (const candidate of this.candidates()) {
      if (rules.permits(this.live.has(candidate.key), this.liveNeighboursOf(candidate))) {
        survivors.add(candidate.key);
      }
    }
    return new Generation(this.topology, survivors);
  }

  equals(other: Generation): boolean {
    return (
      Topology.equals(this.topology, other.topology) &&
      this.live.size === other.live.size &&
      [...this.live].every((key) => other.live.has(key))
    );
  }

  private candidates(): Iterable<Position> {
    const candidates = new Map<string, Position>();
    for (const key of this.live) {
      const cell = fromKey(key);
      candidates.set(cell.key, cell);
      for (const neighbour of this.neighboursOf(cell)) {
        candidates.set(neighbour.key, neighbour);
      }
    }
    return candidates.values();
  }

  private neighboursOf(cell: Position): Position[] {
    const neighbours: Position[] = [];
    for (const [dx, dy] of OFFSETS) {
      const adjacent = countable(cell.x + dx, cell.y + dy);
      const neighbour = adjacent === null ? null : canonical(this.topology, adjacent);
      if (neighbour !== null) {
        neighbours.push(neighbour);
      }
    }
    return neighbours;
  }

  private liveNeighboursOf(cell: Position): number {
    let count = 0;
    for (const neighbour of this.neighboursOf(cell)) {
      if (this.live.has(neighbour.key)) {
        count += 1;
      }
    }
    return count;
  }
}

function countable(x: number, y: number): Position | null {
  return Number.isSafeInteger(x) && Number.isSafeInteger(y) ? Position.of(x, y) : null;
}
