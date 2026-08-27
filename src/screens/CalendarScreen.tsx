import { useMemo, useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { activityTotals, sessionsInRange } from '../lib/analytics';
import {
  addDays,
  endOfDayExclusive,
  formatDuration,
  formatRangeLabel,
  getCalendarRange,
  localDateKey,
  sessionSecondsInRange,
  shiftCalendarAnchor,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '../lib/date';
import { useAppStore } from '../store/AppStore';
import type { Activity, CalendarMode, Session, TimeRange } from '../types';

interface CalendarScreenProps {
  onOpenSettings: () => void;
}

function dateTitle(mode: CalendarMode, anchor: Date, range: TimeRange): string {
  if (mode === 'day') {
    return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(anchor);
  }
  if (mode === 'week') {
    const end = new Date(range.end.getTime() - 1);
    const years = range.start.getFullYear() === end.getFullYear()
      ? String(end.getFullYear())
      : `${range.start.getFullYear()}–${end.getFullYear()}`;
    return `${formatRangeLabel(range)} · ${years}`;
  }
  return new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(anchor);
}

function SessionRow({ session, activity, range, onClick }: { session: Session; activity?: Activity; range: TimeRange; onClick: () => void }) {
  return (
    <button className="calendar-session" type="button" onClick={onClick} style={{ '--activity-color': activity?.color ?? '#7c8196' } as React.CSSProperties}>
      <span className="calendar-session__time">{new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(new Date(Math.max(new Date(session.startedAt).getTime(), range.start.getTime())))}</span>
      <span className="calendar-session__line"><i /></span>
      <span className="calendar-session__body">
        <span><strong>{activity?.name ?? 'Attività archiviata'}</strong><small>{session.source === 'pomodoro' ? (session.completed ? 'Pomodoro completato' : 'Pomodoro interrotto') : 'Cronometro attività'}</small></span>
        <b>{formatDuration(sessionSecondsInRange(session, range), true)}</b>
      </span>
    </button>
  );
}

export function CalendarScreen({ onOpenSettings }: CalendarScreenProps) {
  const { state, removeSession } = useAppStore();
  const [mode, setMode] = useState<CalendarMode>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [activityFilter, setActivityFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const range = useMemo(() => getCalendarRange(mode, anchor), [anchor, mode]);
  const filteredSessions = useMemo(
    () => sessionsInRange(state.sessions, range).filter((session) => activityFilter === 'all' || session.activityId === activityFilter),
    [activityFilter, range, state.sessions],
  );
  const totals = useMemo(
    () => activityTotals(filteredSessions, state.activities, range),
    [filteredSessions, range, state.activities],
  );
  const totalSeconds = totals.reduce((sum, item) => sum + item.seconds, 0);
  const activityMap = useMemo(() => new Map(state.activities.map((activity) => [activity.id, activity])), [state.activities]);

  const jumpToDay = (date: Date) => {
    setAnchor(date);
    setMode('day');
  };

  return (
    <div className="screen calendar-screen">
      <AppHeader eyebrow="La tua memoria" title="Ogni giorno conta." onOpenSettings={onOpenSettings} />

      <div className="segmented calendar-mode" role="group" aria-label="Vista calendario">
        {([['day', 'Giorno'], ['week', 'Settimana'], ['month', 'Mese']] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={mode === value} className={mode === value ? 'is-active' : ''} onClick={() => setMode(value)}>{label}</button>
        ))}
      </div>

      <div className="calendar-toolbar">
        <button className="icon-button" type="button" aria-label="Periodo precedente" onClick={() => setAnchor((current) => shiftCalendarAnchor(current, mode, -1))}><Icon name="chevron-left" /></button>
        <button className="calendar-toolbar__title" type="button" onClick={() => setAnchor(new Date())}><strong>{dateTitle(mode, anchor, range)}</strong><small>Tocca per tornare a oggi</small></button>
        <button className="icon-button" type="button" aria-label="Periodo successivo" onClick={() => setAnchor((current) => shiftCalendarAnchor(current, mode, 1))}><Icon name="chevron-right" /></button>
      </div>

      <label className="filter-select">
        <Icon name="target" size={18} />
        <select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)} aria-label="Filtra per attività">
          <option value="all">Tutte le attività</option>
          {state.activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.name}{activity.archived ? ' (archiviata)' : ''}</option>)}
        </select>
        <Icon name="chevron-right" size={17} />
      </label>

      {mode === 'day' && (
        <DayView
          anchor={anchor}
          sessions={filteredSessions}
          activityMap={activityMap}
          onSession={setSelectedSession}
        />
      )}
      {mode === 'week' && (
        <WeekView
          anchor={anchor}
          sessions={filteredSessions}
          activityMap={activityMap}
          onDay={jumpToDay}
          onSession={setSelectedSession}
        />
      )}
      {mode === 'month' && <MonthView anchor={anchor} sessions={filteredSessions} onDay={jumpToDay} />}

      <section className="period-summary glass-card">
        <div className="section-heading">
          <div><span className="eyebrow">Totale periodo</span><h2>{formatDuration(totalSeconds, true)}</h2></div>
          <span className="summary-session-count">{filteredSessions.length} sessioni</span>
        </div>
        {totals.length ? (
          <div className="period-breakdown">
            {totals.map((item) => (
              <div key={item.activity.id}>
                <span className="period-breakdown__label"><i style={{ background: item.activity.color }} /><strong>{item.activity.name}</strong><small>{item.percentage}% · {formatDuration(item.seconds, true)}</small></span>
                <span className="period-breakdown__track"><span style={{ width: `${item.percentage}%`, background: item.activity.color }} /></span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-inline"><Icon name="calendar" /><p>Nessuna sessione in questo periodo.</p></div>
        )}
      </section>

      <Sheet
        open={Boolean(selectedSession)}
        onClose={() => { setSelectedSession(null); setConfirmDelete(false); }}
        title="Dettaglio sessione"
        subtitle={selectedSession ? new Intl.DateTimeFormat('it-IT', { dateStyle: 'full' }).format(new Date(selectedSession.startedAt)) : ''}
      >
        {selectedSession && (() => {
          const activity = activityMap.get(selectedSession.activityId);
          return (
            <div className="session-detail">
              <span className="session-detail__icon" style={{ '--activity-color': activity?.color } as React.CSSProperties}><Icon name={activity?.icon ?? 'timer'} /></span>
              <h3>{activity?.name ?? 'Attività archiviata'}</h3>
              <strong>{formatDuration(selectedSession.durationSeconds, true)}</strong>
              <div className="session-detail__grid">
                <span><small>Inizio</small><b>{new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(new Date(selectedSession.startedAt))}</b></span>
                <span><small>Fine</small><b>{new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(new Date(selectedSession.endedAt))}</b></span>
                <span><small>Metodo</small><b>{selectedSession.source === 'pomodoro' ? 'Pomodoro' : 'Timer'}</b></span>
              </div>
              {confirmDelete ? (
                <div className="danger-confirm" role="alert"><p>Eliminare definitivamente questa sessione?</p><div><button className="text-button" type="button" onClick={() => setConfirmDelete(false)}>Annulla</button><button className="danger-button" type="button" onClick={() => { removeSession(selectedSession.id); setSelectedSession(null); }}>Elimina</button></div></div>
              ) : (
                <button className="archive-button" type="button" onClick={() => setConfirmDelete(true)}><Icon name="trash" /> Elimina sessione</button>
              )}
            </div>
          );
        })()}
      </Sheet>
    </div>
  );
}

function DayView({ anchor, sessions, activityMap, onSession }: { anchor: Date; sessions: Session[]; activityMap: Map<string, Activity>; onSession: (session: Session) => void }) {
  const dayRange = { start: startOfDay(anchor), end: endOfDayExclusive(anchor) };
  const daySessions = sessions
    .filter((session) => sessionSecondsInRange(session, dayRange) > 0)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  const total = daySessions.reduce((sum, session) => sum + sessionSecondsInRange(session, dayRange), 0);

  return (
    <section className="day-view calendar-panel">
      <div className="day-overview"><div><small>Tempo registrato</small><strong>{formatDuration(total, true)}</strong></div><div><small>Blocchi</small><strong>{daySessions.length}</strong></div></div>
      {daySessions.length ? <div className="day-timeline">{daySessions.map((session) => <SessionRow key={session.id} session={session} activity={activityMap.get(session.activityId)} range={dayRange} onClick={() => onSession(session)} />)}</div> : <CalendarEmpty />}
    </section>
  );
}

function WeekView({ anchor, sessions, activityMap, onDay, onSession }: { anchor: Date; sessions: Session[]; activityMap: Map<string, Activity>; onDay: (date: Date) => void; onSession: (session: Session) => void }) {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const range = { start: date, end: addDays(date, 1) };
    const daySessions = sessions.filter((session) => sessionSecondsInRange(session, range) > 0);
    return { date, range, sessions: daySessions, seconds: daySessions.reduce((sum, session) => sum + sessionSecondsInRange(session, range), 0) };
  });
  const max = Math.max(...days.map((day) => day.seconds), 1);
  const selected = days.find((day) => localDateKey(day.date) === localDateKey(anchor)) ?? days[0];

  return (
    <section className="week-view calendar-panel">
      <div className="week-bars" aria-label="Tempo giornaliero della settimana">
        {days.map((day) => (
          <button key={localDateKey(day.date)} type="button" className={localDateKey(day.date) === localDateKey(anchor) ? 'is-selected' : ''} onClick={() => onDay(day.date)} aria-label={`${new Intl.DateTimeFormat('it-IT', { weekday: 'long' }).format(day.date)}: ${formatDuration(day.seconds, true)}`}>
            <span className="week-bars__value">{day.seconds ? formatDuration(day.seconds, true) : ''}</span>
            <span className="week-bars__track"><i style={{ height: `${Math.max(day.seconds ? 9 : 2, (day.seconds / max) * 100)}%` }} /></span>
            <strong>{new Intl.DateTimeFormat('it-IT', { weekday: 'narrow' }).format(day.date)}</strong>
            <small>{day.date.getDate()}</small>
          </button>
        ))}
      </div>
      <div className="week-detail-heading"><strong>{new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric' }).format(selected.date)}</strong><span>{formatDuration(selected.seconds, true)}</span></div>
      {selected.sessions.length ? <div className="compact-session-list">{selected.sessions.map((session) => <SessionRow key={session.id} session={session} activity={activityMap.get(session.activityId)} range={selected.range} onClick={() => onSession(session)} />)}</div> : <CalendarEmpty compact />}
    </section>
  );
}

