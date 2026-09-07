import type { GenerationView } from '../../application/ports.ts';
import type { Generation } from '../../domain/index.ts';

export type Viewport = {
  readonly widthInCells: number;
  readonly heightInCells: number;
  readonly cellSize: number;
};

type Square = {
  readonly x: number;
  readonly y: number;
  readonly size: number;
};

export interface FillsRectangles {
  clearRect(x: number, y: number, width: number, height: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
}

function squaresFor(generation: Generation, viewport: Viewport): Square[] {
  const squares: Square[] = [];
  for (const cell of generation.livePositions()) {
    if (isVisible(cell.x, viewport.widthInCells) && isVisible(cell.y, viewport.heightInCells)) {
      squares.push({
        x: cell.x * viewport.cellSize,
        y: cell.y * viewport.cellSize,
        size: viewport.cellSize,
      });
    }
  }
  return squares;
}

function isVisible(coordinate: number, extentInCells: number): boolean {
  return coordinate >= 0 && coordinate < extentInCells;
}

export class CanvasView implements GenerationView {
  private readonly surface: FillsRectangles;
  private readonly viewport: Viewport;

  constructor(surface: FillsRectangles, viewport: Viewport) {
    this.surface = surface;
    this.viewport = viewport;
  }

  display(generation: Generation): void {
    this.surface.clearRect(
      0,
      0,
      this.viewport.widthInCells * this.viewport.cellSize,
      this.viewport.heightInCells * this.viewport.cellSize,
    );
    for (const square of squaresFor(generation, this.viewport)) {
      this.surface.fillRect(square.x, square.y, square.size, square.size);
    }
  }
}
