import { useEffect, useState } from 'react';
import { Lock, Settings, Ticket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { activeAdHocSessions } from '../shared/blocking';
import { activeTimeBlockEndsAt, activeTimeBlocks } from '../shared/schedule';
import { setState } from '../shared/storage';
import { useAppState } from '../shared/useAppState';
import type { AppState } from '../shared/types';

const SITE_CHIP_LIMIT = 6;

function sitesForLists(state: AppState, blockListIds: string[]): string[] {
  return [
    ...new Set(
      blockListIds.flatMap((id) => state.blockLists.find((bl) => bl.id === id)?.sites ?? [])
    ),
  ];
}

function SiteChips({ sites }: { sites: string[] }) {
  if (sites.length === 0)
    return <span className="text-xs text-muted-foreground">no sites in list</span>;
  const shown = sites.slice(0, SITE_CHIP_LIMIT);
  const rest = sites.slice(SITE_CHIP_LIMIT);
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((site) => (
        <Badge key={site} variant="secondary">
          {site}
        </Badge>
      ))}
      {rest.length > 0 && (
        <Badge variant="secondary" className="text-muted-foreground" title={rest.join(', ')}>
          +{rest.length} more
        </Badge>
      )}
    </div>
  );
}

function formatCountdown(until: number, now: number): string {
  const total = Math.max(0, Math.ceil((until - now) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function formatClockTime(at: number): string {
  const d = new Date(at);
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h < 12 ? 'am' : 'pm';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}${suffix}` : `${hour12}:${String(m).padStart(2, '0')}${suffix}`;
}

function CountdownTimer({
  until,
  now,
  variant = 'default',
}: {
  until: number;
  now: number;
  variant?: 'default' | 'pass';
}) {
  const tooltip = `until ${formatClockTime(until)}`;

  return (
    <span
      className={`group inline-flex h-6 w-[6.75rem] shrink-0 items-center justify-center rounded-md px-2 text-xs leading-none ${
        variant === 'pass'
          ? 'bg-mint font-medium text-mint-deep'
          : 'bg-secondary text-muted-foreground'
      }`}
      tabIndex={0}
      aria-label={`${formatCountdown(until, now)} left, ${tooltip}`}
    >
      <span className="font-mono tabular-nums group-hover:hidden group-focus-visible:hidden">
        {formatCountdown(until, now)} left
      </span>
      <span className="hidden whitespace-nowrap group-hover:inline group-focus-visible:inline">
        {tooltip}
      </span>
    </span>
  );
}

// Re-render every second so live countdowns tick down while the popup is open.
// Only runs the interval while `enabled`, so an idle popup does no per-second work.
function useNow(enabled: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const tick = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(tick);
  }, [enabled, intervalMs]);
  return now;
}

export function PopupApp() {
  const state = useAppState();
  const [listId, setListId] = useState<string | null>(null);
  const [duration, setDuration] = useState(30);
  // Tick only while something is actually counting down.
  const currentMs = Date.now();
  const hasCountdown =
    !!state &&
    (activeTimeBlocks(state.timeBlocks, new Date(currentMs)).length > 0 ||
      state.adHocSessions.some((s) => s.endsAt > currentMs) ||
      state.passes.some((p) => p.expiresAt > currentMs));
  const nowMs = useNow(hasCountdown);
  if (!state) return null;

  const now = new Date(nowMs);
  const blocks = activeTimeBlocks(state.timeBlocks, now);
  const blockEndsAt = new Map(
    blocks.map((tb) => [tb.id, activeTimeBlockEndsAt(tb, now) ?? nowMs])
  );
  const sessions = activeAdHocSessions(state, now);
  const livePasses = state.passes.filter((p) => p.expiresAt > nowMs);
  const selectedListId = listId ?? state.blockLists[0]?.id ?? null;
  const hasActiveBlock = blocks.length > 0 || sessions.length > 0;

  async function startSession() {
    if (!selectedListId || hasActiveBlock) return;
    const startedAt = Date.now();
    await setState({
      adHocSessions: [
        ...sessions,
        {
          id: crypto.randomUUID(),
          blockListIds: [selectedListId],
          startedAt,
          endsAt: startedAt + duration * 60_000,
        },
      ],
    });
  }

  return (
    <div className="flex w-[320px] flex-col gap-4 p-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <img src="/sidequestLogo32.png" alt="" className="size-6" />
          SideQuest
        </h1>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          title="Open SideQuest settings"
          aria-label="Open SideQuest settings"
          onClick={() => void chrome.runtime.openOptionsPage()}
        >
          <Settings />
        </Button>
      </header>

      {blocks.length === 0 && sessions.length === 0 ? (
        <p className="text-muted-foreground">No blocks active. Roam freely.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {blocks.map((tb) => (
            <div key={tb.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <strong>{tb.label}</strong>
                <CountdownTimer until={blockEndsAt.get(tb.id) ?? nowMs} now={nowMs} />
              </div>
              <SiteChips sites={sitesForLists(state, tb.blockListIds)} />
            </div>
          ))}
          {sessions.map((s) => (
            <div key={s.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <strong className="flex items-center gap-1.5">
                  <Lock aria-hidden="true" className="size-3.5 text-muted-foreground" />
                  Ad hoc session
                </strong>
                <CountdownTimer until={s.endsAt} now={nowMs} />
              </div>
              <SiteChips sites={sitesForLists(state, s.blockListIds)} />
            </div>
          ))}
        </div>
      )}

      {state.blockLists.length > 0 && !hasActiveBlock && (
        <>
          <Separator />
          <div className="flex flex-col gap-2">
            <h2 className="text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">
              Start a block session
            </h2>
            <RadioGroup
              className="gap-1"
              value={selectedListId ?? undefined}
              onValueChange={setListId}
            >
              {state.blockLists.map((bl) => (
                <Label
                  key={bl.id}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 font-normal ${
                    bl.id === selectedListId
                      ? 'border-primary bg-input/30'
                      : 'hover:border-muted-foreground'
                  }`}
                  title={bl.sites.join(', ') || 'no sites in this list'}
                >
                  <span className="flex items-center gap-2">
                    <RadioGroupItem value={bl.id} />
                    {bl.name}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {bl.sites.length} site{bl.sites.length === 1 ? '' : 's'}
                  </span>
                </Label>
              ))}
            </RadioGroup>
            <div className="flex items-center gap-2">
              <Label className="gap-1.5 text-[13px] font-normal text-muted-foreground">
                for
                <Input
                  type="number"
                  className="w-16"
                  min={1}
                  max={480}
                  value={duration}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v >= 1) setDuration(v);
                  }}
                />
                min
              </Label>
              <Button
                className="flex-1"
                disabled={!selectedListId}
                onClick={() => void startSession()}
              >
                Block now
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No ending it early — the only way through is a side quest.
            </p>
          </div>
        </>
      )}

      {livePasses.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">
              Earned passes
            </h2>
            {livePasses.map((p) => (
              <div
                key={p.hostname + p.earnedAt}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex items-center gap-1.5">
                  <Ticket aria-hidden="true" className="size-3.5 text-mint" />
                  {p.hostname}
                </span>
                <CountdownTimer variant="pass" until={p.expiresAt} now={nowMs} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
