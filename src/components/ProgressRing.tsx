import type { PropsWithChildren } from 'react';

interface ProgressRingProps extends PropsWithChildren {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  label?: string;
}

export function ProgressRing({
  progress,
  size = 240,
  strokeWidth = 12,
  color = '#8b85ff',
  className = '',
  label,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI * 2;
  const normalized = Math.min(1, Math.max(0, progress));

  return (
    <div className={`progress-ring ${className}`} style={{ width: size, height: size }} aria-label={label}>
      <svg viewBox={`0 0 ${size} ${size}`} role="presentation">
        <circle className="progress-ring__track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
        <circle
          className="progress-ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - normalized)}
        />
      </svg>
      <div className="progress-ring__content">{children}</div>
    </div>
  );
}
