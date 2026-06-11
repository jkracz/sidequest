import { useEffect, useState } from 'react';
import type { PushupSideQuest, QuestResult } from '../../shared/types';

interface Props {
  quest: PushupSideQuest;
  onComplete: (result: QuestResult) => void;
}

export function PushupQuest({ quest, onComplete }: Props) {
  const target = Math.max(1, quest.config.reps);
  const [count, setCount] = useState(0);
  const done = count >= target;

  // Space counts a rep too, so you can slap the keyboard between push-ups
  // instead of aiming for a button.
  useEffect(() => {
    if (done) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      setCount((c) => Math.min(target, c + 1));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [done, target]);

  return (
    <div className="card flex flex-col items-center gap-5 p-6">
      <p className="text-dim">
        Drop and give yourself {target}. Count a rep with a tap or the space bar — honor system.
      </p>
      <div
        role="button"
        aria-label="Count one push-up"
        className={`flex h-40 w-40 items-center justify-center rounded-full border-4 text-5xl font-bold tabular-nums select-none ${
          done
            ? 'border-mint text-mint'
            : 'cursor-pointer border-gold text-ink active:scale-95'
        }`}
        onClick={() => {
          if (!done) setCount((c) => Math.min(target, c + 1));
        }}
      >
        {done ? '💪' : `${count}/${target}`}
      </div>
      <button
        className="btn btn-primary"
        disabled={!done}
        onClick={() => onComplete({ questType: 'pushups', reps: target })}
      >
        {done ? `Earn ${quest.passDurationMinutes} minutes` : `${target - count} reps to go`}
      </button>
    </div>
  );
}
