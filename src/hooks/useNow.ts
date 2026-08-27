import { useEffect, useState } from 'react';

export function useNow(active = true, intervalMs = 1_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const interval = window.setInterval(update, active ? intervalMs : 60_000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', update);
    };
  }, [active, intervalMs]);

  return now;
}
