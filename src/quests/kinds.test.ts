import { describe, expect, it } from 'vitest';

import { QUEST_TYPES, defaultQuests, migrateQuest } from './kinds';
import type { SideQuest } from '../shared/types';

describe('defaultQuests', () => {
  it('creates one instance of every kind with stable ids', () => {
    const quests = defaultQuests();
    expect([...quests.map((q) => q.type)].sort()).toEqual([...QUEST_TYPES].sort());
    expect(quests.find((q) => q.type === 'flashcards')?.id).toBe('quest-flashcards-default');
  });

  it('ships a non-empty starter deck so flashcards can run on first use', () => {
    const flashcards = defaultQuests().find((q) => q.type === 'flashcards');
    expect(flashcards?.type === 'flashcards' && flashcards.config.cards.length).toBeGreaterThan(0);
  });
});

describe('migrateQuest', () => {
  it('upgrades a legacy single-prompt reflection config', () => {
    const legacy = {
      id: 'r',
      type: 'reflection',
      name: 'R',
      config: { prompt: 'Why?' },
    } as unknown as SideQuest;

    const migrated = migrateQuest(legacy, 10);
    expect(migrated?.type).toBe('reflection');
    if (migrated?.type === 'reflection') {
      expect(migrated.config.prompts).toEqual(['Why?']);
      expect(migrated.config.minChars).toBe(150);
    }
    // passDurationMinutes was absent, so it falls back to the legacy global.
    expect(migrated?.passDurationMinutes).toBe(10);
  });

  it('keeps an explicit pass duration over the legacy fallback', () => {
    const quest: SideQuest = {
      id: 't',
      type: 'timer',
      name: 'T',
      passDurationMinutes: 25,
      config: { seconds: 60 },
    };
    expect(migrateQuest(quest, 10)?.passDurationMinutes).toBe(25);
  });

  it('fills flashcard config defaults', () => {
    const legacy = {
      id: 'f',
      type: 'flashcards',
      name: 'F',
      passDurationMinutes: 5,
      config: {},
    } as unknown as SideQuest;

    const migrated = migrateQuest(legacy, 10);
    expect(migrated?.type).toBe('flashcards');
    if (migrated?.type === 'flashcards') {
      expect(migrated.config.cards).toEqual([]);
      expect(migrated.config.cardsPerPass).toBe(5);
      expect(migrated.config.order).toBe('random');
    }
  });

  it('migrates legacy push-up quests into counter quests', () => {
    const legacy = {
      id: 'p',
      type: 'pushups',
      name: 'Push-ups',
      passDurationMinutes: 5,
      config: { reps: 12 },
    } as unknown as SideQuest;

    const migrated = migrateQuest(legacy, 10);
    expect(migrated?.type).toBe('counter');
    if (migrated?.type === 'counter') {
      expect(migrated.config).toEqual({
        target: 12,
        unit: 'push-up',
        prompt: 'Drop and give yourself',
      });
    }
  });

  it('drops a quest whose kind no longer exists', () => {
    const ghost = {
      id: 'x',
      type: 'mystery',
      name: 'X',
      passDurationMinutes: 10,
      config: {},
    } as unknown as SideQuest;
    expect(migrateQuest(ghost, 10)).toBeNull();
  });
});
