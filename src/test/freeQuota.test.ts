import { describe, expect, it } from "vitest";
import { getLocalDateKey, readDailyUsage, writeDailyUsage } from "@/lib/freeQuota";

function memoryStorage(initial?: Record<string, string>) {
  const map = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => map.set(key, value),
  };
}

describe("free daily quota", () => {
  it("starts at zero for a new day", () => {
    const storage = memoryStorage();
    const now = new Date(2026, 8, 29, 10, 0, 0);
    expect(readDailyUsage(storage, now)).toEqual({ date: "2026-09-29", count: 0 });
  });

  it("keeps the current day's count", () => {
    const now = new Date(2026, 8, 29, 10, 0, 0);
    const storage = memoryStorage({
      promptgrade_daily_usage: JSON.stringify({ date: "2026-09-29", count: 4 }),
    });
    expect(readDailyUsage(storage, now).count).toBe(4);
  });

  it("resets a stale previous-day count", () => {
    const now = new Date(2026, 8, 29, 10, 0, 0);
    const storage = memoryStorage({
      promptgrade_daily_usage: JSON.stringify({ date: "2026-09-28", count: 5 }),
    });
    expect(readDailyUsage(storage, now)).toEqual({ date: "2026-09-29", count: 0 });
  });

  it("writes a normalized local-date usage record", () => {
    const storage = memoryStorage();
    const now = new Date(2026, 8, 29, 10, 0, 0);
    const usage = writeDailyUsage(storage, 3.8, now);
    expect(usage).toEqual({ date: getLocalDateKey(now), count: 3 });
    expect(readDailyUsage(storage, now).count).toBe(3);
  });
});
