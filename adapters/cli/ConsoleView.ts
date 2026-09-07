import type { GenerationView } from '../../application/ports.ts';
import { type Generation, Position } from '../../domain/index.ts';

const LIVE = 'O';
const DEAD = '.';

export type TextWindow = {
  readonly widthInCells: number;
  readonly heightInCells: number;
};

export interface WritesText {
  write(text: string): void;
}

export function renderGeneration(generation: Generation, window: TextWindow): string {
  const live = new Set(generation.livePositions().map((cell) => cell.key));
  const rows: string[] = [];
  for (let y = 0; y < window.heightInCells; y += 1) {
    let row = '';
    for (let x = 0; x < window.widthInCells; x += 1) {
      row += live.has(Position.of(x, y).key) ? LIVE : DEAD;
    }
    rows.push(row);
  }
  return rows.join('\n');
}

export class ConsoleView implements GenerationView {
  private readonly out: WritesText;
  private readonly window: TextWindow;

  constructor(out: WritesText, window: TextWindow) {
    this.out = out;
    this.window = window;
  }

  display(generation: Generation): void {
    this.out.write(`${renderGeneration(generation, this.window)}\n\n`);
  }
}
