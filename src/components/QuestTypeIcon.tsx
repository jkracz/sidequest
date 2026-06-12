import { Dumbbell, Hourglass, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuestType } from '../shared/types';

const ICONS = {
  reflection: PenLine,
  timer: Hourglass,
  pushups: Dumbbell,
} as const;

export function QuestTypeIcon({ type, className }: { type: QuestType; className?: string }) {
  const Icon = ICONS[type];
  return <Icon aria-hidden="true" className={cn('size-4 shrink-0', className)} />;
}
