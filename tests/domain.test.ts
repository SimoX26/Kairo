import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/data';
import { calculateMetrics, currentStreak, percentageChange } from '../src/lib/analytics';
import {
  addDays,
  getComparableReportRanges,
  sessionSecondsInRange,
  startOfDay,
  startOfWeek,
} from '../src/lib/date';
import { runningTimerSeconds, runningTimerSecondsInRange } from '../src/lib/timers';
import { normalizeState } from '../src/services/storage';
import { appReducer } from '../src/store/reducer';
import type { Session } from '../src/types';

describe('cronometro attività', () => {
  it('somma soltanto i segmenti realmente attivi', () => {
    let state = createInitialState();
    state = appReducer(state, { type: 'timer/start', activityId: 'activity_study', at: '2026-08-27T08:00:00.000Z' });
    state = appReducer(state, { type: 'timer/pause', at: '2026-08-27T08:10:00.000Z' });
    state = appReducer(state, { type: 'timer/resume', at: '2026-08-27T08:15:00.000Z' });

    expect(runningTimerSeconds(state.timer, new Date('2026-08-27T08:20:00.000Z'))).toBe(900);

    state = appReducer(state, { type: 'timer/stop', at: '2026-08-27T08:20:00.000Z', sessionId: 'session_test' });
    expect(state.timer).toBeNull();
    expect(state.sessions[0].durationSeconds).toBe(900);
    expect(state.sessions[0].segments).toHaveLength(2);
  });

  it('non crea una sessione di durata nulla', () => {
    let state = createInitialState();
    state = appReducer(state, { type: 'timer/start', activityId: 'activity_study', at: '2026-08-27T08:00:00.000Z' });
    state = appReducer(state, { type: 'timer/stop', at: '2026-08-27T08:00:00.000Z', sessionId: 'session_zero' });
    expect(state.sessions).toHaveLength(0);
  });

  it('attribuisce al giorno corrente solo la parte dopo mezzanotte', () => {
    let state = createInitialState();
    state = appReducer(state, { type: 'timer/start', activityId: 'activity_study', at: '2026-08-27T21:50:00.000Z' });
    const now = new Date('2026-08-27T22:20:00.000Z');
    const today = { start: new Date('2026-08-28T00:00:00+02:00'), end: new Date('2026-08-29T00:00:00+02:00') };
    expect(runningTimerSecondsInRange(state.timer, now, today)).toBe(1_200);
  });
});

describe('pomodoro', () => {
  it('salva un focus completato e prepara la pausa breve', () => {
    let state = createInitialState();
    state = appReducer(state, { type: 'pomodoro/start', at: '2026-08-27T08:00:00.000Z' });
    state = appReducer(state, { type: 'pomodoro/complete', at: '2026-08-27T08:25:00.000Z', sessionId: 'pomo_test', expectedPhase: 'focus', expectedRunningSince: '2026-08-27T08:00:00.000Z', allowAutoStart: true });

    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]).toMatchObject({ source: 'pomodoro', completed: true, durationSeconds: 1_500 });
    expect(state.pomodoro.phase).toBe('shortBreak');
    expect(state.pomodoro.completedFocusRounds).toBe(1);
    expect(state.pomodoro.remainingSeconds).toBe(300);

    state = appReducer(state, { type: 'pomodoro/complete', at: '2026-08-27T08:25:00.000Z', sessionId: 'pomo_duplicate', expectedPhase: 'focus', expectedRunningSince: '2026-08-27T08:00:00.000Z', allowAutoStart: true });
    expect(state.sessions).toHaveLength(1);
    expect(state.pomodoro.phase).toBe('shortBreak');
  });

  it('non ripete la pausa lunga quando un focus viene saltato', () => {
    let state = createInitialState();
    state = { ...state, pomodoro: { ...state.pomodoro, completedFocusRounds: 4 } };
    state = appReducer(state, { type: 'pomodoro/start', at: '2026-08-27T08:00:00.000Z' });
    state = appReducer(state, { type: 'pomodoro/skip', at: '2026-08-27T08:01:00.000Z', sessionId: 'pomo_after_long', expectedPhase: 'focus', expectedPhaseStartedAt: '2026-08-27T08:00:00.000Z' });
    expect(state.pomodoro.phase).toBe('shortBreak');
  });

  it('registra come incompleto un focus saltato dopo essere iniziato', () => {
    let state = createInitialState();
    state = appReducer(state, { type: 'pomodoro/start', at: '2026-08-27T08:00:00.000Z' });
    state = appReducer(state, { type: 'pomodoro/skip', at: '2026-08-27T08:05:00.000Z', sessionId: 'pomo_skip', expectedPhase: 'focus', expectedPhaseStartedAt: '2026-08-27T08:00:00.000Z' });
    expect(state.sessions[0]).toMatchObject({ completed: false, durationSeconds: 300 });
    expect(state.pomodoro.completedFocusRounds).toBe(0);
    expect(state.pomodoro.phase).toBe('shortBreak');
  });

  it('non mette in pausa o salta una fase già arrivata alla scadenza', () => {
    let state = createInitialState();
    state = appReducer(state, { type: 'pomodoro/start', at: '2026-08-27T08:00:00.000Z' });
    const paused = appReducer(state, { type: 'pomodoro/pause', at: '2026-08-27T08:25:00.000Z' });
    const skipped = appReducer(state, { type: 'pomodoro/skip', at: '2026-08-27T08:25:00.000Z', sessionId: 'late_skip', expectedPhase: 'focus', expectedPhaseStartedAt: '2026-08-27T08:00:00.000Z' });
    expect(paused.pomodoro.isRunning).toBe(true);
    expect(skipped.pomodoro.phase).toBe('focus');
    expect(skipped.sessions).toHaveLength(0);
  });
});

