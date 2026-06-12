import { describe, expect, it } from 'vitest';

import {
  activeTimeBlockEndsAt,
  formatSeconds,
  formatTime,
  isTimeBlockActive,
  nextBlockStart,
} from './schedule';
import type { TimeBlock } from './types';

function at(day: number, hour: number, minute = 0): Date {
  return new Date(2026, 5, day, hour, minute, 0, 0);
}

function block(overrides: Partial<TimeBlock> = {}): TimeBlock {
  return {
    id: 'block-1',
    label: 'Focus',
    days: [1],
    startTime: '09:00',
    endTime: '17:00',
    blockListIds: ['social'],
    questIds: ['reflection'],
    ...overrides,
  };
}

describe('isTimeBlockActive', () => {
  it('is active within a same-day window and inactive at the exclusive end', () => {
    const tb = block();

    expect(isTimeBlockActive(tb, at(8, 9))).toBe(true);
    expect(isTimeBlockActive(tb, at(8, 16, 59))).toBe(true);
    expect(isTimeBlockActive(tb, at(8, 17))).toBe(false);
    expect(isTimeBlockActive(tb, at(9, 9))).toBe(false);
  });

  it('handles blocks that span midnight into the next day', () => {
    const tb = block({ days: [1], startTime: '22:00', endTime: '06:00' });

    expect(isTimeBlockActive(tb, at(8, 23))).toBe(true);
    expect(isTimeBlockActive(tb, at(9, 5, 59))).toBe(true);
    expect(isTimeBlockActive(tb, at(9, 6))).toBe(false);
    expect(isTimeBlockActive(tb, at(10, 5))).toBe(false);
  });

  it('is inactive when no days are selected', () => {
    expect(isTimeBlockActive(block({ days: [] }), at(8, 10))).toBe(false);
  });
});

describe('activeTimeBlockEndsAt', () => {
  it('returns the end of the active same-day occurrence', () => {
    const endsAt = activeTimeBlockEndsAt(block(), at(8, 10));

    expect(endsAt).toBe(at(8, 17).getTime());
  });

  it('returns tomorrow when the active occurrence spans midnight from today', () => {
    const tb = block({ startTime: '22:00', endTime: '06:00' });

    expect(activeTimeBlockEndsAt(tb, at(8, 23))).toBe(at(9, 6).getTime());
  });

  it('returns today when the active occurrence started yesterday', () => {
    const tb = block({ startTime: '22:00', endTime: '06:00' });

    expect(activeTimeBlockEndsAt(tb, at(9, 5))).toBe(at(9, 6).getTime());
  });

  it('returns null when the block is inactive', () => {
    expect(activeTimeBlockEndsAt(block(), at(8, 18))).toBeNull();
  });
});

describe('nextBlockStart', () => {
  it('returns the nearest future start across blocks', () => {
    const soon = block({ id: 'soon', days: [1], startTime: '12:00' });
    const later = block({ id: 'later', days: [1], startTime: '15:00' });

    expect(nextBlockStart([later, soon], at(8, 10))).toBe(at(8, 12).getTime());
  });

  it('skips starts that are not in the future', () => {
    expect(nextBlockStart([block()], at(8, 9))).toBe(at(15, 9).getTime());
  });

  it('returns null when no blocks have scheduled days', () => {
    expect(nextBlockStart([block({ days: [] })], at(8, 9))).toBeNull();
  });
});

describe('formatters', () => {
  it('formats 24-hour times as compact 12-hour labels', () => {
    expect(formatTime('00:00')).toBe('12am');
    expect(formatTime('09:05')).toBe('9:05am');
    expect(formatTime('12:00')).toBe('12pm');
    expect(formatTime('23:30')).toBe('11:30pm');
  });

  it('formats seconds as m:ss', () => {
    expect(formatSeconds(0)).toBe('0:00');
    expect(formatSeconds(65)).toBe('1:05');
  });
});
