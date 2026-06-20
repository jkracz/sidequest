import { cn } from '@/lib/utils';
import { QUEST_KINDS } from '../quests/registry';
import type { QuestType } from '../shared/types';

export function QuestTypeIcon({ type, className }: { type: QuestType; className?: string }) {
  const Icon = QUEST_KINDS[type].icon;
  return <Icon aria-hidden="true" className={cn('size-4 shrink-0', className)} />;
}
