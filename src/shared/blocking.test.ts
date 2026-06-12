import { describe, expect, it } from 'vitest';

import { decideBlock, eligibleQuests } from './blocking';
import { DEFAULT_STATE } from './storage';
import type { AppState, SideQuest } from './types';

function at(day: number, hour: number, minute = 0): Date {
  return new Date(2026, 5, day, hour, minute, 0, 0);
}

function quest(id: string, name = id): SideQuest {
  return {
    id,
    type: 'timer',
    name,
    passDurationMinutes: 10,
    config: { seconds: 60 },
  };
}

function state(overrides: Partial<AppState> = {}): AppState {
  return {
    ...DEFAULT_STATE,
    blockLists: [
      {
        id: 'social',
        name: 'Social',
        sites: ['twitter.com', 'reddit.com'],
      },
    ],
    timeBlocks: [
      {
        id: 'weekday-focus',
        label: 'Weekday focus',
        days: [1],
        startTime: '09:00',
        endTime: '17:00',
        blockListIds: ['social'],
        questIds: ['reflection'],
      },
    ],
    quests: [quest('reflection', 'Reflection'), quest('timer', 'Timer')],
    passes: [],
    history: [],
    adHocSessions: [],
    resists: [],
    ...overrides,
  };
}

describe('decideBlock', () => {
  it('blocks matching sites during an active scheduled block', () => {
    expect(decideBlock(state(), 'https://mobile.twitter.com/home', at(8, 10))).toEqual({
      blocked: true,
      questIds: ['reflection'],
      allowAnyQuest: false,
    });
  });

  it('does not block outside the active schedule or for non-matching sites', () => {
    expect(decideBlock(state(), 'https://twitter.com/home', at(8, 18)).blocked).toBe(false);
    expect(decideBlock(state(), 'https://example.com', at(8, 10)).blocked).toBe(false);
  });

  it('does not block invalid or unsupported URLs', () => {
    expect(decideBlock(state(), 'chrome://extensions', at(8, 10)).blocked).toBe(false);
    expect(decideBlock(state(), 'not a url', at(8, 10)).blocked).toBe(false);
  });

  it('allows a blocked hostname while an unexpired pass exists', () => {
    const now = at(8, 10);
    const s = state({
      passes: [
        {
          hostname: 'twitter.com',
          earnedAt: at(8, 9).getTime(),
          expiresAt: at(8, 11).getTime(),
          questId: 'reflection',
        },
      ],
    });

    expect(decideBlock(s, 'https://mobile.twitter.com/home', now).blocked).toBe(false);
  });

  it('ignores expired passes', () => {
    const now = at(8, 10);
    const s = state({
      passes: [
        {
          hostname: 'twitter.com',
          earnedAt: at(8, 8).getTime(),
          expiresAt: at(8, 9).getTime(),
          questId: 'reflection',
        },
      ],
    });

    expect(decideBlock(s, 'https://twitter.com/home', now).blocked).toBe(true);
  });

  it('blocks ad hoc sessions and allows any configured quest', () => {
    const now = at(8, 20);
    const s = state({
      timeBlocks: [],
      adHocSessions: [
        {
          id: 'adhoc-1',
          blockListIds: ['social'],
          startedAt: at(8, 19).getTime(),
          endsAt: at(8, 21).getTime(),
        },
      ],
    });

    expect(decideBlock(s, 'https://reddit.com/r/all', now)).toEqual({
      blocked: true,
      questIds: [],
      allowAnyQuest: true,
    });
  });

  it('combines quest ids from every matching source without duplicates', () => {
    const s = state({
      timeBlocks: [
        {
          id: 'first',
          label: 'First',
          days: [1],
          startTime: '09:00',
          endTime: '17:00',
          blockListIds: ['social'],
          questIds: ['reflection', 'timer'],
        },
        {
          id: 'second',
          label: 'Second',
          days: [1],
          startTime: '09:00',
          endTime: '17:00',
          blockListIds: ['social'],
          questIds: ['timer'],
        },
      ],
    });

    expect(decideBlock(s, 'https://twitter.com/home', at(8, 10)).questIds).toEqual([
      'reflection',
      'timer',
    ]);
  });
});

describe('eligibleQuests', () => {
  it('returns all quests when the decision came from an ad hoc session', () => {
    const s = state();

    expect(eligibleQuests(s, { blocked: true, questIds: [], allowAnyQuest: true })).toEqual(
      s.quests
    );
  });

  it('returns only named quests and drops unknown ids', () => {
    const s = state();

    expect(
      eligibleQuests(s, {
        blocked: true,
        questIds: ['timer', 'missing'],
        allowAnyQuest: false,
      })
    ).toEqual([s.quests[1]]);
  });
});
