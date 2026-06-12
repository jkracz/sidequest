import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { QuestTypeIcon } from '../../components/QuestTypeIcon';
import { setState } from '../../shared/storage';
import type {
  AppState,
  PushupSideQuest,
  ReflectionSideQuest,
  SideQuest,
  TimerSideQuest,
} from '../../shared/types';

export function QuestsSection({ state }: { state: AppState }) {
  async function updateQuest(updated: SideQuest) {
    await setState({ quests: state.quests.map((q) => (q.id === updated.id ? updated : q)) });
  }

  return (
    <section className="flex flex-col items-start gap-4">
      {state.quests.map((quest) => (
        <Card key={quest.id} className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QuestTypeIcon type={quest.type} className="text-muted-foreground" />
              {quest.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3.5">
            {quest.type === 'reflection' && (
              <ReflectionQuestFields quest={quest} onChange={updateQuest} />
            )}
            {quest.type === 'timer' && <TimerQuestFields quest={quest} onChange={updateQuest} />}
            {quest.type === 'pushups' && (
              <PushupQuestFields quest={quest} onChange={updateQuest} />
            )}
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
      ))}
    </section>
  );
}

function ReflectionQuestFields({
  quest,
  onChange,
}: {
  quest: ReflectionSideQuest;
  onChange: (quest: SideQuest) => Promise<void>;
}) {
  const { prompts } = quest.config;

  function setPrompts(next: string[]) {
    void onChange({ ...quest, config: { ...quest.config, prompts: next } });
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span>
          Prompts{' '}
          <span className="text-[13px] text-muted-foreground">
            (served in rotation, one per visit)
          </span>
        </span>
        {prompts.map((prompt, i) => (
          <div key={i} className="flex items-start gap-2">
            <Textarea
              rows={1}
              className="min-h-8 flex-1 resize-y"
              value={prompt}
              onChange={(e) => setPrompts(prompts.map((p, j) => (j === i ? e.target.value : p)))}
            />
            <Button
              variant="destructive"
              size="icon"
              title={prompts.length === 1 ? 'Keep at least one prompt' : 'Remove prompt'}
              disabled={prompts.length === 1}
              onClick={() => setPrompts(prompts.filter((_, j) => j !== i))}
            >
              ✕
            </Button>
          </div>
        ))}
        <Button variant="outline" className="self-start" onClick={() => setPrompts([...prompts, ''])}>
          + Add prompt
        </Button>
      </div>
      <Label className="font-normal">
        Minimum length
        <NumberInput
          value={quest.config.minChars}
          max={2000}
          onChange={(v) => void onChange({ ...quest, config: { ...quest.config, minChars: v } })}
        />
        characters
      </Label>
    </>
  );
}

function TimerQuestFields({
  quest,
  onChange,
}: {
  quest: TimerSideQuest;
  onChange: (quest: SideQuest) => Promise<void>;
}) {
  return (
    <Label className="font-normal">
      Countdown lasts
      <NumberInput
        value={quest.config.seconds}
        max={3600}
        onChange={(v) => void onChange({ ...quest, config: { seconds: v } })}
      />
      seconds before you can continue
    </Label>
  );
}

function PushupQuestFields({
  quest,
  onChange,
}: {
  quest: PushupSideQuest;
  onChange: (quest: SideQuest) => Promise<void>;
}) {
  return (
    <Label className="font-normal">
      Count off
      <NumberInput
        value={quest.config.reps}
        max={500}
        onChange={(v) => void onChange({ ...quest, config: { reps: v } })}
      />
      push-ups before you can continue
    </Label>
  );
}

function NumberInput({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <Input
      type="number"
      className="w-21"
      min={1}
      max={max}
      value={value}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (Number.isFinite(v) && v >= 1) onChange(v);
      }}
    />
  );
}
