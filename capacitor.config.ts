import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.doab.sentinel',
  appName: 'DOAB',
  webDir: 'dist',
  server: {
    url: 'https://doab.sahnirmaan.live',
    androidScheme: 'https',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
