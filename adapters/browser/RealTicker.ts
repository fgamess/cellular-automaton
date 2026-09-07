import type { Cancel, Ticker } from '../../application/ports.ts';

export type ScheduleFrame = (paint: (timestamp: number) => void) => unknown;

const MOST_LAG_MS = 1_000;

export class RealTicker implements Ticker {
  private readonly scheduleFrame: ScheduleFrame;

  constructor(scheduleFrame: ScheduleFrame) {
    this.scheduleFrame = scheduleFrame;
  }

  each(ms: number, fn: () => void): Cancel {
    let cancelled = false;
    let dueAt: number | null = null;
    const paint = (timestamp: number): void => {
      if (cancelled) {
        return;
      }
      if (dueAt === null) {
        dueAt = timestamp + ms;
      } else if (timestamp >= dueAt) {
        dueAt = timestamp - dueAt > MOST_LAG_MS ? timestamp + ms : dueAt + ms;
        fn();
      }
      if (!cancelled) {
        this.scheduleFrame(paint);
      }
    };
    this.scheduleFrame(paint);
    return () => {
      cancelled = true;
    };
  }
}
