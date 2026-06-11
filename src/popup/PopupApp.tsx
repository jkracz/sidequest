import { useState } from 'react';
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
  if (sites.length === 0) return <span className="text-[12px] text-dim">no sites in list</span>;
  const shown = sites.slice(0, SITE_CHIP_LIMIT);
  const rest = sites.slice(SITE_CHIP_LIMIT);
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((site) => (
        <span key={site} className="chip px-2 py-px text-[12px]">
          {site}
        </span>
      ))}
      {rest.length > 0 && (
        <span className="chip px-2 py-px text-[12px] text-dim" title={rest.join(', ')}>
          +{rest.length} more
        </span>
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
    if (!selectedListId) return;
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
        <p className="text-dim">No blocks active. Roam freely.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {blocks.map((tb) => (
            <div key={tb.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <strong>{tb.label}</strong>
                <span className="text-dim">until {formatTime(tb.endTime)}</span>
              </div>
              <SiteChips sites={sitesForLists(state, tb.blockListIds)} />
            </div>
          ))}
          {sessions.map((s) => (
            <div key={s.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <strong>🔒 Ad hoc session</strong>
                <span className="text-dim">{minutesLeft(s.endsAt)} min left</span>
              </div>
              <SiteChips sites={sitesForLists(state, s.blockListIds)} />
            </div>
          ))}
        </div>
      )}

      {state.blockLists.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-edge pt-3">
          <h2 className="text-[13px] font-semibold tracking-wider text-dim uppercase">
            Start a block session
          </h2>
          <div className="flex flex-col gap-1">
            {state.blockLists.map((bl) => (
              <label
                key={bl.id}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-[10px] border px-2.5 py-1.5 ${
                  bl.id === selectedListId
                    ? 'border-gold bg-inset'
                    : 'border-edge hover:border-dim'
                }`}
                title={bl.sites.join(', ') || 'no sites in this list'}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="session-list"
                    className="accent-gold"
                    checked={bl.id === selectedListId}
                    onChange={() => setListId(bl.id)}
                  />
                  {bl.name}
                </span>
                <span className="text-[12px] text-dim">
                  {bl.sites.length} site{bl.sites.length === 1 ? '' : 's'}
                </span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[13px] text-dim">
              for
              <input
                type="number"
                className="input w-[64px] px-1.5 py-1"
                min={1}
                max={480}
                value={duration}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v >= 1) setDuration(v);
                }}
              />
              min
            </label>
            <button
              className="btn btn-primary flex-1"
              disabled={!selectedListId}
              onClick={() => void startSession()}
            >
              Block now
            </button>
          </div>
          <p className="text-[12px] text-dim">
            No ending it early — the only way through is a side quest.
          </p>
        </div>
      )}

      {livePasses.length > 0 && (
        <div className="border-t border-edge pt-3">
          <h2 className="mb-1.5 text-[13px] font-semibold tracking-wider text-dim uppercase">
            Active passes
          </h2>
          {livePasses.map((p) => (
            <div
              key={p.hostname + p.earnedAt}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span>{p.hostname}</span>
              <span className="text-dim">{minutesLeft(p.expiresAt)} min left</span>
            </div>
          ))}
        </div>
      )}

      <button className="btn" onClick={() => void chrome.runtime.openOptionsPage()}>
        Settings
      </button>
    </div>
  );
}
