import { useEffect, useState } from 'react';
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
    <div className="card flex flex-col items-center gap-5 p-6">
      <p className="text-dim">Sit with the urge for a moment. The page isn't going anywhere.</p>
      <div className="text-6xl font-bold tabular-nums" aria-live="polite">
        {formatSeconds(remaining)}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-inset">
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-300"
          style={{ width: `${((total - remaining) / total) * 100}%` }}
        />
      </div>
      <button
        className="btn btn-primary"
        disabled={!done}
        onClick={() => onComplete({ questType: 'timer', seconds: total })}
      >
        {done ? `Earn ${quest.passDurationMinutes} minutes` : 'Counting down…'}
      </button>
    </div>
  );
}
