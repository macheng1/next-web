export interface MessageRect {
  sequence: number;
  top: number;
  bottom: number;
  height: number;
}
export function visibleMessagePosition(
  rects: MessageRect[],
  top: number,
  bottom: number,
) {
  return rects.reduce((highest, rect) => {
    const visible = Math.min(rect.bottom, bottom) - Math.max(rect.top, top);
    return Number.isSafeInteger(rect.sequence) &&
      rect.sequence > 0 &&
      rect.height > 0 &&
      visible >= Math.min(40, rect.height)
      ? Math.max(highest, rect.sequence)
      : highest;
  }, 0);
}
export class ReadPositionQueue {
  private generation = 0;
  private active = false;
  private observed = 0;
  private acknowledged = 0;
  private busy = false;
  constructor(
    private write: (
      position: number,
    ) => Promise<{ readThroughSequence: number }>,
  ) {}
  reset(position: number) {
    this.generation++;
    this.active = true;
    this.observed = position;
    this.acknowledged = position;
    this.busy = false;
  }
  invalidate() {
    this.generation++;
    this.active = false;
  }
  observe(position: number) {
    if (!this.active || !Number.isSafeInteger(position) || position < 1) return;
    this.observed = Math.max(this.observed, position);
    void this.flush();
  }
  private async flush() {
    if (!this.active || this.busy || this.observed <= this.acknowledged) return;
    const token = this.generation,
      through = this.observed;
    this.busy = true;
    let succeeded = false;
    try {
      const result = await this.write(through);
      if (token !== this.generation) return;
      this.acknowledged = Math.max(
        this.acknowledged,
        result.readThroughSequence,
      );
      succeeded = true;
    } catch {
      /* Next visible-area check retries the same unacknowledged position. */
    } finally {
      if (token === this.generation) {
        this.busy = false;
        if (succeeded && this.observed > this.acknowledged) void this.flush();
      }
    }
  }
}
