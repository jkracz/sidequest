import { useCallback, useEffect, useState } from 'react';
import { Check, ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from './fields';
import type { QuestKindUi, QuestRuntimeProps } from './types';
import type { CounterSideQuest, QuestResult, SideQuest } from '../shared/types';

// Pluralize a unit by adding "s", with light handling for the common endings.
// Not exhaustive by design - the user types the singular and we keep it simple.
function pluralize(unit: string): string {
  if (/(s|x|z|ch|sh)$/i.test(unit)) return `${unit}es`;
  if (/[^aeiou]y$/i.test(unit)) return `${unit.slice(0, -1)}ies`;
  return `${unit}s`;
}

function unitFor(count: number, unit: string): string {
  return count === 1 ? unit : pluralize(unit);
}

function CounterRuntime({ quest, ctx, onComplete }: QuestRuntimeProps<CounterSideQuest>) {
  const target = Math.max(1, quest.config.target);
  const unit = unitFor(target, quest.config.unit);
  const [count, setCount] = useState(() => Math.min(target, Math.max(0, ctx.num('count') ?? 0)));
  const done = count >= target;

  const countOne = useCallback(() => {
    setCount((current) => {
      const next = Math.min(target, current + 1);
      ctx.setNum('count', next);
      return next;
    });
  }, [ctx, target]);

  // Space counts too, so the user does not need to aim for the button while
  // completing an off-keyboard activity.
  useEffect(() => {
    if (done) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      countOne();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [countOne, done]);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-5 py-2">
        <p className="text-muted-foreground">
          {quest.config.prompt} {target} {unit}. Count one with a tap or the space bar - honor
          system.
        </p>
        <div
          role="button"
          aria-label={`Count one ${quest.config.unit}`}
          className={`flex h-40 w-40 items-center justify-center rounded-full border-4 text-5xl font-bold tabular-nums select-none ${
            done
              ? 'border-mint text-mint'
              : 'cursor-pointer border-primary text-foreground active:scale-95'
          }`}
          onClick={() => {
            if (!done) countOne();
          }}
        >
          {done ? (
            <Check aria-label="Done" className="size-16" strokeWidth={3} />
          ) : (
            `${count}/${target}`
          )}
        </div>
        <Button
          size="lg"
          disabled={!done}
          onClick={() => onComplete({ questType: 'counter', count: target, unit })}
        >
          {done ? `Earn ${quest.passDurationMinutes} minutes` : `${target - count} ${unit} to go`}
        </Button>
      </CardContent>
    </Card>
  );
}

function CounterEditor({
  quest,
  onChange,
}: {
  quest: CounterSideQuest;
  onChange: (quest: SideQuest) => void;
}) {
  function setConfig(patch: Partial<CounterSideQuest['config']>) {
    onChange({ ...quest, config: { ...quest.config, ...patch } });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <Label className="flex flex-col items-start gap-1.5 font-normal">
        Prompt
        <Input
          value={quest.config.prompt}
          onChange={(e) => setConfig({ prompt: e.target.value })}
          placeholder="Drop and give yourself"
        />
      </Label>
      <Label className="flex-wrap font-normal">
        Count off
        <NumberInput
          value={quest.config.target}
          max={500}
          onChange={(v) => setConfig({ target: v })}
        />
        <Input
          className="w-32"
          value={quest.config.unit}
          onChange={(e) => setConfig({ unit: e.target.value })}
          placeholder="push-up"
        />
        before you can continue
      </Label>
    </div>
  );
}

function CounterLogDetail({ result }: { result: Extract<QuestResult, { questType: 'counter' }> }) {
  return (
    <p className="text-muted-foreground">
      Counted off {result.count} {result.unit}.
    </p>
  );
}

export const counterUi: QuestKindUi<CounterSideQuest> = {
  icon: ListPlus,
  Editor: CounterEditor,
  Runtime: CounterRuntime,
  LogDetail: CounterLogDetail,
};
