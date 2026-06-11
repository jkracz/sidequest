import { computeMetrics, formatMinutes } from '../../shared/metrics';
import { formatSeconds } from '../../shared/schedule';
import { setState } from '../../shared/storage';
import type { AppState, HistoryEntry } from '../../shared/types';

const QUEST_ICONS: Record<HistoryEntry['questType'], string> = {
  reflection: '📝',
  timer: '⏳',
  pushups: '💪',
};

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

  async function clearAll() {
    if (confirm('Reset your quest log and stats? This cannot be undone.')) {
      await setState({ history: [], intercepts: [] });
    }
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
      <p className="text-[13px] text-dim">
        Time saved assumes
        <input
          type="number"
          className="input mx-1.5 w-[64px] px-1.5 py-0.5"
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
        <p className="text-dim">
          The log is empty. Every side quest you complete gets recorded here.
        </p>
      )}

      {groups.map((group) => (
        <div key={group.label} className="flex w-full flex-col gap-2.5">
          <h3 className="mt-2 text-[13px] font-semibold tracking-wider text-dim uppercase">
            {group.label}
          </h3>
          {group.entries.map((entry) => (
            <div key={entry.id} className="card flex w-full flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <span>
                  {QUEST_ICONS[entry.questType]} <strong>{entry.hostname}</strong>{' '}
                  <span className="text-[13px] text-dim">· {entry.questName}</span>
                </span>
                <span className="text-dim">
                  {new Date(entry.createdAt).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {entry.questType === 'reflection' && (
                <>
                  {entry.prompt && <p className="text-[13px] text-dim italic">{entry.prompt}</p>}
                  <p className="whitespace-pre-wrap">{entry.text}</p>
                </>
              )}
              {entry.questType === 'timer' && (
                <p className="text-dim">Waited out a {formatSeconds(entry.seconds)} countdown.</p>
              )}
              {entry.questType === 'pushups' && (
                <p className="text-dim">Knocked out {entry.reps} push-ups.</p>
              )}
              <span className="text-[13px] text-mint">Earned {entry.minutesEarned} min</span>
            </div>
          ))}
        </div>
      ))}

      {(entries.length > 0 || state.intercepts.length > 0) && (
        <button className="btn btn-danger" onClick={() => void clearAll()}>
          Reset log & stats
        </button>
      )}
    </section>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="card flex flex-col items-center gap-1 px-3 py-4 text-center">
      <span className="text-2xl font-bold text-gold">{value}</span>
      <span className="text-[13px] text-dim">{label}</span>
    </div>
  );
}
