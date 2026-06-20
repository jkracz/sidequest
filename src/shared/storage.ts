import { KIND_DATA, QUEST_TYPES, defaultQuests, migrateQuest } from '../quests/kinds';
import type { AppState, HistoryEntry, SideQuest } from './types';

export const DEFAULT_STATE: AppState = {
  blockLists: [],
  timeBlocks: [],
  quests: defaultQuests(),
  passes: [],
  history: [],
  adHocSessions: [],
  resists: [],
  settings: {
    minutesPerResistedVisit: 15,
    theme: 'system',
  },
};

interface LegacyReflectionEntry {
  id: string;
  questId: string;
  hostname: string;
  targetUrl: string;
  text: string;
  createdAt: number;
}

type LegacyHistoryEntry =
  | HistoryEntry
  | (Omit<HistoryEntry, 'questType'> & {
      questType: 'pushups';
      reps: number;
    });

function migrateHistoryEntry(entry: LegacyHistoryEntry): HistoryEntry {
  if (entry.questType !== 'pushups') return entry;
  const { reps, ...base } = entry;
  return {
    ...base,
    questType: 'counter',
    count: reps,
    unit: reps === 1 ? 'push-up' : 'push-ups',
  };
}

/**
 * Bring storage written by any earlier build up to the current shape:
 * global pass duration -> per-quest, `reflections` log -> `history`,
 * single reflection prompt -> prompt pool, push-ups -> counter, plus defaults
 * for new keys.
 */
function migrate(stored: Record<string, unknown>): AppState {
  const legacySettings = stored.settings as { passDurationMinutes?: number } | undefined;
  const legacyMinutes = legacySettings?.passDurationMinutes ?? 10;

  const quests =
    (stored.quests as SideQuest[] | undefined)
      ?.map((q) => migrateQuest(q, legacyMinutes))
      .filter((q): q is SideQuest => q !== null) ?? defaultQuests();
  // Quest kinds added in later builds get their default instance appended.
  for (const type of QUEST_TYPES) {
    if (!quests.some((q) => q.type === type)) {
      quests.push(KIND_DATA[type].defaultInstance(`quest-${type}-default`));
    }
  }

  const legacyReflections = stored.reflections as LegacyReflectionEntry[] | undefined;
  const history =
    (stored.history as LegacyHistoryEntry[] | undefined)?.map(migrateHistoryEntry) ??
    legacyReflections?.map(
      (r): HistoryEntry => ({
        id: r.id,
        questId: r.questId,
        questName: 'Reflection',
        questType: 'reflection',
        hostname: r.hostname,
        targetUrl: r.targetUrl,
        createdAt: r.createdAt,
        minutesEarned: legacyMinutes,
        text: r.text,
      })
    ) ??
    [];

  return {
    blockLists: (stored.blockLists as AppState['blockLists']) ?? [],
    timeBlocks: (stored.timeBlocks as AppState['timeBlocks']) ?? [],
    quests,
    passes: (stored.passes as AppState['passes']) ?? [],
    history,
    adHocSessions: (stored.adHocSessions as AppState['adHocSessions']) ?? [],
    resists: (stored.resists as AppState['resists']) ?? [],
    settings: {
      minutesPerResistedVisit:
        (stored.settings as AppState['settings'] | undefined)?.minutesPerResistedVisit ??
        DEFAULT_STATE.settings.minutesPerResistedVisit,
      theme:
        (stored.settings as AppState['settings'] | undefined)?.theme ??
        DEFAULT_STATE.settings.theme,
    },
  };
}

function hasLegacyShape(stored: Record<string, unknown>): boolean {
  // `intercepts` was arrival data from a build that measured resistance
  // differently; it isn't convertible, so it's dropped rather than migrated.
  if ('reflections' in stored || 'intercepts' in stored) return true;
  const settings = stored.settings as Record<string, unknown> | undefined;
  if (settings && 'passDurationMinutes' in settings) return true;
  const quests = stored.quests as SideQuest[] | undefined;
  const history = stored.history as LegacyHistoryEntry[] | undefined;
  const hasLegacyQuest = quests?.some(
    (q) =>
      q.passDurationMinutes === undefined ||
      (q as { type: string }).type === 'pushups' ||
      (q.type === 'reflection' && q.config && 'prompt' in q.config)
  );
  const hasLegacyHistory = history?.some((h) => h.questType === 'pushups');
  return (hasLegacyQuest ?? false) || (hasLegacyHistory ?? false);
}

export async function getState(): Promise<AppState> {
  const stored = await chrome.storage.local.get(null);
  return migrate(stored);
}

/** Rewrite legacy keys in place so the migration only ever happens once. */
export async function persistMigrationIfNeeded(): Promise<void> {
  const stored = await chrome.storage.local.get(null);
  if (hasLegacyShape(stored)) {
    await chrome.storage.local.set(migrate(stored));
    await chrome.storage.local.remove(['reflections', 'intercepts']);
  }
}

export async function setState(partial: Partial<AppState>): Promise<void> {
  await chrome.storage.local.set(partial);
}

/** Wipe everything; the next read falls back to DEFAULT_STATE. */
export async function resetAllState(): Promise<void> {
  await chrome.storage.local.clear();
}

export function onStateChanged(callback: () => void): () => void {
  const listener = (_changes: unknown, area: string) => {
    if (area === 'local') callback();
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
