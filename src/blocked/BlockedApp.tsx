import { useEffect, useState } from 'react';
import { decideBlock, pickQuest } from '../shared/blocking';
import { hostnameOf } from '../shared/match';
import { getState, setState } from '../shared/storage';
import type { AppState, QuestResult, SideQuest } from '../shared/types';
import { PushupQuest } from './quests/PushupQuest';
import { ReflectionQuest } from './quests/ReflectionQuest';
import { TimerQuest } from './quests/TimerQuest';
import type { ReflectionSideQuest } from '../shared/types';

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

export function BlockedApp() {
  const [state, setAppState] = useState<AppState | null>(null);
  const target = targetFromUrl();

  useEffect(() => {
    void getState().then(setAppState);
  }, []);

  if (!state) return null;

  if (!target) {
    return (
      <main className="mx-auto max-w-2xl px-6 pt-[14vh] pb-12 text-center">
        <h1 className="text-3xl font-bold">SideQuest</h1>
        <p className="mt-2 text-dim">Nothing is being blocked right now. Close this tab and carry on.</p>
      </main>
    );
  }

  const hostname = hostnameOf(target)!;
  const decision = decideBlock(state, target, new Date());

  // The block may have lapsed (time block ended, pass still valid) since the
  // redirect happened — don't make the user do a quest for nothing.
  if (!decision.blocked) {
    window.location.replace(target);
    return null;
  }

  const quest = pickQuest(state, decision.questIds);

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
          hostname,
          targetUrl: target!,
          createdAt: now,
          minutesEarned: quest.passDurationMinutes,
          ...result,
        },
      ],
      passes: [
        ...current.passes.filter((p) => p.expiresAt > now),
        {
          hostname,
          earnedAt: now,
          expiresAt: now + quest.passDurationMinutes * 60_000,
          questId: quest.id,
        },
      ],
    });
    window.location.href = target!;
  }

  return (
    <main className="mx-auto max-w-2xl px-6 pt-[14vh] pb-12 text-center">
      <p className="text-[17px] text-dim">⚔️ A side quest stands between you and</p>
      <h1 className="mt-1 mb-8 text-4xl font-bold text-gold">{hostname}</h1>
      {!quest && (
        <p className="text-dim">
          No quests are configured, so this site stays blocked. Add one on the options page.
        </p>
      )}
      {quest?.type === 'reflection' && (
        <ReflectionQuest
          quest={quest}
          prompt={promptFor(quest, state)}
          onComplete={(result) => void completeQuest(quest, result)}
        />
      )}
      {quest?.type === 'timer' && (
        <TimerQuest quest={quest} onComplete={(result) => void completeQuest(quest, result)} />
      )}
      {quest?.type === 'pushups' && (
        <PushupQuest quest={quest} onComplete={(result) => void completeQuest(quest, result)} />
      )}
    </main>
  );
}
