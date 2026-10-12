import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Radio, 
  MapPin, 
  Bell, 
  Send, 
  UserPlus, 
  Trash2, 
  CheckCircle, 
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

export default function DevAdminDashboard() {
  const [session, setSession] = useState<AdminUser | null>(() => getCurrentAdminSession());
  
  // Login Form State
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Active Admin Tabs
  const [activeTab, setActiveTab] = useState<'triggers' | 'broadcast' | 'admins' | 'audit'>('triggers');

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
  const [sosDepth, setSosDepth] = useState(85);
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

  // 1. Trigger Full-Screen SOS Alarm Broadcast
  const triggerSosDanger = () => {
    playClick();
    playAlertAlarm();
    NativeService.triggerSosHaptics();

    window.dispatchEvent(new CustomEvent('doab:trigger-danger-broadcast', {
      detail: {
        title: sosTitle,
        ward: sosWard,
        waterDepthCm: Number(sosDepth),
        description: sosDesc,
        distanceAhead: '250 meters'
      }
    }));
    showToast(`Dispatched Full-Screen SOS Alarm to active screen: "${sosTitle}"`);
  };

  // 2. Trigger Destination Reached Feedback Panel
  const triggerDestinationArrival = () => {
    playClick();
    window.dispatchEvent(new CustomEvent('doab:trigger-destination-arrival', {
      detail: {
        summary: 'Koramangala 80ft Road → Domlur Safe Haven Corridor',
        distance_meters: 4200,
        duration_seconds: 720,
        mean_risk: 0.08,
        maps_url: 'https://maps.google.com'
      }
    }));
    showToast('Toggled Destination Arrival & AI Accuracy Feedback Panel across app.');
  };

  // 3. Inject Municipal Test Alert into All Alerts Page
  const injectMunicipalAlert = () => {
    playClick();
    try {
      const existing = JSON.parse(localStorage.getItem('doab_admin_custom_alerts') || '[]');
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
      localStorage.setItem('doab_admin_custom_alerts', JSON.stringify([newAlert, ...existing]));
      localStorage.setItem('doab_notifications_read', 'false');

      // Dispatch event to notify components
      window.dispatchEvent(new CustomEvent('doab:admin-alerts-updated'));
      showToast(`Injected alert "${alertTitle}" into Notification Stream.`);
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

  // 4. Handle Add New Admin
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
  // 1. UNPROTECTED / LOGIN SCREEN
  // ─────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[var(--bg-main)] text-[var(--text-main)]">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl neo-glass-card border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 mx-auto flex items-center justify-center shadow-md">
              <Terminal className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">DOAB Developer Console</h1>
            <p className="text-xs text-[var(--text-muted)] font-mono">
              Restricted Demo Simulation & Operations Dispatch
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">
                Admin Username / Email
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter username or email"
                autoComplete="off"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--text-main)] placeholder:text-[var(--text-muted)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">
                Password
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--text-main)] placeholder:text-[var(--text-muted)]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[var(--text-main)] text-[var(--bg-card)] font-bold text-xs hover:opacity-90 transition-opacity shadow-sm cursor-pointer active:scale-95"
            >
              Sign In to Dev Console
            </button>
          </form>

          <div className="pt-2 border-t border-[var(--border-color)] text-center text-[10px] font-mono text-[var(--text-muted)]">
            <span>Confidential & Internal Team Use Only</span>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. AUTHENTICATED DEV / ADMIN DASHBOARD
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-[var(--bg-main)] text-[var(--text-main)] p-4 sm:p-6 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6">
        
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-3xl neo-glass-card border border-[var(--border-color)] bg-[var(--bg-card)] shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[var(--text-main)] text-[var(--bg-card)] flex items-center justify-center shrink-0 shadow-sm">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight">Developer Operations Center</h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  {session.role === 'super_admin' ? 'Super Admin' : 'Dev Admin'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                Operator: <span className="font-semibold text-[var(--text-main)]">{session.username}</span> ({session.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => {
                window.open('/', '_blank');
              }}
              className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-xs font-semibold hover:bg-[var(--bg-main)] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Open Public App</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold hover:bg-rose-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Global Action Toast */}
        {statusMsg && (
          <div className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 ${
            statusMsg.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
          }`}>
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2 overflow-x-auto">
          {[
            { id: 'triggers', label: 'Demo Instant Triggers', icon: Play },
            { id: 'broadcast', label: 'SOS Broadcast Config', icon: ShieldAlert },
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
                    ? 'bg-[var(--text-main)] text-[var(--bg-card)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]'
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
            <div className="p-5 rounded-3xl neo-glass-card border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Simulate Destination Reached</h3>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Trigger the Safe Path Completion & Model Feedback Modal without walking
                  </p>
                </div>
              </div>

              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                During 3-minute hackathon demos, developers cannot physically walk across the city. This button immediately invokes the user arrival confirmation flow with risk probability verification and bookmarking options.
              </p>

              <button
                type="button"
                onClick={triggerDestinationArrival}
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Trigger Destination Reached Modal</span>
              </button>
            </div>

            {/* Action 2: SOS Emergency Siren Trigger */}
            <div className="p-5 rounded-3xl neo-glass-card border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Dispatch Full-Screen SOS Alarm</h3>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Simulate full emergency danger override with audible siren & haptics
                  </p>
                </div>
              </div>

              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Immediately broadcasts the critical life-safety screen on all connected devices, triggering local haptics, warning audio alarms, and rerouting bypass options.
              </p>

              <button
                type="button"
                onClick={triggerSosDanger}
                className="w-full py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <Radio className="h-3.5 w-3.5" />
                <span>Fire Full-Screen SOS Alarm Now</span>
              </button>
            </div>

            {/* Action 3: Inject Live Alert Stream Item */}
            <div className="md:col-span-2 p-5 rounded-3xl neo-glass-card border border-[var(--border-color)] bg-[var(--bg-card)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Inject Custom Municipal Alert</h3>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Broadcast realistic flood alerts into the All Alerts feed
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearAdminAlerts}
                  className="px-2.5 py-1 text-[10px] font-mono rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
                >
                  Clear Custom Alerts
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-mono text-[var(--text-muted)] block mb-1">Title</label>
                  <input
                    type="text"
                    value={alertTitle}
                    onChange={(e) => setAlertTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[var(--text-muted)] block mb-1">Ward / Location</label>
                  <input
                    type="text"
                    value={alertWard}
                    onChange={(e) => setAlertWard(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[var(--text-muted)] block mb-1">Severity</label>
                  <select
                    value={alertSeverity}
                    onChange={(e: any) => setAlertSeverity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs focus:outline-none"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[var(--text-muted)] block mb-1">Water Depth (cm)</label>
                  <input
                    type="number"
                    value={alertDepth}
                    onChange={(e) => setAlertDepth(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={injectMunicipalAlert}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--text-main)] text-[var(--bg-card)] font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Inject Alert into Notifications Stream</span>
              </button>
            </div>

          </div>
        )}

        {/* TAB 2: BROADCAST CONFIG */}
        {activeTab === 'broadcast' && (
          <div className="p-6 rounded-3xl neo-glass-card border border-[var(--border-color)] bg-[var(--bg-card)] space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Radio className="h-4 w-4 text-[var(--color-brand-accent)]" />
              <span>Customize Full-Screen SOS Alarm Payload</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Modify the emergency payload before triggering to demonstrate specific disaster simulation cases (e.g. cloudburst, river dam breach, flash ponding).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-mono text-[10px] text-[var(--text-muted)] block mb-1">Broadcast Title</label>
                <input
                  type="text"
                  value={sosTitle}
                  onChange={(e) => setSosTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] text-[var(--text-muted)] block mb-1">Ward / Location</label>
                <input
                  type="text"
                  value={sosWard}
                  onChange={(e) => setSosWard(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] text-[var(--text-muted)] block mb-1">Reported Depth (cm)</label>
                <input
                  type="number"
                  value={sosDepth}
                  onChange={(e) => setSosDepth(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-mono text-[10px] text-[var(--text-muted)] block mb-1">Warning Description</label>
                <textarea
                  rows={2}
                  value={sosDesc}
                  onChange={(e) => setSosDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={triggerSosDanger}
                className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 transition-colors shadow-sm cursor-pointer flex items-center gap-2"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Test Live Alarm with This Payload</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: ADMIN ACCESS CONTROL */}
        {activeTab === 'admins' && (
          <div className="space-y-6">
            
            {/* Add Admin Form */}
            {session.role === 'super_admin' ? (
              <div className="p-6 rounded-3xl neo-glass-card border border-[var(--border-color)] bg-[var(--bg-card)] space-y-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-[var(--color-brand-accent)]" />
                  <h2 className="text-sm font-bold">Register New Dev Admin</h2>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Only the Super Admin ({session.username}) can grant access to team members to operate this dashboard.
                </p>

                {adminMgmtMsg && (
                  <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 text-xs">
                    {adminMgmtMsg}
                  </div>
                )}

                <form onSubmit={handleAddAdmin} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-mono text-[var(--text-muted)] block mb-1">Username</label>
                    <input
                      type="text"
                      placeholder="e.g. dev_alex"
                      value={newAdminUsername}
                      onChange={(e) => setNewAdminUsername(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-[var(--text-muted)] block mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="alex@example.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-[var(--text-muted)] block mb-1">Initial Password</label>
                    <input
                      type="text"
                      placeholder="Secret password"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[var(--text-main)] text-[var(--bg-card)] font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                    >
                      Grant Admin Credentials
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                You are logged in as a Dev Admin. Only Super Admin has permission to invite or remove administrators.
              </div>
            )}

            {/* Admin Table */}
            <div className="p-6 rounded-3xl neo-glass-card border border-[var(--border-color)] bg-[var(--bg-card)] space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Authorized Dashboard Operators</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] text-[10px] font-mono uppercase text-[var(--text-muted)]">
                      <th className="py-2.5 px-3">Username</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Added Date</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {adminsList.map((a) => (
                      <tr key={a.username} className="hover:bg-[var(--bg-main)]/50 transition-colors">
                        <td className="py-3 px-3 font-bold">{a.username}</td>
                        <td className="py-3 px-3 text-[var(--text-muted)] font-mono">{a.email}</td>
                        <td className="py-3 px-3">
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            a.role === 'super_admin'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25'
                              : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25'
                          }`}>
                            {a.role}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[10px] font-mono text-[var(--text-muted)]">
                          {new Date(a.addedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {session.role === 'super_admin' && a.username !== 'krish' && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAdmin(a.username)}
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
