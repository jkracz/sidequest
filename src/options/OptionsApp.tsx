import { useState } from 'react';
import { useAppState } from '../shared/useAppState';
import { BlockListsSection } from './sections/BlockListsSection';
import { QuestLogSection } from './sections/QuestLogSection';
import { QuestsSection } from './sections/QuestsSection';
import { ScheduleSection } from './sections/ScheduleSection';

const TABS = ['Block Lists', 'Schedule', 'Quests', 'Quest Log'] as const;
type Tab = (typeof TABS)[number];

export function OptionsApp() {
  const state = useAppState();
  const [tab, setTab] = useState<Tab>('Block Lists');

  if (!state) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 pt-10 pb-20">
      <header>
        <h1 className="text-[28px] font-bold">⚔️ SideQuest</h1>
        <p className="mt-1 text-dim">Earn your distractions.</p>
      </header>
      <nav className="mt-7 mb-6 flex gap-2 border-b border-edge pb-3">
        {TABS.map((t) => (
          <button
            key={t}
            className={`cursor-pointer rounded-[10px] px-3 py-1.5 ${
              t === tab ? 'bg-surface font-semibold text-ink' : 'text-dim hover:text-ink'
            }`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>
      <main>
        {tab === 'Block Lists' && <BlockListsSection state={state} />}
        {tab === 'Schedule' && <ScheduleSection state={state} />}
        {tab === 'Quests' && <QuestsSection state={state} />}
        {tab === 'Quest Log' && <QuestLogSection state={state} />}
      </main>
    </div>
  );
}
