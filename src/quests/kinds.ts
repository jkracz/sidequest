import type {
  CounterConfig,
  FlashcardConfig,
  FlashcardItem,
  QuestType,
  ReflectionConfig,
  SideQuest,
  TimerConfig,
} from '../shared/types';
import type { KindData } from './types';

export const DEFAULT_PROMPTS = [
  'What are you avoiding by going to this page?',
  'What were you doing ten minutes ago, and is this more important?',
  'If you closed this tab right now, what would you do instead?',
];

/** A small example deck so the flashcard quest isn't empty on first run. */
const STARTER_FLASHCARDS: FlashcardItem[] = [
  { id: 'starter-1', front: 'Capital of Australia', back: 'Canberra' },
  { id: 'starter-2', front: 'Square root of 144', back: '12' },
  {
    id: 'starter-3',
    front: 'Author of "Meditations"',
    back: 'Marcus Aurelius',
  },
];

const reflection: KindData<Extract<SideQuest, { type: 'reflection' }>> = {
  type: 'reflection',
  label: 'Reflection',
  defaultInstance: (id) => ({
    id,
    type: 'reflection',
    name: 'Reflection',
    passDurationMinutes: 10,
    config: { prompts: [...DEFAULT_PROMPTS], minChars: 150 },
  }),
  migrateConfig: (raw) => {
    // Earlier builds stored a single `prompt` string instead of `prompts`.
    const cfg = (raw ?? {}) as Partial<ReflectionConfig> & { prompt?: string };
    return {
      prompts:
        cfg.prompts ?? (cfg.prompt ? [cfg.prompt] : [...DEFAULT_PROMPTS]),
      minChars: cfg.minChars ?? 150,
    };
  },
};

const timer: KindData<Extract<SideQuest, { type: 'timer' }>> = {
  type: 'timer',
  label: 'Timer',
  defaultInstance: (id) => ({
    id,
    type: 'timer',
    name: 'Wait it out',
    passDurationMinutes: 10,
    config: { seconds: 60 },
  }),
  migrateConfig: (raw) => ({
    seconds: (raw as Partial<TimerConfig>)?.seconds ?? 60,
  }),
};

const counter: KindData<Extract<SideQuest, { type: 'counter' }>> = {
  type: 'counter',
  label: 'Counter',
  defaultInstance: (id) => ({
    id,
    type: 'counter',
    name: 'Push-ups',
    passDurationMinutes: 10,
    config: {
      target: 10,
      unit: 'push-up',
      prompt: 'Drop and give yourself',
    },
  }),
  migrateConfig: (raw) => {
    const cfg = (raw ?? {}) as Partial<CounterConfig> & { reps?: number };
    return {
      target: cfg.target ?? cfg.reps ?? 10,
      unit: cfg.unit ?? 'push-up',
      prompt: cfg.prompt ?? 'Drop and give yourself',
    };
  },
};

const flashcards: KindData<Extract<SideQuest, { type: 'flashcards' }>> = {
  type: 'flashcards',
  label: 'Flashcards',
  defaultInstance: (id) => ({
    id,
    type: 'flashcards',
    name: 'Flashcards',
    passDurationMinutes: 10,
    config: {
      cards: [...STARTER_FLASHCARDS],
      cardsPerPass: 5,
      order: 'random',
    },
  }),
  migrateConfig: (raw) => {
    const cfg = (raw ?? {}) as Partial<FlashcardConfig>;
    return {
      cards: Array.isArray(cfg.cards) ? cfg.cards : [],
      cardsPerPass: cfg.cardsPerPass ?? 5,
      order: cfg.order === 'sequential' ? 'sequential' : 'random',
      requiredCorrect:
        typeof cfg.requiredCorrect === 'number'
          ? cfg.requiredCorrect
          : undefined,
    };
  },
};

/** Pure (React-free) data for every quest kind, keyed by type. */
export const KIND_DATA = { reflection, timer, counter, flashcards } as const;

export const QUEST_TYPES = Object.keys(KIND_DATA) as QuestType[];

const kindData = (type: QuestType): KindData => KIND_DATA[type] as KindData;

/** One fresh instance of every kind, used for first-run defaults and seeding. */
export function defaultQuests(): SideQuest[] {
  return QUEST_TYPES.map((type) =>
    kindData(type).defaultInstance(`quest-${type}-default`),
  );
}

/** A new default instance of one kind (for the options "add quest" picker). */
export function newQuest(type: QuestType): SideQuest {
  return kindData(type).defaultInstance(crypto.randomUUID());
}

/**
 * Bring a stored quest of any build up to the current shape, or null if its
 * kind no longer exists (dropped rather than kept as a ghost).
 */
export function migrateQuest(
  quest: SideQuest,
  legacyMinutes: number,
): SideQuest | null {
  const legacyType = (quest as { type: string }).type;
  const type = legacyType === 'pushups' ? 'counter' : quest.type;
  const data = KIND_DATA[type];
  if (!data) return null;
  return {
    ...quest,
    type,
    passDurationMinutes: quest.passDurationMinutes ?? legacyMinutes,
    config: data.migrateConfig((quest as { config?: unknown }).config),
  } as SideQuest;
}
