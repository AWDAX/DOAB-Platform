import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  MapPin, 
  Bell, 
  Send, 
  UserPlus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  LogOut, 
  Users, 
  Activity, 
  Terminal, 
  Play
} from 'lucide-react';
import { 
  getCurrentAdminSession, 
  verifyAdminCredentials, 
  adminSignOut, 
  getAuthorizedAdmins, 
  addAuthorizedAdmin, 
  removeAuthorizedAdmin,
  type AdminUser 
} from '../lib/adminAuth';
import { playClick, playAlertAlarm } from '../utils/soundFx';
import { NativeService } from '../utils/nativeService';
import { RemoteAdminChannel } from '../services/remoteAdminChannel';

export default function DevAdminDashboard() {
  const [session, setSession] = useState<AdminUser | null>(() => getCurrentAdminSession());
  
  // Login Form State
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Active Admin Tabs
  const [activeTab, setActiveTab] = useState<'triggers' | 'admins'>('triggers');

  // Trigger Action States
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Custom Alert Injection Form State
  const [alertTitle, setAlertTitle] = useState('Critical Inundation: 80ft Road Corridor');
  const [alertWard, setAlertWard] = useState('Ward 14 (Koramangala)');
  const [alertSeverity, setAlertSeverity] = useState<'Critical' | 'High' | 'Medium'>('Critical');
  const [alertDepth, setAlertDepth] = useState(65);

  // Custom Danger Broadcast Form State
  const [sosTitle, setSosTitle] = useState('Severe Flash Flood Surge');
  const [sosWard, setSosWard] = useState('MG Road Underpass');
  const [sosDesc, setSosDesc] = useState('Water level rapidly rising. Immediate bypass engaged. All low clearance vehicles halted.');

  // Admin Delegation State
  const [adminsList, setAdminsList] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [adminMgmtMsg, setAdminMgmtMsg] = useState('');

  useEffect(() => {
    if (session) {
      setAdminsList(getAuthorizedAdmins());
    }
  }, [session]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    setLoginError('');

    const res = verifyAdminCredentials(usernameInput, passwordInput);
    if (res.success && res.user) {
      setSession(res.user);
      setUsernameInput('');
      setPasswordInput('');
    } else {
      setLoginError(res.error || 'Authentication failed.');
    }
  };

  const handleLogout = () => {
    playClick();
    adminSignOut();
    setSession(null);
  };

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // 2. Trigger Destination Reached Feedback Panel (Local + Remote Mobile Devices)
  const triggerDestinationArrival = () => {
    playClick();
    const payload = {
      summary: 'Koramangala 80ft Road → Domlur Safe Haven Corridor',
      distance_meters: 4200,
      duration_seconds: 720,
      mean_risk: 0.08,
      maps_url: 'https://maps.google.com'
    };

    RemoteAdminChannel.broadcast('destination_arrival', payload);
    showToast('Toggled Destination Arrival & AI Accuracy Feedback Panel across app & remote devices.');
  };

  // 3. Inject Municipal Test Alert into All Alerts Page (Local + Remote Mobile Devices)
  const injectMunicipalAlert = () => {
    playClick();
    try {
      const newAlert = {
        lat: 12.9352,
        lng: 77.6245,
        title: alertTitle,
        ward: alertWard,
        severity: alertSeverity,
        waterDepthCm: Number(alertDepth),
        rainfallMmH: 42,
        probability: alertSeverity === 'Critical' ? 0.92 : alertSeverity === 'High' ? 0.74 : 0.45,
        confidence: 'Live Admin Dispatched Event',
        updatedTime: 'Just now (Admin Live Broadcast)',
        isMockup: false,
      };

      RemoteAdminChannel.broadcast('custom_alert', newAlert);
      showToast(`Injected alert "${alertTitle}" into Notification Stream on all devices.`);
    } catch (e) {
      showToast('Failed to save simulated alert.', 'error');
    }
  };

  // Clear injected alerts
  const clearAdminAlerts = () => {
    playClick();
    localStorage.removeItem('doab_admin_custom_alerts');
    window.dispatchEvent(new CustomEvent('doab:admin-alerts-updated'));
    showToast('Cleared all custom admin alerts.');
  };

  // 4. Register New Sub-Admin
  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    setAdminMgmtMsg('');

    if (!session) return;
    const res = addAuthorizedAdmin(newAdminEmail, newAdminUsername, newAdminPassword, session.username);
    if (res.success) {
      setAdminsList(getAuthorizedAdmins());
      setNewAdminEmail('');
      setNewAdminUsername('');
      setNewAdminPassword('');
      setAdminMgmtMsg('Admin added successfully.');
    } else {
      setAdminMgmtMsg(res.error || 'Failed to add admin.');
    }
  };

  const handleRemoveAdmin = (username: string) => {
    playClick();
    const res = removeAuthorizedAdmin(username);
    if (res.success) {
      setAdminsList(getAuthorizedAdmins());
      showToast(`Admin ${username} removed.`);
    } else {
      showToast(res.error || 'Failed to remove admin.', 'error');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. UNPROTECTED / LOGIN SCREEN (DOAB Monochromatic Strict Obsidian & Porcelain)
  // ─────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-white dark:bg-[#080808] text-neutral-900 dark:text-neutral-100 font-sans selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-neutral-50/80 dark:bg-[#121214] border border-neutral-300 dark:border-white/10 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 mx-auto flex items-center justify-center shadow-md">
              <Terminal className="h-6 w-6 stroke-[2]" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white">DOAB Developer Console</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
              [RESTRICTED] Operations Dispatch & Demo Simulation
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-xl bg-neutral-200/80 dark:bg-white/10 border border-neutral-400 dark:border-white/20 text-neutral-950 dark:text-white text-xs font-mono font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block font-semibold">
                Admin Username / Email
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter username or email"
                autoComplete="off"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white placeholder:text-neutral-400 font-mono transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block font-semibold">
                Password
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white placeholder:text-neutral-400 font-mono transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs hover:opacity-90 active:scale-98 transition-all shadow-md cursor-pointer font-sans"
            >
              Sign In to Dev Console
            </button>
          </form>

          <div className="pt-2 border-t border-neutral-200 dark:border-white/10 text-center text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
            <span>[INTERNAL USE ONLY] • AUTHENTICATED ACCESS REQUIRED</span>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. AUTHENTICATED DEV / ADMIN DASHBOARD (Pure Obsidian & Porcelain Monochromatic Architecture)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#080808] text-neutral-900 dark:text-neutral-100 p-4 sm:p-6 md:p-8 flex flex-col items-center font-sans selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
      <div className="w-full max-w-5xl space-y-6">
        
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-3xl bg-neutral-50/80 dark:bg-[#121214] border border-neutral-300 dark:border-white/10 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center shrink-0 shadow-sm">
              <Terminal className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-neutral-950 dark:text-white">Developer Operations Center</h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-white/10 text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-white/20 uppercase tracking-wider">
                  {session.role === 'super_admin' ? '[SUPER ADMIN]' : '[DEV ADMIN]'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                Operator: <span className="font-semibold text-neutral-950 dark:text-white">{session.username}</span> ({session.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => {
                window.open('/', '_blank');
              }}
              className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-white/15 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Open Public App</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-100 dark:bg-white/5 text-neutral-900 dark:text-white text-xs font-semibold hover:bg-neutral-200 dark:hover:bg-white/15 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Global Action Toast */}
        {statusMsg && (
          <div className="p-3.5 rounded-2xl border border-neutral-400 dark:border-white/20 bg-neutral-100 dark:bg-[#18181b] text-neutral-950 dark:text-white text-xs font-mono font-medium flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-white/10 pb-2 overflow-x-auto">
          {[
            { id: 'triggers', label: 'Instant Triggers & Broadcast Suite', icon: Play },
            { id: 'admins', label: 'Admin Access Control', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { playClick(); setActiveTab(tab.id as any); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                  active
                    ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: INSTANT TRIGGERS */}
        {activeTab === 'triggers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Action 1: Destination Arrival Modal Trigger */}
            <div className="p-5 rounded-3xl bg-neutral-50/80 dark:bg-[#121214] border border-neutral-300 dark:border-white/10 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-neutral-200 dark:bg-white/10 text-neutral-950 dark:text-white border border-neutral-300 dark:border-white/20">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Simulate Destination Reached</h3>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                    [TELEMETRY] Trigger Arrival & AI Accuracy Verification Modal
                  </p>
                </div>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                During 3-minute hackathon evaluations, testers cannot walk across the city. This dispatches the destination arrival flow with AI model feedback and bookmarking across desktop and connected phones.
              </p>

              <button
                type="button"
                onClick={triggerDestinationArrival}
                className="w-full py-2.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs hover:opacity-90 active:scale-98 transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Trigger Destination Reached Modal</span>
              </button>
            </div>

            {/* Section 2: Direct Emergency SOS Push Notification Dispatcher */}
            <div className="md:col-span-2 p-6 rounded-3xl bg-neutral-50/80 dark:bg-[#121214] border border-neutral-300 dark:border-white/10 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 shadow-sm">
                    <Radio className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Emergency SOS Alert Broadcast</h3>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                      [CRITICAL SIREN & HAPTICS] Dispatches emergency push notification overriding silent/vibrate mode
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-neutral-200 dark:bg-white/10 text-neutral-950 dark:text-white border border-neutral-300 dark:border-white/20 font-bold uppercase tracking-wider">
                  HIGH PRIORITY SOS
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 block mb-1">Alert Title</label>
                  <input
                    type="text"
                    value={sosTitle}
                    onChange={(e) => setSosTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 block mb-1">Ward / Location</label>
                  <input
                    type="text"
                    value={sosWard}
                    onChange={(e) => setSosWard(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 block mb-1">Advisory Description</label>
                  <input
                    type="text"
                    value={sosDesc}
                    onChange={(e) => setSosDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playClick();
                  playAlertAlarm();
                  NativeService.triggerSosHaptics();

                  const alertTitle = `🚨 ${sosTitle || 'DOAB EMERGENCY SOS ALERT'}`;
                  const alertBody = `${sosWard ? `[${sosWard}] ` : ''}${sosDesc || 'Severe flash waterlogging reported. Immediate high-ground bypass advised.'}`;

                  // 1. Broadcast 'sos_danger' (the exact event type required by the downloaded native APK)
                  RemoteAdminChannel.broadcast('sos_danger', {
                    title: alertTitle,
                    ward: sosWard,
                    waterDepthCm: 85,
                    description: alertBody,
                    distanceAhead: '200 meters',
                    isCritical: true,
                  });

                  // 2. Also broadcast push_notification for generic listeners
                  RemoteAdminChannel.broadcast('push_notification' as any, {
                    title: alertTitle,
                    body: alertBody,
                    isCritical: true,
                  });

                  showToast('Dispatched Instant Push Notification (SOS) to all active devices.');
                }}
                className="w-full py-3 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs hover:opacity-90 active:scale-98 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 font-sans"
              >
                <Send className="h-4 w-4" />
                <span>Dispatch Instant Push Notification (SOS)</span>
              </button>
            </div>

            {/* Action 4: Inject Live Alert Stream Item */}
            <div className="md:col-span-2 p-5 rounded-3xl bg-neutral-50/80 dark:bg-[#121214] border border-neutral-300 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-neutral-200 dark:bg-white/10 text-neutral-950 dark:text-white border border-neutral-300 dark:border-white/20">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Simulate Municipal Hazard Alert</h3>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                      [INUNDATION STREAM] Injects instant live alert into All Alerts feed
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearAdminAlerts}
                  className="px-2.5 py-1 text-[10px] font-mono rounded-lg border border-neutral-300 dark:border-white/15 text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  Clear Custom Alerts
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 block mb-1">Title</label>
                  <input
                    type="text"
                    value={alertTitle}
                    onChange={(e) => setAlertTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 block mb-1">Ward / Location</label>
                  <input
                    type="text"
                    value={alertWard}
                    onChange={(e) => setAlertWard(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 block mb-1">Severity</label>
                  <select
                    value={alertSeverity}
                    onChange={(e: any) => setAlertSeverity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 block mb-1">Water Depth (cm)</label>
                  <input
                    type="number"
                    value={alertDepth}
                    onChange={(e) => setAlertDepth(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={injectMunicipalAlert}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Inject Alert into Notifications Stream</span>
              </button>
            </div>

          </div>
        )}

        {/* TAB 2: ADMIN ACCESS CONTROL */}
        {activeTab === 'admins' && (
          <div className="space-y-6">
            
            {/* Add Admin Form */}
            {session.role === 'super_admin' ? (
              <div className="p-6 rounded-3xl bg-neutral-50/80 dark:bg-[#121214] border border-neutral-300 dark:border-white/10 space-y-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-neutral-950 dark:text-white" />
                  <h2 className="text-sm font-bold text-neutral-950 dark:text-white">Register New Dev Admin</h2>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Only the Super Admin ({session.username}) can grant access to team members to operate this dashboard.
                </p>

                {adminMgmtMsg && (
                  <div className="p-3 rounded-xl bg-neutral-200 dark:bg-white/10 border border-neutral-300 dark:border-white/20 text-neutral-950 dark:text-white text-xs font-mono">
                    {adminMgmtMsg}
                  </div>
                )}

                <form onSubmit={handleAddAdmin} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 block mb-1">Username</label>
                    <input
                      type="text"
                      placeholder="e.g. dev_alex"
                      value={newAdminUsername}
                      onChange={(e) => setNewAdminUsername(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 block mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="alex@example.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 block mb-1">Initial Password</label>
                    <input
                      type="text"
                      placeholder="Secret password"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-300 dark:border-white/15 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white font-mono"
                    />
                  </div>
                  <div className="sm:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-sm font-sans"
                    >
                      Grant Admin Credentials
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-300 dark:border-white/15 text-neutral-700 dark:text-neutral-300 text-xs font-mono">
                [NOTICE] You are logged in as a Dev Admin. Only Super Admin has permission to invite or remove administrators.
              </div>
            )}

            {/* Admin Table */}
            <div className="p-6 rounded-3xl bg-neutral-50/80 dark:bg-[#121214] border border-neutral-300 dark:border-white/10 space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2 text-neutral-950 dark:text-white">
                <Users className="h-4 w-4" />
                <span>Authorized Dashboard Operators</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-white/10 text-[10px] font-mono uppercase text-neutral-500 dark:text-neutral-400">
                      <th className="py-2.5 px-3">Username</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Added Date</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:border-white/10">
                    {adminsList.map((a) => (
                      <tr key={a.username} className="hover:bg-neutral-100/50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 font-bold text-neutral-950 dark:text-white">{a.username}</td>
                        <td className="py-3 px-3 text-neutral-500 dark:text-neutral-400 font-mono">{a.email}</td>
                        <td className="py-3 px-3">
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border border-neutral-300 dark:border-white/20 bg-neutral-100 dark:bg-white/10 text-neutral-900 dark:text-neutral-100 uppercase">
                            [{a.role}]
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                          {new Date(a.addedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {session.role === 'super_admin' && a.username !== 'krish' && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAdmin(a.username)}
                              className="p-1 rounded-lg text-neutral-500 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                              title="Revoke Admin Access"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
