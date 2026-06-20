import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { QuestTypeIcon } from '../../components/QuestTypeIcon';
import { QuestLogDetail } from '../../quests/registry';
import { activityByDay, computeMetrics, dayKey, formatMinutes } from '../../shared/metrics';
import type { AppState, HistoryEntry } from '../../shared/types';

function dayLabel(t: number, now: Date): string {
  const d = new Date(t);
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86_400_000).toDateString();
  if (d.toDateString() === today) return 'Today';
  if (d.toDateString() === yesterday) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function QuestLogSection({ state }: { state: AppState }) {
  const now = new Date();
  const metrics = computeMetrics(state, now.getTime());
  const entries = [...state.history].sort((a, b) => b.createdAt - a.createdAt);

  const groups: { label: string; entries: HistoryEntry[] }[] = [];
  for (const entry of entries) {
    const label = dayLabel(entry.createdAt, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.entries.push(entry);
    else groups.push({ label, entries: [entry] });
  }

  return (
    <section className="flex flex-col items-start gap-4">
      <div className="grid w-full grid-cols-3 gap-3">
        <StatCard value={String(metrics.questsCompleted)} label="quests completed" />
        <StatCard value={String(metrics.resistedVisits)} label="temptations resisted" />
        <StatCard value={`~${formatMinutes(metrics.minutesSaved)}`} label="time saved" />
      </div>

      <Card size="sm" className="w-full">
        <CardContent className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] text-muted-foreground">
              <strong className="text-base font-bold text-primary">{metrics.streakDays}</strong>{' '}
              day streak
            </span>
            <span className="text-xs text-muted-foreground">a square a day keeps the feed away</span>
          </div>
          <StreakGrid counts={activityByDay(state)} now={now} />
        </CardContent>
      </Card>

      {entries.length === 0 && (
        <p className="text-muted-foreground">
          The log is empty. Every side quest you complete gets recorded here.
        </p>
      )}

      {groups.map((group) => (
        <div key={group.label} className="flex w-full flex-col gap-2.5">
          <h3 className="mt-2 text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">
            {group.label}
          </h3>
          {group.entries.map((entry) => (
            <Card key={entry.id} size="sm" className="w-full">
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <QuestTypeIcon
                      type={entry.questType}
                      className="size-3.5 text-muted-foreground"
                    />
                    <strong>{entry.hostname}</strong>
                    <span className="text-[13px] text-muted-foreground">· {entry.questName}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <QuestLogDetail result={entry} />
                <span className="text-[13px] text-mint">Earned {entry.minutesEarned} min</span>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </section>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <Card size="sm" className="items-center gap-1 px-3 py-4 text-center">
      <span className="text-2xl font-bold text-primary">{value}</span>
      <span className="text-[13px] text-muted-foreground">{label}</span>
    </Card>
  );
}

const GRID_WEEKS = 36;
const DAY_MS = 86_400_000;

function cellClass(count: number): string {
  if (count === 0) return 'bg-foreground/8';
  if (count === 1) return 'bg-mint/40';
  if (count <= 3) return 'bg-mint/70';
  return 'bg-mint';
}

/** GitHub-style activity grid: one column per week, Sunday at the top. */
function StreakGrid({ counts, now }: { counts: Map<string, number>; now: Date }) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay() - (GRID_WEEKS - 1) * 7);

  const weeks = Array.from({ length: GRID_WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(start.getTime() + (w * 7 + d) * DAY_MS);
      return { date, count: counts.get(dayKey(date.getTime())) ?? 0 };
    })
  );

  return (
    <div className="flex gap-1" role="img" aria-label={`Activity over the last ${GRID_WEEKS} weeks`}>
      {weeks.map((week, w) => (
        <div key={w} className="flex flex-1 flex-col gap-1">
          {week.map(({ date, count }) => {
            const future = date > now;
            const isToday = date.toDateString() === now.toDateString();
            return (
              <div
                key={date.getTime()}
                title={
                  future
                    ? undefined
                    : `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${
                        count === 0 ? 'quiet' : `${count} logged`
                      }`
                }
                className={cn(
                  'aspect-square w-full rounded-[3px]',
                  future ? 'bg-transparent' : cellClass(count),
                  isToday && 'ring-1 ring-primary/60'
                )}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
