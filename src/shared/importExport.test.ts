import { describe, expect, it } from 'vitest';

import {
  applyImportedData,
  createQuestExport,
  createQuestLogCsv,
  createQuestLogExport,
  parseSideQuestImport,
  stringifyExport,
} from './importExport';
import { DEFAULT_STATE } from './storage';
import type { AppState, HistoryEntry, ResistedVisit, SideQuest } from './types';

const NOW = new Date('2026-06-20T12:00:00.000Z');

function timerQuest(overrides: Partial<Extract<SideQuest, { type: 'timer' }>> = {}): SideQuest {
  return {
    id: 'timer-1',
    type: 'timer',
    name: 'Wait',
    passDurationMinutes: 10,
    config: { seconds: 60 },
    ...overrides,
  };
}

function reflectionEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 'history-1',
    questId: 'reflection-1',
    questName: 'Reflection',
    questType: 'reflection',
    hostname: 'example.com',
    targetUrl: 'https://example.com/feed',
    createdAt: Date.parse('2026-06-19T20:00:00.000Z'),
    minutesEarned: 10,
    prompt: 'Why this page?',
    text: 'I was drifting.',
    ...overrides,
  } as HistoryEntry;
}

function resist(overrides: Partial<ResistedVisit> = {}): ResistedVisit {
  return {
    hostname: 'example.com',
    at: Date.parse('2026-06-19T21:00:00.000Z'),
    ...overrides,
  };
}

function state(overrides: Partial<AppState> = {}): AppState {
  return {
    ...DEFAULT_STATE,
    blockLists: [],
    timeBlocks: [],
    quests: [],
    passes: [],
    history: [],
    adHocSessions: [],
    resists: [],
    ...overrides,
  };
}

describe('SideQuest JSON exports', () => {
  it('roundtrips a quests export through the import parser', () => {
    const exported = createQuestExport(state({ quests: [timerQuest()] }), NOW);
    const parsed = parseSideQuestImport(stringifyExport(exported));

    expect(parsed.kind).toBe('quests');
    expect(parsed.summary.quests).toBe(1);
    expect(parsed.quests).toEqual([timerQuest()]);
  });

  it('roundtrips a quest log export with history and resisted visits', () => {
    const exported = createQuestLogExport(
      state({ history: [reflectionEntry()], resists: [resist()] }),
      NOW
    );
    const parsed = parseSideQuestImport(stringifyExport(exported));

    expect(parsed.kind).toBe('quest-log');
    expect(parsed.summary.history).toBe(1);
    expect(parsed.summary.resists).toBe(1);
    expect(parsed.history).toEqual([reflectionEntry()]);
    expect(parsed.resists).toEqual([resist()]);
  });

  it('preserves flashcard logs with zero correct answers', () => {
    const entry: HistoryEntry = {
      id: 'flashcard-history-1',
      questId: 'flashcards-1',
      questName: 'Flashcards',
      questType: 'flashcards',
      hostname: 'example.com',
      targetUrl: 'https://example.com/feed',
      createdAt: Date.parse('2026-06-19T22:00:00.000Z'),
      minutesEarned: 10,
      reviewed: 3,
      correct: 0,
      cards: [{ front: 'A', back: 'B', missed: true }],
    };

    const parsed = parseSideQuestImport(
      stringifyExport(createQuestLogExport(state({ history: [entry] }), NOW))
    );

    expect(parsed.history).toEqual([entry]);
  });

  it('rejects unknown JSON instead of importing partial data', () => {
    expect(() => parseSideQuestImport(JSON.stringify({ app: 'other', data: {} }))).toThrow(
      /SideQuest export/
    );
  });
});

describe('import merge behavior', () => {
  it('adds conflicting quest IDs under a new imported ID', () => {
    const currentQuest = timerQuest({ name: 'Current timer', config: { seconds: 30 } });
    const importedQuest = timerQuest({ name: 'Imported timer', config: { seconds: 90 } });
    const parsed = parseSideQuestImport(
      stringifyExport(createQuestExport(state({ quests: [importedQuest] }), NOW))
    );

    const result = applyImportedData(state({ quests: [currentQuest] }), parsed, 'merge');

    expect(result.addedQuests).toBe(1);
    expect(result.reassignedQuestIds).toBe(1);
    expect(result.changes.quests).toEqual([
      currentQuest,
      { ...importedQuest, id: 'timer-1-imported' },
    ]);
  });

  it('deduplicates quest log entries and resisted visits while merging', () => {
    const currentHistory = reflectionEntry();
    const importedHistory = reflectionEntry({ id: 'history-2', text: 'A new record.' });
    const currentResist = resist();
    const importedResist = resist({ at: Date.parse('2026-06-20T21:00:00.000Z') });
    const parsed = parseSideQuestImport(
      stringifyExport(
        createQuestLogExport(
          state({
            history: [currentHistory, importedHistory],
            resists: [currentResist, importedResist],
          }),
          NOW
        )
      )
    );

    const result = applyImportedData(
      state({ history: [currentHistory], resists: [currentResist] }),
      parsed,
      'merge'
    );

    expect(result.addedHistory).toBe(1);
    expect(result.skippedHistory).toBe(1);
    expect(result.addedResists).toBe(1);
    expect(result.skippedResists).toBe(1);
    expect(result.changes.history).toEqual([currentHistory, importedHistory]);
    expect(result.changes.resists).toEqual([currentResist, importedResist]);
  });

  it('cleans schedule quest references when quests are replaced', () => {
    const importedQuest = timerQuest({ id: 'new-timer' });
    const parsed = parseSideQuestImport(
      stringifyExport(createQuestExport(state({ quests: [importedQuest] }), NOW))
    );

    const result = applyImportedData(
      state({
        quests: [timerQuest()],
        timeBlocks: [
          {
            id: 'block-1',
            label: 'Focus',
            days: [1],
            startTime: '09:00',
            endTime: '17:00',
            blockListIds: [],
            questIds: ['timer-1', 'new-timer'],
          },
        ],
      }),
      parsed,
      'replace'
    );

    expect(result.changes.quests).toEqual([importedQuest]);
    expect(result.changes.timeBlocks).toEqual([
      {
        id: 'block-1',
        label: 'Focus',
        days: [1],
        startTime: '09:00',
        endTime: '17:00',
        blockListIds: [],
        questIds: ['new-timer'],
      },
    ]);
  });
});

describe('quest log CSV export', () => {
  it('escapes spreadsheet fields and includes resisted visits', () => {
    const csv = createQuestLogCsv(
      state({
        history: [
          reflectionEntry({
            hostname: 'social.example',
            text: 'Line one, "quoted"\nline two',
          }),
        ],
        resists: [resist({ hostname: 'news.example' })],
      })
    );

    expect(csv).toContain('event_type,created_at,created_at_ms');
    expect(csv).toContain('quest_completed');
    expect(csv).toContain('resisted_visit');
    expect(csv).toContain('"Line one, ""quoted""\nline two"');
  });
});
