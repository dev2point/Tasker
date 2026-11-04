import { describe, it, expect } from 'vitest';
import {
  getDefaultDueDateTime,
  isDueDateTimeInPast,
  getMinDateStr,
  getMinTimeForDate,
  formatLocalDate,
  formatLocalTime,
  parseLocalDateTime,
} from '@/lib/due-date-utils';

describe('Due Date & Time Calculation & Strict Future Validation', () => {
  describe('getDefaultDueDateTime (+2 hours rounded to next full hour)', () => {
    it('should round 18:25 to 21:00 on the same day', () => {
      // 2026-11-03 at 18:25:00
      const baseDate = new Date(2026, 10, 3, 18, 25, 0);
      const res = getDefaultDueDateTime(baseDate);

      expect(res.dueDate).toBe('2026-11-03');
      expect(res.dueTime).toBe('21:00');
    });

    it('should round 14:00 to 16:00 on exact hour (no extra hour increment)', () => {
      // 2026-11-03 at 14:00:00
      const baseDate = new Date(2026, 10, 3, 14, 0, 0);
      const res = getDefaultDueDateTime(baseDate);

      expect(res.dueDate).toBe('2026-11-03');
      expect(res.dueTime).toBe('16:00');
    });

    it('should round 14:01 to 17:00 because minutes > 0', () => {
      const baseDate = new Date(2026, 10, 3, 14, 1, 0);
      const res = getDefaultDueDateTime(baseDate);

      expect(res.dueDate).toBe('2026-11-03');
      expect(res.dueTime).toBe('17:00');
    });

    it('should handle late evening and rollover to next day correctly (23:15 -> next day 02:00)', () => {
      const baseDate = new Date(2026, 10, 3, 23, 15, 0);
      const res = getDefaultDueDateTime(baseDate);

      // 23:15 + 2h = 01:15 next day -> round up = 02:00 next day
      expect(res.dueDate).toBe('2026-11-04');
      expect(res.dueTime).toBe('02:00');
    });

    it('should handle 22:00 rollover (22:00 + 2h = 00:00 midnight next day)', () => {
      const baseDate = new Date(2026, 10, 3, 22, 0, 0);
      const res = getDefaultDueDateTime(baseDate);

      expect(res.dueDate).toBe('2026-11-04');
      expect(res.dueTime).toBe('00:00');
    });
  });

  describe('isDueDateTimeInPast', () => {
    const reference = new Date(2026, 10, 3, 18, 25, 0); // Reference: 2026-11-03 at 18:25

    it('should flag 14:00 today as past when current time is 18:25', () => {
      const isPast = isDueDateTimeInPast('2026-11-03', '14:00', reference);
      expect(isPast).toBe(true);
    });

    it('should flag 18:20 today as past', () => {
      const isPast = isDueDateTimeInPast('2026-11-03', '18:20', reference);
      expect(isPast).toBe(true);
    });

    it('should NOT flag 21:00 today as past', () => {
      const isPast = isDueDateTimeInPast('2026-11-03', '21:00', reference);
      expect(isPast).toBe(false);
    });

    it('should NOT flag tomorrow as past even without time', () => {
      const isPast = isDueDateTimeInPast('2026-11-04', undefined, reference);
      expect(isPast).toBe(false);
    });

    it('should flag yesterday as past even without time', () => {
      const isPast = isDueDateTimeInPast('2026-11-02', undefined, reference);
      expect(isPast).toBe(true);
    });

    it('should allow tolerance of 1 minute so current minute is not immediately flagged', () => {
      // 18:25:30 compared to 18:25:00
      const isPast = isDueDateTimeInPast('2026-11-03', '18:25', reference);
      expect(isPast).toBe(false);
    });
  });

  describe('getMinDateStr and getMinTimeForDate', () => {
    const reference = new Date(2026, 10, 3, 18, 25, 0);

    it('should return current date for getMinDateStr', () => {
      expect(getMinDateStr(reference)).toBe('2026-11-03');
    });

    it('should return current time when selectedDate is today', () => {
      expect(getMinTimeForDate('2026-11-03', reference)).toBe('18:25');
    });

    it('should return undefined when selectedDate is a future date', () => {
      expect(getMinTimeForDate('2026-11-04', reference)).toBeUndefined();
    });
  });
});
