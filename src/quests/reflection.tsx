import { useState } from 'react';
import { PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DEFAULT_PROMPTS } from './kinds';
import { NumberInput } from './fields';
import type { QuestKindUi, QuestRuntimeProps } from './types';
import type { AppState, QuestResult, ReflectionSideQuest, SideQuest } from '../shared/types';

/** Each completion of this quest advances the rotation to the next prompt. */
function promptFor(quest: ReflectionSideQuest, state: AppState): string {
  const prompts = quest.config.prompts;
  if (prompts.length === 0) return DEFAULT_PROMPTS[0];
  const completed = state.history.filter((h) => h.questId === quest.id).length;
  return prompts[completed % prompts.length];
}

function draftKey(questId: string, target: string, prompt: string): string {
  return `sidequest:reflection-draft:${questId}:${target}:${prompt}`;
}

function ReflectionForm({
  prompt,
  minChars,
  passMinutes,
  initialText,
  onTextChange,
  onComplete,
}: {
  prompt: string;
  minChars: number;
  passMinutes: number;
  initialText: string;
  onTextChange: (text: string) => void;
  onComplete: (text: string) => void;
}) {
  const [text, setText] = useState(initialText);
  const remaining = minChars - text.trim().length;
  const ready = remaining <= 0;

  return (
    <Card className="text-left">
      <CardHeader>
        <CardTitle className="text-[19px] font-semibold">{prompt}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) onComplete(text.trim());
          }}
        >
          <Textarea
            autoFocus
            rows={6}
            className="min-h-[140px] resize-y"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              onTextChange(e.target.value);
            }}
            placeholder="Be honest. Nobody is grading this but you."
          />
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[13px] ${ready ? 'text-mint' : 'text-muted-foreground'}`}>
              {ready ? 'Quest requirement met' : `${remaining} more characters`}
            </span>
            <Button type="submit" disabled={!ready}>
              Earn {passMinutes} minutes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ReflectionRuntime({
  quest,
  state,
  target,
  ctx,
  onComplete,
}: QuestRuntimeProps<ReflectionSideQuest>) {
  const prompt = promptFor(quest, state);
  const key = draftKey(quest.id, target, prompt);
  return (
    <ReflectionForm
      key={key}
      prompt={prompt}
      minChars={quest.config.minChars}
      passMinutes={quest.passDurationMinutes}
      initialText={ctx.draft(key)}
      onTextChange={(text) => ctx.setDraft(key, text)}
      onComplete={(text) => {
        ctx.setDraft(key, '');
        onComplete({ questType: 'reflection', text, prompt });
      }}
    />
  );
}

function ReflectionEditor({
  quest,
  onChange,
}: {
  quest: ReflectionSideQuest;
  onChange: (quest: SideQuest) => void;
}) {
  const { prompts } = quest.config;

  function setPrompts(next: string[]) {
    onChange({ ...quest, config: { ...quest.config, prompts: next } });
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
        <Button
          variant="outline"
          className="self-start"
          onClick={() => setPrompts([...prompts, ''])}
        >
          + Add prompt
        </Button>
      </div>
      <Label className="font-normal">
        Minimum length
        <NumberInput
          value={quest.config.minChars}
          max={2000}
          onChange={(v) => onChange({ ...quest, config: { ...quest.config, minChars: v } })}
        />
        characters
      </Label>
    </>
  );
}

function ReflectionLogDetail({
  result,
}: {
  result: Extract<QuestResult, { questType: 'reflection' }>;
}) {
  return (
    <>
      {result.prompt && (
        <p className="text-[13px] text-muted-foreground italic">{result.prompt}</p>
      )}
      <p className="whitespace-pre-wrap">{result.text}</p>
    </>
  );
}

export const reflectionUi: QuestKindUi<ReflectionSideQuest> = {
  icon: PenLine,
  Editor: ReflectionEditor,
  Runtime: ReflectionRuntime,
  LogDetail: ReflectionLogDetail,
};
