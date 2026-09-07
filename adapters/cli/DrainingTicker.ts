import type { Cancel, Ticker } from '../../application/ports.ts';

export class DrainingTicker implements Ticker {
  readonly finished: Promise<void>;
  private readonly settle: () => void;
  private running: boolean;

  constructor() {
    let settle: () => void = () => undefined;
    this.finished = new Promise<void>((resolve) => {
      settle = resolve;
    });
    this.settle = settle;
    this.running = false;
  }

  each(_ms: number, fn: () => void): Cancel {
    this.running = true;
    const drain = (): void => {
      if (!this.running) {
        return;
      }
      fn();
      if (this.running) {
        queueMicrotask(drain);
      }
    };
    queueMicrotask(drain);
    return () => {
      this.running = false;
      this.settle();
    };
  }
}
