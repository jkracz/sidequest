import { ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { QuestTypeIcon } from '../../components/QuestTypeIcon';
import { ALL_KINDS, QuestLogDetail } from '../../quests/registry';
import {
  activityByDay,
  computeMetrics,
  dayKey,
  formatMinutes,
  questsByDay,
} from '../../shared/metrics';
import type {
  AppState,
  HistoryEntry,
  QuestType,
  ResistedVisit,
} from '../../shared/types';

/** A resist has no quest type, so the log filters treat it as its own category. */
const RESIST_FILTER = 'resisted';
type FilterCategory = QuestType | typeof RESIST_FILTER;

/** The unified log interleaves completed quests with resisted visits. */
type LogItem =
  | { kind: 'quest'; id: string; at: number; entry: HistoryEntry }
  | { kind: 'resist'; id: string; at: number; resist: ResistedVisit };

function formatTime(t: number): string {
  return new Date(t).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function dayLabel(t: number, now: Date): string {
  const d = new Date(t);
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86_400_000).toDateString();
  if (d.toDateString() === today) return 'Today';
  if (d.toDateString() === yesterday) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/** Reconstruct a local-midnight timestamp from a dayKey produced by `dayKey`. */
function parseDayKey(key: string): number {
  const [year, month, date] = key.split('-').map(Number);
  return new Date(year, month, date).getTime();
}

const RANGES = [
  { value: '30', label: '30 days', days: 30 },
  { value: '90', label: '90 days', days: 90 },
  { value: 'all', label: 'All time', days: null },
] as const;

type RangeValue = (typeof RANGES)[number]['value'];

/** Selected-state styling shared by the schedule and settings toggles. */
const ACTIVE_TOGGLE =
  'data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:font-semibold data-[state=on]:text-primary-foreground';

/** Local midnight `days - 1` days ago, so today is fully included. null = no bound. */
function rangeCutoff(range: RangeValue, now: Date): number | null {
  const days = RANGES.find((r) => r.value === range)?.days ?? null;
  if (days == null) return null;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start.getTime();
}

export function QuestLogSection({ state }: { state: AppState }) {
  const now = new Date();
  const metrics = computeMetrics(state, now.getTime());
  const [range, setRange] = useState<RangeValue>('30');
  const [categories, setCategories] = useState<FilterCategory[]>([]);
  // A day pinned by clicking the streak grid. Overrides the range toggle.
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const hasLog = state.history.length > 0 || state.resists.length > 0;
  const cutoff = rangeCutoff(range, now);
  const items: LogItem[] = [
    ...state.history.map(
      (entry): LogItem => ({
        kind: 'quest',
        id: entry.id,
        at: entry.createdAt,
        entry,
      }),
    ),
    ...state.resists.map(
      (resist): LogItem => ({
        kind: 'resist',
        id: `resist-${resist.at}-${resist.hostname}`,
        at: resist.at,
        resist,
      }),
    ),
  ]
    .sort((a, b) => b.at - a.at)
    .filter((item) => {
      if (selectedDay) {
        if (dayKey(item.at) !== selectedDay) return false;
      } else if (cutoff != null && item.at < cutoff) {
        return false;
      }
      if (categories.length > 0) {
        const category: FilterCategory =
          item.kind === 'resist' ? RESIST_FILTER : item.entry.questType;
        if (!categories.includes(category)) return false;
      }
      return true;
    });

  const groups: { label: string; items: LogItem[] }[] = [];
  for (const item of items) {
    const label = dayLabel(item.at, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }

  return (
    <section className="flex flex-col items-start gap-4">
      <div className="grid w-full grid-cols-3 gap-3">
        <StatCard
          value={String(metrics.questsCompleted)}
          label="quests completed"
        />
        <StatCard
          value={String(metrics.resistedVisits)}
          label="temptations resisted"
        />
        <StatCard
          value={`~${formatMinutes(metrics.minutesSaved)}`}
          label="time saved"
        />
      </div>

      <Card size="sm" className="w-full">
        <CardContent className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] text-muted-foreground">
              <strong className="text-base font-bold text-primary">
                {metrics.streakDays}
              </strong>{' '}
              day streak
            </span>
            <span className="text-xs text-muted-foreground">
              a square a day keeps the feed away
            </span>
          </div>
          <StreakGrid
            counts={activityByDay(state)}
            questCounts={questsByDay(state)}
            selectedDay={selectedDay}
            onSelectDay={(key) =>
              setSelectedDay((prev) => (prev === key ? null : key))
            }
            now={now}
          />
        </CardContent>
      </Card>

      {hasLog && (
        <div className="flex w-full flex-col gap-3 rounded-xl bg-muted/40 p-3">
          {selectedDay ? (
            <div className="flex items-center gap-1">
              <span className="text-[13px] text-muted-foreground">
                Showing{' '}
                <strong className="text-foreground">
                  {dayLabel(parseDayKey(selectedDay), now)}
                </strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setSelectedDay(null)}
              >
                <X />
                Clear
              </Button>
            </div>
          ) : (
            <ToggleGroup
              type="single"
              value={range}
              onValueChange={(value) => value && setRange(value as RangeValue)}
              variant="outline"
              size="sm"
              spacing={0}
            >
              {RANGES.map((r) => (
                <ToggleGroupItem
                  key={r.value}
                  value={r.value}
                  className={ACTIVE_TOGGLE}
                >
                  {r.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}

          <ToggleGroup
            type="multiple"
            value={categories}
            onValueChange={(value) => setCategories(value as FilterCategory[])}
            variant="outline"
            size="sm"
            className="flex-wrap"
          >
            {ALL_KINDS.map((kind) => (
              <ToggleGroupItem
                key={kind.type}
                value={kind.type}
                aria-label={kind.label}
                className={ACTIVE_TOGGLE}
              >
                <QuestTypeIcon
                  type={kind.type}
                  className="text-muted-foreground group-data-[state=on]/toggle:text-primary-foreground"
                />
                {kind.label}
              </ToggleGroupItem>
            ))}
            <ToggleGroupItem
              value={RESIST_FILTER}
              aria-label="Resisted"
              className={ACTIVE_TOGGLE}
            >
              <ShieldCheck className="text-muted-foreground group-data-[state=on]/toggle:text-primary-foreground" />
              Resisted
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {!hasLog && (
        <p className="text-muted-foreground">
          The log is empty. Every side quest you complete gets recorded here.
        </p>
      )}

      {hasLog && items.length === 0 && (
        <p className="text-muted-foreground">Nothing matches these filters.</p>
      )}

      {groups.map((group) => (
        <div key={group.label} className="flex w-full flex-col gap-2.5">
          {!selectedDay && (
            <h3 className="mt-2 text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">
              {group.label}
            </h3>
          )}
          {group.items.map((item) =>
            item.kind === 'quest' ? (
              <QuestCard key={item.id} entry={item.entry} />
            ) : (
              <ResistCard key={item.id} resist={item.resist} />
            ),
          )}
        </div>
      ))}
    </section>
  );
}

function QuestCard({ entry }: { entry: HistoryEntry }) {
  return (
    <Card size="sm" className="w-full">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <QuestTypeIcon
              type={entry.questType}
              className="size-3.5 text-muted-foreground"
            />
            <strong>{entry.hostname}</strong>
            <span className="text-[13px] text-muted-foreground">
              · {entry.questName}
            </span>
          </span>
          <span className="text-muted-foreground">
            {formatTime(entry.createdAt)}
          </span>
        </div>
        <QuestLogDetail result={entry} />
        <span className="text-[13px] text-mint">
          Earned {entry.minutesEarned} min
        </span>
      </CardContent>
    </Card>
  );
}

/** A resisted visit: no quest, no reward — a quieter row than a completion. */
function ResistCard({ resist }: { resist: ResistedVisit }) {
  return (
    <Card size="sm" className="w-full">
      <CardContent className="flex items-baseline justify-between gap-2 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5" />
          Resisted{' '}
          <strong className="text-foreground">{resist.hostname}</strong>
        </span>
        <span>{formatTime(resist.at)}</span>
      </CardContent>
    </Card>
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

interface StreakGridProps {
  /** Combined activity (quests + resists) per day — drives the square color. */
  counts: Map<string, number>;
  /** Completed quests per day — drives the tooltip count and clickability. */
  questCounts: Map<string, number>;
  selectedDay: string | null;
  onSelectDay: (key: string) => void;
  now: Date;
}

/** GitHub-style activity grid: one column per week, Sunday at the top. */
function StreakGrid({
  counts,
  questCounts,
  selectedDay,
  onSelectDay,
  now,
}: StreakGridProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay() - (GRID_WEEKS - 1) * 7);

  const weeks = Array.from({ length: GRID_WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(start.getTime() + (w * 7 + d) * DAY_MS);
      const key = dayKey(date.getTime());
      return {
        date,
        key,
        row: d,
        count: counts.get(key) ?? 0,
        quests: questCounts.get(key) ?? 0,
      };
    }),
  );

  return (
    <div
      className="flex gap-1"
      role="group"
      aria-label={`Activity over the last ${GRID_WEEKS} weeks`}
    >
      {weeks.map((week, w) => (
        <div key={w} className="flex flex-1 flex-col gap-1">
          {week.map(({ date, key, row, count, quests }) => {
            const future = date > now;
            const isToday = date.toDateString() === now.toDateString();
            const selected = key === selectedDay;
            // `count` is total activity (quests + resists), so a day is clickable
            // whenever it has any log entry — quiet days stay inert.
            const resists = count - quests;
            const clickable = !future && count > 0;
            const dateStr = date.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });
            const parts: string[] = [];
            if (quests > 0)
              parts.push(`${quests} quest${quests === 1 ? '' : 's'}`);
            if (resists > 0) parts.push(`${resists} resisted`);
            const label = parts.length
              ? `${dateStr} · ${parts.join(' · ')}`
              : dateStr;

            const tooltip = hovered === key && !future && (
              <span
                role="tooltip"
                className={cn(
                  'pointer-events-none absolute z-20 rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md',
                  row <= 1 ? 'top-full mt-1' : 'bottom-full mb-1',
                  // Anchor to the cell's near edge and grow inward so the tooltip
                  // never overflows (and gets clipped by) the card's rounded edge.
                  w >= GRID_WEEKS / 2 ? 'right-0' : 'left-0',
                )}
              >
                {label}
              </span>
            );

            const className = cn(
              'relative aspect-square w-full rounded-[3px]',
              future ? 'bg-transparent' : cellClass(count),
              isToday && !selected && 'ring-1 ring-primary/60',
              selected && 'ring-2 ring-primary',
              clickable && 'cursor-pointer',
            );

            const hoverHandlers = future
              ? undefined
              : {
                  onMouseEnter: () => setHovered(key),
                  onMouseLeave: () => setHovered((h) => (h === key ? null : h)),
                };

            if (clickable) {
              return (
                <button
                  key={date.getTime()}
                  type="button"
                  aria-label={`${label}. Filter the log to this day.`}
                  aria-pressed={selected}
                  onClick={() => onSelectDay(key)}
                  onFocus={() => setHovered(key)}
                  onBlur={() => setHovered((h) => (h === key ? null : h))}
                  {...hoverHandlers}
                  className={className}
                >
                  {tooltip}
                </button>
              );
            }

            return (
              <div
                key={date.getTime()}
                {...hoverHandlers}
                className={className}
              >
                {tooltip}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
