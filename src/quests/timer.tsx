import { useEffect, useState } from 'react';
import { Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { NumberInput } from './fields';
import { formatSeconds } from '../shared/schedule';
import type { QuestKindUi, QuestRuntimeProps } from './types';
import type { QuestResult, SideQuest, TimerSideQuest } from '../shared/types';

function TimerRuntime({
  quest,
  ctx,
  onComplete,
}: QuestRuntimeProps<TimerSideQuest>) {
  const total = Math.max(1, quest.config.seconds);
  const [startedAt] = useState(() => ctx.num('startedAt') ?? Date.now());
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.ceil((startedAt + total * 1000 - Date.now()) / 1000)),
  );

  useEffect(() => {
    if (ctx.num('startedAt') === undefined) ctx.setNum('startedAt', startedAt);
  }, [ctx, startedAt]);

  // Count against the wall clock rather than accumulating interval ticks, so
  // background-tab throttling can't stretch the wait.
  useEffect(() => {
    const endAt = startedAt + total * 1000;
    const tick = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) window.clearInterval(tick);
    }, 250);
    return () => window.clearInterval(tick);
  }, [startedAt, total]);

  const done = remaining === 0;

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-5 py-2">
        <p className="text-muted-foreground">
          Sit with the urge for a moment. The page isn't going anywhere.
        </p>
        <div className="text-6xl font-bold tabular-nums" aria-live="polite">
          {formatSeconds(remaining)}
        </div>
        <Progress
          className="h-1.5"
          value={((total - remaining) / total) * 100}
        />
        <Button
          size="lg"
          disabled={!done}
          onClick={() => onComplete({ questType: 'timer', seconds: total })}
        >
          {done
            ? `Earn ${quest.passDurationMinutes} minutes`
            : 'Counting down…'}
        </Button>
      </CardContent>
    </Card>
  );
}

function TimerEditor({
  quest,
  onChange,
}: {
  quest: TimerSideQuest;
  onChange: (quest: SideQuest) => void;
}) {
  return (
    <Label className="font-normal">
      Countdown lasts
      <NumberInput
        value={quest.config.seconds}
        max={3600}
        onChange={(v) => onChange({ ...quest, config: { seconds: v } })}
      />
      seconds before you can continue
    </Label>
  );
}

function TimerLogDetail({
  result,
}: {
  result: Extract<QuestResult, { questType: 'timer' }>;
}) {
  return (
    <p className="text-muted-foreground">
      Waited out a {formatSeconds(result.seconds)} countdown.
    </p>
  );
}

export const timerUi: QuestKindUi<TimerSideQuest> = {
  icon: Hourglass,
  Editor: TimerEditor,
  Runtime: TimerRuntime,
  LogDetail: TimerLogDetail,
};
