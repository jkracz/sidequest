import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppState } from '../shared/useAppState';
import { BlockListsSection } from './sections/BlockListsSection';
import { QuestLogSection } from './sections/QuestLogSection';
import { QuestsSection } from './sections/QuestsSection';
import { ScheduleSection } from './sections/ScheduleSection';
import { SettingsSection } from './sections/SettingsSection';

const TABS = ['Block Lists', 'Schedule', 'Quests', 'Quest Log', 'Settings'] as const;

export function OptionsApp() {
  const state = useAppState();

  if (!state) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 pt-10 pb-20">
      <header>
        <h1 className="flex items-center gap-3 text-[28px] font-bold">
          <img src="/sidequestLogo48.png" alt="" className="size-9" />
          SideQuest
        </h1>
        <p className="mt-1 text-muted-foreground">Earn your distractions.</p>
      </header>
      <Tabs defaultValue={TABS[0]} className="mt-7 gap-6">
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
