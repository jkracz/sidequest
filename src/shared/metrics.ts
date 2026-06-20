import type { AppState } from './types';

export interface Metrics {
  questsCompleted: number;
  resistedVisits: number;
  /** resistedVisits × settings.minutesPerResistedVisit — an estimate. */
  minutesSaved: number;
  /** Consecutive days (ending today or yesterday) with any logged activity. */
  streakDays: number;
}

export function computeMetrics(state: AppState, now = Date.now()): Metrics {
  const { history, resists, settings } = state;

  const activityTimestamps = [
    ...history.map((h) => h.createdAt),
    ...resists.map((r) => r.at),
  ];

  return {
    questsCompleted: history.length,
    resistedVisits: resists.length,
    minutesSaved: resists.length * settings.minutesPerResistedVisit,
    streakDays: computeStreak(activityTimestamps, now),
  };
}

export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Logged events (quests + resists) per local day, keyed by dayKey. */
export function activityByDay(state: AppState): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of [
    ...state.history.map((h) => h.createdAt),
    ...state.resists.map((r) => r.at),
  ]) {
    const key = dayKey(t);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Completed quests per local day, keyed by dayKey (history only, excludes resists). */
export function questsByDay(state: AppState): Map<string, number> {
  const counts = new Map<string, number>();
  for (const h of state.history) {
    const key = dayKey(h.createdAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function computeStreak(timestamps: number[], now: number): number {
  const days = new Set(timestamps.map(dayKey));
  const cursor = new Date(now);
  // A quiet day-so-far shouldn't break the streak; start counting yesterday.
  if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** "3h 25m" / "45m" rendering of a duration in minutes. */
export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
