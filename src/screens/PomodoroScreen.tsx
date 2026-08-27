import { useEffect, useMemo, useRef, useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { ProgressRing } from '../components/ProgressRing';
import { useNow } from '../hooks/useNow';
import { calculateMetrics } from '../lib/analytics';
import { endOfDayExclusive, formatDuration, formatTimer, startOfDay } from '../lib/date';
import { pomodoroSecondsLeft } from '../lib/timers';
import { useAppStore } from '../store/AppStore';
import type { PomodoroPhase } from '../types';

interface PomodoroScreenProps {
  onOpenSettings: () => void;
}

const phases: { id: PomodoroPhase; label: string; short: string }[] = [
  { id: 'focus', label: 'Focus', short: 'Focus' },
  { id: 'shortBreak', label: 'Pausa breve', short: 'Breve' },
  { id: 'longBreak', label: 'Pausa lunga', short: 'Lunga' },
];

export function PomodoroScreen({ onOpenSettings }: PomodoroScreenProps) {
  const {
    state,
    selectPomodoroActivity,
    setPomodoroPhase,
    togglePomodoro,
    resetPomodoro,
    skipPomodoro,
  } = useAppStore();
  const now = useNow(Boolean(state.pomodoro.phaseStartedAt), state.pomodoro.isRunning ? 250 : 60_000);
  const [celebrating, setCelebrating] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const previousCompletedRounds = useRef(state.pomodoro.completedFocusRounds);
  const activeActivities = state.activities.filter((activity) => !activity.archived);
  const duration = state.pomodoro.targetSeconds;
  const secondsLeft = pomodoroSecondsLeft(state.pomodoro, now);
  const progress = duration ? (duration - secondsLeft) / duration : 0;
  const phaseCopy = phases.find((phase) => phase.id === state.pomodoro.phase)!;
  const selectedActivity = state.activities.find((activity) => activity.id === state.pomodoro.activityId);
  const todayRange = useMemo(() => ({ start: startOfDay(now), end: endOfDayExclusive(now) }), [now]);
  const todayPomodoros = useMemo(
    () => state.sessions.filter((session) => session.source === 'pomodoro'),
    [state.sessions],
  );
  const todayMetrics = useMemo(() => calculateMetrics(todayPomodoros, todayRange), [todayPomodoros, todayRange]);

  useEffect(() => {
    if (state.pomodoro.completedFocusRounds <= previousCompletedRounds.current) {
      previousCompletedRounds.current = state.pomodoro.completedFocusRounds;
      return;
    }
    previousCompletedRounds.current = state.pomodoro.completedFocusRounds;
    setCelebrating(true);
    const timeout = window.setTimeout(() => setCelebrating(false), 950);
    return () => window.clearTimeout(timeout);
  }, [state.pomodoro.completedFocusRounds]);

  const roundModulo = state.pomodoro.completedFocusRounds % state.settings.roundsBeforeLongBreak;
  const phaseIndex = state.pomodoro.phase === 'longBreak' && state.pomodoro.completedFocusRounds > 0 && roundModulo === 0
    ? state.settings.roundsBeforeLongBreak
    : roundModulo;

  return (
    <div className={`screen pomodoro-screen ${celebrating ? 'is-celebrating' : ''}`}>
      <AppHeader eyebrow="Metodo Pomodoro" title="Focus, poi respira." onOpenSettings={onOpenSettings} />

      <div className="segmented phase-selector" role="group" aria-label="Fase Pomodoro">
        {phases.map((phase) => (
          <button
            key={phase.id}
            type="button"
            aria-pressed={state.pomodoro.phase === phase.id}
            className={state.pomodoro.phase === phase.id ? 'is-active' : ''}
            disabled={Boolean(state.pomodoro.phaseStartedAt)}
            onClick={() => setPomodoroPhase(phase.id)}
          >
            {phase.short}
          </button>
        ))}
      </div>

      <section className={`pomodoro-stage ${state.pomodoro.isRunning ? 'is-running' : ''}`}>
        <div className="orbit orbit--one"><span /></div>
        <div className="orbit orbit--two"><span /></div>
        {celebrating && <div className="celebration" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ '--i': index } as React.CSSProperties} />)}</div>}
        <ProgressRing
          progress={progress}
          size={278}
          strokeWidth={12}
          color={state.pomodoro.phase === 'focus' ? '#ff745e' : '#56d6c9'}
          className="pomodoro-ring"
          label={`${formatTimer(secondsLeft)} rimanenti, fase ${phaseCopy.label}`}
        >
          <span className="pomodoro-stage__phase">{phaseCopy.label}</span>
          <strong className="pomodoro-digits">{formatTimer(secondsLeft)}</strong>
          <span className="pomodoro-stage__status">{state.pomodoro.isRunning ? 'Resta qui. Ci pensa Kairo.' : 'Quando vuoi, cominciamo.'}</span>
        </ProgressRing>
      </section>

      <label className="activity-select">
        <span className="activity-select__icon" style={{ '--activity-color': selectedActivity?.color } as React.CSSProperties}><Icon name={selectedActivity?.icon ?? 'brain'} /></span>
        <span><small>Focus dedicato a</small><select value={state.pomodoro.activityId} disabled={Boolean(state.pomodoro.phaseStartedAt)} onChange={(event) => selectPomodoroActivity(event.target.value)}>{activeActivities.map((activity) => <option key={activity.id} value={activity.id}>{activity.name}</option>)}</select></span>
        <Icon name="chevron-right" size={18} />
      </label>

      {state.timer && <div className="notice-card"><Icon name="timer" /><span>Metti fine al cronometro attività prima di avviare il Pomodoro.</span></div>}

      <div className="pomodoro-controls">
        <button className="round-button round-button--secondary" type="button" aria-label="Azzera fase" onClick={() => state.pomodoro.phaseStartedAt ? setConfirmReset(true) : void resetPomodoro()}><Icon name="rotate" /></button>
        <button className="round-button round-button--pomo" type="button" disabled={Boolean(state.timer)} aria-label={state.pomodoro.isRunning ? 'Metti in pausa' : 'Avvia'} onClick={() => void togglePomodoro()}><Icon name={state.pomodoro.isRunning ? 'pause' : 'play'} size={31} /></button>
        <button className="round-button round-button--secondary" type="button" aria-label="Salta fase" onClick={() => void skipPomodoro()}><Icon name="skip" /></button>
      </div>

      {confirmReset && (
        <div className="pomo-reset-confirm" role="alert">
          <span>Azzerare il progresso di questa fase?</span>
          <button type="button" onClick={() => setConfirmReset(false)}>Continua</button>
          <button type="button" onClick={() => { void resetPomodoro(); setConfirmReset(false); }}>Azzera</button>
        </div>
      )}

      <section className="pomo-cycle glass-card">
        <div className="pomo-cycle__header"><div><span className="eyebrow">Ciclo attuale</span><h2>{phaseIndex} di {state.settings.roundsBeforeLongBreak} focus</h2></div><span className="cycle-badge"><Icon name="flame" size={17} /> {todayMetrics.completedPomodoros}</span></div>
        <div className="round-track" aria-label={`${phaseIndex} sessioni completate nel ciclo`}>
          {Array.from({ length: state.settings.roundsBeforeLongBreak }, (_, index) => <span key={index} className={index < phaseIndex ? 'is-complete' : index === phaseIndex && state.pomodoro.phase === 'focus' ? 'is-current' : ''}><i /></span>)}
        </div>
        <div className="pomo-stats">
          <div><small>Focus oggi</small><strong>{formatDuration(todayMetrics.totalSeconds, true)}</strong></div>
          <div><small>Completamento</small><strong>{todayMetrics.completionRate === null ? '—' : `${todayMetrics.completionRate}%`}</strong></div>
          <div><small>Prossima lunga</small><strong>{state.pomodoro.phase === 'longBreak' ? 'ora' : state.settings.roundsBeforeLongBreak - phaseIndex}</strong></div>
        </div>
      </section>
    </div>
  );
}
