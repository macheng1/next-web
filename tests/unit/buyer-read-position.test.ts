import { it, expect, vi } from "vitest";
import {
  visibleMessagePosition,
  ReadPositionQueue,
} from "../../src/lib/buyer/read-position";
it("marks only sufficiently visible messages", () => {
  expect(
    visibleMessagePosition(
      [{ sequence: 3, top: 101, bottom: 160, height: 59 }],
      0,
      100,
    ),
  ).toBe(0);
  expect(
    visibleMessagePosition(
      [{ sequence: 3, top: 30, bottom: 90, height: 60 }],
      0,
      100,
    ),
  ).toBe(3);
});
it("invalidates pending writes on conversation switch", async () => {
  let done!: (v: { readThroughSequence: number }) => void;
  const write = vi.fn(
    () =>
      new Promise<{ readThroughSequence: number }>((resolve) => {
        done = resolve;
      }),
  );
  const queue = new ReadPositionQueue(write);
  queue.reset(0);
  queue.observe(2);
  queue.invalidate();
  done({ readThroughSequence: 2 });
  await Promise.resolve();
  queue.observe(5);
  expect(write).toHaveBeenCalledTimes(1);
});
