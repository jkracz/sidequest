export interface BlockList {
  id: string;
  name: string;
  /** Normalized hostnames, e.g. "twitter.com". Matches the host and all subdomains. */
  sites: string[];
}

/** 0 = Sunday … 6 = Saturday, matching Date#getDay. */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface TimeBlock {
  id: string;
  label: string;
  days: DayOfWeek[];
  /** "HH:MM" 24h. */
  startTime: string;
  /** "HH:MM" 24h. If <= startTime, the block spans midnight into the next day. */
  endTime: string;
  blockListIds: string[];
  /** Quests eligible during this block. Empty means the page is blocked outright. */
  questIds: string[];
}

export type QuestType = 'reflection' | 'timer' | 'counter' | 'flashcards';

export interface ReflectionConfig {
  /** Served in rotation: each completion advances to the next prompt. */
  prompts: string[];
  minChars: number;
}

export interface TimerConfig {
  /** How long the countdown runs before the user may continue. */
  seconds: number;
}

export interface CounterConfig {
  /** Items to count off before the user may continue. */
  target: number;
  /** Singular unit name, e.g. "push-up". Pluralized automatically for display. */
  unit: string;
  prompt: string;
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
}

export interface FlashcardConfig {
  cards: FlashcardItem[];
  /** How many cards to step through before the pass is earned. */
  cardsPerPass: number;
  /** 'random' samples each visit; 'sequential' advances through the deck across visits. */
  order: 'random' | 'sequential';
  /**
   * Cards you must grade correct to earn the pass. Omitted = review only:
   * stepping through the set is enough. When set, missed cards come back until
   * you clear this many.
   */
  requiredCorrect?: number;
}

interface SideQuestBase {
  id: string;
  name: string;
  /** Minutes of access to the blocked site earned by completing this quest. */
  passDurationMinutes: number;
}

export interface ReflectionSideQuest extends SideQuestBase {
  type: 'reflection';
  config: ReflectionConfig;
}

export interface TimerSideQuest extends SideQuestBase {
  type: 'timer';
  config: TimerConfig;
}

export interface CounterSideQuest extends SideQuestBase {
  type: 'counter';
  config: CounterConfig;
}

export interface FlashcardSideQuest extends SideQuestBase {
  type: 'flashcards';
  config: FlashcardConfig;
}

export type SideQuest =
  | ReflectionSideQuest
  | TimerSideQuest
  | CounterSideQuest
  | FlashcardSideQuest;

/** The type-specific outcome of a completed quest. */
export type QuestResult =
  | { questType: 'reflection'; text: string; prompt?: string }
  | { questType: 'timer'; seconds: number }
  | { questType: 'counter'; count: number; unit: string }
  // `correct` and `cards` are absent on entries logged before grading existed.
  | {
      questType: 'flashcards';
      reviewed: number;
      correct?: number;
      cards?: { front: string; back: string; missed: boolean }[];
    };

/** A user-initiated block running from now until endsAt, regardless of schedule. */
export interface AdHocSession {
  id: string;
  blockListIds: string[];
  startedAt: number;
  endsAt: number;
}

/**
 * A visit where the user hit the block page and left without earning a pass.
 * Registered when a quest is shown and withdrawn on completion.
 */
export interface ResistedVisit {
  hostname: string;
  at: number;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  /** Minutes assumed saved per resisted visit in dashboard estimates. */
  minutesPerResistedVisit: number;
  theme: ThemePreference;
}

/** A temporary allowance earned by completing a quest. */
export interface Pass {
  hostname: string;
  earnedAt: number;
  expiresAt: number;
  questId: string;
}

interface HistoryEntryBase {
  id: string;
  questId: string;
  questName: string;
  hostname: string;
  targetUrl: string;
  createdAt: number;
  minutesEarned: number;
}

export type HistoryEntry = HistoryEntryBase & QuestResult;

export interface AppState {
  blockLists: BlockList[];
  timeBlocks: TimeBlock[];
  quests: SideQuest[];
  passes: Pass[];
  history: HistoryEntry[];
  adHocSessions: AdHocSession[];
  resists: ResistedVisit[];
  settings: Settings;
}
