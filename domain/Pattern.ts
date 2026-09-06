import type { PatternName } from './PatternName.ts';
import { fromKey, Position } from './Position.ts';
import type { Topology } from './Topology.ts';

export class PatternDoesNotFit extends RangeError {}

export class Pattern {
  readonly name: PatternName;
  private readonly live: ReadonlySet<string>;
  private readonly maxX: number;
  private readonly maxY: number;

  private constructor(name: PatternName, live: ReadonlySet<string>, maxX: number, maxY: number) {
    this.name = name;
    this.live = live;
    this.maxX = maxX;
    this.maxY = maxY;
    Object.freeze(this);
  }

  static of(name: PatternName, cells: Iterable<Position>): Pattern {
    const drawn = [...cells];
    const box = boxAround(drawn);
    if (box === null) {
      throw new RangeError(
        `a pattern draws at least one live cell, and the one named ${name} draws none`,
      );
    }
    const live = new Set(
      drawn.map((cell) => Position.of(cell.x - box.minX, cell.y - box.minY).key),
    );
    return new Pattern(name, live, box.maxX - box.minX, box.maxY - box.minY);
  }

  get width(): number {
    return this.maxX + 1;
  }

  get height(): number {
    return this.maxY + 1;
  }

  cells(): Position[] {
    return [...this.live].map(fromKey).sort((a, b) => a.y - b.y || a.x - b.x);
  }

  placedAt(origin: Position, topology: Topology): Position[] {
    this.requireFit(origin, topology);
    return this.cells().map((cell) => Position.of(cell.x + origin.x, cell.y + origin.y));
  }

  centeredOn(topology: Topology): Position[] {
    if (topology.kind === 'unbounded') {
      return this.placedAt(Position.of(0, 0), topology);
    }
    return this.placedAt(
      Position.of(
        Math.floor((topology.width - this.width) / 2),
        Math.floor((topology.height - this.height) / 2),
      ),
      topology,
    );
  }

  equals(other: Pattern): boolean {
    return (
      this.name.equals(other.name) &&
      this.live.size === other.live.size &&
      [...this.live].every((key) => other.live.has(key))
    );
  }

  private requireFit(origin: Position, topology: Topology): void {
    if (topology.kind === 'unbounded') {
      return;
    }
    const fits =
      origin.x >= 0 &&
      origin.y >= 0 &&
      origin.x + this.width <= topology.width &&
      origin.y + this.height <= topology.height;
    if (!fits) {
      throw new PatternDoesNotFit(
        `${this.name} measures ${this.width} x ${this.height} and does not fit at ${origin} in a ${topology.kind} ${topology.width}x${topology.height} universe`,
      );
    }
  }
}

type Box = { minX: number; minY: number; maxX: number; maxY: number };

function boxAround(cells: readonly Position[]): Box | null {
  const first = cells[0];
  if (first === undefined) {
    return null;
  }
  const box = { minX: first.x, minY: first.y, maxX: first.x, maxY: first.y };
  for (const cell of cells) {
    box.minX = Math.min(box.minX, cell.x);
    box.minY = Math.min(box.minY, cell.y);
    box.maxX = Math.max(box.maxX, cell.x);
    box.maxY = Math.max(box.maxY, cell.y);
  }
  return box;
}
