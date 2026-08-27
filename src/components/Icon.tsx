import type { SVGProps } from 'react';

export type IconName =
  | 'timer'
  | 'tomato'
  | 'calendar'
  | 'chart'
  | 'plus'
  | 'play'
  | 'pause'
  | 'stop'
  | 'skip'
  | 'settings'
  | 'chevron-left'
  | 'chevron-right'
  | 'close'
  | 'more'
  | 'book'
  | 'briefcase'
  | 'code'
  | 'brain'
  | 'language'
  | 'palette'
  | 'sparkles'
  | 'flame'
  | 'target'
  | 'trend-up'
  | 'trash'
  | 'edit'
  | 'check'
  | 'download'
  | 'shield'
  | 'rotate';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 22, ...props }: IconProps) {
  const paths: Record<IconName, React.ReactNode> = {
    timer: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 1.5M9 2h6M12 2v3" /></>,
    tomato: <><path d="M8.5 6.2C5 7.4 3 10 3.5 14.2 4 18.5 7.2 21 12 21s8-2.5 8.5-6.8C21 10 19 7.4 15.5 6.2" /><path d="M9 6c.5-2 1.5-3 3-3-.2 1.6.5 2.5 2 3-1.2.4-2.2.2-3-.6-.5.8-1.2 1-2 .6Z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    play: <path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke="none" />,
    pause: <><path d="M9 5v14M15 5v14" /></>,
    stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />,
    skip: <><path d="m5 5 10 7L5 19V5Z" /><path d="M19 5v14" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    'chevron-left': <path d="m15 18-6-6 6-6" />,
    'chevron-right': <path d="m9 18 6-6-6-6" />,
    close: <><path d="M6 6l12 12M18 6 6 18" /></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    book: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5ZM20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="3" /><path d="M9 7V4h6v3M3 12h18M10 12v2h4v-2" /></>,
    code: <><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" /></>,
    brain: <><path d="M9.5 4A3 3 0 0 0 5 6.6 3.5 3.5 0 0 0 4 13a3.5 3.5 0 0 0 3 5.5A3 3 0 0 0 12 20V5a3 3 0 0 0-2.5-1ZM14.5 4A3 3 0 0 1 19 6.6a3.5 3.5 0 0 1 1 6.4 3.5 3.5 0 0 1-3 5.5A3 3 0 0 1 12 20V5a3 3 0 0 1 2.5-1Z" /><path d="M8 9c0 1.5 1 2.5 2.5 2.5M16 9c0 1.5-1 2.5-2.5 2.5M7 15c1.5 0 2.5.8 2.5 2" /></>,
    language: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
    palette: <><path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h5a4 4 0 0 0 4-4c0-3.3-4-6-9-6Z" /><circle cx="7.5" cy="10" r="1" fill="currentColor" stroke="none" /><circle cx="10" cy="6.5" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="7" r="1" fill="currentColor" stroke="none" /></>,
    sparkles: <><path d="m12 2 1.2 4.2L17 8l-3.8 1.8L12 14l-1.2-4.2L7 8l3.8-1.8L12 2ZM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14ZM19 13l.7 1.8 1.8.7-1.8.7L19 18l-.7-1.8-1.8-.7 1.8-.7L19 13Z" /></>,
    flame: <path d="M13 2s1 4-2 6c-2-3-5-1-5 3 0 1.5.7 2.6 1.7 3.5C6.8 12 9 10 9 10s-.5 4 2 5c-1 1-1.2 3-.2 4.5A6 6 0 0 0 18 14c0-5-5-6-5-12Z" />,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    'trend-up': <><path d="m3 17 6-6 4 4 8-9" /><path d="M15 6h6v6" /></>,
    trash: <><path d="M4 7h16M9 3h6l1 4H8l1-4ZM6 7l1 14h10l1-14M10 11v6M14 11v6" /></>,
    edit: <><path d="m4 16-1 5 5-1L19 9l-4-4L4 16Z" /><path d="m13 7 4 4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    download: <><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></>,
    shield: <><path d="M12 2 4 5v6c0 5.5 3.4 9 8 11 4.6-2 8-5.5 8-11V5l-8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    rotate: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 8a7 7 0 0 1 11.7-2L20 8M4 16l2.2 2a7 7 0 0 0 11.7-2" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
