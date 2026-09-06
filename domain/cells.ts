import { Position } from './Position.ts';

const LIVE = 'O';
const DEAD = '.';
const COMMENT = '!';

export function parseCells(text: string): Position[] {
  const cells: Position[] = [];
  let y = 0;
  for (const line of text.replaceAll('\r', '').split('\n')) {
    if (line.startsWith(COMMENT)) {
      continue;
    }
    for (const [x, character] of [...line].entries()) {
      if (character === LIVE) {
        cells.push(Position.of(x, y));
      } else if (character !== DEAD) {
        throw new RangeError(
          `a plaintext pattern is written with O and ., not with "${character}" at (${x}, ${y})`,
        );
      }
    }
    y += 1;
  }
  return cells;
}
