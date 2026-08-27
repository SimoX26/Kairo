import { useMemo, useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { useNow } from '../hooks/useNow';
import {
  activityTotals,
  calculateMetrics,
  currentStreak,
  dailyTrend,
  percentageChange,
  type TrendPoint,
} from '../lib/analytics';
import { formatDuration, formatRangeLabel, getComparableReportRanges } from '../lib/date';
import { useAppStore } from '../store/AppStore';
import type { ReportPeriod } from '../types';

interface ReportsScreenProps {
  onOpenSettings: () => void;
  onStartFocus: () => void;
}

function changeLabel(change: number | null): string {
  if (change === null) return 'Nuovo ritmo';
  if (change === 0) return 'In linea';
  return `${change > 0 ? '+' : ''}${change}%`;
}

function compactTrend(points: TrendPoint[], target = 14): TrendPoint[] {
  if (points.length <= target) return points;
  const groupSize = Math.ceil(points.length / target);
  const compacted: TrendPoint[] = [];
  for (let index = 0; index < points.length; index += groupSize) {
    const group = points.slice(index, index + groupSize);
    compacted.push({
      key: `${group[0].key}-${group.at(-1)?.key}`,
      label: group.length > 1 ? `${group[0].label}–${group.at(-1)?.label}` : group[0].label,
      seconds: group.reduce((sum, point) => sum + point.seconds, 0),
    });
  }
  return compacted;
}

export function ReportsScreen({ onOpenSettings, onStartFocus }: ReportsScreenProps) {
  const { state } = useAppStore();
  const [period, setPeriod] = useState<ReportPeriod>('week');
  const [activityFilter, setActivityFilter] = useState('all');
  const now = useNow(true, 60_000);
  const ranges = useMemo(() => getComparableReportRanges(period, now), [now, period]);
  const sessions = useMemo(
    () => state.sessions.filter((session) => activityFilter === 'all' || session.activityId === activityFilter),
    [activityFilter, state.sessions],
  );
  const current = useMemo(() => calculateMetrics(sessions, ranges.current), [ranges.current, sessions]);
  const previous = useMemo(() => calculateMetrics(sessions, ranges.previous), [ranges.previous, sessions]);
  const change = percentageChange(current.totalSeconds, previous.totalSeconds);
  const sessionChange = percentageChange(current.sessionCount, previous.sessionCount);
  const breakdown = useMemo(
    () => activityTotals(sessions, state.activities, ranges.current),
    [ranges.current, sessions, state.activities],
  );
  const previousBreakdown = useMemo(
    () => activityTotals(sessions, state.activities, ranges.previous),
    [ranges.previous, sessions, state.activities],
  );
  const rawTrend = useMemo(
    () => dailyTrend(sessions, ranges.current),
    [ranges.current, sessions],
  );
  const trend = useMemo(() => compactTrend(rawTrend), [rawTrend]);
  const maxTrend = Math.max(...trend.map((point) => point.seconds), 1);
  const streak = currentStreak(sessions, now);
  const donut = useMemo(() => {
    if (!breakdown.length) return 'conic-gradient(#252a3b 0 100%)';
    let cursor = 0;
    const stops = breakdown.map((item) => {
      const start = cursor;
      cursor += item.percentage;
      return `${item.activity.color} ${start}% ${cursor}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [breakdown]);
  const comparisonItems = useMemo(
    () => state.activities
      .map((activity) => ({
        activity,
        current: breakdown.find((item) => item.activity.id === activity.id),
        previous: previousBreakdown.find((item) => item.activity.id === activity.id),
      }))
      .filter((item) => item.current || item.previous)
      .sort((a, b) => (b.current?.seconds ?? b.previous?.seconds ?? 0) - (a.current?.seconds ?? a.previous?.seconds ?? 0)),
    [breakdown, previousBreakdown, state.activities],
  );
  const bestDay = [...rawTrend].sort((a, b) => b.seconds - a.seconds)[0];

  return (
    <div className="screen reports-screen">
      <AppHeader eyebrow="Insight locali" title="Il progresso, chiaro." onOpenSettings={onOpenSettings} />

      <div className="segmented report-period" role="group" aria-label="Periodo report">
        {([['week', '7 giorni'], ['month', 'Mese'], ['quarter', '90 giorni']] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={period === value} className={period === value ? 'is-active' : ''} onClick={() => setPeriod(value)}>{label}</button>
        ))}
      </div>

      <div className="report-context-row">
        <label className="filter-select filter-select--compact">
          <Icon name="target" size={17} />
          <select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)} aria-label="Filtra report per attività">
            <option value="all">Tutte</option>
            {state.activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.name}</option>)}
          </select>
        </label>
        <span>{formatRangeLabel(ranges.current)}</span>
      </div>

      <section className="report-hero glass-card">
        <div className="report-hero__glow" />
        <span className="eyebrow">Tempo di lavoro</span>
        <strong className="report-total">{formatDuration(current.totalSeconds, true)}</strong>
        <div className={`change-pill ${change !== null && change < 0 ? 'is-negative' : ''}`}>
          <Icon name={change !== null && change < 0 ? 'chevron-right' : 'trend-up'} size={16} />
          <strong>{changeLabel(change)}</strong>
          <span>vs periodo precedente</span>
        </div>
        <div className="report-hero__comparison">
          <span>Prima <strong>{formatDuration(previous.totalSeconds, true)}</strong></span>
          <i />
          <span>Ora <strong>{formatDuration(current.totalSeconds, true)}</strong></span>
        </div>
      </section>

      <div className="metric-grid">
        <article><span className="metric-icon metric-icon--violet"><Icon name="timer" /></span><small>Sessioni</small><strong>{current.sessionCount}</strong><em>{changeLabel(sessionChange)}</em></article>
        <article><span className="metric-icon metric-icon--coral"><Icon name="target" /></span><small>Media</small><strong>{formatDuration(current.averageSeconds, true)}</strong><em>per blocco</em></article>
        <article><span className="metric-icon metric-icon--lime"><Icon name="tomato" /></span><small>Pomodoro</small><strong>{current.completedPomodoros}</strong><em>{current.completionRate === null ? 'N/D' : `${current.completionRate}% completati`}</em></article>
        <article><span className="metric-icon metric-icon--aqua"><Icon name="flame" /></span><small>Serie</small><strong>{streak}</strong><em>{streak === 1 ? 'giorno' : 'giorni'}</em></article>
      </div>

      <section className="chart-card glass-card">
        <div className="section-heading"><div><span className="eyebrow">Andamento</span><h2>Il tuo ritmo</h2></div><span className="chart-peak"><Icon name="sparkles" size={15} /> Picco {bestDay?.seconds ? formatDuration(bestDay.seconds, true) : '—'}</span></div>
        {current.totalSeconds ? (
          <div className="trend-chart" role="img" aria-label={`Grafico del tempo: ${trend.map((point) => `${point.label} ${formatDuration(point.seconds, true)}`).join(', ')}`}>
            {trend.map((point, index) => (
              <div key={point.key} className="trend-column" style={{ '--delay': `${index * 35}ms` } as React.CSSProperties}>
                <span className="trend-column__value">{point.seconds ? formatDuration(point.seconds, true) : ''}</span>
                <span className="trend-column__bar"><i style={{ height: `${Math.max(point.seconds ? 5 : 1, (point.seconds / maxTrend) * 100)}%` }} /></span>
                <small>{index === 0 || index === trend.length - 1 || trend.length <= 8 || index % 2 === 0 ? point.label.split(' ')[0] : ''}</small>
              </div>
            ))}
          </div>
        ) : <ReportEmpty onStartFocus={onStartFocus} />}
      </section>

      <section className="distribution-card glass-card">
        <div className="section-heading"><div><span className="eyebrow">Distribuzione</span><h2>Dove va il tempo</h2></div></div>
        {comparisonItems.length ? (
          <div className="distribution-layout">
            <div className="donut" style={{ background: donut }} role="img" aria-label={breakdown.length ? breakdown.map((item) => `${item.activity.name} ${item.percentage}%`).join(', ') : 'Nessun tempo nel periodo corrente'}><span><strong>{breakdown.length}</strong><small>attività ora</small></span></div>
            <div className="distribution-list">
              {comparisonItems.map(({ activity, current: item, previous: oldItem }) => {
                const currentSeconds = item?.seconds ?? 0;
                const old = oldItem?.seconds ?? 0;
                const delta = percentageChange(currentSeconds, old);
                return (
                  <div key={activity.id}>
                    <i style={{ background: activity.color }} />
                    <span><strong>{activity.name}</strong><small>{formatDuration(currentSeconds, true)} · {item?.sessions ?? 0} sessioni</small></span>
                    <b>{item?.percentage ?? 0}%</b>
                    <em className={delta !== null && delta < 0 ? 'is-negative' : ''}>{changeLabel(delta)}</em>
                  </div>
                );
              })}
            </div>
          </div>
        ) : <div className="empty-inline"><Icon name="chart" /><p>Servono sessioni per calcolare la distribuzione.</p></div>}
      </section>

      <section className="insight-card">
        <span className="insight-card__orb"><Icon name="sparkles" /></span>
        <div>
          <span className="eyebrow">Kairo insight</span>
          <h2>{current.totalSeconds === 0 ? 'Il prossimo dato nasce da una sessione.' : change !== null && change >= 10 ? 'Il tuo focus sta accelerando.' : 'La costanza batte l’intensità.'}</h2>
          <p>{current.totalSeconds === 0 ? 'Avvia un timer: dopo il primo blocco vedrai trend, percentuali e confronti.' : breakdown[0] ? `${breakdown[0].activity.name} guida il periodo con il ${breakdown[0].percentage}% del tempo. ${bestDay?.label ? `Il picco è stato ${bestDay.label}.` : ''}` : 'Continua a registrare il tuo ritmo.'}</p>
        </div>
      </section>
    </div>
  );
}

function ReportEmpty({ onStartFocus }: { onStartFocus: () => void }) {
  return (
    <div className="report-empty">
      <span><Icon name="chart" /></span>
      <strong>Il grafico è pronto per te</strong>
      <p>Completa almeno una sessione per vedere il ritmo prendere forma.</p>
      <button className="small-action" type="button" onClick={onStartFocus}><Icon name="play" size={15} /> Vai al timer</button>
    </div>
  );
}
