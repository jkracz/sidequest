import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Dices, Settings2, X } from 'lucide-react';
import { QuestTypeIcon } from '../components/QuestTypeIcon';
import {
  QuestRunner,
  resetQuestProgress,
  updateUrlParams,
} from '../quests/runtime';
import { decideBlock, eligibleQuests } from '../shared/blocking';
import { hostnameOf } from '../shared/match';
import { siteResistStats, type SiteResistStats } from '../shared/metrics';
import { getState, setState } from '../shared/storage';
import type { AppState, QuestResult, SideQuest } from '../shared/types';

/** Reloading the block page while dithering shouldn't stack up resists. */
const RESIST_DEDUPE_MS = 60_000;

/** Completing a quest withdraws resists registered this recently. */
const RESIST_WITHDRAW_MS = 10 * 60_000;

function targetFromUrl(): string | null {
  const target = new URLSearchParams(window.location.search).get('target');
  if (!target) return null;
  return hostnameOf(target) ? target : null;
}

function stringParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * Walking away counts as resisting, so the visit is recorded as resisted the
 * moment a quest is offered; completing a quest withdraws it. No write is
 * needed at page-leave time, which is when writes are least reliable.
 */
async function registerResist(hostname: string): Promise<void> {
  const current = await getState();
  const now = Date.now();
  const recent = current.resists.some(
    (r) => r.hostname === hostname && now - r.at < RESIST_DEDUPE_MS,
  );
  if (!recent) {
    await setState({ resists: [...current.resists, { hostname, at: now }] });
  }
}

/** Close the tab the block page took over. Best-effort: window.close() as fallback. */
async function closeTab(): Promise<void> {
  try {
    const tab = await chrome.tabs.getCurrent();
    if (tab?.id != null) {
      await chrome.tabs.remove(tab.id);
      return;
    }
  } catch {
    // fall through
  }
  window.close();
}

export function BlockedApp() {
  const [state, setAppState] = useState<AppState | null>(null);
  const [chosenQuestId, setChosenQuestId] = useState<string | null>(() =>
    stringParam('quest'),
  );
  const target = targetFromUrl();
  const hostname = target ? hostnameOf(target) : null;
  const decision =
    state && target ? decideBlock(state, target, new Date()) : null;

  useEffect(() => {
    void getState().then(setAppState);
  }, []);

  useEffect(() => {
    if (hostname && decision?.blocked) void registerResist(hostname);
    // Deliberately keyed to blocked-ness, not state: one registration per page load.
  }, [hostname, decision?.blocked]);

  if (!state) return null;

  if (!target || !hostname) {
    return (
      <main className="mx-auto max-w-2xl px-6 pt-[14vh] pb-12 text-center">
        <h1 className="text-3xl font-bold">SideQuest</h1>
        <p className="mt-2 text-muted-foreground">
          Nothing is being blocked right now. Close this tab and carry on.
        </p>
      </main>
    );
  }

  // The block may have lapsed (time block ended, pass still valid) since the
  // redirect happened — don't make the user do a quest for nothing.
  if (!decision!.blocked) {
    window.location.replace(target);
    return null;
  }

  const quests = eligibleQuests(state, decision!);
  const stats = siteResistStats(state, hostname);
  const quest =
    quests.length === 1
      ? quests[0]
      : (quests.find((q) => q.id === chosenQuestId) ?? null);

  function chooseQuest(id: string) {
    setChosenQuestId(id);
    updateUrlParams({ quest: id });
    resetQuestProgress();
  }

  function clearQuest() {
    setChosenQuestId(null);
    updateUrlParams({ quest: null });
    resetQuestProgress();
  }

  async function completeQuest(quest: SideQuest, result: QuestResult) {
    const now = Date.now();
    const current = await getState();
    await setState({
      history: [
        ...current.history,
        {
          id: crypto.randomUUID(),
          questId: quest.id,
          questName: quest.name,
          hostname: hostname!,
          targetUrl: target!,
          createdAt: now,
          minutesEarned: quest.passDurationMinutes,
          ...result,
        },
      ],
      passes: [
        ...current.passes.filter((p) => p.expiresAt > now),
        {
          hostname: hostname!,
          earnedAt: now,
          expiresAt: now + quest.passDurationMinutes * 60_000,
          questId: quest.id,
        },
      ],
      resists: current.resists.filter(
        (r) => !(r.hostname === hostname && now - r.at < RESIST_WITHDRAW_MS),
      ),
    });
    window.location.href = target!;
  }

  // Once a quest is underway, strip the page down so nothing competes with it.
  if (quest) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col px-6 pt-[10vh] pb-12">
        <SiteBadge hostname={hostname} />
        <div className="mt-8 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
          <QuestRunner
            quest={quest}
            state={state}
            target={target}
            onComplete={(result) => void completeQuest(quest, result)}
          />
        </div>
        {quests.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-5 self-center text-muted-foreground hover:text-foreground"
            onClick={clearQuest}
          >
            ← choose a different quest
          </Button>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center px-6 pt-[9vh] pb-16 text-center">
      <SiteBadge hostname={hostname} />

      <StreakHero stats={stats} />

      <Button
        size="lg"
        className="mt-9 h-12 w-full max-w-xs gap-2 rounded-2xl text-[15px] font-semibold shadow-sm animate-in fade-in-50 slide-in-from-bottom-2 duration-700"
        onClick={() => void closeTab()}
      >
        <X aria-hidden="true" className="size-4" />
        Close this tab
      </Button>

      {quests.length === 0 ? (
        <NoBypassNote hasConfiguredQuests={state.quests.length > 0} />
      ) : (
        <section className="mt-12 w-full animate-in fade-in-50 slide-in-from-bottom-2 duration-700">
          <Rule />
          <p className="mx-auto max-w-sm text-[15px] leading-relaxed text-muted-foreground">
            Otherwise, a side quest stands between you and{' '}
            <span className="font-semibold text-foreground">{hostname}</span>.
          </p>
          <QuestPicker quests={quests} onChoose={chooseQuest} />
        </section>
      )}
    </main>
  );
}

