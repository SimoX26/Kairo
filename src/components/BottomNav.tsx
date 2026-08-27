import { Icon, type IconName } from './Icon';

export type AppTab = 'focus' | 'pomodoro' | 'calendar' | 'reports';

interface BottomNavProps {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  elevated?: boolean;
}

const tabs: { id: AppTab; label: string; icon: IconName }[] = [
  { id: 'focus', label: 'Timer', icon: 'timer' },
  { id: 'pomodoro', label: 'Pomodoro', icon: 'tomato' },
  { id: 'calendar', label: 'Calendario', icon: 'calendar' },
  { id: 'reports', label: 'Report', icon: 'chart' },
];

export function BottomNav({ active, onChange, elevated }: BottomNavProps) {
  return (
    <nav className={`bottom-nav ${elevated ? 'bottom-nav--elevated' : ''}`} aria-label="Navigazione principale">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={active === tab.id ? 'is-active' : ''}
          aria-current={active === tab.id ? 'page' : undefined}
          onClick={() => onChange(tab.id)}
        >
          <span className="bottom-nav__icon"><Icon name={tab.icon} size={21} /></span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
