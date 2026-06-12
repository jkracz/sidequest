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

  const activityTimestamps = [...history.map((h) => h.createdAt), ...resists.map((r) => r.at)];

  return {
    questsCompleted: history.length,
    resistedVisits: resists.length,
    minutesSaved: resists.length * settings.minutesPerResistedVisit,
    streakDays: computeStreak(activityTimestamps, now),
  };
}

function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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
