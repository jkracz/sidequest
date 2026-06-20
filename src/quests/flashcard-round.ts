import type { FlashcardItem } from '../shared/types';

export type Grade = 'correct' | 'missed';

export interface RoundState {
  /** Cards still to face in the current pass. */
  pending: FlashcardItem[];
  /** Cards missed this pass, fed back in for a retry when a threshold is set. */
  missed: FlashcardItem[];
  /** Ids of every card missed at least once, for the "worth another look" list. */
  everMissed: string[];
  /** Distinct cards actually faced this session, in order — for the quest log. */
  seen: FlashcardItem[];
  /** Distinct cards graded correct (counts toward the threshold). */
  correct: number;
  /** Total gradings this session. */
  faced: number;
  finished: boolean;
}

export function initRound(cards: FlashcardItem[]): RoundState {
  return {
    pending: cards,
    missed: [],
    everMissed: [],
    seen: [],
    correct: 0,
    faced: 0,
    finished: cards.length === 0,
  };
}

/**
 * Advance the round by one grade. With no threshold the quest finishes after a
 * single pass; with a threshold, missed cards are retried until enough are
 * cleared, so the user always has a way through (and drills what they don't know).
 */
export function reduceRound(
  s: RoundState,
  action: { result: Grade; required: number | null },
): RoundState {
  if (s.finished || s.pending.length === 0) return s;
  const [card, ...rest] = s.pending;
  const isCorrect = action.result === 'correct';
  const faced = s.faced + 1;
  const correct = s.correct + (isCorrect ? 1 : 0);
  const missed = isCorrect ? s.missed : [...s.missed, card];
  const everMissed =
    isCorrect || s.everMissed.includes(card.id)
      ? s.everMissed
      : [...s.everMissed, card.id];
  const seen = s.seen.some((c) => c.id === card.id)
    ? s.seen
    : [...s.seen, card];
  const { required } = action;
  const base = { missed, everMissed, seen, correct, faced };

  // Threshold reached — stop early, no need to finish the pass.
  if (required != null && correct >= required) {
    return { ...base, pending: [], finished: true };
  }
  // More cards left in this pass.
  if (rest.length > 0) {
    return { ...base, pending: rest, finished: false };
  }
  // Pass complete. Review-only quests are done; threshold quests retry misses.
  if (required == null) {
    return { ...base, pending: [], finished: true };
  }
  if (missed.length > 0) {
    return { ...base, pending: missed, missed: [], finished: false };
  }
  return { ...base, pending: [], finished: true };
}
