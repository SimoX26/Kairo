import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';
import type { AppTheme, PomodoroPhase } from '../types';

const POMODORO_NOTIFICATION_ID = 2515;
const EXACT_ALARM_PROMPTED_KEY = 'kairo.exact-alarm-prompted';

export async function configureNativeShell(theme: AppTheme = 'dark'): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await Promise.allSettled([
    StatusBar.setStyle({ style: theme === 'light' ? Style.Dark : Style.Light }),
    StatusBar.setBackgroundColor({ color: theme === 'light' ? '#f6f7fc' : '#080b17' }),
  ]);
}

export async function tapFeedback(enabled = true): Promise<void> {
  if (!enabled || !Capacitor.isNativePlatform()) return;
  await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
}

export async function successFeedback(enabled = true): Promise<void> {
  if (enabled && Capacitor.isNativePlatform()) {
    await Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
  }
}

function notificationCopy(phase: PomodoroPhase): { title: string; body: string } {
  if (phase === 'focus') {
    return { title: 'Focus completato ✦', body: 'Ottimo ritmo. È il momento di respirare.' };
  }
  return { title: 'Pausa terminata', body: 'La prossima sessione di focus ti aspetta.' };
}

export async function schedulePomodoroNotification(
  seconds: number,
  phase: PomodoroPhase,
  requestPermission = false,
): Promise<void> {
  if (!Capacitor.isNativePlatform() || seconds <= 0) return;

  const current = await LocalNotifications.checkPermissions();
  const permission = current.display === 'prompt' && requestPermission
    ? await LocalNotifications.requestPermissions()
    : current;
  if (permission.display !== 'granted') return;

  if (requestPermission) {
    const exact = await LocalNotifications.checkExactNotificationSetting().catch(() => null);
    const { value: exactPrompted } = await Preferences.get({ key: EXACT_ALARM_PROMPTED_KEY });
    if (exact && exact.exact_alarm !== 'granted' && exactPrompted !== 'true') {
      await Preferences.set({ key: EXACT_ALARM_PROMPTED_KEY, value: 'true' });
      await LocalNotifications.changeExactNotificationSetting().catch(() => undefined);
    }
  }

  const copy = notificationCopy(phase);
  await LocalNotifications.cancel({ notifications: [{ id: POMODORO_NOTIFICATION_ID }] });
  await LocalNotifications.schedule({
    notifications: [
      {
        id: POMODORO_NOTIFICATION_ID,
        title: copy.title,
        body: copy.body,
        schedule: { at: new Date(Date.now() + seconds * 1_000), allowWhileIdle: true },
        smallIcon: 'ic_stat_kairo',
      },
    ],
  });
}

export async function cancelPomodoroNotification(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.cancel({ notifications: [{ id: POMODORO_NOTIFICATION_ID }] }).catch(() => undefined);
}

export function playCompletionTone(enabled = true): void {
  if (!enabled || typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(523.25, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(783.99, context.currentTime + 0.35);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.6);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.62);
  oscillator.addEventListener('ended', () => void context.close());
}
