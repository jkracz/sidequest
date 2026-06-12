import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { PushupSideQuest, QuestResult } from '../../shared/types';

interface Props {
  quest: PushupSideQuest;
  initialCount?: number;
  onCountChange?: (count: number) => void;
  onComplete: (result: QuestResult) => void;
}

export function PushupQuest({ quest, initialCount = 0, onCountChange, onComplete }: Props) {
  const target = Math.max(1, quest.config.reps);
  const [count, setCount] = useState(() => Math.min(target, Math.max(0, initialCount)));
  const done = count >= target;

  const countRep = useCallback(() => {
    setCount((current) => {
      const next = Math.min(target, current + 1);
      onCountChange?.(next);
      return next;
    });
  }, [onCountChange, target]);

  // Space counts a rep too, so you can slap the keyboard between push-ups
  // instead of aiming for a button.
  useEffect(() => {
    if (done) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      countRep();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [countRep, done]);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-5 py-2">
        <p className="text-muted-foreground">
          Drop and give yourself {target}. Count a rep with a tap or the space bar — honor system.
        </p>
        <div
          role="button"
          aria-label="Count one push-up"
          className={`flex h-40 w-40 items-center justify-center rounded-full border-4 text-5xl font-bold tabular-nums select-none ${
            done
              ? 'border-mint text-mint'
              : 'cursor-pointer border-primary text-foreground active:scale-95'
          }`}
          onClick={() => {
            if (!done) countRep();
          }}
        >
          {done ? '💪' : `${count}/${target}`}
        </div>
        <Button
          size="lg"
          disabled={!done}
          onClick={() => onComplete({ questType: 'pushups', reps: target })}
        >
          {done ? `Earn ${quest.passDurationMinutes} minutes` : `${target - count} reps to go`}
        </Button>
      </CardContent>
    </Card>
  );
}
