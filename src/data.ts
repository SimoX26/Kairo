import type { Activity, AppSettings, AppState, PomodoroState } from './types';

const createdAt = new Date().toISOString();

export const defaultActivities: Activity[] = [
  {
    id: 'activity_study',
    name: 'Studio profondo',
    color: '#8b85ff',
    icon: 'brain',
    weeklyGoalMinutes: 600,
    createdAt,
    archived: false,
  },
  {
    id: 'activity_work',
    name: 'Lavoro',
    color: '#ff745e',
    icon: 'briefcase',
    weeklyGoalMinutes: 900,
    createdAt,
    archived: false,
  },
  {
    id: 'activity_reading',
    name: 'Lettura',
    color: '#b8f35a',
    icon: 'book',
    weeklyGoalMinutes: 210,
    createdAt,
    archived: false,
  },
];

export const defaultSettings: AppSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  roundsBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  hapticsEnabled: true,
  dailyGoalMinutes: 240,
  motion: 'system',
};

export function createDefaultPomodoro(settings = defaultSettings): PomodoroState {
  return {
    phase: 'focus',
    activityId: defaultActivities[0].id,
    remainingSeconds: settings.focusMinutes * 60,
    targetSeconds: settings.focusMinutes * 60,
    runningSince: null,
    phaseStartedAt: null,
    isRunning: false,
    completedFocusRounds: 0,
    segments: [],
  };
}

export function createInitialState(): AppState {
  return {
    schemaVersion: 1,
    activities: defaultActivities.map((activity) => ({ ...activity })),
    sessions: [],
    timer: null,
    pomodoro: createDefaultPomodoro(),
    settings: { ...defaultSettings },
  };
}
