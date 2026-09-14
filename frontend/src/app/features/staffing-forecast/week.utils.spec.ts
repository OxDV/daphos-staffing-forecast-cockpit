import {
  addDays,
  formatConfidencePercent,
  formatDayHeading,
  formatWeekRange,
  isoWeekNumber,
  mondayOf,
} from './week.utils';

describe('week.utils', () => {
  it('normalizes dates to Monday', () => {
    expect(mondayOf('2026-09-16')).toBe('2026-09-14');
    expect(mondayOf('2026-09-13')).toBe('2026-09-07');
  });

  it('adds days in UTC', () => {
    expect(addDays('2026-09-14', 7)).toBe('2026-09-21');
    expect(addDays('2026-09-14', -7)).toBe('2026-09-07');
  });

  it('formats week range and day headings', () => {
    expect(formatWeekRange('2026-09-14', '2026-09-20')).toContain('14');
    expect(formatWeekRange('2026-09-14', '2026-09-20')).toContain('20');
    expect(formatDayHeading('2026-09-14')).toContain('14');
  });

  it('computes ISO week numbers and confidence percents', () => {
    expect(isoWeekNumber('2026-09-14')).toBe(38);
    expect(formatConfidencePercent(0.58)).toBe('58%');
    expect(formatConfidencePercent(0.8)).toBe('80%');
  });
});
