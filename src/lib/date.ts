import type { CalendarMode, ReportPeriod, Session, TimeRange } from '../types';

export const SECOND = 1_000;
export const MINUTE_SECONDS = 60;
export const HOUR_SECONDS = 3_600;
export const DAY_MS = 86_400_000;

export function startOfDay(input: Date): Date {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDayExclusive(input: Date): Date {
  return addDays(startOfDay(input), 1);
}

export function startOfWeek(input: Date): Date {
  const date = startOfDay(input);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return date;
}

export function startOfMonth(input: Date): Date {
  const date = startOfDay(input);
  date.setDate(1);
  return date;
}

export function addDays(input: Date, amount: number): Date {
  const date = new Date(input);
  date.setDate(date.getDate() + amount);
  return date;
}

export function addMonths(input: Date, amount: number): Date {
  const date = new Date(input);
  date.setDate(1);
  date.setMonth(date.getMonth() + amount);
  return date;
}

export function localDateKey(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCalendarRange(mode: CalendarMode, anchor: Date): TimeRange {
  if (mode === 'day') {
    return { start: startOfDay(anchor), end: endOfDayExclusive(anchor) };
  }

  if (mode === 'week') {
    const start = startOfWeek(anchor);
    return { start, end: addDays(start, 7) };
  }

  const start = startOfMonth(anchor);
  return { start, end: addMonths(start, 1) };
}

export function getReportRange(period: ReportPeriod, anchor: Date): TimeRange {
  if (period === 'week') {
    const start = startOfWeek(anchor);
    return { start, end: addDays(start, 7) };
  }

  if (period === 'month') {
    const start = startOfMonth(anchor);
    return { start, end: addMonths(start, 1) };
  }

  const end = endOfDayExclusive(anchor);
  return { start: addDays(end, -90), end };
}

export function getComparableReportRanges(
  period: ReportPeriod,
  now: Date,
): { current: TimeRange; previous: TimeRange } {
  const fullCurrent = getReportRange(period, now);
  const current: TimeRange = {
    start: fullCurrent.start,
    end: new Date(Math.min(fullCurrent.end.getTime(), now.getTime())),
  };

  if (period === 'quarter') {
    return { current, previous: previousRange(current) };
  }

  const previousStart = period === 'week'
    ? addDays(fullCurrent.start, -7)
    : addMonths(fullCurrent.start, -1);
  const previousFullEnd = period === 'week' ? addDays(previousStart, 7) : addMonths(previousStart, 1);
  const elapsed = Math.max(0, current.end.getTime() - current.start.getTime());
  return {
    current,
    previous: {
      start: previousStart,
      end: new Date(Math.min(previousFullEnd.getTime(), previousStart.getTime() + elapsed)),
    },
  };
}

export function previousRange(range: TimeRange): TimeRange {
  const duration = range.end.getTime() - range.start.getTime();
  return {
    start: new Date(range.start.getTime() - duration),
    end: new Date(range.end.getTime() - duration),
  };
}

export function sessionSecondsInRange(session: Session, range: TimeRange): number {
  if (session.segments?.length) {
    return session.segments.reduce((total, segment) => {
      const segmentStart = new Date(segment.startedAt).getTime();
      const segmentEnd = new Date(segment.endedAt).getTime();
      const overlap = Math.max(
        0,
        Math.min(segmentEnd, range.end.getTime()) - Math.max(segmentStart, range.start.getTime()),
      );
      return total + Math.round(overlap / 1_000);
    }, 0);
  }

  const sessionStart = new Date(session.startedAt).getTime();
  const sessionEnd = new Date(session.endedAt).getTime();
  const rangeStart = range.start.getTime();
  const rangeEnd = range.end.getTime();

  if (!Number.isFinite(sessionStart) || !Number.isFinite(sessionEnd) || session.durationSeconds <= 0) {
    return 0;
  }

  if (sessionEnd <= rangeStart || sessionStart >= rangeEnd) {
    return 0;
  }

  const wallDuration = Math.max(1, sessionEnd - sessionStart);
  const overlap = Math.max(0, Math.min(sessionEnd, rangeEnd) - Math.max(sessionStart, rangeStart));
  return Math.round(session.durationSeconds * (overlap / wallDuration));
}

export function formatDuration(totalSeconds: number, compact = false): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSeconds / HOUR_SECONDS);
  const minutes = Math.floor((safeSeconds % HOUR_SECONDS) / MINUTE_SECONDS);

  if (compact) {
    if (hours === 0) return `${minutes}m`;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatTimer(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / HOUR_SECONDS);
  const minutes = Math.floor((safeSeconds % HOUR_SECONDS) / MINUTE_SECONDS);
  const seconds = safeSeconds % MINUTE_SECONDS;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatRangeLabel(range: TimeRange): string {
  const endInclusive = new Date(range.end.getTime() - 1);
  const sameMonth = range.start.getMonth() === endInclusive.getMonth();
  const start = new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    ...(sameMonth ? {} : { month: 'short' as const }),
  }).format(range.start);
  const end = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(endInclusive);
  return `${start} – ${end}`;
}

export function shiftCalendarAnchor(anchor: Date, mode: CalendarMode, direction: -1 | 1): Date {
  if (mode === 'day') return addDays(anchor, direction);
  if (mode === 'week') return addDays(anchor, direction * 7);
  return addMonths(anchor, direction);
}
