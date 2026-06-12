import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatSeconds } from '../../shared/schedule';
import type { QuestResult, TimerSideQuest } from '../../shared/types';

interface Props {
  quest: TimerSideQuest;
  onComplete: (result: QuestResult) => void;
}

export function TimerQuest({ quest, onComplete }: Props) {
  const total = Math.max(1, quest.config.seconds);
  const [remaining, setRemaining] = useState(total);

  // Count against the wall clock rather than accumulating interval ticks, so
  // background-tab throttling can't stretch the wait.
  useEffect(() => {
    const endAt = Date.now() + total * 1000;
    const tick = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) window.clearInterval(tick);
    }, 250);
    return () => window.clearInterval(tick);
  }, [total]);

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
        <Progress className="h-1.5" value={((total - remaining) / total) * 100} />
        <Button
          size="lg"
          disabled={!done}
          onClick={() => onComplete({ questType: 'timer', seconds: total })}
        >
          {done ? `Earn ${quest.passDurationMinutes} minutes` : 'Counting down…'}
        </Button>
      </CardContent>
    </Card>
  );
}