describe('calendario e report', () => {
  const crossingSession: Session = {
    id: 'crossing',
    activityId: 'activity_study',
    startedAt: '2026-08-27T21:50:00.000Z',
    endedAt: '2026-08-27T22:20:00.000Z',
    durationSeconds: 900,
    source: 'timer',
    completed: true,
    segments: [
      { startedAt: '2026-08-27T21:50:00.000Z', endedAt: '2026-08-27T22:00:00.000Z' },
      { startedAt: '2026-08-27T22:15:00.000Z', endedAt: '2026-08-27T22:20:00.000Z' },
    ],
  };

  it('ripartisce una sessione oltre mezzanotte usando i segmenti', () => {
    const firstDay = { start: new Date('2026-08-27T00:00:00+02:00'), end: new Date('2026-08-28T00:00:00+02:00') };
    const secondDay = { start: firstDay.end, end: new Date('2026-08-29T00:00:00+02:00') };
    expect(sessionSecondsInRange(crossingSession, firstDay)).toBe(600);
    expect(sessionSecondsInRange(crossingSession, secondDay)).toBe(300);
  });

  it('calcola metriche e variazioni senza percentuali fuorvianti', () => {
    const range = { start: new Date('2026-08-27T00:00:00+02:00'), end: new Date('2026-08-29T00:00:00+02:00') };
    const metrics = calculateMetrics([crossingSession], range);
    expect(metrics.totalSeconds).toBe(900);
    expect(metrics.sessionCount).toBe(1);
    expect(percentageChange(120, 100)).toBe(20);
    expect(percentageChange(120, 0)).toBeNull();
    expect(percentageChange(0, 0)).toBe(0);
    expect(metrics.activeDays).toBe(2);
    expect(currentStreak([crossingSession], new Date('2026-08-28T12:00:00+02:00'))).toBe(2);
  });

  it('inizia la settimana di lunedì', () => {
    const thursday = new Date('2026-08-27T12:00:00+02:00');
    expect(startOfWeek(thursday).getDay()).toBe(1);
    expect(startOfWeek(thursday).getDate()).toBe(24);
  });

  it('mantiene corretti i giorni attraverso il cambio DST', () => {
    const dstDay = startOfDay(new Date('2026-03-29T12:00:00+02:00'));
    const next = addDays(dstDay, 1);
    expect(next.getDate()).toBe(30);
    expect(next.getHours()).toBe(0);
  });

  it('confronta la porzione trascorsa con un intervallo precedente equivalente', () => {
    const { current, previous } = getComparableReportRanges('week', new Date('2026-08-27T12:00:00+02:00'));
    expect(current.end.getTime() - current.start.getTime()).toBe(previous.end.getTime() - previous.start.getTime());
    expect(current.start.getDay()).toBe(1);
  });
});

describe('tema', () => {
  it('mantiene il tema scuro per i dati esistenti senza preferenza', () => {
    const state = createInitialState();
    const { theme: _theme, ...legacySettings } = state.settings;
    const normalized = normalizeState({ ...state, settings: legacySettings });

    expect(normalized.settings.theme).toBe('dark');
  });

  it('mantiene il tema chiaro salvato', () => {
    const state = createInitialState();
    const normalized = normalizeState({ ...state, settings: { ...state.settings, theme: 'light' } });

    expect(normalized.settings.theme).toBe('light');
  });

  it.each(['nature-dark', 'nature-light'] as const)('mantiene il tema %s salvato', (theme) => {
    const state = createInitialState();
    const normalized = normalizeState({ ...state, settings: { ...state.settings, theme } });

    expect(normalized.settings.theme).toBe(theme);
  });
});
