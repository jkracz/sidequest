import type { DayOfWeek, TimeBlock } from './types';

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function isTimeBlockActive(tb: TimeBlock, now: Date): boolean {
  if (tb.days.length === 0) return false;
  const day = now.getDay() as DayOfWeek;
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = minutesOf(tb.startTime);
  const end = minutesOf(tb.endTime);
  if (start < end) {
    return tb.days.includes(day) && mins >= start && mins < end;
  }
  // Spans midnight: active from start on a listed day through end the next day.
  if (tb.days.includes(day) && mins >= start) return true;
  const prevDay = ((day + 6) % 7) as DayOfWeek;
  return tb.days.includes(prevDay) && mins < end;
}

export function activeTimeBlocks(
  timeBlocks: TimeBlock[],
  now: Date,
): TimeBlock[] {
  return timeBlocks.filter((tb) => isTimeBlockActive(tb, now));
}

/**
 * Epoch ms when the current active occurrence of a time block ends, or null
 * when the block is not active at `now`.
 */
export function activeTimeBlockEndsAt(tb: TimeBlock, now: Date): number | null {
  if (!isTimeBlockActive(tb, now)) return null;

  const day = now.getDay() as DayOfWeek;
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = minutesOf(tb.startTime);
  const end = minutesOf(tb.endTime);
  const endsAt = new Date(now);
  endsAt.setHours(Math.floor(end / 60), end % 60, 0, 0);

  if (start < end) return endsAt.getTime();

  if (tb.days.includes(day) && mins >= start) {
    endsAt.setDate(endsAt.getDate() + 1);
  }

  return endsAt.getTime();
}

/**
 * Epoch ms of the next moment any time block begins, or null if there are
 * no scheduled blocks. Used to schedule the tab-sweep alarm.
 */
export function nextBlockStart(
  timeBlocks: TimeBlock[],
  now: Date,
): number | null {
  let best: number | null = null;
  for (const tb of timeBlocks) {
    const start = minutesOf(tb.startTime);
    for (const day of tb.days) {
      for (let offset = 0; offset <= 7; offset++) {
        const d = new Date(now);
        d.setDate(d.getDate() + offset);
        if (d.getDay() !== day) continue;
        d.setHours(Math.floor(start / 60), start % 60, 0, 0);
        const t = d.getTime();
        if (t > now.getTime() && (best === null || t < best)) best = t;
      }
    }
  }
  return best;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h < 12 ? 'am' : 'pm';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0
    ? `${hour12}${suffix}`
    : `${hour12}:${String(m).padStart(2, '0')}${suffix}`;
}

/** "1:05" style m:ss rendering of a duration in seconds. */
export function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const DAY_LABELS = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
] as const;
