import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { decideBlock, eligibleQuests } from '../shared/blocking';
import { hostnameOf } from '../shared/match';
import { QUEST_ICONS } from '../shared/quests';
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
  const [chosenQuestId, setChosenQuestId] = useState<string | null>(null);
  const target = targetFromUrl();
  const hostname = target ? hostnameOf(target) : null;
  const decision = state && target ? decideBlock(state, target, new Date()) : null;

  useEffect(() => {
    void getState().then(setAppState);
  }, []);

  useEffect(() => {
    if (hostname && decision?.blocked) void registerResist(hostname);
    // Deliberately keyed to blocked-ness, not state: one registration per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const quests = eligibleQuests(state, decision!.questIds);
  const quest =
    quests.length === 1 ? quests[0] : (quests.find((q) => q.id === chosenQuestId) ?? null);

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
      <p className="text-[17px] text-muted-foreground">⚔️ A side quest stands between you and</p>
      <h1 className="mt-1 mb-8 text-4xl font-bold text-primary">{hostname}</h1>

      {quests.length === 0 && (
        <p className="text-muted-foreground">
          No quests are configured, so this site stays blocked. Add one on the options page.
        </p>
      )}

      {quests.length > 0 && !quest && (
        <QuestPicker quests={quests} onChoose={(id) => setChosenQuestId(id)} />
      )}

      {quest && (
        <>
          {quest.type === 'reflection' && (
            <ReflectionQuest
              quest={quest}
              prompt={promptFor(quest, state)}
              onComplete={(result) => void completeQuest(quest, result)}
            />
          )}
          {quest.type === 'timer' && (
            <TimerQuest quest={quest} onComplete={(result) => void completeQuest(quest, result)} />
          )}
          {quest.type === 'pushups' && (
            <PushupQuest quest={quest} onComplete={(result) => void completeQuest(quest, result)} />
          )}
          {quests.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-muted-foreground hover:text-foreground"
              onClick={() => setChosenQuestId(null)}
            >
              ← choose a different quest
            </Button>
          )}
        </>
      )}
    </main>
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
            <span>
              {QUEST_ICONS[q.type]} <strong>{q.name}</strong>
            </span>
            <span className="text-[13px] font-normal text-muted-foreground">
              earns {q.passDurationMinutes} min
            </span>
          </Button>
        ))}
        <Button onClick={() => onChoose(quests[Math.floor(Math.random() * quests.length)].id)}>
          🎲 Surprise me
        </Button>
      </CardContent>
    </Card>
  );
}
