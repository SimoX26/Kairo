import { useEffect, useState } from 'react';
import type { AppSettings, AppTheme } from '../types';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

interface SettingsSheetProps {
  open: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
  onReset: () => Promise<void>;
}

const themes: { value: AppTheme; label: string; hint: string }[] = [
  { value: 'dark', label: 'Kairo scuro', hint: 'Notte viola' },
  { value: 'light', label: 'Kairo chiaro', hint: 'Luce pulita' },
  { value: 'nature-dark', label: 'Natura scura', hint: 'Giardino notturno' },
  { value: 'nature-light', label: 'Natura chiara', hint: 'Mattino botanico' },
];

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (value: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="toggle-row">
      <span><strong>{label}</strong>{hint && <small>{hint}</small>}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle" aria-hidden="true"><span /></span>
    </label>
  );
}

export function SettingsSheet({ open, settings, onClose, onSave, onReset }: SettingsSheetProps) {
  const [draft, setDraft] = useState(settings);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(settings);
      setConfirmReset(false);
    }
  }, [open, settings]);

  const numberSetting = (key: keyof AppSettings, value: number) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Il tuo ritmo"
      subtitle="Regola Kairo intorno alle tue giornate."
      className="settings-sheet"
    >
      <section className="settings-section">
        <h3>Pomodoro</h3>
        <div className="duration-grid">
          <label><span>Focus</span><input type="number" min="1" max="120" value={draft.focusMinutes} onChange={(event) => numberSetting('focusMinutes', Number(event.target.value))} /><small>min</small></label>
          <label><span>Pausa</span><input type="number" min="1" max="60" value={draft.shortBreakMinutes} onChange={(event) => numberSetting('shortBreakMinutes', Number(event.target.value))} /><small>min</small></label>
          <label><span>Lunga</span><input type="number" min="1" max="90" value={draft.longBreakMinutes} onChange={(event) => numberSetting('longBreakMinutes', Number(event.target.value))} /><small>min</small></label>
        </div>
        <label className="field field--inline">
          <span>Pausa lunga ogni</span>
          <select value={draft.roundsBeforeLongBreak} onChange={(event) => numberSetting('roundsBeforeLongBreak', Number(event.target.value))}>
            {[2, 3, 4, 5, 6].map((round) => <option key={round} value={round}>{round} focus</option>)}
          </select>
        </label>
        <Toggle checked={draft.autoStartBreaks} onChange={(value) => setDraft({ ...draft, autoStartBreaks: value })} label="Avvia pause automaticamente" />
        <Toggle checked={draft.autoStartFocus} onChange={(value) => setDraft({ ...draft, autoStartFocus: value })} label="Avvia focus automaticamente" />
      </section>

      <section className="settings-section">
        <h3>Esperienza</h3>
        <fieldset className="theme-choice">
          <legend>Tema</legend>
          <div className="theme-grid">
            {themes.map((theme) => (
              <button key={theme.value} type="button" aria-pressed={draft.theme === theme.value} className={`theme-option ${draft.theme === theme.value ? 'is-active' : ''}`} onClick={() => setDraft({ ...draft, theme: theme.value })}>
                <span className={`theme-preview theme-preview--${theme.value}`} aria-hidden="true"><i /><i /></span>
                <span><strong>{theme.label}</strong><small>{theme.hint}</small></span>
                {draft.theme === theme.value && <Icon name="check" size={16} />}
              </button>
            ))}
          </div>
        </fieldset>
        <Toggle checked={draft.soundEnabled} onChange={(value) => setDraft({ ...draft, soundEnabled: value })} label="Suono nell’app" />
        <Toggle checked={draft.hapticsEnabled} onChange={(value) => setDraft({ ...draft, hapticsEnabled: value })} label="Feedback aptico nell’app" />
        <label className="field field--range">
          <span><span>Obiettivo giornaliero</span><strong>{Math.round(draft.dailyGoalMinutes / 60)} ore</strong></span>
          <input type="range" min="60" max="720" step="30" value={draft.dailyGoalMinutes} onChange={(event) => numberSetting('dailyGoalMinutes', Number(event.target.value))} />
        </label>
        <fieldset className="motion-choice">
          <legend>Movimento</legend>
          <div className="segmented segmented--three">
            {([['system', 'Sistema'], ['full', 'Wow'], ['reduced', 'Ridotto']] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={draft.motion === value} className={draft.motion === value ? 'is-active' : ''} onClick={() => setDraft({ ...draft, motion: value })}>{label}</button>
            ))}
          </div>
        </fieldset>
      </section>

      <div className="privacy-card">
        <span className="privacy-card__icon"><Icon name="shield" /></span>
        <div><strong>Solo sul tuo dispositivo</strong><p>Nessun account, cloud o tracciamento. Disinstallando Kairo perderai i dati.</p></div>
      </div>

      <button
        className="primary-button"
        type="button"
        onClick={() => {
          onSave(draft);
          onClose();
        }}
      >
        <Icon name="check" /> Salva impostazioni
      </button>

      {confirmReset ? (
        <div className="danger-confirm" role="alert">
          <p>Verranno eliminate attività e sessioni. Non si può annullare.</p>
          <div>
            <button className="text-button" type="button" onClick={() => setConfirmReset(false)}>Annulla</button>
            <button className="danger-button" type="button" onClick={() => void onReset().then(onClose)}>Elimina tutto</button>
          </div>
        </div>
      ) : (
        <button className="archive-button" type="button" onClick={() => setConfirmReset(true)}>
          <Icon name="trash" /> Azzera tutti i dati
        </button>
      )}
    </Sheet>
  );
}
