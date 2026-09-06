const KEY_SEPARATOR = ',';
const KEY_PATTERN = /^-?\d+,-?\d+$/;

export class Position {
  readonly x: number;
  readonly y: number;
  readonly key: string;

  private constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.key = `${x}${KEY_SEPARATOR}${y}`;
    Object.freeze(this);
  }

  static of(x: number, y: number): Position {
    if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
      throw new RangeError(`a cell sits at whole countable coordinates, not at (${x}, ${y})`);
    }
    return new Position(x, y);
  }

  equals(other: Position): boolean {
    return this.key === other.key;
  }

  toString(): string {
    return `(${this.x}, ${this.y})`;
  }
}

export function fromKey(key: string): Position {
  if (!KEY_PATTERN.test(key)) {
    throw new RangeError(`${key} is not the key of a cell`);
  }
  const separator = key.indexOf(KEY_SEPARATOR);
  return Position.of(Number(key.slice(0, separator)), Number(key.slice(separator + 1)));
}
