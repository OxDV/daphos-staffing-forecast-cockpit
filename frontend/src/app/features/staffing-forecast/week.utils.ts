/** ISO calendar-date helpers that avoid local timezone shifts. */

function toUtcDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function mondayOf(isoDate: string): string {
  const date = toUtcDate(isoDate);
  const weekday = date.getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + offset);
  return toIsoDate(date);
}

export function addDays(isoDate: string, amount: number): string {
  const date = toUtcDate(isoDate);
  date.setUTCDate(date.getUTCDate() + amount);
  return toIsoDate(date);
}

export function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = toUtcDate(weekStart);
  const end = toUtcDate(weekEnd);
  const startLabel = start.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const endLabel = end.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `${startLabel} – ${endLabel}`;
}

export function formatDayHeading(isoDate: string): string {
  const date = toUtcDate(isoDate);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function isoWeekNumber(weekStart: string): number {
  const date = toUtcDate(weekStart);
  const dayNumber = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const diff = date.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}

export function formatConfidencePercent(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}
