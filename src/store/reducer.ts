import { createDefaultPomodoro, createInitialState } from '../data';
import { createId } from '../lib/id';
import { phaseDurationSeconds, pomodoroSecondsLeft, runningTimerSeconds } from '../lib/timers';
import type {
  Activity,
  AppSettings,
  AppState,
  PomodoroPhase,
  Session,
  TimeSegment,
} from '../types';

export type AppAction =
  | { type: 'hydrate'; state: AppState }
  | { type: 'activity/add'; activity: Activity }
  | { type: 'activity/update'; activityId: string; patch: Partial<Omit<Activity, 'id' | 'createdAt'>> }
  | { type: 'activity/archive'; activityId: string }
  | { type: 'timer/start'; activityId: string; at: string }
  | { type: 'timer/pause'; at: string }
  | { type: 'timer/resume'; at: string }
  | { type: 'timer/stop'; at: string; sessionId: string }
  | { type: 'timer/discard' }
  | { type: 'pomodoro/select-activity'; activityId: string }
  | { type: 'pomodoro/set-phase'; phase: PomodoroPhase }
  | { type: 'pomodoro/start'; at: string }
  | { type: 'pomodoro/pause'; at: string }
  | { type: 'pomodoro/reset' }
  | { type: 'pomodoro/complete'; at: string; sessionId: string; expectedPhase: PomodoroPhase; expectedRunningSince: string; allowAutoStart: boolean }
  | { type: 'pomodoro/skip'; at: string; sessionId: string; expectedPhase: PomodoroPhase; expectedPhaseStartedAt: string | null }
  | { type: 'settings/update'; patch: Partial<AppSettings> }
  | { type: 'session/remove'; sessionId: string }
  | { type: 'state/reset' };

function closeSegment(segments: TimeSegment[], runningSince: string | null, at: string): TimeSegment[] {
  if (!runningSince) return segments;
  const startedAt = new Date(runningSince).getTime();
  const endedAt = Math.max(startedAt, new Date(at).getTime());
  return [...segments, { startedAt: runningSince, endedAt: new Date(endedAt).toISOString() }];
}

function segmentSeconds(segments: TimeSegment[]): number {
  return Math.round(
    segments.reduce(
      (total, segment) => total + Math.max(0, new Date(segment.endedAt).getTime() - new Date(segment.startedAt).getTime()),
      0,
    ) / 1_000,
  );
}

function nextPhase(
  current: PomodoroPhase,
  rounds: number,
  settings: AppSettings,
  completedFocus: boolean,
): PomodoroPhase {
  if (current !== 'focus') return 'focus';
  return completedFocus && rounds > 0 && rounds % settings.roundsBeforeLongBreak === 0 ? 'longBreak' : 'shortBreak';
}

function advancePomodoro(
  state: AppState,
  at: string,
  countRound: boolean,
  allowAutoStart = true,
): AppState['pomodoro'] {
  const rounds = state.pomodoro.completedFocusRounds + (countRound ? 1 : 0);
  const phase = nextPhase(state.pomodoro.phase, rounds, state.settings, countRound);
  const shouldAutoStart = allowAutoStart && (phase === 'focus' ? state.settings.autoStartFocus : state.settings.autoStartBreaks);
  return {
    phase,
    activityId: state.pomodoro.activityId,
    remainingSeconds: phaseDurationSeconds(phase, state.settings),
    targetSeconds: phaseDurationSeconds(phase, state.settings),
    runningSince: shouldAutoStart ? at : null,
    phaseStartedAt: shouldAutoStart ? at : null,
    isRunning: shouldAutoStart,
    completedFocusRounds: rounds,
    segments: [],
  };
}

