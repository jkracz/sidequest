import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { activeAdHocSessions } from '../shared/blocking';
import { activeTimeBlocks, formatTime } from '../shared/schedule';
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

function minutesLeft(until: number): number {
  return Math.max(1, Math.ceil((until - Date.now()) / 60_000));
}

export function PopupApp() {
  const state = useAppState();
  const [listId, setListId] = useState<string | null>(null);
  const [duration, setDuration] = useState(30);
  if (!state) return null;

  const now = new Date();
  const blocks = activeTimeBlocks(state.timeBlocks, now);
  const sessions = activeAdHocSessions(state, now);
  const livePasses = state.passes.filter((p) => p.expiresAt > Date.now());
  const selectedListId = listId ?? state.blockLists[0]?.id ?? null;

  async function startSession() {
    if (!selectedListId || sessions.length > 0) return;
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
      <h1 className="text-lg font-bold">⚔️ SideQuest</h1>

      {blocks.length === 0 && sessions.length === 0 ? (
        <p className="text-muted-foreground">No blocks active. Roam freely.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {blocks.map((tb) => (
            <div key={tb.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <strong>{tb.label}</strong>
                <span className="text-muted-foreground">until {formatTime(tb.endTime)}</span>
              </div>
              <SiteChips sites={sitesForLists(state, tb.blockListIds)} />
            </div>
          ))}
          {sessions.map((s) => (
            <div key={s.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <strong>🔒 Ad hoc session</strong>
                <span className="text-muted-foreground">{minutesLeft(s.endsAt)} min left</span>
              </div>
              <SiteChips sites={sitesForLists(state, s.blockListIds)} />
            </div>
          ))}
        </div>
      )}

      {state.blockLists.length > 0 && sessions.length > 0 && (
        <>
          <Separator />
          <p className="text-xs text-muted-foreground">
            A session is already running. See it through — then you can start another.
          </p>
        </>
      )}

      {state.blockLists.length > 0 && sessions.length === 0 && (
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
          <div>
            <h2 className="mb-1.5 text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">
              Active passes
            </h2>
            {livePasses.map((p) => (
              <div
                key={p.hostname + p.earnedAt}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span>{p.hostname}</span>
                <span className="text-muted-foreground">{minutesLeft(p.expiresAt)} min left</span>
              </div>
            ))}
          </div>
        </>
      )}

      <Button variant="outline" onClick={() => void chrome.runtime.openOptionsPage()}>
        Open
      </Button>
    </div>
  );
}
