import { useState } from 'react';
import type { QuestResult, ReflectionSideQuest } from '../../shared/types';

interface Props {
  quest: ReflectionSideQuest;
  prompt: string;
  onComplete: (result: QuestResult) => void;
}

export function ReflectionQuest({ quest, prompt, onComplete }: Props) {
  const [text, setText] = useState('');
  const { minChars } = quest.config;
  const remaining = minChars - text.trim().length;
  const ready = remaining <= 0;

  return (
    <form
      className="card flex flex-col gap-3.5 p-6 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onComplete({ questType: 'reflection', text: text.trim(), prompt });
      }}
    >
      <h2 className="text-[19px] font-semibold">{prompt}</h2>
      <textarea
        autoFocus
        rows={6}
        className="input min-h-[140px] resize-y"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Be honest. Nobody is grading this but you."
      />
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[13px] ${ready ? 'text-mint' : 'text-dim'}`}>
          {ready ? 'Quest requirement met' : `${remaining} more characters`}
        </span>
        <button type="submit" className="btn btn-primary" disabled={!ready}>
          Earn {quest.passDurationMinutes} minutes
        </button>
      </div>
    </form>
  );
}
