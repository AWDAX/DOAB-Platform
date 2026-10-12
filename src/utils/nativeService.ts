import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export const NativeService = {
  isNative: (): boolean => Capacitor.isNativePlatform(),

  // Trigger high-intensity emergency vibration / haptic feedback
  triggerSosHaptics: async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.notification({ type: NotificationType.Error });
        await Haptics.vibrate({ duration: 1000 });
      } else if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300, 100, 800]);
      }
    } catch (e) {
      console.warn('Haptics not supported or failed:', e);
    }
  },

  // Haptic feedback for button clicks
  impactLight: async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch (e) {
      console.warn('Light impact failed:', e);
    }
  },

  // High-priority emergency local notification
  sendEmergencyNotification: async (title: string, body: string) => {
    try {
      if (Capacitor.isNativePlatform()) {
        const perm = await LocalNotifications.requestPermissions();
        if (perm.display === 'granted') {
          await LocalNotifications.schedule({
            notifications: [
              {
                id: Date.now() % 100000,
                title: title || '🚨 CRITICAL SOS ALERT',
                body: body || 'Emergency beacon triggered. Sending live telemetry.',
                schedule: { at: new Date(Date.now() + 100) },
                sound: 'beep.wav',
                actionTypeId: '',
                extra: { isSos: true }
              }
            ]
          });
        }
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.svg' });
      }
    } catch (e) {
      console.warn('Local notification failed:', e);
    }
  },

  // Get device native GPS location with high accuracy
  getCurrentPosition: async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const hasPerm = await Geolocation.requestPermissions();
        if (hasPerm.location === 'granted' || hasPerm.coarseLocation === 'granted') {
          const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000
          });
          return {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
        }
      } else if (navigator.geolocation) {
        return new Promise<{ latitude: number; longitude: number; accuracy: number }>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy
              });
            },
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 10000 }
          );
        });
      }
    } catch (e) {
      console.warn('Native geolocation failed:', e);
    }
    return null;
  },

  // Check actual runtime hardware permissions status
  checkPermissions: async () => {
    let locationStatus: 'granted' | 'prompt' | 'denied' = 'prompt';
    let notificationStatus: 'granted' | 'prompt' | 'denied' = 'prompt';

    try {
      if (Capacitor.isNativePlatform()) {
        const geo = await Geolocation.checkPermissions();
        if (geo.location === 'granted' || geo.coarseLocation === 'granted') {
          locationStatus = 'granted';
        } else if (geo.location === 'denied') {
          locationStatus = 'denied';
        } else {
          locationStatus = 'prompt';
        }

        const notif = await LocalNotifications.checkPermissions();
        if (notif.display === 'granted') {
          notificationStatus = 'granted';
        } else if (notif.display === 'denied') {
          notificationStatus = 'denied';
        } else {
          notificationStatus = 'prompt';
        }
      } else {
        if ('Notification' in window) {
          notificationStatus = Notification.permission as any;
        }
        if (navigator.permissions) {
          const res = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          locationStatus = res.state as any;
        }
      }
    } catch (e) {
      console.warn('Check permissions status error:', e);
    }

    return {
      location: locationStatus,
      notifications: notificationStatus
    };
  },

  // Request actual Android system dialog for location
  requestLocationPermission: async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const res = await Geolocation.requestPermissions();
        return res.location === 'granted' || res.coarseLocation === 'granted';
      } else if (navigator.geolocation) {
        return new Promise<boolean>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(true),
            () => resolve(false),
            { timeout: 8000 }
          );
        });
      }
    } catch (e) {
      console.warn('Request location permission error:', e);
    }
    return false;
  },

  // Request actual Android system dialog for notifications
  requestNotificationPermission: async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const res = await LocalNotifications.requestPermissions();
        return res.display === 'granted';
      } else if ('Notification' in window) {
        const res = await Notification.requestPermission();
        return res === 'granted';
      }
    } catch (e) {
      console.warn('Request notification permission error:', e);
    }
    return false;
  }
};
