import { RunSimulation } from '../../application/RunSimulation.ts';
import { PatternName, Ruleset, Topology } from '../../domain/index.ts';
import { BundledPatternCatalog } from '../patterns/BundledPatternCatalog.ts';
import { bundledTextSource } from '../patterns/bundledTextSource.ts';
import { CanvasView, type Viewport } from './CanvasView.ts';
import { RealTicker } from './RealTicker.ts';

const VIEWPORT: Viewport = { widthInCells: 96, heightInCells: 64, cellSize: 10 };

const canvas = document.querySelector('canvas');
if (canvas === null) {
  throw new Error('the page carries no canvas for the simulation to draw on');
}
canvas.width = VIEWPORT.widthInCells * VIEWPORT.cellSize;
canvas.height = VIEWPORT.heightInCells * VIEWPORT.cellSize;

const surface = canvas.getContext('2d');
if (surface === null) {
  throw new Error('this browser offers no two-dimensional drawing surface');
}
surface.fillStyle = '#39d353';

await new RunSimulation(
  new BundledPatternCatalog(bundledTextSource),
  new CanvasView(surface, VIEWPORT),
  new RealTicker(requestAnimationFrame.bind(globalThis)),
).execute({
  name: PatternName.of('glider_gun'),
  topology: Topology.unbounded,
  rules: Ruleset.parse('B3/S23'),
  generations: 2_000,
  everyMs: 60,
});
