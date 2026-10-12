import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.doab.sentinel',
  appName: 'DOAB',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '83391717697-3e4n8oi2ffmu030cnc7o851tn7lq286o.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