function MonthView({ anchor, sessions, onDay }: { anchor: Date; sessions: Session[]; onDay: (date: Date) => void }) {
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    const range = { start: date, end: addDays(date, 1) };
    const seconds = sessions.reduce((sum, session) => sum + sessionSecondsInRange(session, range), 0);
    return { date, seconds };
  });
  const max = Math.max(...cells.map((cell) => cell.seconds), 1);
  const todayKey = localDateKey(new Date());

  return (
    <section className="month-view calendar-panel">
      <div className="month-weekdays">{['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className="month-grid">
        {cells.map((cell) => {
          const intensity = cell.seconds / max;
          const outside = cell.date.getMonth() !== monthStart.getMonth();
          return (
            <button
              key={localDateKey(cell.date)}
              type="button"
              className={`${outside ? 'is-outside' : ''} ${localDateKey(cell.date) === todayKey ? 'is-today' : ''}`}
              style={{ '--intensity': intensity } as React.CSSProperties}
              onClick={() => onDay(cell.date)}
              aria-label={`${new Intl.DateTimeFormat('it-IT', { dateStyle: 'full' }).format(cell.date)}, ${formatDuration(cell.seconds, true)}`}
            >
              <span>{cell.date.getDate()}</span>
              {cell.seconds > 0 && <i />}
            </button>
          );
        })}
      </div>
      <div className="heat-legend"><span>Meno</span><i /><i /><i /><i /><span>Più focus</span></div>
    </section>
  );
}

function CalendarEmpty({ compact = false }: { compact?: boolean }) {
  return <div className={`calendar-empty ${compact ? 'is-compact' : ''}`}><span><Icon name="calendar" /></span><div><strong>Spazio ancora libero</strong><p>Le sessioni concluse appariranno qui.</p></div></div>;
}
