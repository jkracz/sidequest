import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { computeMetrics, formatMinutes } from '../../shared/metrics';
import { QUEST_ICONS } from '../../shared/quests';
import { formatSeconds } from '../../shared/schedule';
import { setState } from '../../shared/storage';
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
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard value={String(metrics.questsCompleted)} label="quests completed" />
        <StatCard value={String(metrics.resistedVisits)} label="temptations resisted" />
        <StatCard value={`~${formatMinutes(metrics.minutesSaved)}`} label="time saved (est.)" />
        <StatCard
          value={String(metrics.streakDays)}
          label={metrics.streakDays === 1 ? 'day streak' : 'day streak'}
        />
      </div>
      <p className="text-[13px] text-muted-foreground">
        Time saved assumes
        <Input
          type="number"
          className="mx-1.5 inline-flex h-7 w-16 px-1.5"
          min={1}
          max={120}
          value={state.settings.minutesPerResistedVisit}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v >= 1) {
              void setState({ settings: { ...state.settings, minutesPerResistedVisit: v } });
            }
          }}
        />
        minutes per resisted visit — a visit where you hit the wall and walked away without
        earning a pass.
      </p>

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
                  <span>
                    {QUEST_ICONS[entry.questType]} <strong>{entry.hostname}</strong>{' '}
                    <span className="text-[13px] text-muted-foreground">· {entry.questName}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {entry.questType === 'reflection' && (
                  <>
                    {entry.prompt && (
                      <p className="text-[13px] text-muted-foreground italic">{entry.prompt}</p>
                    )}
                    <p className="whitespace-pre-wrap">{entry.text}</p>
                  </>
                )}
                {entry.questType === 'timer' && (
                  <p className="text-muted-foreground">
                    Waited out a {formatSeconds(entry.seconds)} countdown.
                  </p>
                )}
                {entry.questType === 'pushups' && (
                  <p className="text-muted-foreground">Knocked out {entry.reps} push-ups.</p>
                )}
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
