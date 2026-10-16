import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  MapPin, 
  SlidersHorizontal, 
  Radio, 
  Volume2, 
  X
} from 'lucide-react';
import { playClick } from '../utils/soundFx';
import { NativeService } from '../utils/nativeService';
import { ToggleSwitch } from './PreferencesModal';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PermissionsModal({ isOpen, onClose }: PermissionsModalProps) {
  // Read persisted user choices (defaults to false so nothing is taken for granted)
  const [permissions, setPermissions] = useState<{
    location: boolean;
    notifications: boolean;
    geofence: boolean;
    dndBroadcast: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('doab_user_permissions_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      location: false,
      notifications: false,
      geofence: false,
      dndBroadcast: false
    };
  });

  // Sync actual OS permission status on open
  useEffect(() => {
    const update = async () => {
      const res = await NativeService.checkPermissions();
      setPermissions((prev) => {
        const next = {
          ...prev,
          location: res.location === 'granted' ? true : prev.location,
          notifications: res.notifications === 'granted' ? true : prev.notifications
        };
        try {
          localStorage.setItem('doab_user_permissions_v2', JSON.stringify(next));
        } catch {}
        return next;
      });
    };
    if (isOpen) update();
  }, [isOpen]);

  const savePermission = (key: keyof typeof permissions, val: boolean) => {
    setPermissions((prev) => {
      const updated = { ...prev, [key]: val };
      try {
        localStorage.setItem('doab_user_permissions_v2', JSON.stringify(updated));
        if (updated.location && updated.notifications && updated.geofence && updated.dndBroadcast) {
          localStorage.setItem('doab_permissions_prompted', 'true');
        }
      } catch {}
      return updated;
    });
    window.dispatchEvent(new CustomEvent('doab:permissions-updated'));
  };

  const toggleLocation = async (enabled: boolean) => {
    playClick();
    if (enabled) {
      const granted = await NativeService.requestLocationPermission();
      savePermission('location', Boolean(granted));
    } else {
      savePermission('location', false);
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    playClick();
    if (enabled) {
      const granted = await NativeService.requestNotificationPermission();
      savePermission('notifications', Boolean(granted));
    } else {
      savePermission('notifications', false);
    }
  };

  const toggleGeofence = (enabled: boolean) => {
    playClick();
    savePermission('geofence', enabled);
  };

  const toggleDndBroadcast = (enabled: boolean) => {
    playClick();
    savePermission('dndBroadcast', enabled);
  };

  if (!isOpen) return null;

  const PERMISSION_ITEMS = [
    {
      id: 'location',
      title: 'GPS Location',
      category: 'Turn-by-turn Navigation',
      description: 'Finds your live position on the operations map to compute flood avoidance paths and calculate waterlogging perimeters.',
      icon: MapPin,
      enabled: permissions.location,
      onToggle: toggleLocation
    },
    {
      id: 'notifications',
      title: 'Civic Notifications',
      category: 'Waterlogging & Tanker Alerts',
      description: 'Receive real-time ward telemetry alerts, flash flood warnings, and tanker dispatch updates directly on your device.',
      icon: Bell,
      enabled: permissions.notifications,
      onToggle: toggleNotifications
    },
    {
      id: 'geofence',
      title: 'Commuter Geofencing',
      category: 'Background Road Telemetry',
      description: 'Transmits passive road elevation telemetry during your commute so surrounding riders are alerted in real time.',
      icon: Radio,
      enabled: permissions.geofence,
      onToggle: toggleGeofence
    },
    {
      id: 'dnd_broadcast',
      title: 'DND / SOS Broadcast',
      category: 'Emergency Alarm Override',
      description: 'Enables high-priority full-screen emergency broadcast screens when your route crosses an unsafe red flood zone.',
      icon: Volume2,
      enabled: permissions.dndBroadcast,
      onToggle: toggleDndBroadcast
    }
  ];

  const handleComplete = () => {
    playClick();
    localStorage.setItem('doab_permissions_prompted', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md pb-[max(1rem,env(safe-area-inset-bottom))]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl lg:max-w-3xl neo-glass-card rounded-2xl sm:rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl p-4 sm:p-6 flex flex-col max-h-[92vh] sm:max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5 pb-3 border-b border-[var(--border-color)] dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-neutral-900/5 dark:bg-white/10 text-[var(--text-main)] dark:text-neutral-200 border border-[var(--border-color)] dark:border-white/10 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="h-5 w-5 text-[var(--text-main)] dark:text-neutral-200" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)] leading-tight">
                Life-Safety & Permissions
              </h2>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                You can enable or disable these at any time in preferences
              </span>
            </div>
          </div>

          <button
            onClick={handleComplete}
            className="p-2 rounded-xl border border-[var(--border-color)] dark:border-white/10 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
            aria-label="Close Modal"
          >
            <X className="h-4.5 w-4.5 text-[var(--text-muted)] hover:text-[var(--text-main)]" />
          </button>
        </div>

        {/* Permission Cards Grid - 2x2 Grid on desktop/tablet to eliminate overflow-y */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5 max-h-[75vh] sm:max-h-none overflow-y-auto sm:overflow-visible custom-scrollbar pr-0.5 sm:pr-0">
          {PERMISSION_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                  item.enabled
                    ? 'border-neutral-900/20 dark:border-white/20 bg-neutral-900/[0.03] dark:bg-white/[0.04]'
                    : 'border-[var(--border-color)] dark:border-white/10 bg-[var(--bg-main)]/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      item.enabled 
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 border-neutral-900 dark:border-white'
                        : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-color)] dark:border-white/10'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs text-[var(--text-main)] truncate">{item.title}</h3>
                      <span className="text-[9.5px] font-mono text-[var(--text-muted)] block truncate">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  {/* Clean Enable / Disable Switch */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9.5px] font-mono font-bold ${
                      item.enabled ? 'text-[var(--text-main)] dark:text-neutral-200' : 'text-[var(--text-muted)]'
                    }`}>
                      {item.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <ToggleSwitch
                      checked={item.enabled}
                      onChange={item.onToggle}
                      ariaLabel={`Toggle ${item.title}`}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer Action */}
        <div className="mt-4 pt-3 border-t border-[var(--border-color)] dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            Changes save instantly to browser & telemetry service
          </span>
          <button
            type="button"
            onClick={handleComplete}
            className="px-4 py-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 border border-neutral-950/20 dark:border-white/20 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-98"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
