import { describe, expect, it } from 'vitest';

import {
  type Grade,
  type RoundState,
  initRound,
  reduceRound,
} from './flashcard-round';
import type { FlashcardItem } from '../shared/types';

const deck = (n: number): FlashcardItem[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `c${i}`,
    front: `q${i}`,
    back: `a${i}`,
  }));

function play(
  cards: FlashcardItem[],
  required: number | null,
  grades: Grade[],
): RoundState {
  return grades.reduce(
    (s, result) => reduceRound(s, { result, required }),
    initRound(cards),
  );
}

describe('reduceRound — review only (no threshold)', () => {
  it('finishes after a single pass regardless of misses', () => {
    const end = play(deck(3), null, ['correct', 'missed', 'correct']);
    expect(end.finished).toBe(true);
    expect(end.correct).toBe(2);
    expect(end.faced).toBe(3);
    expect(end.everMissed).toEqual(['c1']);
    // Every distinct card faced is recorded once, in order, for the log.
    expect(end.seen.map((c) => c.id)).toEqual(['c0', 'c1', 'c2']);
  });

  it('does not advance once finished', () => {
    const end = play(deck(1), null, ['correct']);
    expect(end.finished).toBe(true);
    expect(reduceRound(end, { result: 'missed', required: null })).toBe(end);
  });
});

describe('reduceRound — threshold', () => {
  it('finishes early the moment the threshold is cleared', () => {
    const end = play(deck(5), 2, ['correct', 'correct']);
    expect(end.finished).toBe(true);
    expect(end.correct).toBe(2);
    // Stopped after two cards, did not face the remaining three.
    expect(end.faced).toBe(2);
    expect(end.seen.map((c) => c.id)).toEqual(['c0', 'c1']);
  });

  it('retries only the missed cards until the threshold is met', () => {
    // 3-card deck, need all 3. Miss the last, then clear it on the retry pass.
    const end = play(deck(3), 3, ['correct', 'correct', 'missed', 'correct']);
    expect(end.finished).toBe(true);
    expect(end.correct).toBe(3);
    expect(end.faced).toBe(4); // three in the first pass, one retry
    expect(end.everMissed).toEqual(['c2']);
  });

  it('keeps retrying across multiple rounds and never strands the user', () => {
    // Need 1 correct but miss the only card twice before getting it.
    const end = play(deck(1), 1, ['missed', 'missed', 'correct']);
    expect(end.finished).toBe(true);
    expect(end.correct).toBe(1);
    expect(end.faced).toBe(3);
  });

  it('is not finished while still short of the threshold mid-round', () => {
    const mid = play(deck(4), 4, ['correct', 'correct']);
    expect(mid.finished).toBe(false);
    expect(mid.pending).toHaveLength(2);
  });
});
