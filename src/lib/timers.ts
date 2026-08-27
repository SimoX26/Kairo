import type { AppSettings, PomodoroPhase, PomodoroState, RunningTimer, TimeRange } from '../types';

export function runningTimerSeconds(timer: RunningTimer | null, now: Date): number {
  if (!timer) return 0;
  if (!timer.isRunning || !timer.runningSince) return timer.accumulatedSeconds;
  const elapsed = Math.max(0, Math.floor((now.getTime() - new Date(timer.runningSince).getTime()) / 1_000));
  return timer.accumulatedSeconds + elapsed;
}

export function runningTimerSecondsInRange(
  timer: RunningTimer | null,
  now: Date,
  range: TimeRange,
): number {
  if (!timer) return 0;
  const segments = timer.isRunning && timer.runningSince
    ? [...timer.segments, { startedAt: timer.runningSince, endedAt: now.toISOString() }]
    : timer.segments;
  return segments.reduce((total, segment) => {
    const overlap = Math.max(
      0,
      Math.min(new Date(segment.endedAt).getTime(), range.end.getTime()) -
        Math.max(new Date(segment.startedAt).getTime(), range.start.getTime()),
    );
    return total + Math.round(overlap / 1_000);
  }, 0);
}

export function pomodoroSecondsLeft(pomodoro: PomodoroState, now: Date): number {
  if (!pomodoro.isRunning || !pomodoro.runningSince) return pomodoro.remainingSeconds;
  const elapsed = Math.max(0, Math.floor((now.getTime() - new Date(pomodoro.runningSince).getTime()) / 1_000));
  return Math.max(0, pomodoro.remainingSeconds - elapsed);
}

export function phaseDurationSeconds(phase: PomodoroPhase, settings: AppSettings): number {
  if (phase === 'focus') return settings.focusMinutes * 60;
  if (phase === 'shortBreak') return settings.shortBreakMinutes * 60;
  return settings.longBreakMinutes * 60;
}
