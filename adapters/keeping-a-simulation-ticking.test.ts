import { describe, expect, it } from 'vitest';
import type { Ticker } from '../application/ports.ts';
import { RealTicker, type ScheduleFrame } from './browser/RealTicker.ts';
import { DrainingTicker } from './cli/DrainingTicker.ts';

type FrameClock = {
  readonly schedule: ScheduleFrame;
  paint(timestamp: number): void;
  readonly pending: boolean;
};

const frameClock = (): FrameClock => {
  let due: ((timestamp: number) => void) | null = null;
  return {
    schedule(paint) {
      due = paint;
    },
    paint(timestamp) {
      const next = due;
      due = null;
      next?.(timestamp);
    },
    get pending() {
      return due !== null;
    },
  };
};

const paintEvery = (clock: FrameClock, ms: number, frames: number, from = 0): void => {
  for (let frame = 0; frame < frames; frame += 1) {
    clock.paint(from + frame * ms);
  }
};

const clocks = [
  { clock: 'the browser clock', create: (): Ticker => new RealTicker(() => 0) },
  { clock: 'the draining clock', create: (): Ticker => new DrainingTicker() },
];

describe('keeping a simulation ticking', () => {
  it.each(clocks)('$clock hands back its cancel before it ticks', ({ create }) => {
    let ticked = false;

    const cancel = create().each(10, () => {
      ticked = true;
    });
    cancel();

    expect(ticked).toBe(false);
  });

  it('the browser clock ticks at the interval it was asked for, not once a frame', () => {
    const clock = frameClock();
    let ticks = 0;

    new RealTicker(clock.schedule).each(100, () => {
      ticks += 1;
    });
    paintEvery(clock, 16, 32);

    expect(ticks).toBe(4);
  });

  it('the browser clock keeps its ticks anchored to the run instead of drifting a frame at a time', () => {
    const clock = frameClock();
    let ticks = 0;

    new RealTicker(clock.schedule).each(100, () => {
      ticks += 1;
    });
    paintEvery(clock, 16, 64);

    expect(ticks).toBe(10);
  });

  it('the browser clock drops the ticks a hidden tab owes rather than firing them all at once', () => {
    const clock = frameClock();
    let ticks = 0;

    new RealTicker(clock.schedule).each(100, () => {
      ticks += 1;
    });
    clock.paint(0);
    clock.paint(5_000);
    paintEvery(clock, 16, 20, 5_016);

    expect(ticks).toBe(4);
  });

  it('the browser clock catches up on a frame a whole second late rather than skipping ahead', () => {
    const clock = frameClock();
    let ticks = 0;

    new RealTicker(clock.schedule).each(100, () => {
      ticks += 1;
    });
    clock.paint(0);
    clock.paint(1_100);
    paintEvery(clock, 16, 3, 1_116);

    expect(ticks).toBe(4);
  });

  it('the browser clock stops catching up a millisecond past the second it tolerates', () => {
    const clock = frameClock();
    let ticks = 0;

    new RealTicker(clock.schedule).each(100, () => {
      ticks += 1;
    });
    clock.paint(0);
    clock.paint(1_101);
    paintEvery(clock, 16, 3, 1_117);

    expect(ticks).toBe(1);
  });

  it('the browser clock stops ticking and stops asking for frames once it is cancelled', () => {
    const clock = frameClock();
    let ticks = 0;
    const cancel = new RealTicker(clock.schedule).each(100, () => {
      ticks += 1;
    });
    paintEvery(clock, 16, 32);

    cancel();
    paintEvery(clock, 16, 32);

    expect(ticks).toBe(4);
    expect(clock.pending).toBe(false);
  });

  it('the draining clock runs the tick over and over until the run cancels it', async () => {
    const ticker = new DrainingTicker();
    let ticks = 0;

    const cancel = ticker.each(1, () => {
      ticks += 1;
      if (ticks === 5) {
        cancel();
      }
    });
    await ticker.finished;

    expect(ticks).toBe(5);
  });
});
