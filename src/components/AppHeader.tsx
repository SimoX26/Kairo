import { Icon } from './Icon';

interface AppHeaderProps {
  eyebrow?: string;
  title: string;
  onOpenSettings: () => void;
}

export function AppHeader({ eyebrow, title, onOpenSettings }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="brand-lockup">
        <div className="brand-lockup__logo">
          <img src={`${import.meta.env.BASE_URL}kairo-logo.png`} alt="" />
          <span className="brand-lockup__pulse" />
        </div>
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
        </div>
      </div>
      <button className="icon-button icon-button--glass" type="button" aria-label="Apri impostazioni" onClick={onOpenSettings}>
        <Icon name="settings" />
      </button>
    </header>
  );
}
