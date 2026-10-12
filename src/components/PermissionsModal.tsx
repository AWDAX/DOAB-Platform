import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  MapPin, 
  ShieldCheck, 
  Radio, 
  Volume2, 
  CheckCircle2, 
  X
} from 'lucide-react';
import { playClick } from '../utils/soundFx';
import { NativeService } from '../utils/nativeService';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestDangerBroadcast?: () => void;
}

export default function PermissionsModal({ isOpen, onClose, onTestDangerBroadcast }: PermissionsModalProps) {
  const [permissions, setPermissions] = useState<{
    location: 'granted' | 'prompt' | 'denied';
    notifications: 'granted' | 'prompt' | 'denied';
    geofence: boolean;
    dndBroadcast: boolean;
  }>({
    location: 'prompt',
    notifications: 'prompt',
    geofence: true,
    dndBroadcast: true
  });

  useEffect(() => {
    const update = async () => {
      const res = await NativeService.checkPermissions();
      setPermissions((prev) => ({
        ...prev,
        location: res.location,
        notifications: res.notifications
      }));
    };
    update();
  }, [isOpen]);

  const requestLocation = async () => {
    playClick();
    const granted = await NativeService.requestLocationPermission();
    setPermissions((prev) => ({ ...prev, location: granted ? 'granted' : 'denied' }));
    window.dispatchEvent(new CustomEvent('doab:permissions-updated'));
  };

  const requestNotifications = async () => {
    playClick();
    const granted = await NativeService.requestNotificationPermission();
    setPermissions((prev) => ({ ...prev, notifications: granted ? 'granted' : 'denied' }));
    window.dispatchEvent(new CustomEvent('doab:permissions-updated'));
  };

  if (!isOpen) return null;

  const PERMISSION_ITEMS = [
    {
      id: 'location',
      title: 'GPS Location',
      category: 'Telemetry Coordinate Stream',
      description: 'Used on the operations map to compute turn-by-turn flood avoidance paths and calculate risk perimeters.',
      icon: MapPin,
      isGranted: permissions.location === 'granted',
      statusLabel: 'Granted',
      action: requestLocation,
      actionText: permissions.location === 'granted' ? 'Allowed' : 'Allow Location Access'
    },
    {
      id: 'notifications',
      title: 'Civic Notifications',
      category: 'Life-Safety Broadcasts',
      description: 'Permits DOAB to broadcast real-time ward telemetry alerts, flash flood warnings, and tanker dispatch updates.',
      icon: Bell,
      isGranted: permissions.notifications === 'granted',
      statusLabel: 'Enabled',
      action: requestNotifications,
      actionText: permissions.notifications === 'granted' ? 'Enabled' : 'Enable Notifications'
    },
    {
      id: 'geofence',
      title: 'Commuter Geofencing',
      category: 'Background Passive Telemetry',
      description: 'Transmits passive road elevation telemetry during your commute so surrounding riders are alerted in real time.',
      icon: Radio,
      isGranted: permissions.geofence,
      statusLabel: 'Enabled',
      action: () => { playClick(); setPermissions((prev) => ({ ...prev, geofence: !prev.geofence })); },
      actionText: permissions.geofence ? 'Disable' : 'Enable Geofencing'
    },
    {
      id: 'dnd_broadcast',
      title: 'DND / SOS Broadcast',
      category: 'Emergency Alarm Override',
      description: 'Enables high-priority full-screen emergency broadcast screens when your route crosses an unsafe red flood zone.',
      icon: Volume2,
      isGranted: permissions.dndBroadcast,
      statusLabel: 'Enabled',
      action: () => {
        playClick();
        if (onTestDangerBroadcast) onTestDangerBroadcast();
      },
      actionText: 'Test Emergency Alert'
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
        className="relative w-full max-w-lg neo-glass-card rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl overflow-hidden p-4 sm:p-7 flex flex-col max-h-[88dvh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-5 pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[var(--text-main)]/10 text-[var(--text-main)] border border-[var(--border-color)] flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-[var(--color-brand-accent)]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)] leading-tight">
                Life-Safety & Permissions Suite
              </h2>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                Civic & Emergency Telemetry Infrastructure
              </span>
            </div>
          </div>

          <button
            onClick={() => { playClick(); onClose(); }}
            className="p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
            aria-label="Close Modal"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Permission Cards Stack */}
        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
          {PERMISSION_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${
                  item.isGranted
                    ? 'border-[var(--border-color)] bg-[var(--bg-main)]/60'
                    : 'border-[var(--text-main)]/30 bg-[var(--bg-card)] shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      item.isGranted 
                        ? 'bg-[var(--text-main)] text-[var(--bg-card)] border-[var(--text-main)]'
                        : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-color)]'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-[var(--text-main)]">{item.title}</h3>
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  {item.isGranted && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--text-main)]/10 text-[var(--text-main)] shrink-0">
                      <CheckCircle2 className="h-3 w-3" />
                      {item.statusLabel}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mb-3 pl-10.5">
                  {item.description}
                </p>

                <div className="flex justify-end pl-10.5">
                  <button
                    type="button"
                    onClick={item.action}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      item.isGranted
                        ? 'border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card)]'
                        : 'bg-[var(--text-main)] text-[var(--bg-card)] hover:opacity-90 shadow-xs'
                    }`}
                  >
                    {item.actionText}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions: Save & Close */}
        <div className="mt-4 pt-3.5 border-t border-[var(--border-color)] flex justify-end">
          <button
            onClick={handleComplete}
            className="w-full sm:w-auto px-5 py-2.5 bg-[var(--text-main)] text-[var(--bg-card)] rounded-xl font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            Save & Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
