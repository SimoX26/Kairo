import { useMemo, useState } from 'react';
import { ActivitySheet } from '../components/ActivitySheet';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { ProgressRing } from '../components/ProgressRing';
import { activityTotals, calculateMetrics } from '../lib/analytics';
import { endOfDayExclusive, formatDuration, formatTimer, startOfDay, startOfWeek, addDays } from '../lib/date';
import { runningTimerSeconds, runningTimerSecondsInRange } from '../lib/timers';
import { useNow } from '../hooks/useNow';
import { useAppStore } from '../store/AppStore';
import type { Activity } from '../types';

interface FocusScreenProps {
  onOpenSettings: () => void;
}

function greeting(now: Date): string {
  if (now.getHours() < 12) return 'Buongiorno';
  if (now.getHours() < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

export function FocusScreen({ onOpenSettings }: FocusScreenProps) {
  const {
    state,
    addActivity,
    updateActivity,
    archiveActivity,
    startTimer,
    toggleTimer,
    stopTimer,
    discardTimer,
  } = useAppStore();
  const now = useNow(Boolean(state.timer), state.timer?.isRunning ? 1_000 : 60_000);
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const todayRange = useMemo(() => ({ start: startOfDay(now), end: endOfDayExclusive(now) }), [now]);
  const weekRange = useMemo(() => {
    const start = startOfWeek(now);
    return { start, end: addDays(start, 7) };
  }, [now]);
  const todayMetrics = useMemo(() => calculateMetrics(state.sessions, todayRange), [state.sessions, todayRange]);
  const todayByActivity = useMemo(
    () => activityTotals(state.sessions, state.activities, todayRange),
    [state.activities, state.sessions, todayRange],
  );
  const weekByActivity = useMemo(
    () => activityTotals(state.sessions, state.activities, weekRange),
    [state.activities, state.sessions, weekRange],
  );
  const activeActivities = state.activities.filter((activity) => !activity.archived);
  const currentActivity = state.activities.find((activity) => activity.id === state.timer?.activityId);
  const elapsed = runningTimerSeconds(state.timer, now);
  const liveToday = runningTimerSecondsInRange(state.timer, now, todayRange);
  const liveWeek = runningTimerSecondsInRange(state.timer, now, weekRange);
  const todayWithLive = todayMetrics.totalSeconds + liveToday;
  const goalSeconds = state.settings.dailyGoalMinutes * 60;
  const goalProgress = goalSeconds ? todayWithLive / goalSeconds : 0;
  const recentSessions = [...state.sessions]
    .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())
    .slice(0, 3);

  const openCreate = () => {
    setEditingActivity(null);
    setActivitySheetOpen(true);
  };

  const openEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setActivitySheetOpen(true);
  };

  return (
    <div className="screen focus-screen">
      <AppHeader eyebrow={greeting(now)} title="Trova il tuo ritmo." onOpenSettings={onOpenSettings} />

      <section className={`timer-hero glass-card ${state.timer?.isRunning ? 'is-running' : ''}`}>
        <div className="timer-hero__ambient" style={{ '--activity-color': currentActivity?.color ?? '#8b85ff' } as React.CSSProperties} />
        {state.timer ? (
          <>
            <div className="live-pill"><span /> {state.timer.isRunning ? 'In corso' : 'In pausa'}</div>
            <ProgressRing
              progress={Math.min(1, goalProgress)}
              size={236}
              strokeWidth={9}
              color={currentActivity?.color}
              label={`${formatTimer(elapsed)} su ${currentActivity?.name}`}
              className="timer-ring"
            >
              <span className="timer-hero__icon" style={{ color: currentActivity?.color }}>
                <Icon name={currentActivity?.icon ?? 'timer'} />
              </span>
              <strong className="timer-digits">{formatTimer(elapsed)}</strong>
              <span className="timer-activity-name">{currentActivity?.name}</span>
            </ProgressRing>
            <div className="timer-controls">
              <button className="round-button round-button--secondary" type="button" aria-label="Elimina cronometro" onClick={() => setConfirmDiscard(true)}>
                <Icon name="trash" />
              </button>
              <button className="round-button round-button--primary" type="button" aria-label={state.timer.isRunning ? 'Metti in pausa' : 'Riprendi'} onClick={toggleTimer}>
                <Icon name={state.timer.isRunning ? 'pause' : 'play'} size={29} />
              </button>
              <button className="round-button round-button--finish" type="button" aria-label="Termina e salva" onClick={stopTimer}>
                <Icon name="stop" />
              </button>
            </div>
            {confirmDiscard && (
              <div className="inline-confirm" role="alert">
                <span>Scartare questa sessione?</span>
                <button type="button" onClick={() => setConfirmDiscard(false)}>No</button>
                <button type="button" onClick={() => { discardTimer(); setConfirmDiscard(false); }}>Scarta</button>
              </div>
            )}
          </>
        ) : (
          <div className="daily-overview">
            <ProgressRing progress={Math.min(1, goalProgress)} size={172} strokeWidth={9} label={`${Math.round(goalProgress * 100)}% dell'obiettivo quotidiano`}>
              <span className="daily-overview__label">Oggi</span>
              <strong>{formatDuration(todayWithLive)}</strong>
              <small>di {formatDuration(goalSeconds, true)}</small>
            </ProgressRing>
            <div className="daily-overview__copy">
              <span className="gradient-kicker"><Icon name="sparkles" size={16} /> Spazio di focus</span>
              <h2>{todayWithLive ? 'Continua così.' : 'Inizia con intenzione.'}</h2>
              <p>{todayWithLive ? `Hai completato ${todayMetrics.sessionCount} sessioni. Il prossimo blocco fa la differenza.` : 'Scegli un’attività e lascia che Kairo tenga il tempo per te.'}</p>
              <div className="mini-stat-row">
                <span><strong>{Math.round(goalProgress * 100)}%</strong> obiettivo</span>
                <span><strong>{todayMetrics.sessionCount}</strong> sessioni</span>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="eyebrow">I tuoi spazi</span><h2>Attività</h2></div>
          <button className="small-action" type="button" onClick={openCreate}><Icon name="plus" size={18} /> Nuova</button>
        </div>
        <div className="activity-list">
          {activeActivities.map((activity, index) => {
            const today = (todayByActivity.find((item) => item.activity.id === activity.id)?.seconds ?? 0) + (state.timer?.activityId === activity.id ? liveToday : 0);
            const week = (weekByActivity.find((item) => item.activity.id === activity.id)?.seconds ?? 0) + (state.timer?.activityId === activity.id ? liveWeek : 0);
            const goal = activity.weeklyGoalMinutes * 60;
            const running = state.timer?.activityId === activity.id;
            return (
              <article
                key={activity.id}
                className={`activity-card ${running ? 'is-active' : ''}`}
                style={{ '--activity-color': activity.color, '--delay': `${index * 55}ms` } as React.CSSProperties}
              >
                <button className="activity-card__main" type="button" onClick={() => openEdit(activity)} aria-label={`Modifica ${activity.name}`}>
                  <span className="activity-icon"><Icon name={activity.icon} /></span>
                  <span className="activity-card__copy">
                    <strong>{activity.name}</strong>
                    <small>{formatDuration(today, true)} oggi · {Math.min(100, Math.round((week / goal) * 100))}% settimana</small>
                    <span className="activity-progress"><span style={{ width: `${Math.min(100, (week / goal) * 100)}%` }} /></span>
                  </span>
                </button>
                <button
                  className="activity-play"
                  type="button"
                  aria-label={`Avvia ${activity.name}`}
                  disabled={Boolean(state.timer) || Boolean(state.pomodoro.phaseStartedAt)}
                  onClick={() => startTimer(activity.id)}
                >
                  <Icon name={running ? 'pause' : 'play'} size={18} />
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-block recent-block">
        <div className="section-heading"><div><span className="eyebrow">Memoria recente</span><h2>Ultime sessioni</h2></div></div>
        {recentSessions.length ? (
          <div className="recent-list">
            {recentSessions.map((session) => {
              const activity = state.activities.find((item) => item.id === session.activityId);
              return (
                <div className="recent-row" key={session.id}>
                  <span className="recent-row__dot" style={{ background: activity?.color }} />
                  <div><strong>{activity?.name ?? 'Attività archiviata'}</strong><small>{new Intl.DateTimeFormat('it-IT', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(session.startedAt))}</small></div>
                  <span>{formatDuration(session.durationSeconds, true)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-inline"><Icon name="sparkles" /><p>La tua prima sessione comparirà qui.</p></div>
        )}
      </section>

      <ActivitySheet
        open={activitySheetOpen}
        activity={editingActivity}
        onClose={() => setActivitySheetOpen(false)}
        onSave={(input) => editingActivity ? updateActivity(editingActivity.id, input) : addActivity(input)}
        onArchive={
          editingActivity &&
          activeActivities.length > 1 &&
          state.timer?.activityId !== editingActivity.id &&
          !(state.pomodoro.activityId === editingActivity.id && state.pomodoro.phaseStartedAt)
            ? () => archiveActivity(editingActivity.id)
            : undefined
        }
      />
    </div>
  );
}