function pomodoroSession(
  state: AppState,
  at: string,
  id: string,
  completed: boolean,
): Session | null {
  if (state.pomodoro.phase !== 'focus') return null;
  const segments = closeSegment(state.pomodoro.segments, state.pomodoro.runningSince, at);
  const durationSeconds = segmentSeconds(segments);
  if (durationSeconds < 1) return null;
  return {
    id,
    activityId: state.pomodoro.activityId,
    startedAt: segments[0]?.startedAt ?? state.pomodoro.phaseStartedAt ?? at,
    endedAt: at,
    durationSeconds,
    source: 'pomodoro',
    completed,
    segments,
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'hydrate':
      return action.state;

    case 'activity/add':
      return { ...state, activities: [...state.activities, action.activity] };

    case 'activity/update':
      return {
        ...state,
        activities: state.activities.map((activity) =>
          activity.id === action.activityId ? { ...activity, ...action.patch } : activity,
        ),
      };

    case 'activity/archive': {
      if (state.timer?.activityId === action.activityId) return state;
      if (
        state.pomodoro.activityId === action.activityId &&
        (state.pomodoro.phaseStartedAt || state.pomodoro.segments.length > 0)
      ) return state;
      if (state.activities.filter((activity) => !activity.archived).length <= 1) return state;
      const activities = state.activities.map((activity) =>
        activity.id === action.activityId ? { ...activity, archived: true } : activity,
      );
      const fallbackActivity = activities.find((activity) => !activity.archived);
      return {
        ...state,
        activities,
        pomodoro:
          state.pomodoro.activityId === action.activityId && fallbackActivity
            ? { ...state.pomodoro, activityId: fallbackActivity.id }
            : state.pomodoro,
      };
    }

    case 'timer/start':
      if (state.timer || state.pomodoro.isRunning || state.pomodoro.phaseStartedAt) return state;
      return {
        ...state,
        timer: {
          activityId: action.activityId,
          sessionStartedAt: action.at,
          runningSince: action.at,
          accumulatedSeconds: 0,
          isRunning: true,
          segments: [],
        },
      };

    case 'timer/pause': {
      if (!state.timer?.isRunning) return state;
      const segments = closeSegment(state.timer.segments, state.timer.runningSince, action.at);
      return {
        ...state,
        timer: {
          ...state.timer,
          segments,
          accumulatedSeconds: segmentSeconds(segments),
          runningSince: null,
          isRunning: false,
        },
      };
    }

    case 'timer/resume':
      if (!state.timer || state.timer.isRunning || state.pomodoro.isRunning) return state;
      return { ...state, timer: { ...state.timer, runningSince: action.at, isRunning: true } };

    case 'timer/stop': {
      if (!state.timer) return state;
      const segments = closeSegment(state.timer.segments, state.timer.runningSince, action.at);
      const durationSeconds = segmentSeconds(segments);
      if (durationSeconds < 1) return { ...state, timer: null };
      const session: Session = {
        id: action.sessionId,
        activityId: state.timer.activityId,
        startedAt: state.timer.sessionStartedAt,
        endedAt: action.at,
        durationSeconds,
        source: 'timer',
        completed: true,
        segments,
      };
      return { ...state, timer: null, sessions: [...state.sessions, session] };
    }

    case 'timer/discard':
      return { ...state, timer: null };

    case 'pomodoro/select-activity':
      if (state.pomodoro.isRunning || state.pomodoro.phaseStartedAt || state.pomodoro.segments.length > 0) return state;
      return { ...state, pomodoro: { ...state.pomodoro, activityId: action.activityId } };

    case 'pomodoro/set-phase':
      if (state.pomodoro.isRunning || state.pomodoro.phaseStartedAt || state.pomodoro.segments.length > 0) return state;
      return {
        ...state,
        pomodoro: {
          ...state.pomodoro,
          phase: action.phase,
          remainingSeconds: phaseDurationSeconds(action.phase, state.settings),
          targetSeconds: phaseDurationSeconds(action.phase, state.settings),
          phaseStartedAt: null,
          runningSince: null,
          segments: [],
        },
      };

    case 'pomodoro/pause': {
      if (state.timer) return state;
      if (!state.pomodoro.isRunning) return state;
      const remainingSeconds = pomodoroSecondsLeft(state.pomodoro, new Date(action.at));
      if (remainingSeconds <= 0) return state;
      const segments = closeSegment(state.pomodoro.segments, state.pomodoro.runningSince, action.at);
      return {
        ...state,
        pomodoro: {
          ...state.pomodoro,
          remainingSeconds,
          segments,
          runningSince: null,
          isRunning: false,
        },
      };
    }

    case 'pomodoro/start':
      if (state.timer || state.pomodoro.isRunning || state.pomodoro.remainingSeconds <= 0) return state;
      return {
        ...state,
        pomodoro: {
          ...state.pomodoro,
          runningSince: action.at,
          phaseStartedAt: state.pomodoro.phaseStartedAt ?? action.at,
          isRunning: true,
        },
      };

    case 'pomodoro/reset':
      return {
        ...state,
        pomodoro: {
          ...state.pomodoro,
          remainingSeconds: phaseDurationSeconds(state.pomodoro.phase, state.settings),
          targetSeconds: phaseDurationSeconds(state.pomodoro.phase, state.settings),
          runningSince: null,
          phaseStartedAt: null,
          isRunning: false,
          segments: [],
        },
      };

    case 'pomodoro/complete': {
      if (
        state.pomodoro.phase !== action.expectedPhase ||
        state.pomodoro.runningSince !== action.expectedRunningSince
      ) return state;
      const session = pomodoroSession(state, action.at, action.sessionId, true);
      const countRound = state.pomodoro.phase === 'focus';
      return {
        ...state,
        sessions: session ? [...state.sessions, session] : state.sessions,
        pomodoro: advancePomodoro(state, action.at, countRound, action.allowAutoStart),
      };
    }

    case 'pomodoro/skip': {
      if (
        state.pomodoro.phase !== action.expectedPhase ||
        state.pomodoro.phaseStartedAt !== action.expectedPhaseStartedAt
      ) return state;
      if (
        state.pomodoro.isRunning &&
        pomodoroSecondsLeft(state.pomodoro, new Date(action.at)) <= 0
      ) return state;
      const session = pomodoroSession(state, action.at, action.sessionId, false);
      return {
        ...state,
        sessions: session ? [...state.sessions, session] : state.sessions,
        pomodoro: advancePomodoro(state, action.at, false),
      };
    }

    case 'settings/update': {
      const rawSettings = { ...state.settings, ...action.patch };
      const settings: AppSettings = {
        ...rawSettings,
        focusMinutes: Math.min(120, Math.max(1, Number(rawSettings.focusMinutes) || 25)),
        shortBreakMinutes: Math.min(60, Math.max(1, Number(rawSettings.shortBreakMinutes) || 5)),
        longBreakMinutes: Math.min(90, Math.max(1, Number(rawSettings.longBreakMinutes) || 15)),
        roundsBeforeLongBreak: Math.min(8, Math.max(2, Number(rawSettings.roundsBeforeLongBreak) || 4)),
        dailyGoalMinutes: Math.min(720, Math.max(30, Number(rawSettings.dailyGoalMinutes) || 240)),
      };
      const durationChanged =
        action.patch.focusMinutes !== undefined ||
        action.patch.shortBreakMinutes !== undefined ||
        action.patch.longBreakMinutes !== undefined;
      return {
        ...state,
        settings,
        pomodoro:
          durationChanged && !state.pomodoro.isRunning && !state.pomodoro.phaseStartedAt
            ? {
                ...state.pomodoro,
                remainingSeconds: phaseDurationSeconds(state.pomodoro.phase, settings),
                targetSeconds: phaseDurationSeconds(state.pomodoro.phase, settings),
                phaseStartedAt: null,
                segments: [],
              }
            : state.pomodoro,
      };
    }

    case 'session/remove':
      return { ...state, sessions: state.sessions.filter((session) => session.id !== action.sessionId) };

    case 'state/reset':
      return createInitialState();

    default:
      return state;
  }
}

export function nextSessionId(source: 'timer' | 'pomodoro'): string {
  return createId(source === 'timer' ? 'session' : 'pomo');
}

export function timerElapsedAt(state: AppState, now: Date): number {
  return runningTimerSeconds(state.timer, now);
}

export function freshPomodoro(state: AppState): AppState['pomodoro'] {
  return { ...createDefaultPomodoro(state.settings), activityId: state.pomodoro.activityId };
}
