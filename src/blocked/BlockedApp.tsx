import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dices } from 'lucide-react';
import { QuestTypeIcon } from '../components/QuestTypeIcon';
import { decideBlock, eligibleQuests } from '../shared/blocking';
import { hostnameOf } from '../shared/match';
import { getState, setState } from '../shared/storage';
import type { AppState, QuestResult, ReflectionSideQuest, SideQuest } from '../shared/types';
import { PushupQuest } from './quests/PushupQuest';
import { ReflectionQuest } from './quests/ReflectionQuest';
import { TimerQuest } from './quests/TimerQuest';

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

function numberParam(name: string): number | undefined {
  const raw = stringParam(name);
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function updateUrlParams(updates: Record<string, string | number | null>): void {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, String(value));
    }
  }
  window.history.replaceState(null, '', `${url.pathname}${url.search}`);
}

function draftKey(target: string, questId: string, prompt: string): string {
  return `sidequest:reflection-draft:${questId}:${target}:${prompt}`;
}

function getDraft(key: string): string {
  try {
    return window.sessionStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function setDraft(key: string, text: string): void {
  try {
    if (text) {
      window.sessionStorage.setItem(key, text);
    } else {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Draft persistence is best-effort; the quest should still work without it.
  }
}

/** Each completion of this quest advances the rotation to the next prompt. */
function promptFor(quest: ReflectionSideQuest, state: AppState): string {
  const prompts = quest.config.prompts;
  if (prompts.length === 0) return 'What are you avoiding by going to this page?';
  const completed = state.history.filter((h) => h.questId === quest.id).length;
  return prompts[completed % prompts.length];
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
    (r) => r.hostname === hostname && now - r.at < RESIST_DEDUPE_MS
  );
  if (!recent) {
    await setState({ resists: [...current.resists, { hostname, at: now }] });
  }
}

export function BlockedApp() {
  const [state, setAppState] = useState<AppState | null>(null);
  const [chosenQuestId, setChosenQuestId] = useState<string | null>(() => stringParam('quest'));
  const target = targetFromUrl();
  const hostname = target ? hostnameOf(target) : null;
  const decision = state && target ? decideBlock(state, target, new Date()) : null;

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
  const hasQuestBypass = quests.length > 0;
  const quest =
    quests.length === 1 ? quests[0] : (quests.find((q) => q.id === chosenQuestId) ?? null);

  function chooseQuest(id: string) {
    setChosenQuestId(id);
    updateUrlParams({ quest: id, startedAt: null, count: null });
  }

  function clearQuest() {
    setChosenQuestId(null);
    updateUrlParams({ quest: null, startedAt: null, count: null });
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
        (r) => !(r.hostname === hostname && now - r.at < RESIST_WITHDRAW_MS)
      ),
    });
    window.location.href = target!;
  }

  return (
    <main className="mx-auto max-w-2xl px-6 pt-[14vh] pb-12 text-center">
      <p className="flex items-center justify-center gap-2 text-[17px] text-muted-foreground">
        <img src="/sidequestLogo32.png" alt="" className="size-5" />
        {hasQuestBypass ? 'A side quest stands between you and' : 'SideQuest blocked'}
      </p>
      <h1 className="mt-1 mb-8 text-4xl font-bold text-primary">{hostname}</h1>

      {quests.length === 0 && (
        <BlockedOutright hasConfiguredQuests={state.quests.length > 0} />
      )}

      {quests.length > 0 && !quest && (
        <QuestPicker quests={quests} onChoose={chooseQuest} />
      )}

      {quest && (
        <>
          {quest.type === 'reflection' &&
            (() => {
              const prompt = promptFor(quest, state);
              const key = draftKey(target, quest.id, prompt);
              return (
                <ReflectionQuest
                  key={key}
                  quest={quest}
                  prompt={prompt}
                  initialText={getDraft(key)}
                  onTextChange={(text) => setDraft(key, text)}
                  onComplete={(result) => {
                    setDraft(key, '');
                    void completeQuest(quest, result);
                  }}
                />
              );
            })()}
          {quest.type === 'timer' && (
            <TimerQuest
              key={quest.id}
              quest={quest}
              startedAt={numberParam('startedAt')}
              onStartedAtChange={(startedAt) => updateUrlParams({ startedAt })}
              onComplete={(result) => void completeQuest(quest, result)}
            />
          )}
          {quest.type === 'pushups' && (
            <PushupQuest
              key={quest.id}
              quest={quest}
              initialCount={numberParam('count')}
              onCountChange={(count) => updateUrlParams({ count })}
              onComplete={(result) => void completeQuest(quest, result)}
            />
          )}
          {quests.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-muted-foreground hover:text-foreground"
              onClick={clearQuest}
            >
              ← choose a different quest
            </Button>
          )}
        </>
      )}
    </main>
  );
}

function openOptionsPage(): void {
  window.location.href = chrome.runtime.getURL('src/options/index.html?tab=schedule');
}

function BlockedOutright({ hasConfiguredQuests }: { hasConfiguredQuests: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[19px] font-semibold">Blocked outright</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <p className="text-muted-foreground">
          {hasConfiguredQuests
            ? 'This schedule has no quests selected, so there is no bypass for this page.'
            : 'No quests are configured, so there is no bypass for this page.'}
        </p>
        <Button onClick={openOptionsPage}>Configure quests for blocks</Button>
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle className="text-[19px] font-semibold">Choose your quest</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {quests.map((q) => (
          <Button
            key={q.id}
            variant="outline"
            className="h-auto justify-between gap-3 px-4 py-3"
            onClick={() => onChoose(q.id)}
          >
            <span className="flex items-center gap-2">
              <QuestTypeIcon type={q.type} className="text-muted-foreground" />
              <strong>{q.name}</strong>
            </span>
            <span className="text-[13px] font-normal text-muted-foreground">
              earns {q.passDurationMinutes} min
            </span>
          </Button>
        ))}
        <Button onClick={() => onChoose(quests[Math.floor(Math.random() * quests.length)].id)}>
          <Dices aria-hidden="true" />
          Surprise me
        </Button>
      </CardContent>
    </Card>
  );
}
