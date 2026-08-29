import { useEffect, useRef, useState } from 'react';
import { BottomNav, type AppTab } from './components/BottomNav';
import { Icon } from './components/Icon';
import { SettingsSheet } from './components/SettingsSheet';
import { useNow } from './hooks/useNow';
import { formatTimer } from './lib/date';
import { pomodoroSecondsLeft, runningTimerSeconds } from './lib/timers';
import { playCompletionTone, successFeedback } from './services/device';
import { CalendarScreen } from './screens/CalendarScreen';
import { FocusScreen } from './screens/FocusScreen';
import { PomodoroScreen } from './screens/PomodoroScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { useAppStore } from './store/AppStore';

export default function App() {
  const {
    state,
    hydrated,
    storageError,
    toggleTimer,
    togglePomodoro,
    completePomodoro,
    updateSettings,
    resetAll,
  } = useAppStore();
  const [tab, setTab] = useState<AppTab>('focus');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const anyPhaseOpen = Boolean(state.timer || state.pomodoro.phaseStartedAt);
  const anyClockRunning = Boolean(state.timer?.isRunning || state.pomodoro.isRunning);
  const now = useNow(anyPhaseOpen, anyClockRunning ? 1_000 : 60_000);
  const completedPhaseKey = useRef<string | null>(null);
  const showTimerMini = Boolean(state.timer && tab !== 'focus');
  const showPomodoroMini = Boolean(state.pomodoro.phaseStartedAt && tab !== 'pomodoro');
  const hasMiniPlayer = showTimerMini || showPomodoroMini;
  const openSettings = () => setSettingsOpen(true);

  useEffect(() => {
    if (!hydrated || !state.pomodoro.isRunning || !state.pomodoro.runningSince) return;
    const secondsLeft = pomodoroSecondsLeft(state.pomodoro, now);
    if (secondsLeft > 0) return;
    const key = `${state.pomodoro.phase}:${state.pomodoro.runningSince}`;
    if (completedPhaseKey.current === key) return;
    completedPhaseKey.current = key;
    const deadline = new Date(
      new Date(state.pomodoro.runningSince).getTime() + state.pomodoro.remainingSeconds * 1_000,
    );
    const freshCompletion = Math.abs(now.getTime() - deadline.getTime()) < 5_000;
    if (freshCompletion && document.visibilityState === 'visible') {
      playCompletionTone(state.settings.soundEnabled);
      void successFeedback(state.settings.hapticsEnabled);
    }
    void completePomodoro(deadline);
  }, [completePomodoro, hydrated, now, state.pomodoro, state.settings.hapticsEnabled, state.settings.soundEnabled]);

  if (!hydrated) {
    return (
      <main className="launch-screen">
        <div className="launch-screen__halo" />
        <img src={`${import.meta.env.BASE_URL}kairo-logo.png`} alt="Kairo" />
        <strong>Kairo</strong>
        <span>Il tuo tempo sta per prendere forma</span>
        <div className="launch-loader"><i /><i /><i /></div>
      </main>
    );
  }

  return (
    <main className={`app-shell ${hasMiniPlayer ? 'has-mini-player' : ''}`}>
      <div className="ambient-background" aria-hidden="true">
        <span className="ambient-background__one" />
        <span className="ambient-background__two" />
        <span className="ambient-background__grain" />
      </div>

      <div className="screen-viewport" key={tab}>
        {tab === 'focus' && <FocusScreen onOpenSettings={openSettings} />}
        {tab === 'pomodoro' && <PomodoroScreen onOpenSettings={openSettings} />}
        {tab === 'calendar' && <CalendarScreen onOpenSettings={openSettings} />}
        {tab === 'reports' && <ReportsScreen onOpenSettings={openSettings} onStartFocus={() => setTab('focus')} />}
      </div>

      {showTimerMini && state.timer && (
        <aside className="mini-player" style={{ '--activity-color': state.activities.find((activity) => activity.id === state.timer?.activityId)?.color } as React.CSSProperties}>
          <button className="mini-player__main" type="button" onClick={() => setTab('focus')}>
            <span className="mini-player__pulse" />
            <span><small>{state.timer.isRunning ? 'Timer attivo' : 'Timer in pausa'}</small><strong>{state.activities.find((activity) => activity.id === state.timer?.activityId)?.name}</strong></span>
            <b>{formatTimer(runningTimerSeconds(state.timer, now))}</b>
          </button>
          <button className="mini-player__control" type="button" aria-label={state.timer.isRunning ? 'Metti in pausa' : 'Riprendi'} onClick={toggleTimer}><Icon name={state.timer.isRunning ? 'pause' : 'play'} size={18} /></button>
        </aside>
      )}

      {showPomodoroMini && (
        <aside className="mini-player mini-player--pomo">
          <button className="mini-player__main" type="button" onClick={() => setTab('pomodoro')}>
            <span className="mini-player__pulse" />
            <span><small>Pomodoro · {state.pomodoro.isRunning ? (state.pomodoro.phase === 'focus' ? 'Focus' : 'Pausa') : 'In pausa'}</small><strong>{state.activities.find((activity) => activity.id === state.pomodoro.activityId)?.name}</strong></span>
            <b>{formatTimer(pomodoroSecondsLeft(state.pomodoro, now))}</b>
          </button>
          <button className="mini-player__control" type="button" aria-label={state.pomodoro.isRunning ? 'Metti in pausa' : 'Riprendi'} onClick={() => void togglePomodoro()}><Icon name={state.pomodoro.isRunning ? 'pause' : 'play'} size={18} /></button>
        </aside>
      )}

      <BottomNav active={tab} onChange={setTab} elevated={hasMiniPlayer} />

      {storageError && <div className="toast toast--error" role="status">{storageError}</div>}

      <SettingsSheet
        open={settingsOpen}
        settings={state.settings}
        onClose={() => setSettingsOpen(false)}
        onSave={updateSettings}
        onReset={resetAll}
      />
    </main>
  );
}
