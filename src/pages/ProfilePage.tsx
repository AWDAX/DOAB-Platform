import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Truck, Shield, ShieldCheck, LogOut, Clock, Settings, Users2, Award } from 'lucide-react';
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
    const { error } = await signInWithGoogle();
    if (error) {
      alert(error);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    setLoading(true);
    await firebaseSignOut();
    setLoading(false);
    navigate('/', { replace: true });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar flex flex-col items-center">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full max-w-3xl mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-main)] flex items-center gap-2.5">
            <User className="h-6 w-6 text-[var(--color-brand-accent)]" />
            Entity Profile & Credentials
          </h1>
          <p className="text-[var(--text-muted)] text-xs sm:text-sm mt-1">Manage your role, dispatch partner verification, and telemetry parameters.</p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <PageTourButton pageKey="profile" label="Profile Guide" />

          {user && (
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold btn-danger-subtle cursor-pointer shadow-2xs shrink-0"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          )}
        </div>
      </div>
      
      {/* Authentication Card */}
      <div id="tour-profile-auth" className="neo-glass-card p-6 sm:p-7 rounded-2xl w-full max-w-3xl mx-auto mb-6 border border-[var(--border-color)] shadow-sm">
        <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--text-muted)] mb-4 text-left">
          Authentication Status
        </h2>
        
        {loading ? (
          <div className="flex items-center justify-center gap-3.5 p-5 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] w-full">
            <BrandLogo size="sm" isLoader={true} />
            <span className="text-xs text-[var(--text-muted)] font-mono">Verifying DOAB Firebase session...</span>
          </div>
        ) : user ? (
          <div className="p-4 sm:p-5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl w-full flex flex-col gap-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div className="flex items-center gap-3.5 min-w-0">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'User')}&background=0284c7&color=fff&bold=true`} 
                  alt="Avatar" 
                  referrerPolicy="no-referrer"
                  className="h-11 w-11 rounded-full border border-[var(--border-color)] shadow-xs object-cover shrink-0" 
                />
                <div className="min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-[var(--text-main)] truncate">{user.displayName || 'Civic Operator'}</div>
                  <div className="text-[11px] font-mono text-[var(--text-muted)] truncate">{user.email}</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full border border-[var(--border-color)] bg-[var(--text-main)]/10 text-[var(--text-main)] self-start sm:self-auto shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Verified Session</span>
              </span>
            </div>

            <div className="pt-3 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[var(--text-muted)]">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[var(--color-brand-accent)]" />
                <span>Last Logged In:</span>
                <span className="font-semibold text-[var(--text-main)]">
                  {formatLastLogin(user.lastLogin || localStorage.getItem('doab_last_login') || user.metadata?.lastSignInTime)}
                </span>
              </div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">
                Provider: {user.providerData?.[0]?.providerId === 'google.com' ? 'Google OAuth' : 'DOAB Secure Auth'}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] text-center flex flex-col items-center justify-center w-full">
            <p className="text-xs text-[var(--text-muted)] mb-4 max-w-md mx-auto leading-relaxed">
              Authenticate via Firebase to sync historical delivery routes, access high-priority rerouting, and claim dispatch bounties.
            </p>
            <button 
              onClick={handleLogin}
              className="inline-flex items-center justify-center gap-2.5 px-6 py-2.5 bg-[var(--text-main)] text-[var(--bg-card)] rounded-xl font-semibold text-xs hover:opacity-90 transition-opacity shadow-sm cursor-pointer mx-auto"
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

      {/* Your Role Card */}
      <div id="tour-profile-roles" className="neo-glass-card p-6 sm:p-7 rounded-2xl w-full max-w-3xl mx-auto border border-[var(--border-color)] shadow-sm">
        <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--text-muted)] mb-4 text-left">
          Your Role
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 w-full">
          <label className={`p-4.5 border rounded-2xl cursor-pointer transition-all ${
            role === 'citizen' 
              ? 'border-[var(--text-main)] ring-1 ring-[var(--text-main)] bg-[var(--bg-main)] shadow-xs' 
              : 'border-[var(--border-color)] hover:border-[var(--text-muted)] bg-[var(--bg-card)]'
          }`}>
            <input type="radio" name="role" value="citizen" className="hidden" checked={role === 'citizen'} onChange={() => setRole('citizen')} />
            <div className="flex items-center gap-2 mb-1">
              <User className={`h-4 w-4 ${role === 'citizen' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`} />
              <div className="font-bold text-xs text-[var(--text-main)]">Citizen</div>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] leading-relaxed">Standard civic routing, ward waterlogging warnings & photo back-check.</div>
          </label>

          <label className={`p-4.5 border rounded-2xl cursor-pointer transition-all ${
            role === 'delivery' 
              ? 'border-[var(--text-main)] ring-1 ring-[var(--text-main)] bg-[var(--bg-main)] shadow-xs' 
              : 'border-[var(--border-color)] hover:border-[var(--text-muted)] bg-[var(--bg-card)]'
          }`}>
            <input type="radio" name="role" value="delivery" className="hidden" checked={role === 'delivery'} onChange={() => setRole('delivery')} />
            <div className="flex items-center gap-2 mb-1">
              <Truck className={`h-4 w-4 ${role === 'delivery' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`} />
              <div className="font-bold text-xs text-[var(--text-main)]">Delivery Partner / Dispatch</div>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] leading-relaxed">Swiggy, Zomato, Zepto riders & emergency plumber/tanker work orders.</div>
          </label>
        </div>

        {/* Vendor Verification for Delivery Partners */}
        {role === 'delivery' && (
          <div className="mb-6 p-4 sm:p-4.5 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] w-full">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="font-bold text-xs text-[var(--text-main)]">Vendor Identification Link</h3>
              <button
                type="button"
                onClick={() => setVendorId('SWIGGY-BLR-9021')}
                className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-neutral-200/90 dark:bg-white/10 hover:bg-neutral-300 dark:hover:bg-white/15 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-white/10 transition-colors cursor-pointer"
              >
                Demo Partner ID
              </button>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mb-3">Input your platform partner ID to unlock verified commercial dispatch routing.</p>
            <input 
              type="text" 
              placeholder="e.g. SWIGGY-BLR-8821 or ZEPTO-OPS-109" 
              className="w-full h-9 px-3 text-xs font-mono border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-1 focus:ring-[var(--text-main)] bg-[var(--bg-card)] text-[var(--text-main)] placeholder:text-[var(--text-muted)]" 
              disabled={!user}
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
            />
            {!user && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1.5 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                Please sign in via Google above before linking a Vendor ID.
              </p>
            )}
          </div>
        )}

        {/* Two-Wheeler Flood Clearance Limit (Synced with Settings) */}
        <div className="mb-6 p-4 sm:p-4.5 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] w-full">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[var(--color-brand-accent)] shrink-0" />
              <div>
                <div className="text-xs font-bold text-[var(--text-main)]">Two-Wheeler Flood Clearance Limit</div>
                <div className="text-[10px] text-[var(--text-muted)]">Reroutes riders when standing water exceeds limit</div>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--color-brand-accent)] shrink-0">
              {clearanceLimit} cm max
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 mb-3">
            {[
              { val: '15', label: '15 cm', desc: 'Strict Safety' },
              { val: '20', label: '20 cm', desc: 'Standard City' },
              { val: '25', label: '25 cm', desc: 'High Clearance' },
            ].map((item) => (
              <button
                key={item.val}
                type="button"
                onClick={() => handleClearanceChange(item.val as any)}
                className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                  clearanceLimit === item.val
                    ? 'border-[var(--text-main)] bg-[var(--bg-card)] shadow-xs ring-1 ring-[var(--text-main)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-card)]/50 hover:bg-[var(--bg-card)]'
                }`}
              >
                <div className="text-xs font-bold text-[var(--text-main)]">{item.label}</div>
                <div className="text-[9px] text-[var(--text-muted)] font-mono">{item.desc}</div>
              </button>
            ))}
          </div>

          <div className="pt-2.5 border-t border-[var(--border-color)] flex items-center justify-between gap-3">
            <div className="text-xs font-medium text-[var(--text-main)]">
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

        {/* Telemetry & Permissions Setting */}
        <div id="tour-profile-permissions" className="border-t border-[var(--border-color)] pt-5 w-full">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--text-muted)] text-left">
              Life-Safety & Permissions Suite
            </h2>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('doab:open-permissions'));
              }}
              className="text-[10px] font-mono text-[var(--color-brand-accent)] hover:underline font-bold cursor-pointer"
            >
              Configure
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <button 
              type="button" 
              onClick={() => window.dispatchEvent(new CustomEvent('doab:open-permissions'))}
              className="p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] flex items-center justify-between hover:border-[var(--color-brand-accent)] transition-colors cursor-pointer text-left"
            >
              <span className="text-xs font-bold text-[var(--text-main)]">GPS Location</span>
              <span className="mono-badge text-[10px] px-2 py-0.5 rounded-full border border-neutral-300 dark:border-white/20 bg-neutral-200/80 dark:bg-white/10 text-neutral-900 dark:text-neutral-100">
                Granted
              </span>
            </button>
            <button 
              type="button" 
              onClick={() => window.dispatchEvent(new CustomEvent('doab:open-permissions'))}
              className="p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] flex items-center justify-between hover:border-[var(--color-brand-accent)] transition-colors cursor-pointer text-left"
            >
              <span className="text-xs font-bold text-[var(--text-main)]">Civic Notifications</span>
              <span className="mono-badge text-[10px] px-2 py-0.5 rounded-full border border-neutral-300 dark:border-white/20 bg-neutral-200/80 dark:bg-white/10 text-neutral-900 dark:text-neutral-100">
                Enabled
              </span>
            </button>
            <button 
              type="button" 
              onClick={() => window.dispatchEvent(new CustomEvent('doab:open-permissions'))}
              className="p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] flex items-center justify-between hover:border-[var(--color-brand-accent)] transition-colors cursor-pointer text-left"
            >
              <span className="text-xs font-bold text-[var(--text-main)]">Commuter Geofencing</span>
              <span className="mono-badge text-[10px] px-2 py-0.5 rounded-full border border-neutral-300 dark:border-white/20 bg-neutral-200/80 dark:bg-white/10 text-neutral-900 dark:text-neutral-100">
                Enabled
              </span>
            </button>
            <button 
              type="button" 
              onClick={() => window.dispatchEvent(new CustomEvent('doab:open-permissions'))}
              className="p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] flex items-center justify-between hover:border-[var(--color-brand-accent)] transition-colors cursor-pointer text-left"
            >
              <span className="text-xs font-bold text-[var(--text-main)]">DND / SOS Broadcast</span>
              <span className="mono-badge text-[10px] px-2 py-0.5 rounded-full border border-neutral-300 dark:border-white/20 bg-neutral-200/80 dark:bg-white/10 text-neutral-900 dark:text-neutral-100">
                Enabled
              </span>
            </button>
          </div>

          <label className="flex items-start gap-3.5 cursor-pointer group w-full">
            <div className="relative flex items-center justify-center mt-0.5">
              <input type="checkbox" className="peer appearance-none h-4.5 w-4.5 border border-[var(--border-color)] rounded-md bg-[var(--bg-card)] checked:bg-[var(--text-main)] checked:border-[var(--text-main)] transition-colors focus:ring-1 focus:ring-[var(--text-main)]" defaultChecked />
              <Shield className="h-3 w-3 text-[var(--bg-card)] absolute opacity-0 peer-checked:opacity-100 pointer-events-none" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-xs text-[var(--text-main)] group-hover:text-[var(--color-brand-accent)] transition-colors">Background Risk Geofencing</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">Transmit passive road elevation telemetry to alert surrounding riders in real-time.</div>
            </div>
          </label>
        </div>
      </div>

      {/* ── Mobile-Only / Touch-Friendly Quick Action Grid (SAHNIRMAAN Standard) ── */}
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-3.5 sm:hidden my-2">
        {/* Civic Standing & Trust Score Card */}
        <div className="w-full p-4 rounded-2xl neo-glass-card border border-[var(--border-color)] flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs">
          <div className="inline-flex items-center justify-center gap-2 max-w-full">
            <div className="w-6 h-6 rounded-lg bg-[var(--text-main)] text-[var(--bg-card)] flex items-center justify-center shrink-0">
              <Award size={13} />
            </div>
            <span className="text-xs font-semibold text-[var(--text-main)] truncate">
              <span className="font-bold">Civic Standing:</span>{' '}
              <span className="font-mono text-[var(--text-muted)]">Verified Commuter (Top 5% Bengaluru Grid)</span>
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-[var(--color-brand-accent)] inline-flex items-center gap-1">
            <span>Level 3 Hydrology Back-Checker</span>
          </span>
        </div>

        {/* 3-Column Symmetrical Grid: Preferences, Team, Logout */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => {
              playClick();
              window.dispatchEvent(new CustomEvent('doab:open-preferences'));
            }}
            className="p-3.5 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-main)] border border-[var(--border-color)] transition-all flex flex-col items-center justify-center gap-2 text-center group cursor-pointer shadow-2xs"
          >
            <Settings size={18} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
            <span className="text-[11px] font-medium text-[var(--text-main)] text-center leading-tight">
              Settings & Theme
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClick();
              navigate('/team');
            }}
            className="p-3.5 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-main)] border border-[var(--border-color)] transition-all flex flex-col items-center justify-center gap-2 text-center group cursor-pointer shadow-2xs"
          >
            <Users2 size={18} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
            <span className="text-[11px] font-medium text-[var(--text-main)] text-center leading-tight">
              Meet Team
            </span>
          </button>

          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="p-3.5 rounded-2xl bg-rose-500/[0.06] hover:bg-rose-500/[0.12] dark:bg-rose-500/[0.08] dark:hover:bg-rose-500/[0.16] border border-rose-200/80 dark:border-rose-500/20 transition-all flex flex-col items-center justify-center gap-2 text-center group cursor-pointer shadow-2xs"
            >
              <LogOut size={18} className="text-rose-500 dark:text-rose-400 group-hover:scale-105 transition-transform" />
              <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 text-center leading-tight">
                Sign Out
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              className="p-3.5 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-main)] border border-[var(--border-color)] transition-all flex flex-col items-center justify-center gap-2 text-center group cursor-pointer shadow-2xs"
            >
              <User size={18} className="text-[var(--color-brand-accent)] group-hover:scale-105 transition-transform" />
              <span className="text-[11px] font-medium text-[var(--text-main)] text-center leading-tight">
                Sign In
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
