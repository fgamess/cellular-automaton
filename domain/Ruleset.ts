const NOTATION = /^B[0-9]*\/S[0-9]*$/;
const MOST_NEIGHBOURS = 8;

export class Ruleset {
  private readonly birth: ReadonlySet<number>;
  private readonly survival: ReadonlySet<number>;

  private constructor(birth: ReadonlySet<number>, survival: ReadonlySet<number>) {
    this.birth = birth;
    this.survival = survival;
    Object.freeze(this);
  }

  static parse(notation: string): Ruleset {
    if (!NOTATION.test(notation)) {
      throw new RangeError(`${notation} is not birth/survival notation such as B3/S23`);
    }
    const separator = notation.indexOf('/');
    return new Ruleset(
      neighbourCounts(notation.slice(1, separator)),
      neighbourCounts(notation.slice(separator + 2)),
    );
  }

  permits(isAlive: boolean, liveNeighbours: number): boolean {
    return isAlive ? this.survival.has(liveNeighbours) : this.birth.has(liveNeighbours);
  }

  equals(other: Ruleset): boolean {
    return this.toString() === other.toString();
  }

  toString(): string {
    return `B${render(this.birth)}/S${render(this.survival)}`;
  }
}

function neighbourCounts(digits: string): ReadonlySet<number> {
  const counts = new Set<number>();
  for (const digit of digits) {
    const count = Number(digit);
    if (count > MOST_NEIGHBOURS) {
      throw new RangeError(`${count} is not a possible count; a cell has eight neighbours`);
    }
    counts.add(count);
  }
  return counts;
}

function render(counts: ReadonlySet<number>): string {
  return [...counts].sort((a, b) => a - b).join('');
}
