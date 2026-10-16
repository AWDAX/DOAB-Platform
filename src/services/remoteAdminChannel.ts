/**
 * DOAB Remote Real-Time Admin Telemetry Channel
 * Connects the web Admin Console (/admin on laptop) to all connected devices (including Android Native APK).
 * Uses zero-configuration global lightweight pub/sub with instant push and poll redundancy.
 */

import { NativeService } from '../utils/nativeService';
import { playEmergencyBuzzingAlarm, playCivicNotificationChime, playArrivalSuccessChime, stopAlertAlarm } from '../utils/soundFx';

export interface RemoteAdminBeacon {
  id: string;
  type: 'sos_danger' | 'destination_arrival' | 'custom_alert' | 'clear_alarm' | 'push_notification';
  timestamp: number;
  payload: any;
}

const BEACON_TOPIC = 'doab-sentinel-beacon-live-grid';
const NTFY_URL = `https://ntfy.sh/${BEACON_TOPIC}`;

// Track recent executed beacon IDs (up to 250) so fast-polling redundancy never replays past sirens
const PROCESSED_BEACONS_KEY = 'doab_processed_beacon_ids_v2';
const STAND_DOWN_TIME_KEY = 'doab_last_stand_down_timestamp';

const processedBeaconsSet = new Set<string>();

function loadProcessedBeacons(): void {
  try {
    const raw = localStorage.getItem(PROCESSED_BEACONS_KEY);
    if (raw) {
      const arr: string[] = JSON.parse(raw);
      arr.forEach(id => processedBeaconsSet.add(id));
    }
  } catch {}
}
loadProcessedBeacons();

function markBeaconProcessed(id: string): void {
  processedBeaconsSet.add(id);
  try {
    const arr = Array.from(processedBeaconsSet).slice(-200);
    localStorage.setItem(PROCESSED_BEACONS_KEY, JSON.stringify(arr));
  } catch {}
}

