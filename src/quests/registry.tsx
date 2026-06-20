import type { FC } from 'react';
import { KIND_DATA, QUEST_TYPES } from './kinds';
import { reflectionUi } from './reflection';
import { timerUi } from './timer';
import { counterUi } from './counter';
import { flashcardsUi } from './flashcards';
import type { QuestKind, QuestKindUi } from './types';
import type { QuestResult, QuestType, SideQuest } from '../shared/types';

const KIND_UI: Record<QuestType, QuestKindUi> = {
  reflection: reflectionUi as QuestKindUi,
  timer: timerUi as QuestKindUi,
  counter: counterUi as QuestKindUi,
  flashcards: flashcardsUi as QuestKindUi,
};

/** Pure data + UI for every quest kind, keyed by type. The single source the
 *  blocked page, options page, and quest log all look kinds up through. */
export const QUEST_KINDS = Object.fromEntries(
  QUEST_TYPES.map((type) => [type, { ...KIND_DATA[type], ...KIND_UI[type] }])
) as Record<QuestType, QuestKind>;

export const ALL_KINDS: QuestKind[] = QUEST_TYPES.map((type) => QUEST_KINDS[type]);

export const kindOf = (quest: SideQuest): QuestKind => QUEST_KINDS[quest.type];

/** Render the log detail for a completed result through its kind. */
export function QuestLogDetail({ result }: { result: QuestResult }) {
  const { LogDetail } = QUEST_KINDS[result.questType];
  // The record is typed to the SideQuest union; result is the matching arm.
  const Detail = LogDetail as FC<{ result: QuestResult }>;
  return <Detail result={result} />;
}
