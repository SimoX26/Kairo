export type ActivityIcon = 'book' | 'briefcase' | 'code' | 'brain' | 'language' | 'palette';

export interface Activity {
  id: string;
  name: string;
  color: string;
  icon: ActivityIcon;
  weeklyGoalMinutes: number;
  createdAt: string;
  archived: boolean;
}

export type SessionSource = 'timer' | 'pomodoro';

export interface TimeSegment {
  startedAt: string;
  endedAt: string;
}

export interface Session {
  id: string;
  activityId: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  source: SessionSource;
  completed: boolean;
  segments: TimeSegment[];
}

export interface RunningTimer {
  activityId: string;
  sessionStartedAt: string;
  runningSince: string | null;
  accumulatedSeconds: number;
  isRunning: boolean;
  segments: TimeSegment[];
}

export type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';
export type AppTheme = 'dark' | 'light';

export interface PomodoroState {
  phase: PomodoroPhase;
  activityId: string;
  remainingSeconds: number;
  targetSeconds: number;
  runningSince: string | null;
  phaseStartedAt: string | null;
  isRunning: boolean;
  completedFocusRounds: number;
  segments: TimeSegment[];
}

export interface AppSettings {
  theme: AppTheme;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  roundsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  dailyGoalMinutes: number;
  motion: 'system' | 'full' | 'reduced';
}

export interface AppState {
  schemaVersion: 1;
  activities: Activity[];
  sessions: Session[];
  timer: RunningTimer | null;
  pomodoro: PomodoroState;
  settings: AppSettings;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export type CalendarMode = 'day' | 'week' | 'month';
export type ReportPeriod = 'week' | 'month' | 'quarter';
