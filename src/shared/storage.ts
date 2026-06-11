import type { AppState, HistoryEntry, ReflectionConfig, SideQuest } from './types';

const DEFAULT_PROMPTS = [
  'What are you avoiding by going to this page?',
  'What were you doing ten minutes ago, and is this more important?',
  'If you closed this tab right now, what would you do instead?',
];

export const DEFAULT_STATE: AppState = {
  blockLists: [],
  timeBlocks: [],
  quests: [
    {
      id: 'quest-reflection-default',
      type: 'reflection',
      name: 'Reflection',
      passDurationMinutes: 10,
      config: {
        prompts: [...DEFAULT_PROMPTS],
        minChars: 150,
      },
    },
    {
      id: 'quest-timer-default',
      type: 'timer',
      name: 'Wait it out',
      passDurationMinutes: 10,
      config: {
        seconds: 60,
      },
    },
    {
      id: 'quest-pushups-default',
      type: 'pushups',
      name: 'Push-ups',
      passDurationMinutes: 10,
      config: {
        reps: 10,
      },
    },
  ],
  passes: [],
  history: [],
  adHocSessions: [],
  intercepts: [],
  settings: {
    minutesPerResistedVisit: 15,
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

function migrateQuest(q: SideQuest, legacyMinutes: number): SideQuest {
  const passDurationMinutes = q.passDurationMinutes ?? legacyMinutes;
  if (q.type === 'reflection') {
    // Earlier builds stored a single `prompt` string instead of `prompts`.
    const cfg = q.config as Partial<ReflectionConfig> & { prompt?: string };
    return {
      ...q,
      passDurationMinutes,
      config: {
        prompts: cfg.prompts ?? (cfg.prompt ? [cfg.prompt] : [...DEFAULT_PROMPTS]),
        minChars: cfg.minChars ?? 150,
      },
    };
  }
  return { ...q, passDurationMinutes };
}

/**
 * Bring storage written by any earlier build up to the current shape:
 * global pass duration -> per-quest, `reflections` log -> `history`,
 * single reflection prompt -> prompt pool, plus defaults for new keys.
 */
function migrate(stored: Record<string, unknown>): AppState {
  const legacySettings = stored.settings as { passDurationMinutes?: number } | undefined;
  const legacyMinutes = legacySettings?.passDurationMinutes ?? 10;

  const quests =
    (stored.quests as SideQuest[] | undefined)?.map((q) => migrateQuest(q, legacyMinutes)) ??
    [...DEFAULT_STATE.quests];
  // Quest types added in later builds get their default entry appended.
  for (const dq of DEFAULT_STATE.quests) {
    if (!quests.some((q) => q.type === dq.type)) quests.push(dq);
  }

  const legacyReflections = stored.reflections as LegacyReflectionEntry[] | undefined;
  const history =
    (stored.history as HistoryEntry[] | undefined) ??
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
    intercepts: (stored.intercepts as AppState['intercepts']) ?? [],
    settings: {
      minutesPerResistedVisit:
        (stored.settings as AppState['settings'] | undefined)?.minutesPerResistedVisit ??
        DEFAULT_STATE.settings.minutesPerResistedVisit,
    },
  };
}

function hasLegacyShape(stored: Record<string, unknown>): boolean {
  if ('reflections' in stored) return true;
  const settings = stored.settings as Record<string, unknown> | undefined;
  if (settings && 'passDurationMinutes' in settings) return true;
  const quests = stored.quests as SideQuest[] | undefined;
  return (
    quests?.some(
      (q) =>
        q.passDurationMinutes === undefined ||
        (q.type === 'reflection' && q.config && 'prompt' in q.config)
    ) ?? false
  );
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
    await chrome.storage.local.remove(['reflections']);
  }
}

export async function setState(partial: Partial<AppState>): Promise<void> {
  await chrome.storage.local.set(partial);
}

export function onStateChanged(callback: () => void): () => void {
  const listener = (_changes: unknown, area: string) => {
    if (area === 'local') callback();
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
