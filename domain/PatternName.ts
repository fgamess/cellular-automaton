const MAXIMUM_LENGTH = 64;
const SPELLING = /^[a-z][a-z0-9_]*$/;

export class PatternName {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static of(value: string): PatternName {
    if (value.length > MAXIMUM_LENGTH || !SPELLING.test(value)) {
      throw new RangeError(
        `a pattern is named in up to ${MAXIMUM_LENGTH} lowercase letters, digits and underscores, not "${value}"`,
      );
    }
    return new PatternName(value);
  }

  equals(other: PatternName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
