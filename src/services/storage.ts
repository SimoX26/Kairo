import { Preferences } from '@capacitor/preferences';
import { createInitialState, defaultSettings } from '../data';
import { phaseDurationSeconds } from '../lib/timers';
import type { Activity, AppState, AppTheme, PomodoroState, Session, TimeSegment } from '../types';

const STORAGE_KEY = 'kairo.app-state.v1';

function validIso(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime());
}

function normalizeSegments(value: unknown): TimeSegment[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (segment): segment is TimeSegment =>
      typeof segment === 'object' &&
      segment !== null &&
      validIso((segment as TimeSegment).startedAt) &&
      validIso((segment as TimeSegment).endedAt) &&
      new Date((segment as TimeSegment).endedAt) >= new Date((segment as TimeSegment).startedAt),
  );
}

function normalizeActivities(value: unknown, fallback: Activity[]): Activity[] {
  if (!Array.isArray(value)) return fallback;
  const activities = value.filter(
    (activity): activity is Activity =>
      typeof activity === 'object' &&
      activity !== null &&
      typeof (activity as Activity).id === 'string' &&
      typeof (activity as Activity).name === 'string' &&
      typeof (activity as Activity).color === 'string',
  );
  return activities.length ? activities.map((activity) => ({ ...activity, archived: Boolean(activity.archived) })) : fallback;
}

function normalizeSessions(value: unknown): Session[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (session): session is Session =>
        typeof session === 'object' &&
        session !== null &&
        typeof (session as Session).id === 'string' &&
        typeof (session as Session).activityId === 'string' &&
        validIso((session as Session).startedAt) &&
        validIso((session as Session).endedAt) &&
        Number.isFinite((session as Session).durationSeconds) &&
        (session as Session).durationSeconds > 0,
    )
    .map((session) => ({ ...session, segments: normalizeSegments(session.segments) }));
}

function normalizeTheme(value: unknown): AppTheme {
  if (value === 'light' || value === 'nature-dark' || value === 'nature-light') return value;
  return 'dark';
}

export function normalizeState(value: unknown): AppState {
  const fallback = createInitialState();
  if (!value || typeof value !== 'object') return fallback;

  const candidate = value as Partial<AppState>;
  const activities = normalizeActivities(candidate.activities, fallback.activities);
  const activeActivities = activities.filter((activity) => !activity.archived);
  const settings = {
    ...defaultSettings,
    ...(candidate.settings ?? {}),
    theme: normalizeTheme(candidate.settings?.theme),
  };
  const rawPomodoro = candidate.pomodoro as Partial<PomodoroState> | undefined;
  const phase = rawPomodoro?.phase === 'shortBreak' || rawPomodoro?.phase === 'longBreak' ? rawPomodoro.phase : 'focus';
  const fallbackTargetSeconds = phaseDurationSeconds(phase, settings);
  const activityId = activities.some((activity) => activity.id === rawPomodoro?.activityId && !activity.archived)
    ? rawPomodoro!.activityId!
    : (activeActivities[0]?.id ?? activities[0].id);

  const pomodoro: PomodoroState = {
    ...fallback.pomodoro,
    ...rawPomodoro,
    phase,
    activityId,
    remainingSeconds: Math.max(0, Number(rawPomodoro?.remainingSeconds ?? fallbackTargetSeconds)),
    targetSeconds: Math.max(1, Number(rawPomodoro?.targetSeconds ?? fallbackTargetSeconds)),
    isRunning: Boolean(rawPomodoro?.isRunning && validIso(rawPomodoro.runningSince)),
    runningSince: validIso(rawPomodoro?.runningSince) ? rawPomodoro.runningSince : null,
    phaseStartedAt: validIso(rawPomodoro?.phaseStartedAt) ? rawPomodoro.phaseStartedAt : null,
    segments: normalizeSegments(rawPomodoro?.segments),
  };

  const rawTimer = candidate.timer;
  const timer =
    rawTimer &&
    activities.some((activity) => activity.id === rawTimer.activityId) &&
    validIso(rawTimer.sessionStartedAt)
      ? {
          ...rawTimer,
          accumulatedSeconds: Math.max(0, Number(rawTimer.accumulatedSeconds) || 0),
          isRunning: Boolean(rawTimer.isRunning && validIso(rawTimer.runningSince)),
          runningSince: validIso(rawTimer.runningSince) ? rawTimer.runningSince : null,
          segments: normalizeSegments(rawTimer.segments),
        }
      : null;

  return {
    schemaVersion: 1,
    activities,
    sessions: normalizeSessions(candidate.sessions),
    timer,
    pomodoro,
    settings,
  };
}

export async function loadState(): Promise<AppState> {
  const { value } = await Preferences.get({ key: STORAGE_KEY });
  if (!value) return createInitialState();

  try {
    return normalizeState(JSON.parse(value));
  } catch {
    return createInitialState();
  }
}

export async function saveState(state: AppState): Promise<void> {
  await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(state) });
}

export async function clearStoredState(): Promise<void> {
  await Preferences.remove({ key: STORAGE_KEY });
}
