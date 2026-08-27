import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'it.kairo.focus',
  appName: 'Kairo',
  webDir: 'dist',
  backgroundColor: '#080b17',
  android: {
    backgroundColor: '#080b17',
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#080b17',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_kairo',
      iconColor: '#8B85FF',
    },
  },
};

export default config;
