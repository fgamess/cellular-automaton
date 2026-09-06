import { Position } from './Position.ts';

export type Topology =
  | { kind: 'bounded'; width: number; height: number }
  | { kind: 'toroidal'; width: number; height: number }
  | { kind: 'unbounded' };

const unbounded: Topology = Object.freeze({ kind: 'unbounded' });

function bounded(width: number, height: number): Topology {
  requireExtent(width, height);
  return Object.freeze({ kind: 'bounded', width, height });
}

function toroidal(width: number, height: number): Topology {
  requireExtent(width, height);
  return Object.freeze({ kind: 'toroidal', width, height });
}

function equals(a: Topology, b: Topology): boolean {
  return extentOf(a) === extentOf(b);
}

function extentOf(topology: Topology): string {
  return topology.kind === 'unbounded'
    ? topology.kind
    : `${topology.kind} ${topology.width}x${topology.height}`;
}

function requireExtent(width: number, height: number): void {
  if (!isExtent(width) || !isExtent(height)) {
    throw new RangeError(`a universe measures whole positive extents, not ${width} x ${height}`);
  }
}

function isExtent(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export const Topology = Object.freeze({ unbounded, bounded, toroidal, equals });

export function sealed(topology: Topology): Topology {
  switch (topology.kind) {
    case 'unbounded':
      return unbounded;
    case 'bounded':
      return bounded(topology.width, topology.height);
    case 'toroidal':
      return toroidal(topology.width, topology.height);
  }
}

export function canonical(topology: Topology, position: Position): Position | null {
  switch (topology.kind) {
    case 'unbounded':
      return position;
    case 'bounded':
      return within(position.x, topology.width) && within(position.y, topology.height)
        ? position
        : null;
    case 'toroidal':
      return Position.of(fold(position.x, topology.width), fold(position.y, topology.height));
  }
}

function within(coordinate: number, extent: number): boolean {
  return coordinate >= 0 && coordinate < extent;
}

function fold(coordinate: number, extent: number): number {
  const folded = coordinate % extent;
  return folded < 0 ? folded + extent : folded;
}
