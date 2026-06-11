import type { AppState } from './types';

export interface Metrics {
  questsCompleted: number;
  resistedVisits: number;
  /** resistedVisits × settings.minutesPerResistedVisit — an estimate. */
  minutesSaved: number;
  /** Consecutive days (ending today or yesterday) with any logged activity. */
  streakDays: number;
}

/**
 * An intercept counts as resisted if no quest was completed for that hostname
 * within this window afterwards — i.e. you hit the wall and walked away.
 */
const FOLLOW_THROUGH_MS = 5 * 60_000;

export function computeMetrics(state: AppState, now = Date.now()): Metrics {
  const { history, intercepts, settings } = state;

  const resistedVisits = intercepts.filter((i) => {
    if (now - i.at < FOLLOW_THROUGH_MS) return false; // verdict still pending
    return !history.some(
      (h) =>
        h.hostname === i.hostname && h.createdAt >= i.at && h.createdAt - i.at <= FOLLOW_THROUGH_MS
    );
  }).length;

  const activityTimestamps = [
    ...history.map((h) => h.createdAt),
    ...intercepts.map((i) => i.at),
  ];

  return {
    questsCompleted: history.length,
    resistedVisits,
    minutesSaved: resistedVisits * settings.minutesPerResistedVisit,
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