function getLastStandDownTime(): number {
  try {
    const raw = localStorage.getItem(STAND_DOWN_TIME_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

function setLastStandDownTime(ts: number): void {
  try {
    localStorage.setItem(STAND_DOWN_TIME_KEY, String(ts));
  } catch {}
}

export const RemoteAdminChannel = {
  /**
   * Broadcast an administrative event from Laptop/Admin dashboard to all devices
   */
  broadcast: async (type: RemoteAdminBeacon['type'], payload: any) => {
    const beacon: RemoteAdminBeacon = {
      id: `beacon-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      timestamp: Date.now(),
      payload
    };

    // 1. Dispatch locally on current machine immediately
    RemoteAdminChannel.executeLocally(beacon);

    // 2. Publish to cloud channel so Android Phone / remote clients receive it in real-time
    try {
      await fetch(NTFY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Title': type === 'sos_danger' 
            ? '🚨 DOAB SOS ALARM' 
            : type === 'clear_alarm'
            ? '✅ DOAB ALL-CLEAR (STAND DOWN)'
            : 'DOAB Mission Telemetry',
          'Priority': type === 'sos_danger' ? 'urgent' : 'default',
          'Tags': type === 'sos_danger' 
            ? 'warning,rotating_light' 
            : type === 'clear_alarm'
            ? 'white_check_mark,bell'
            : 'information_source'
        },
        body: JSON.stringify(beacon)
      });
    } catch (err) {
      console.warn('[RemoteAdminChannel] Cloud publish fallback:', err);
    }
  },

  /**
   * Execute beacon event on current device
   */
  executeLocally: (beacon: RemoteAdminBeacon) => {
    try {
      if (!beacon || !beacon.id) return;
      if (processedBeaconsSet.has(beacon.id)) return;
      markBeaconProcessed(beacon.id);

      const lastStandDown = getLastStandDownTime();

      if (beacon.type === 'sos_danger') {
        // Drop any buffered SOS messages if they occurred prior to the last stand-down
        if (beacon.timestamp && beacon.timestamp <= lastStandDown) {
          return;
        }

        // Dispatch admin broadcast state indicator to the Admin Console
        window.dispatchEvent(new CustomEvent('doab:admin-broadcast-status', {
          detail: { active: true, payload: beacon.payload }
        }));

        const isOnAdminDashboard = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
        if (isOnAdminDashboard) {
          // Do not blast siren or mount takeover modal on the Admin Control Console itself!
          return;
        }

        // High-urgency aggressive buzzing alarm & haptics for field clients / remote phones
        playEmergencyBuzzingAlarm(3500);
        try {
          NativeService.triggerSosHaptics();
          NativeService.sendEmergencyNotification(
            '🚨 CRITICAL INUNDATION ALERT',
            beacon.payload?.title || 'Severe Flash Flood Alert Dispatched.'
          );
        } catch {}
        // Dispatch UI display immediately so full-screen alarm appears on remote device
        window.dispatchEvent(new CustomEvent('doab:trigger-danger-broadcast', {
          detail: beacon.payload
        }));
      } else if (beacon.type === 'clear_alarm') {
        // Record stand-down timestamp to invalidate any past SOS packets in poll buffers
        const standDownTs = beacon.timestamp || Date.now();
        setLastStandDownTime(standDownTs);

        // All-Clear / Stand-Down: stop active alarms and dismiss danger modal across all devices
        stopAlertAlarm();
        window.dispatchEvent(new CustomEvent('doab:clear-danger-broadcast', {
          detail: beacon.payload
        }));
        window.dispatchEvent(new CustomEvent('doab:admin-broadcast-status', {
          detail: { active: false, payload: beacon.payload }
        }));
      } else if (beacon.type === 'destination_arrival') {
        playArrivalSuccessChime();
        window.dispatchEvent(new CustomEvent('doab:trigger-destination-arrival', {
          detail: beacon.payload
        }));
      } else if (beacon.type === 'custom_alert') {
        playCivicNotificationChime();
        try {
          const existing = JSON.parse(localStorage.getItem('doab_admin_custom_alerts') || '[]');
          localStorage.setItem('doab_admin_custom_alerts', JSON.stringify([beacon.payload, ...existing]));
          localStorage.setItem('doab_notifications_read', 'false');
          window.dispatchEvent(new CustomEvent('doab:admin-alerts-updated'));
          
          // Trigger system push notification for the injected municipal alert
          NativeService.sendEmergencyNotification(
            `⚠️ ${beacon.payload?.severity || 'Civic'} Alert: ${beacon.payload?.ward || 'Flood Zone'}`,
            beacon.payload?.title || 'New municipal alert reported.',
            'civic_chime.wav'
          );
        } catch {}
      } else if (beacon.type === 'push_notification' as any) {
        const isCrit = Boolean(beacon.payload?.isCritical);
        if (isCrit) {
          playEmergencyBuzzingAlarm(2800);
          NativeService.triggerSosHaptics();
        } else {
          playCivicNotificationChime();
        }
        try {
          NativeService.sendEmergencyNotification(
            beacon.payload?.title || 'DOAB Civic Advisory',
            beacon.payload?.body || 'Important advisory broadcast from command center.',
            isCrit ? 'sos_buzzer.wav' : 'civic_chime.wav'
          );
        } catch {}
      }
    } catch (e) {
      console.error('[RemoteAdminChannel] Error executing beacon:', e);
    }
  },

  /**
   * Start listening for remote admin triggers (called once on App startup)
   */
  listen: () => {
    let eventSource: EventSource | null = null;
    let pollInterval: any = null;

    // A. Real-Time Server-Sent Events (Instant Push < 200ms)
    try {
      eventSource = new EventSource(`${NTFY_URL}/sse`);
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.message) {
            const beacon: RemoteAdminBeacon = typeof parsed.message === 'string'
              ? JSON.parse(parsed.message)
              : parsed.message;
            if (beacon && beacon.id && beacon.type) {
              RemoteAdminChannel.executeLocally(beacon);
            }
          }
        } catch {}
      };
      eventSource.onerror = () => {
        // SSE auto-reconnects
      };
    } catch (e) {
      console.warn('[RemoteAdminChannel] SSE not supported, falling back to polling');
    }

    // B. Fast Polling Redundancy (every 3 seconds for bulletproof delivery across mobile sleep states)
    const pollBeacons = async () => {
      try {
        const sinceSeconds = Math.floor(Date.now() / 1000) - 15; // Last 15 seconds
        const res = await fetch(`${NTFY_URL}/json?since=${sinceSeconds}&poll=1`, {
          headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) return;
        const text = await res.text();
        const lines = text.trim().split('\n');
        for (const line of lines) {
          if (!line) continue;
          try {
            const data = JSON.parse(line);
            if (data && data.message) {
              const beacon: RemoteAdminBeacon = typeof data.message === 'string'
                ? JSON.parse(data.message)
                : data.message;
              if (beacon && beacon.id && beacon.type) {
                RemoteAdminChannel.executeLocally(beacon);
              }
            }
          } catch {}
        }
      } catch {}
    };

    pollInterval = setInterval(pollBeacons, 3500);

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }
};
