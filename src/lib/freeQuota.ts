const STORAGE_KEY = "promptgrade_daily_usage";

export interface DailyUsage {
  date: string;
  count: number;
}

export function getLocalDateKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function readDailyUsage(storage: Pick<Storage, "getItem">, now = new Date()): DailyUsage {
  const today = getLocalDateKey(now);

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { date: today, count: 0 };

    const parsed = JSON.parse(raw) as Partial<DailyUsage>;
    const count = Number(parsed.count);

    if (parsed.date !== today || !Number.isFinite(count) || count < 0) {
      return { date: today, count: 0 };
    }

    return { date: today, count: Math.floor(count) };
  } catch {
    return { date: today, count: 0 };
  }
}

export function writeDailyUsage(
  storage: Pick<Storage, "setItem">,
  count: number,
  now = new Date(),
): DailyUsage {
  const usage = {
    date: getLocalDateKey(now),
    count: Math.max(0, Math.floor(count)),
  };

  storage.setItem(STORAGE_KEY, JSON.stringify(usage));
  return usage;
}
