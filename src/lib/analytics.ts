import type { Activity, Session, TimeRange } from '../types';
import { addDays, localDateKey, sessionSecondsInRange, startOfDay } from './date';

export interface ActivityTotal {
  activity: Activity;
  seconds: number;
  percentage: number;
  sessions: number;
}

export interface PeriodMetrics {
  totalSeconds: number;
  sessionCount: number;
  averageSeconds: number;
  pomodoros: number;
  completedPomodoros: number;
  completionRate: number | null;
  activeDays: number;
}

export interface TrendPoint {
  key: string;
  label: string;
  seconds: number;
}

export function sessionsInRange(sessions: Session[], range: TimeRange): Session[] {
  return sessions.filter((session) => sessionSecondsInRange(session, range) > 0);
}

export function calculateMetrics(sessions: Session[], range: TimeRange): PeriodMetrics {
  const relevant = sessionsInRange(sessions, range);
  const totalSeconds = relevant.reduce((sum, session) => sum + sessionSecondsInRange(session, range), 0);
  const pomodoros = relevant.filter((session) => session.source === 'pomodoro');
  const completedPomodoros = pomodoros.filter((session) => session.completed).length;
  const activeDays = dailyTrend(relevant, range).filter((point) => point.seconds > 0).length;

  return {
    totalSeconds,
    sessionCount: relevant.length,
    averageSeconds: relevant.length ? Math.round(totalSeconds / relevant.length) : 0,
    pomodoros: pomodoros.length,
    completedPomodoros,
    completionRate: pomodoros.length ? Math.round((completedPomodoros / pomodoros.length) * 100) : null,
    activeDays,
  };
}

export function activityTotals(
  sessions: Session[],
  activities: Activity[],
  range: TimeRange,
): ActivityTotal[] {
  const totalSeconds = sessions.reduce((sum, session) => sum + sessionSecondsInRange(session, range), 0);

  return activities
    .map((activity) => {
      const activitySessions = sessions.filter((session) => session.activityId === activity.id);
      const seconds = activitySessions.reduce(
        (sum, session) => sum + sessionSecondsInRange(session, range),
        0,
      );
      return {
        activity,
        seconds,
        sessions: activitySessions.filter((session) => sessionSecondsInRange(session, range) > 0).length,
        percentage: totalSeconds ? Math.round((seconds / totalSeconds) * 100) : 0,
      };
    })
    .filter((item) => item.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);
}

export function percentageChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function dailyTrend(sessions: Session[], range: TimeRange): TrendPoint[] {
  const points: TrendPoint[] = [];
  const cursor = startOfDay(range.start);

  while (cursor < range.end) {
    const dayStart = new Date(cursor);
    const dayEnd = addDays(dayStart, 1);
    const dayRange = { start: dayStart, end: dayEnd < range.end ? dayEnd : range.end };
    points.push({
      key: localDateKey(dayStart),
      label: new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric' }).format(dayStart),
      seconds: sessions.reduce((sum, session) => sum + sessionSecondsInRange(session, dayRange), 0),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return points;
}

export function currentStreak(sessions: Session[], now: Date): number {
  const activeDays = new Set<string>();
  for (const session of sessions) {
    const sessionStart = startOfDay(new Date(session.startedAt));
    const sessionEnd = new Date(session.endedAt);
    let cursor = sessionStart;
    while (cursor < sessionEnd) {
      const dayRange = { start: cursor, end: addDays(cursor, 1) };
      if (sessionSecondsInRange(session, dayRange) > 0) activeDays.add(localDateKey(cursor));
      cursor = dayRange.end;
    }
  }
  let cursor = startOfDay(now);

  if (!activeDays.has(localDateKey(cursor))) {
    cursor = addDays(cursor, -1);
  }

  let streak = 0;
  while (activeDays.has(localDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
