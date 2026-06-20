import { Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QuestTypeIcon } from '../../components/QuestTypeIcon';
import { NumberInput } from '../../quests/fields';
import { ALL_KINDS, kindOf } from '../../quests/registry';
import { newQuest } from '../../quests/kinds';
import { setState } from '../../shared/storage';
import type { AppState, QuestType, SideQuest } from '../../shared/types';

export function QuestsSection({ state }: { state: AppState }) {
  async function updateQuest(updated: SideQuest) {
    await setState({ quests: state.quests.map((q) => (q.id === updated.id ? updated : q)) });
  }

  async function addQuest(type: QuestType) {
    await setState({ quests: [...state.quests, newQuest(type)] });
  }

  async function duplicateQuest(quest: SideQuest) {
    const copy: SideQuest = {
      ...quest,
      id: crypto.randomUUID(),
      name: `${quest.name} copy`,
      config: structuredClone(quest.config),
    } as SideQuest;
    await setState({ quests: [...state.quests, copy] });
  }

  async function deleteQuest(quest: SideQuest) {
    if (
      !window.confirm(
        `Delete "${quest.name}"? Any schedule using it will lose this quest as a bypass.`
      )
    ) {
      return;
    }
    await setState({
      quests: state.quests.filter((q) => q.id !== quest.id),
      // Drop the quest from every schedule so no block references a ghost.
      timeBlocks: state.timeBlocks.map((tb) => ({
        ...tb,
        questIds: tb.questIds.filter((id) => id !== quest.id),
      })),
    });
  }

  return (
    <section className="flex flex-col items-start gap-4">
      {state.quests.map((quest) => {
        const { Editor } = kindOf(quest);
        return (
          <Card key={quest.id} className="w-full">
            <CardHeader className="flex flex-row items-center gap-2">
              <QuestTypeIcon type={quest.type} className="text-muted-foreground" />
              <Input
                className="h-9 flex-1 font-medium"
                value={quest.name}
                aria-label="Quest name"
                onChange={(e) => void updateQuest({ ...quest, name: e.target.value })}
              />
              <Button
                variant="ghost"
                size="icon"
                title="Duplicate quest"
                aria-label="Duplicate quest"
                onClick={() => void duplicateQuest(quest)}
              >
                <Copy />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                title="Delete quest"
                aria-label="Delete quest"
                disabled={state.quests.length === 1}
                onClick={() => void deleteQuest(quest)}
              >
                <Trash2 />
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-3.5">
              <Editor quest={quest} onChange={(q) => void updateQuest(q)} />
              <Label className="font-normal">
                Completing it earns
                <NumberInput
                  value={quest.passDurationMinutes}
                  max={120}
                  onChange={(v) => void updateQuest({ ...quest, passDurationMinutes: v })}
                />
                minutes on the blocked site
              </Label>
            </CardContent>
          </Card>
        );
      })}

      <Card className="w-full border-dashed">
        <CardContent className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-muted-foreground">Add a quest</span>
          {ALL_KINDS.map((kind) => (
            <Button
              key={kind.type}
              variant="outline"
              size="sm"
              onClick={() => void addQuest(kind.type)}
            >
              <QuestTypeIcon type={kind.type} className="text-muted-foreground" />
              {kind.label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
