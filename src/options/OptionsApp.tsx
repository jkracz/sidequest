import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppState } from '../shared/useAppState';
import { BlockListsSection } from './sections/BlockListsSection';
import { QuestLogSection } from './sections/QuestLogSection';
import { QuestsSection } from './sections/QuestsSection';
import { ScheduleSection } from './sections/ScheduleSection';
import { SettingsSection } from './sections/SettingsSection';

const TABS = ['Block Lists', 'Schedule', 'Quests', 'Quest Log', 'Settings'] as const;
type OptionsTab = (typeof TABS)[number];

const TAB_SLUGS: Record<OptionsTab, string> = {
  'Block Lists': 'block-lists',
  Schedule: 'schedule',
  Quests: 'quests',
  'Quest Log': 'quest-log',
  Settings: 'settings',
};

function tabFromUrl(): OptionsTab {
  const slug = new URLSearchParams(window.location.search).get('tab');
  return TABS.find((tab) => TAB_SLUGS[tab] === slug) ?? TABS[0];
}

function setTabInUrl(tab: OptionsTab): void {
  const url = new URL(window.location.href);
  if (tab === TABS[0]) {
    url.searchParams.delete('tab');
  } else {
    url.searchParams.set('tab', TAB_SLUGS[tab]);
  }
  window.history.replaceState(null, '', `${url.pathname}${url.search}`);
}

export function OptionsApp() {
  const state = useAppState();
  const [tab, setTab] = useState<OptionsTab>(tabFromUrl);

  if (!state) return null;

  function changeTab(nextTab: string) {
    const validTab = TABS.find((candidate) => candidate === nextTab);
    if (!validTab) return;
    setTab(validTab);
    setTabInUrl(validTab);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 pt-10 pb-20">
      <header>
        <h1 className="flex items-center gap-3 text-[28px] font-bold">
          <img src="/sidequestLogo48.png" alt="" className="size-9" />
          SideQuest
        </h1>
        <p className="mt-1 font-serif text-[15px] text-muted-foreground italic">
          Earn your distractions.
        </p>
      </header>
      <Tabs value={tab} onValueChange={changeTab} className="mt-7 gap-6">
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="Block Lists">
          <BlockListsSection state={state} />
        </TabsContent>
        <TabsContent value="Schedule">
          <ScheduleSection state={state} />
        </TabsContent>
        <TabsContent value="Quests">
          <QuestsSection state={state} />
        </TabsContent>
        <TabsContent value="Quest Log">
          <QuestLogSection state={state} />
        </TabsContent>
        <TabsContent value="Settings">
          <SettingsSection state={state} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
