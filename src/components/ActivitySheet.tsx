import { useEffect, useState, type FormEvent } from 'react';
import type { Activity, ActivityIcon } from '../types';
import { Icon, type IconName } from './Icon';
import { Sheet } from './Sheet';

interface ActivitySheetProps {
  open: boolean;
  activity?: Activity | null;
  onClose: () => void;
  onSave: (input: Pick<Activity, 'name' | 'color' | 'icon' | 'weeklyGoalMinutes'>) => void;
  onArchive?: () => void;
}

const colors = ['#8b85ff', '#ff745e', '#b8f35a', '#56d6c9', '#ffbf5f', '#e875ff'];
const icons: { value: ActivityIcon; label: string; icon: IconName }[] = [
  { value: 'brain', label: 'Focus', icon: 'brain' },
  { value: 'book', label: 'Studio', icon: 'book' },
  { value: 'briefcase', label: 'Lavoro', icon: 'briefcase' },
  { value: 'code', label: 'Codice', icon: 'code' },
  { value: 'language', label: 'Lingue', icon: 'language' },
  { value: 'palette', label: 'Creatività', icon: 'palette' },
];

export function ActivitySheet({ open, activity, onClose, onSave, onArchive }: ActivitySheetProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(colors[0]);
  const [icon, setIcon] = useState<ActivityIcon>('brain');
  const [goalHours, setGoalHours] = useState(5);
  const [confirmArchive, setConfirmArchive] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(activity?.name ?? '');
    setColor(activity?.color ?? colors[0]);
    setIcon(activity?.icon ?? 'brain');
    setGoalHours(activity ? Math.max(1, Math.round(activity.weeklyGoalMinutes / 60)) : 5);
    setConfirmArchive(false);
  }, [activity, open]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), color, icon, weeklyGoalMinutes: goalHours * 60 });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={activity ? 'Modifica attività' : 'Nuova attività'}
      subtitle="Dalle un’identità: sarà più bello tornarci."
    >
      <form className="activity-form" onSubmit={submit}>
        <label className="field">
          <span>Nome attività</span>
          <input
            autoFocus
            type="text"
            value={name}
            maxLength={32}
            placeholder="Es. Analisi matematica"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <fieldset className="choice-field">
          <legend>Icona</legend>
          <div className="icon-picker">
            {icons.map((item) => (
              <button
                type="button"
                key={item.value}
                className={icon === item.value ? 'is-selected' : ''}
                aria-label={item.label}
                aria-pressed={icon === item.value}
                onClick={() => setIcon(item.value)}
              >
                <Icon name={item.icon} />
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="choice-field">
          <legend>Colore</legend>
          <div className="color-picker">
            {colors.map((item) => (
              <button
                type="button"
                key={item}
                className={color === item ? 'is-selected' : ''}
                style={{ '--swatch': item } as React.CSSProperties}
                aria-label={`Scegli il colore ${item}`}
                aria-pressed={color === item}
                onClick={() => setColor(item)}
              />
            ))}
          </div>
        </fieldset>

        <label className="field field--range">
          <span><span>Obiettivo settimanale</span><strong>{goalHours} ore</strong></span>
          <input
            type="range"
            min="1"
            max="40"
            value={goalHours}
            onChange={(event) => setGoalHours(Number(event.target.value))}
          />
        </label>

        <button className="primary-button" type="submit" disabled={!name.trim()}>
          <Icon name={activity ? 'check' : 'plus'} />
          {activity ? 'Salva modifiche' : 'Crea attività'}
        </button>

        {activity && onArchive && (
          confirmArchive ? (
            <div className="danger-confirm" role="alert">
              <p>Lo storico resterà nei report. Archiviare?</p>
              <div>
                <button type="button" className="text-button" onClick={() => setConfirmArchive(false)}>Annulla</button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    onArchive();
                    onClose();
                  }}
                >
                  Archivia
                </button>
              </div>
            </div>
          ) : (
            <button className="archive-button" type="button" onClick={() => setConfirmArchive(true)}>
              <Icon name="trash" /> Archivia attività
            </button>
          )
        )}
      </form>
    </Sheet>
  );
}
