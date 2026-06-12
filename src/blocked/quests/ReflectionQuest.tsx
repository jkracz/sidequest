import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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
    <Card className="text-left">
      <CardHeader>
        <CardTitle className="text-[19px] font-semibold">{prompt}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) onComplete({ questType: 'reflection', text: text.trim(), prompt });
          }}
        >
          <Textarea
            autoFocus
            rows={6}
            className="min-h-[140px] resize-y"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Be honest. Nobody is grading this but you."
          />
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[13px] ${ready ? 'text-mint' : 'text-muted-foreground'}`}>
              {ready ? 'Quest requirement met' : `${remaining} more characters`}
            </span>
            <Button type="submit" disabled={!ready}>
              Earn {quest.passDurationMinutes} minutes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
