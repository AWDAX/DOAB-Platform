import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Truck, LogOut, Clock, Settings, Users2, Award, Sliders, ChevronRight } from 'lucide-react';
import { signInWithGoogle, firebaseSignOut, onDOABAuthStateChanged } from '../lib/firebase';
import { ToggleSwitch } from '../components/PreferencesModal';
import { PageTourButton } from '../components/GuidedTour';
import { playClick } from '../utils/soundFx';
import BrandLogo from '../components/BrandLogo';
import { useUserSettings } from '../hooks/useUserSettings';

function formatLastLogin(dateString?: string | null) {
  if (!dateString) return 'Today, ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Active session';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return 'Active session';
  }
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useUserSettings();
  const role = profile.role;
  const vendorId = profile.vendorId;
  const setRole = (r: 'citizen' | 'delivery') => {
    updateProfile({ role: r });
    try {
      localStorage.setItem('doab_user_role', r);
    } catch {}
  };
  const setVendorId = (v: string) => {
    updateProfile({ vendorId: v });
    try {
      localStorage.setItem('doab_vendor_id', v);
    } catch {}
  };

  const [clearanceLimit, setClearanceLimit] = useState<'15' | '20' | '25'>(() => {
    try {
      const saved = localStorage.getItem('doab_clearance_limit');
      if (saved === '15' || saved === '20' || saved === '25') return saved;
    } catch {}
    return '15';
  });

  const [highElevationPriority, setHighElevationPriority] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('doab_high_elevation');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {}
    return true;
  });

  const handleClearanceChange = (val: '15' | '20' | '25') => {
    playClick();
    setClearanceLimit(val);
    try {
      localStorage.setItem('doab_clearance_limit', val);
      window.dispatchEvent(new CustomEvent('doab:clearance-changed', { detail: { clearanceLimit: val } }));
    } catch {}
  };

  const handleElevationToggle = (checked: boolean) => {
    playClick();
    setHighElevationPriority(checked);
    try {
      localStorage.setItem('doab_high_elevation', JSON.stringify(checked));
      window.dispatchEvent(new CustomEvent('doab:elevation-changed', { detail: { highElevationPriority: checked } }));
    } catch {}
  };

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Listen to auth state (supports real Firebase + local demo session)
  useEffect(() => {
    const unsubscribe = onDOABAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setAuthError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setAuthError(error);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    setLoading(true);
    await firebaseSignOut();
    setLoading(false);
    navigate('/login', { replace: true });
  };

  return (
    <div className="py-6 sm:py-8 lg:py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full overflow-y-auto custom-scrollbar flex flex-col items-center sm:snap-none snap-y snap-mandatory scroll-smooth">
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full max-w-5xl mx-auto sm:snap-align-none snap-start">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-main)] flex items-center gap-2.5">
            <User className="h-5 w-5 sm:h-5.5 sm:w-5.5 text-[var(--text-main)] dark:text-neutral-200 shrink-0" />
            <span className="truncate">Entity Profile & Credentials</span>
          </h1>
          <p className="text-[var(--text-muted)] text-xs sm:text-sm mt-1 sm:whitespace-nowrap">
            Manage your role, dispatch partner verification, and telemetry parameters.
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <PageTourButton pageKey="profile" label="Profile Guide" className="h-9 px-3.5 rounded-full text-xs" />

          {user && (
            <button 
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap btn-danger-subtle cursor-pointer select-none shadow-2xs shrink-0 transition-colors duration-200"
            >
              <LogOut size={13} className="shrink-0" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Desktop / Laptop 2-Column Responsive Layout (Contained within 1 Screen on HP Victus 1080p) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 w-full max-w-5xl mx-auto items-stretch">
        {/* Left Column: Authentication Card (Identity & Status) */}
        <div id="tour-profile-auth" className="lg:col-span-5 neo-glass-card p-4.5 sm:p-6 rounded-2xl w-full border border-[var(--border-color)] shadow-sm sm:snap-align-none snap-start flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2.5 sm:mb-3 text-left">
              Authentication Status
            </h2>

        {authError && (
          <div className="mb-2.5 p-2.5 rounded-lg border border-rose-600/25 dark:border-rose-400/25 bg-rose-950/[0.06] dark:bg-rose-500/[0.12] flex items-center justify-between gap-3 text-xs text-rose-700 dark:text-rose-300">
            <span>{authError}</span>
            <button
              type="button"
              onClick={() => setAuthError(null)}
              className="px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] font-semibold text-[10px] hover:opacity-90 cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center gap-3 p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] w-full">
            <BrandLogo size="sm" isLoader={true} />
            <span className="text-xs text-[var(--text-muted)] font-mono">Verifying DOAB Firebase session...</span>
          </div>
        ) : user ? (
          <div className="p-4 sm:p-5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl w-full flex flex-col items-center text-center">
            {/* Centered Profile Image Circle with Ambient Amber-Gold Glow (Uniform Across Light & Dark Modes) */}
            <div className="relative mb-1.5 sm:mb-2 flex items-center justify-center">
              {/* Ambient blurred amber-gold glow backdrop in both light & dark modes */}
              <div 
                aria-hidden="true" 
                className="absolute -inset-2 sm:-inset-2.5 rounded-full bg-gradient-to-tr from-amber-600/35 via-amber-400/30 to-yellow-500/25 blur-xl pointer-events-none opacity-85" 
              />
              
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'User')}&background=0284c7&color=fff&bold=true`} 
                alt="Avatar" 
                referrerPolicy="no-referrer"
                className="relative z-10 h-18 w-18 sm:h-20 sm:w-20 rounded-full border-2 border-amber-400/50 object-cover shadow-sm ring-2 ring-amber-400/60 shadow-[0_0_24px_rgba(245,158,11,0.45)] [filter:drop-shadow(0_0_12px_rgba(245,158,11,0.4))] transition-all" 
              />
            </div>

            {/* Centered User Details */}
            <div className="font-bold text-base sm:text-lg text-[var(--text-main)] leading-tight mt-1">
              {user.displayName || 'Civic Operator'}
            </div>
            <div className="text-xs sm:text-sm font-mono text-[var(--text-muted)] mt-1">
              {user.email}
            </div>

            <div className="mt-2.5 mb-1">
              <span className="inline-flex items-center gap-1.5 font-mono text-[9.5px] font-bold px-2.5 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--text-main)]/5 dark:bg-white/10 text-[var(--text-main)] dark:text-neutral-200 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-main)] dark:bg-white animate-pulse" />
                <span>Verified Session</span>
              </span>
            </div>

            {/* Metadata Bottom Strip */}
            <div className="w-full pt-3 mt-3 border-t border-[var(--border-color)] flex flex-col items-center justify-center gap-1.5 text-xs font-mono text-[var(--text-muted)] text-center">
              <div className="flex items-center justify-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[var(--text-main)] dark:text-neutral-300" />
                <span>Last Logged In:</span>
                <span className="font-semibold text-[var(--text-main)]">
                  {formatLastLogin(user.lastLogin || localStorage.getItem('doab_last_login') || user.metadata?.lastSignInTime)}
                </span>
              </div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] text-center">
                Provider: {user.providerData?.[0]?.providerId === 'google.com' ? 'Google OAuth' : 'DOAB Secure Auth'}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] text-center flex flex-col items-center justify-center w-full">
            <p className="text-xs text-[var(--text-muted)] mb-2.5 max-w-md mx-auto leading-relaxed">
              Authenticate via Firebase to sync historical delivery routes, access high-priority rerouting, and claim dispatch bounties.
            </p>
            <button 
              onClick={handleLogin}
              className="inline-flex items-center justify-center gap-2.5 px-4.5 py-2 bg-[var(--text-main)] text-[var(--bg-card)] rounded-xl font-semibold text-xs hover:opacity-90 transition-opacity shadow-sm cursor-pointer mx-auto"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </div>
        )}
          </div>
        </div>

        {/* Right Column: Role Selector, Flood Clearance & System Permissions */}
        <div id="tour-profile-roles" className="lg:col-span-7 neo-glass-card p-4.5 sm:p-6 rounded-2xl w-full border border-[var(--border-color)] shadow-sm sm:snap-align-none snap-start flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2.5 sm:mb-3 text-left">
              Your Role
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 w-full">
              <label className={`p-3.5 sm:p-4 border rounded-xl cursor-pointer transition-all ${
                role === 'citizen' 
                  ? 'border-[var(--text-main)] ring-1 ring-[var(--text-main)] bg-[var(--bg-main)] shadow-xs' 
                  : 'border-[var(--border-color)] hover:border-[var(--text-muted)] bg-[var(--bg-card)]'
              }`}>
                <input type="radio" name="role" value="citizen" className="hidden" checked={role === 'citizen'} onChange={() => setRole('citizen')} />
                <div className="flex items-center gap-2 mb-1">
                  <User className={`h-4 w-4 ${role === 'citizen' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`} />
                  <div className="font-bold text-xs sm:text-sm text-[var(--text-main)]">Citizen</div>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] leading-relaxed">Standard civic routing, ward waterlogging warnings & photo back-check.</div>
              </label>

              <label className={`p-3.5 sm:p-4 border rounded-xl cursor-pointer transition-all ${
                role === 'delivery' 
                  ? 'border-[var(--text-main)] ring-1 ring-[var(--text-main)] bg-[var(--bg-main)] shadow-xs' 
                  : 'border-[var(--border-color)] hover:border-[var(--text-muted)] bg-[var(--bg-card)]'
              }`}>
                <input type="radio" name="role" value="delivery" className="hidden" checked={role === 'delivery'} onChange={() => setRole('delivery')} />
                <div className="flex items-center gap-2 mb-1">
                  <Truck className={`h-4 w-4 ${role === 'delivery' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`} />
                  <div className="font-bold text-xs sm:text-sm text-[var(--text-main)]">Delivery Partner</div>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] leading-relaxed">Priority clearance for commercial riders, multi-drop waypoint logic & SLA alerts.</div>
              </label>
            </div>

            {/* Vendor Verification for Delivery Partners */}
            {role === 'delivery' && (
              <div className="mb-2 p-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] w-full">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-bold text-xs text-[var(--text-main)]">Vendor Identification Link</h3>
                  <button
                    type="button"
                    onClick={() => setVendorId('SWIGGY-BLR-9021')}
                    className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-neutral-200/90 dark:bg-white/10 hover:bg-neutral-300 dark:hover:bg-white/15 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-white/10 transition-colors cursor-pointer"
                  >
                    Demo Partner ID
                  </button>
                </div>
                <input 
                  type="text" 
                  placeholder="e.g. SWIGGY-BLR-8821 or ZEPTO-OPS-109" 
                  className="w-full h-7 px-2.5 text-xs font-mono border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--text-main)] bg-[var(--bg-card)] text-[var(--text-main)] placeholder:text-[var(--text-muted)]" 
                  disabled={!user}
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                />
                {!user && (
                  <p className="text-[9.5px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1.5 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    Sign in with Google to link a Vendor ID.
                  </p>
                )}
              </div>
            )}

            {/* Two-Wheeler Flood Clearance Limit (Balanced Proportions) */}
            <div className="p-3.5 sm:p-4 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] w-full mb-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded-md bg-[var(--text-main)]/5 dark:bg-white/10 text-[var(--text-main)] dark:text-neutral-200 shrink-0">
                    <Sliders size={12} className="shrink-0" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-main)] leading-tight">Flood Clearance Threshold</div>
                    <div className="text-[9px] text-[var(--text-muted)]">Reroute threshold for standing water</div>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border border-[var(--border-color)] dark:border-white/20 bg-[var(--bg-card)] text-[var(--text-main)] dark:text-neutral-200 shrink-0 shadow-2xs">
                  {clearanceLimit} cm max
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 mb-2">
                {[
                  { val: '15', label: '15 cm', desc: 'Strict Safety' },
                  { val: '20', label: '20 cm', desc: 'Standard City' },
                  { val: '25', label: '25 cm', desc: 'High Clearance' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => handleClearanceChange(item.val as any)}
                    className={`py-1.5 px-2 rounded-lg text-center border transition-all cursor-pointer ${
                      clearanceLimit === item.val
                        ? 'border-[var(--text-main)] bg-[var(--bg-card)] shadow-xs ring-1 ring-[var(--text-main)]'
                        : 'border-[var(--border-color)] bg-[var(--bg-card)]/60 hover:bg-[var(--bg-card)]'
                    }`}
                  >
                    <div className="text-xs font-bold text-[var(--text-main)]">{item.label}</div>
                    <div className="text-[8.5px] text-[var(--text-muted)] font-mono mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>

              <div className="pt-1.5 border-t border-[var(--border-color)] flex items-center justify-between gap-3">
                <div className="text-[10.5px] font-medium text-[var(--text-main)]">
                  Prefer High-Elevation Ridges
                </div>
                <ToggleSwitch
                  size="sm"
                  checked={highElevationPriority}
                  onChange={handleElevationToggle}
                  ariaLabel="Toggle high-elevation priority"
                />
              </div>
            </div>
          </div>

          {/* Life-Safety & Permissions Setting */}
          <div id="tour-profile-permissions" className="border-t border-[var(--border-color)] pt-3.5 w-full">
            <div className="p-3.5 sm:p-4 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-[var(--text-main)]/10 text-[var(--text-main)] border border-[var(--border-color)] dark:border-white/10 flex items-center justify-center shrink-0">
                  <Settings className="h-4 w-4 text-[var(--text-main)] dark:text-neutral-200" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-[var(--text-main)] truncate">
                    Life-Safety & System Permissions
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">
                    Manage GPS, civic alerts, commuter geofencing & alarms.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playClick();
                  window.dispatchEvent(new CustomEvent('doab:open-permissions'));
                }}
                className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 border border-neutral-950/20 dark:border-white/20 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-xs active:scale-98"
              >
                <Sliders size={12} className="stroke-[2.2]" />
                <span className="text-[11px]">All Permissions</span>
                <ChevronRight size={12} className="opacity-70" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile-Only / Touch-Friendly Quick Action Grid (DOAB Standard) ── */}
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-2 sm:hidden my-2 sm:snap-align-none snap-start">
        {/* Civic Standing & Trust Score Card */}
        <div className="w-full p-2.5 rounded-xl neo-glass-card border border-[var(--border-color)] flex flex-col items-center justify-center text-center gap-1 shadow-2xs">
          <div className="inline-flex items-center justify-center gap-1.5 max-w-full">
            <div className="w-5 h-5 rounded-lg bg-[var(--text-main)] text-[var(--bg-card)] flex items-center justify-center shrink-0">
              <Award size={11} />
            </div>
            <span className="text-xs font-semibold text-[var(--text-main)] truncate">
              <span className="font-bold">Civic Standing:</span>{' '}
              <span className="font-mono text-[var(--text-muted)]">Verified Commuter (Top 5% Bengaluru Grid)</span>
            </span>
          </div>
          <span className="text-[9.5px] font-mono font-bold text-[var(--text-main)] dark:text-neutral-200 inline-flex items-center gap-1">
            <span>Level 3 Hydrology Back-Checker</span>
          </span>
        </div>

        {/* 3-Column Symmetrical Grid: Preferences, Team, Logout */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => {
              playClick();
              window.dispatchEvent(new CustomEvent('doab:open-preferences'));
            }}
            className="p-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-main)] border border-[var(--border-color)] transition-all flex flex-col items-center justify-center gap-1 text-center group cursor-pointer shadow-2xs"
          >
            <Settings size={15} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
            <span className="text-[9.5px] font-medium text-[var(--text-main)] text-center leading-tight">
              Settings & Theme
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClick();
              navigate('/team');
            }}
            className="p-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-main)] border border-[var(--border-color)] transition-all flex flex-col items-center justify-center gap-1 text-center group cursor-pointer shadow-2xs"
          >
            <Users2 size={15} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
            <span className="text-[9.5px] font-medium text-[var(--text-main)] text-center leading-tight">
              Meet Team
            </span>
          </button>

          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-rose-950/[0.06] hover:bg-rose-950/[0.12] dark:bg-rose-500/[0.08] dark:hover:bg-rose-500/[0.16] border border-rose-600/25 dark:border-rose-400/25 transition-all flex flex-col items-center justify-center gap-1 text-center group cursor-pointer shadow-2xs"
            >
              <LogOut size={15} className="text-rose-700 dark:text-rose-300 group-hover:scale-105 transition-transform" />
              <span className="text-[9.5px] font-medium text-rose-700 dark:text-rose-300 text-center leading-tight">
                Sign Out
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              className="p-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-main)] border border-[var(--border-color)] transition-all flex flex-col items-center justify-center gap-1 text-center group cursor-pointer shadow-2xs"
            >
              <User size={15} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)] group-hover:scale-105 transition-all" />
              <span className="text-[9.5px] font-medium text-[var(--text-main)] text-center leading-tight">
                Sign In
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