function SiteBadge({ hostname }: { hostname: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground animate-in fade-in duration-500">
      <img src="/sidequestLogo32.png" alt="" className="size-4 opacity-80" />
      <span>{hostname}</span>
    </div>
  );
}

function StreakHero({ stats }: { stats: SiteResistStats }) {
  const { last30Days, allTime } = stats;
  // mint = earned: the panel only lights up once there are walk-aways to celebrate.
  const earned = last30Days > 0;
  return (
    <section className="mt-8 flex flex-col items-center animate-in fade-in-50 slide-in-from-bottom-3 duration-700">
      <div
        className={cn(
          'flex min-w-[15rem] flex-col items-center rounded-[2.25rem] px-12 py-9 ring-1',
          earned ? 'bg-mint-deep ring-mint/20' : 'bg-card ring-foreground/10',
        )}
      >
        <span
          className={cn(
            'text-[5.5rem] leading-none font-bold tracking-tighter tabular-nums',
            earned ? 'text-mint' : 'text-foreground',
          )}
        >
          {last30Days}
        </span>
        <p className="mt-2 text-[15px] text-foreground/70">
          time{last30Days === 1 ? '' : 's'} you walked away in the last 30 days
        </p>
      </div>
      {allTime > 0 && (
        <p className="mt-3.5 text-[13px] text-muted-foreground tabular-nums">
          {allTime} all-time
        </p>
      )}
    </section>
  );
}

function Rule() {
  return <div className="mx-auto mb-5 h-px w-14 bg-border" />;
}

function openOptionsPage(): void {
  window.location.href = chrome.runtime.getURL(
    'src/options/index.html?tab=schedule',
  );
}

function NoBypassNote({
  hasConfiguredQuests,
}: {
  hasConfiguredQuests: boolean;
}) {
  return (
    <div className="mt-12 flex w-full max-w-sm flex-col items-center gap-5 animate-in fade-in-50 duration-700">
      <Rule />
      <p className="font-serif text-[15px] leading-relaxed text-muted-foreground italic">
        {hasConfiguredQuests
          ? 'This schedule has no quests selected, so there is no bypass for this page.'
          : 'No quests are configured, so there is no bypass for this page.'}
      </p>
      <Button variant="outline" onClick={openOptionsPage}>
        <Settings2 aria-hidden="true" />
        Configure quests for blocks
      </Button>
    </div>
  );
}

function QuestPicker({
  quests,
  onChoose,
}: {
  quests: SideQuest[];
  onChoose: (id: string) => void;
}) {
  return (
    <div className="mt-5 flex flex-col gap-2.5 text-left">
      {quests.map((q) => (
        <button
          key={q.id}
          type="button"
          onClick={() => onChoose(q.id)}
          className="group flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3.5 ring-1 ring-foreground/10 transition-all hover:-translate-y-px hover:ring-foreground/20 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <QuestTypeIcon type={q.type} />
            </span>
            <span className="font-semibold">{q.name}</span>
          </span>
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[12px] font-medium text-muted-foreground">
            +{q.passDurationMinutes} min
          </span>
        </button>
      ))}
      <Button
        variant="ghost"
        className="mt-1 self-center text-muted-foreground hover:text-foreground"
        onClick={() =>
          onChoose(quests[Math.floor(Math.random() * quests.length)].id)
        }
      >
        <Dices aria-hidden="true" />
        Surprise me
      </Button>
    </div>
  );
}
