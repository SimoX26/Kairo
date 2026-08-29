import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { createInitialState } from '../data';
import { createId } from '../lib/id';
import { phaseDurationSeconds, pomodoroSecondsLeft } from '../lib/timers';
import {
  cancelPomodoroNotification,
  configureNativeShell,
  schedulePomodoroNotification,
  tapFeedback,
} from '../services/device';
import { clearStoredState, loadState, saveState } from '../services/storage';
import type { Activity, AppSettings, AppState, PomodoroPhase } from '../types';
import { appReducer, nextSessionId } from './reducer';

interface ActivityInput {
  name: string;
  color: string;
  icon: Activity['icon'];
  weeklyGoalMinutes: number;
}

interface AppStoreValue {
  state: AppState;
  hydrated: boolean;
  storageError: string | null;
  addActivity: (input: ActivityInput) => void;
  updateActivity: (activityId: string, input: ActivityInput) => void;
  archiveActivity: (activityId: string) => void;
  startTimer: (activityId: string) => void;
  toggleTimer: () => void;
  stopTimer: () => void;
  discardTimer: () => void;
  selectPomodoroActivity: (activityId: string) => void;
  setPomodoroPhase: (phase: PomodoroPhase) => void;
  togglePomodoro: () => Promise<void>;
  resetPomodoro: () => Promise<void>;
  skipPomodoro: () => Promise<void>;
  completePomodoro: (completedAt: Date) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => void;
  removeSession: (sessionId: string) => void;
  resetAll: () => Promise<void>;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

function followingPhase(state: AppState): PomodoroPhase {
  if (state.pomodoro.phase !== 'focus') return 'focus';
  const rounds = state.pomodoro.completedFocusRounds + 1;
  return rounds > 0 && rounds % state.settings.roundsBeforeLongBreak === 0 ? 'longBreak' : 'shortBreak';
}

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    void loadState()
      .then((storedState) => {
        if (active) dispatch({ type: 'hydrate', state: storedState });
      })
      .catch(() => {
        if (active) setStorageError('Impossibile leggere i dati locali.');
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(() => saveState(state))
      .then(() => setStorageError(null))
      .catch(() => setStorageError('Le ultime modifiche non sono state salvate.'));
  }, [hydrated, state]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = state.settings.motion;
  }, [state.settings.motion]);

  useEffect(() => {
    const themeColor = state.settings.theme === 'light' ? '#f6f7fc' : '#080b17';
    document.documentElement.dataset.theme = state.settings.theme;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', themeColor);
    void configureNativeShell(state.settings.theme);
  }, [state.settings.theme]);

  const addActivity = useCallback((input: ActivityInput) => {
    dispatch({
      type: 'activity/add',
      activity: {
        ...input,
        id: createId('activity'),
        name: input.name.trim(),
        createdAt: new Date().toISOString(),
        archived: false,
      },
    });
  }, []);

  const updateActivity = useCallback((activityId: string, input: ActivityInput) => {
    dispatch({ type: 'activity/update', activityId, patch: { ...input, name: input.name.trim() } });
  }, []);

  const archiveActivity = useCallback((activityId: string) => {
    dispatch({ type: 'activity/archive', activityId });
  }, []);

  const startTimer = useCallback(
    (activityId: string) => {
      void tapFeedback(state.settings.hapticsEnabled);
      dispatch({ type: 'timer/start', activityId, at: new Date().toISOString() });
    },
    [state.settings.hapticsEnabled],
  );

  const toggleTimer = useCallback(() => {
    const at = new Date().toISOString();
    void tapFeedback(state.settings.hapticsEnabled);
    dispatch({ type: state.timer?.isRunning ? 'timer/pause' : 'timer/resume', at });
  }, [state.settings.hapticsEnabled, state.timer?.isRunning]);

  const stopTimer = useCallback(() => {
    dispatch({ type: 'timer/stop', at: new Date().toISOString(), sessionId: nextSessionId('timer') });
  }, []);

  const discardTimer = useCallback(() => dispatch({ type: 'timer/discard' }), []);
  const selectPomodoroActivity = useCallback(
    (activityId: string) => dispatch({ type: 'pomodoro/select-activity', activityId }),
    [],
  );
  const setPomodoroPhase = useCallback(
    (phase: PomodoroPhase) => dispatch({ type: 'pomodoro/set-phase', phase }),
    [],
  );

  const togglePomodoro = useCallback(async () => {
    const wasRunning = state.pomodoro.isRunning;
    const remaining = pomodoroSecondsLeft(state.pomodoro, new Date());
    if (wasRunning) {
      await cancelPomodoroNotification();
    } else {
      await schedulePomodoroNotification(remaining, state.pomodoro.phase, true).catch(() => undefined);
    }
    void tapFeedback(state.settings.hapticsEnabled);
    dispatch({ type: wasRunning ? 'pomodoro/pause' : 'pomodoro/start', at: new Date().toISOString() });
  }, [state.pomodoro, state.settings.hapticsEnabled]);

  const resetPomodoro = useCallback(async () => {
    await cancelPomodoroNotification();
    dispatch({ type: 'pomodoro/reset' });
  }, []);

  const skipPomodoro = useCallback(async () => {
    const current = state.pomodoro;
    const nextPhase: PomodoroPhase = current.phase === 'focus' ? 'shortBreak' : 'focus';
    const shouldAutoStart = nextPhase === 'focus' ? state.settings.autoStartFocus : state.settings.autoStartBreaks;
    await cancelPomodoroNotification();
    const at = new Date().toISOString();
    dispatch({
      type: 'pomodoro/skip',
      at,
      sessionId: nextSessionId('pomodoro'),
      expectedPhase: current.phase,
      expectedPhaseStartedAt: current.phaseStartedAt,
    });
    if (shouldAutoStart) {
      await schedulePomodoroNotification(phaseDurationSeconds(nextPhase, state.settings), nextPhase).catch(() => undefined);
    }
  }, [state.pomodoro, state.settings]);

  const completePomodoro = useCallback(
    async (completedAt: Date) => {
      const current = state.pomodoro;
      if (!current.runningSince) return;
      const allowAutoStart = Math.abs(Date.now() - completedAt.getTime()) < 5_000;
      const nextPhase = followingPhase(state);
      const shouldAutoStart = allowAutoStart && (nextPhase === 'focus' ? state.settings.autoStartFocus : state.settings.autoStartBreaks);
      dispatch({
        type: 'pomodoro/complete',
        at: completedAt.toISOString(),
        sessionId: nextSessionId('pomodoro'),
        expectedPhase: current.phase,
        expectedRunningSince: current.runningSince,
        allowAutoStart,
      });
      await cancelPomodoroNotification();
      if (shouldAutoStart) {
        await schedulePomodoroNotification(phaseDurationSeconds(nextPhase, state.settings), nextPhase).catch(() => undefined);
      }
    },
    [state],
  );

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => dispatch({ type: 'settings/update', patch }),
    [],
  );
  const removeSession = useCallback(
    (sessionId: string) => dispatch({ type: 'session/remove', sessionId }),
    [],
  );
  const resetAll = useCallback(async () => {
    await cancelPomodoroNotification();
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(() => clearStoredState());
    await saveQueue.current;
    dispatch({ type: 'state/reset' });
  }, []);

  const value = useMemo<AppStoreValue>(
    () => ({
      state,
      hydrated,
      storageError,
      addActivity,
      updateActivity,
      archiveActivity,
      startTimer,
      toggleTimer,
      stopTimer,
      discardTimer,
      selectPomodoroActivity,
      setPomodoroPhase,
      togglePomodoro,
      resetPomodoro,
      skipPomodoro,
      completePomodoro,
      updateSettings,
      removeSession,
      resetAll,
    }),
    [
      state,
      hydrated,
      storageError,
      addActivity,
      updateActivity,
      archiveActivity,
      startTimer,
      toggleTimer,
      stopTimer,
      discardTimer,
      selectPomodoroActivity,
      setPomodoroPhase,
      togglePomodoro,
      resetPomodoro,
      skipPomodoro,
      completePomodoro,
      updateSettings,
      removeSession,
      resetAll,
    ],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const value = useContext(AppStoreContext);
  if (!value) throw new Error('useAppStore deve essere usato dentro AppStoreProvider');
  return value;
}
