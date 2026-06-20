import type { FC } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { AppState, QuestResult, SideQuest } from '../shared/types';

/**
 * In-progress quest state that survives a block-page reload. URL params hold
 * small numeric progress (timer start, rep/card index); sessionStorage holds
 * larger private text (reflection drafts). Built once by the QuestRunner and
 * handed to every Runtime so kinds never touch window.* directly.
 */
export interface QuestRuntimeContext {
  num: (name: string) => number | undefined;
  setNum: (name: string, value: number | null) => void;
  draft: (key: string) => string;
  setDraft: (key: string, text: string) => void;
}

export interface QuestRuntimeProps<Q extends SideQuest = SideQuest> {
  quest: Q;
  /** Read-only app state, for history-derived rotation (reflection prompt, deck offset). */
  state: AppState;
  /** The blocked URL, for namespacing per-target drafts. */
  target: string;
  ctx: QuestRuntimeContext;
  onComplete: (result: QuestResult) => void;
}

/** Narrows QuestResult to the arm a given kind produces. */
export type ResultOf<T extends SideQuest['type']> = Extract<
  QuestResult,
  { questType: T }
>;

/**
 * The React-free half of a quest kind. Lives in kinds.ts so storage and the
 * background service worker can build defaults and migrate configs without
 * pulling React into their bundles.
 */
export interface KindData<Q extends SideQuest = SideQuest> {
  type: Q['type'];
  /** Shown in the add-quest picker and used as a new instance's default name. */
  label: string;
  defaultInstance: (id: string) => Q;
  /** Bring an older stored config of this kind up to the current shape. */
  migrateConfig: (raw: unknown) => Q['config'];
}

/** The React half of a quest kind: how it looks and runs. */
export interface QuestKindUi<Q extends SideQuest = SideQuest> {
  icon: LucideIcon;
  Editor: FC<{ quest: Q; onChange: (quest: SideQuest) => void }>;
  Runtime: FC<QuestRuntimeProps<Q>>;
  LogDetail: FC<{ result: ResultOf<Q['type']> }>;
}

export type QuestKind<Q extends SideQuest = SideQuest> = KindData<Q> &
  QuestKindUi<Q>;
