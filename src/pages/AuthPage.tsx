import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, LogIn, UserPlus, AlertTriangle, User, Truck, X } from 'lucide-react';
import { signInWithGoogle, signInWithFirebaseEmail, createFirebaseAccount, onDOABAuthStateChanged } from '../lib/firebase';
import { getAccountProfile, setAccountProfile } from '../hooks/useUserSettings';
import BrandLogo from '../components/BrandLogo';
import MinimalBrandHeader from '../components/MinimalBrandHeader';
import { Capacitor } from '@capacitor/core';

interface AuthPageProps {
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  envMode?: 'flood' | 'drought';
  toggleEnvMode?: () => void;
}

export default function AuthPage({ isDarkMode, toggleTheme, envMode, toggleEnvMode }: AuthPageProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [selectedRole, setSelectedRole] = useState<'citizen' | 'delivery'>(() => {
    try {
      const profile = getAccountProfile();
      if (profile.role === 'citizen' || profile.role === 'delivery') return profile.role;
      const saved = localStorage.getItem('doab_user_role');
      if (saved === 'citizen' || saved === 'delivery') return saved;
    } catch {}
    return 'citizen';
  });

  const [vendorId, setVendorId] = useState<string>(() => {
    try {
      const profile = getAccountProfile();
      if (profile.vendorId) return profile.vendorId;
      return localStorage.getItem('doab_vendor_id') || '';
    } catch {}
    return '';
  });
  
  const [lastGoogleAccount] = useState<any>(() => {
    try {
      const raw = localStorage.getItem('doab_last_google_account');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && (
        parsed.email === 'suneet.chugh@doab.gov.in' ||
        parsed.email === 'operator@doab.gov.in' ||
        parsed.email?.includes('doab.gov.in')
      )) {
        localStorage.removeItem('doab_last_google_account');
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    document.documentElement.classList.add('auth-page');
    return () => {
      document.documentElement.classList.remove('auth-page');
    };
  }, []);

  const handleRoleSelect = (role: 'citizen' | 'delivery') => {
    setSelectedRole(role);
    setAccountProfile({ role });
    try {
      localStorage.setItem('doab_user_role', role);
    } catch {}
  };

  const handleVendorIdChange = (val: string) => {
    setVendorId(val);
    setAccountProfile({ vendorId: val.trim() });
    try {
      localStorage.setItem('doab_vendor_id', val.trim());
    } catch {}
  };

  const handleFillDemoId = () => {
    const demo = 'SWIGGY-BLR-9021';
    setVendorId(demo);
    setAccountProfile({ vendorId: demo });
    try {
      localStorage.setItem('doab_vendor_id', demo);
    } catch {}
  };

  const isNavigatingRef = React.useRef(false);

  useEffect(() => {
    const unsubscribe = onDOABAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser && !isNavigatingRef.current) {
        isNavigatingRef.current = true;
        setAccountProfile({
          role: selectedRole,
          vendorId: selectedRole === 'delivery' ? vendorId.trim() : ''
        });
        try {
          localStorage.setItem('doab_user_role', selectedRole);
          if (selectedRole === 'delivery' && vendorId.trim()) {
            localStorage.setItem('doab_vendor_id', vendorId.trim());
          }
        } catch {}
        navigate('/', { replace: true });
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [navigate, selectedRole, vendorId]);

  if (user) {
    return <Navigate to="/" replace />;
  }


  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

  // 1-Click Fast Login with previously logged in account (or prompt if no account)
  const handleGoogleBtnClick = async () => {
    // If native mobile, open account selection sheet
    if (Capacitor.isNativePlatform()) {
      if (mode === 'login' && lastGoogleAccount) {
        // Fast direct login as last account on native
        await handleGoogleAccountPick(lastGoogleAccount);
        return;
      }
      setIsGoogleModalOpen(true);
      return;
    }

    // On Desktop Browser: If previous account exists in login mode, log in straight with that account!
    setError(null);
    setGoogleLoading(true);
    setAccountProfile({
      role: selectedRole,
      vendorId: selectedRole === 'delivery' ? vendorId.trim() : ''
    });
    try {
      localStorage.setItem('doab_user_role', selectedRole);
      if (selectedRole === 'delivery' && vendorId.trim()) {
        localStorage.setItem('doab_vendor_id', vendorId.trim());
      }
    } catch {}

    const loginHint = mode === 'login' && lastGoogleAccount?.email ? lastGoogleAccount.email : null;
    const result = await signInWithGoogle(loginHint, lastGoogleAccount || undefined);
    if (result.error) {
      setError(result.error);
    } else if (result.user) {
      try {
        localStorage.setItem(
          'doab_last_google_account',
          JSON.stringify({
            email: result.user.email,
            fullName: result.user.displayName || result.user.email?.split('@')[0] || 'Operator',
            photoURL: result.user.photoURL
          })
        );
      } catch {}
      if (!isNavigatingRef.current) {
        isNavigatingRef.current = true;
        navigate('/', { replace: true });
      }
    }
    setGoogleLoading(false);
  };

  // Explicit Choose Another Account: ALWAYS opens the Google / Firebase Account Chooser
  const handleGoogleChooseAnotherAccount = async () => {
    if (Capacitor.isNativePlatform()) {
      setIsGoogleModalOpen(true);
      return;
    }

    setError(null);
    setGoogleLoading(true);
    setAccountProfile({
      role: selectedRole,
      vendorId: selectedRole === 'delivery' ? vendorId.trim() : ''
    });
    try {
      localStorage.setItem('doab_user_role', selectedRole);
      if (selectedRole === 'delivery' && vendorId.trim()) {
        localStorage.setItem('doab_vendor_id', vendorId.trim());
      }
    } catch {}

    // Passing null forces prompt: 'select_account', opening the Firebase / Google account chooser
    const result = await signInWithGoogle(null);
    if (result.error) {
      setError(result.error);
    } else if (result.user) {
      try {
        localStorage.setItem(
          'doab_last_google_account',
          JSON.stringify({
            email: result.user.email,
            fullName: result.user.displayName || result.user.email?.split('@')[0] || 'Operator',
            photoURL: result.user.photoURL
          })
        );
      } catch {}
      if (!isNavigatingRef.current) {
        isNavigatingRef.current = true;
        navigate('/', { replace: true });
      }
    }
    setGoogleLoading(false);
  };

  const handleGoogleAccountPick = async (account: { email: string; name?: string; photoURL?: string }) => {
    setIsGoogleModalOpen(false);
    setError(null);
    setGoogleLoading(true);

    setAccountProfile({
      role: selectedRole,
      vendorId: selectedRole === 'delivery' ? vendorId.trim() : ''
    });
    try {
      localStorage.setItem('doab_user_role', selectedRole);
      if (selectedRole === 'delivery' && vendorId.trim()) {
        localStorage.setItem('doab_vendor_id', vendorId.trim());
      }
    } catch {}

    const result = await signInWithGoogle(account.email, account);
    if (result.error) {
      setError(result.error);
    } else if (result.user) {
      try {
        localStorage.setItem(
          'doab_last_google_account',
          JSON.stringify({
            email: result.user.email,
            fullName: result.user.displayName || result.user.email?.split('@')[0] || 'Operator',
            photoURL: result.user.photoURL
          })
        );
        setAccountProfile({
          role: selectedRole,
          vendorId: selectedRole === 'delivery' ? vendorId.trim() : ''
        });
        localStorage.setItem('doab_user_role', selectedRole);
        if (selectedRole === 'delivery' && vendorId.trim()) {
          localStorage.setItem('doab_vendor_id', vendorId.trim());
        }
      } catch {}
      if (!isNavigatingRef.current) {
        isNavigatingRef.current = true;
        navigate('/', { replace: true });
      }
    }
    setGoogleLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    setAccountProfile({
      role: selectedRole,
      vendorId: selectedRole === 'delivery' ? vendorId.trim() : ''
    });

    try {
      const res = mode === 'register'
        ? await createFirebaseAccount(emailTrimmed, password)
        : await signInWithFirebaseEmail(emailTrimmed, password);

      if (res && res.error) {
        setError(res.error);
      } else {
        try {
          setAccountProfile({
            role: selectedRole,
            vendorId: selectedRole === 'delivery' ? vendorId.trim() : ''
          });
          localStorage.setItem('doab_user_role', selectedRole);
          if (selectedRole === 'delivery' && vendorId.trim()) {
            localStorage.setItem('doab_vendor_id', vendorId.trim());
          }
        } catch {}
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container h-[100dvh] max-h-[100dvh] w-full flex flex-col items-center justify-center relative px-4 transition-colors duration-300 bg-[var(--bg-main)] overflow-y-auto sm:overflow-hidden select-none">
      {/* SWATVA Minimal Brand Header */}
      <MinimalBrandHeader
        backLabel="Back to Home"
        brandLabel="DOAB"
        isLoader={loading || googleLoading}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        envMode={envMode}
        toggleEnvMode={toggleEnvMode}
      />

      {/* Ambient Amber-Gold & Climate Glassmorphic Glow Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full pointer-events-none blur-[130px] opacity-35 dark:opacity-25 bg-gradient-to-tr from-amber-500/30 via-yellow-500/20 to-[var(--color-brand-accent)]/20 -z-10" />
      <div className="absolute bottom-12 right-12 w-[380px] h-[380px] rounded-full pointer-events-none blur-[110px] opacity-25 dark:opacity-20 bg-gradient-to-bl from-amber-500/25 via-orange-400/15 to-transparent -z-10" />
      <div className="absolute top-1/3 -left-20 w-[300px] h-[300px] rounded-full pointer-events-none blur-[100px] opacity-20 bg-amber-400/20 -z-10" />

      {/* Large Background Watermark */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none z-0 overflow-hidden">
        <span className="text-[22vw] font-black tracking-tighter text-slate-900/[0.03] dark:text-white/[0.03] leading-none font-mono">
          DOAB
        </span>
      </div>

      {/* Main Authentication Form Container (SWATVA Proportions, True Center with Balanced Margins) */}
      <main className="relative flex-1 flex flex-col items-center justify-center w-full max-w-[540px] z-10 pt-16 pb-14 my-auto">
        <div className="w-full p-6 sm:p-8 md:p-9 login-form-card neo-glass-card shadow-2xl relative overflow-hidden transition-all duration-300">
          
          <h1 className="h-7 sm:h-8 flex items-center justify-center gap-2 text-base sm:text-lg font-bold text-neutral-950 dark:text-white text-center mb-5 sm:mb-6 whitespace-nowrap tracking-tight font-sans">
            {mode === 'login' ? (
              <>
                <LogIn size={16} className="stroke-[2] flex-shrink-0" aria-hidden="true" />
                <span>Sign in to DOAB</span>
              </>
            ) : (
              <>
                <UserPlus size={16} className="stroke-[2] flex-shrink-0" aria-hidden="true" />
                <span>Create your DOAB account</span>
              </>
            )}
          </h1>

          {/* Clean Segmented Control / Pill Mode Switcher from SWATVA */}
          <div className="mb-5 sm:mb-6 p-1 rounded-full neo-glass-card border border-neutral-200/80 dark:border-white/10">
            <div className="relative grid grid-cols-2 gap-1">
              <span
                aria-hidden="true"
                style={{
                  backgroundImage: 'var(--auth-pill-gradient, linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #334155 100%))'
                }}
                className={`absolute inset-y-0 left-0 w-[calc(50%-2px)] rounded-full dark:!bg-white dark:!bg-none transition-transform duration-[340ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  mode === 'register' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                }`}
              />
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className={`relative z-10 inline-flex items-center justify-center gap-1.5 h-8.5 rounded-full text-xs font-semibold tracking-tight transition-colors cursor-pointer font-sans ${
                  mode === 'login' ? 'text-white dark:text-neutral-950 font-bold' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <LogIn size={13} className="stroke-[2] flex-shrink-0" aria-hidden="true" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className={`relative z-10 inline-flex items-center justify-center gap-1.5 h-8.5 rounded-full text-xs font-semibold tracking-tight transition-colors cursor-pointer font-sans ${
                  mode === 'register' ? 'text-white dark:text-neutral-950 font-bold' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <UserPlus size={13} className="stroke-[2] flex-shrink-0" aria-hidden="true" />
                <span>Create Account</span>
              </button>
            </div>
          </div>

          {/* Your Role Selector */}
          <div className="mb-5 sm:mb-6">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400">
                Your Role
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-neutral-100/80 dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/10">
              <button
                type="button"
                onClick={() => handleRoleSelect('citizen')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedRole === 'citizen'
                    ? 'bg-white dark:bg-white text-neutral-950 dark:text-neutral-950 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <User size={14} className="shrink-0" />
                <span>Citizen Rider</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('delivery')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedRole === 'delivery'
                    ? 'bg-white dark:bg-white text-neutral-950 dark:text-neutral-950 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Truck size={14} className="shrink-0" />
                <span>Delivery Partner</span>
              </button>
            </div>

            {/* If Delivery Partner is selected, show Vendor Identification Link */}
            {selectedRole === 'delivery' && (
              <div className="mt-3 p-3.5 rounded-xl border border-neutral-300/80 dark:border-white/10 bg-neutral-100/70 dark:bg-white/[0.04] transition-all">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold text-neutral-900 dark:text-neutral-100">
                    Vendor Identification Link
                  </span>
                  <button
                    type="button"
                    onClick={handleFillDemoId}
                    className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-neutral-200/90 dark:bg-white/10 hover:bg-neutral-300 dark:hover:bg-white/15 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-white/10 transition-colors cursor-pointer"
                  >
                    Demo Partner ID
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. SWIGGY-BLR-8821 or ZEPTO-OPS-109"
                  value={vendorId}
                  onChange={(e) => handleVendorIdChange(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-neutral-300/90 dark:border-white/15 bg-white dark:bg-neutral-900/80 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-1.5 focus:ring-neutral-400 dark:focus:ring-white/30 transition-shadow"
                />
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-2 leading-tight">
                  Enables 15cm flood thresholds, hazard dispatch alerts & fleet telemetry routing.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-5 sm:mb-6 p-3 sm:p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-start gap-2.5 font-sans">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-500" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          {/* Unified Height-Constant Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleBtnClick}
            disabled={loading || googleLoading}
            className="w-full h-11.5 sm:h-12 mb-5 sm:mb-6 flex items-center justify-between px-4 rounded-xl text-xs sm:text-sm font-semibold tracking-tight border border-neutral-300/90 dark:border-white/10 bg-neutral-100/90 dark:bg-white/[0.05] hover:bg-neutral-200/80 dark:hover:bg-white/[0.08] text-neutral-950 dark:text-white transition-all duration-200 shadow-xs active:scale-[0.99] disabled:opacity-50 cursor-pointer group font-sans"
          >
            <div className="flex items-center gap-3 min-w-0">
              {googleLoading ? (
                <div className="w-4 h-4 border-2 border-neutral-600 dark:border-neutral-400 border-t-transparent rounded-full animate-spin shrink-0" />
              ) : mode === 'login' && lastGoogleAccount?.photoURL ? (
                <img
                  src={lastGoogleAccount.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full object-cover shrink-0 border border-neutral-300 dark:border-white/15 shadow-2xs"
                />
              ) : (
                <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              )}
              <span className="truncate font-semibold text-neutral-950 dark:text-white">
                {mode === 'login'
                  ? (lastGoogleAccount ? `Continue as ${lastGoogleAccount.fullName?.split(' ')[0] || 'User'}` : 'Continue with Google')
                  : 'Sign up with Google'}
              </span>
            </div>

            {mode === 'login' && lastGoogleAccount ? (
              <span className="text-[11px] font-mono text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-950 dark:group-hover:text-white truncate max-w-[170px] hidden sm:inline">
                {lastGoogleAccount.email}
              </span>
            ) : (
              <span className="mono-badge text-[10px] text-neutral-900 dark:text-neutral-100 bg-neutral-200/90 dark:bg-white/10 border border-neutral-300 dark:border-white/20 px-2.5 py-0.5 rounded-full hidden sm:inline shrink-0 font-bold">
                1-Click OAuth
              </span>
            )}
          </button>

          {/* Explicit Option to Switch Google Accounts */}
          {mode === 'login' && lastGoogleAccount && (
            <div className="-mt-3 mb-5 sm:mb-6 flex items-center justify-center">
              <button
                type="button"
                onClick={handleGoogleChooseAnotherAccount}
                disabled={loading || googleLoading}
                className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer hover:underline inline-flex items-center gap-1 font-sans disabled:opacity-50"
              >
                <span>Sign in with another Google account</span>
                <ArrowRight size={12} className="stroke-[2.5]" />
              </button>
            </div>
          )}

          <div className="relative flex items-center justify-center my-5 sm:my-6">
            <div className="border-t border-neutral-200/80 dark:border-white/10 w-full" />
            <span className="bg-[var(--bg-card)] px-3 text-[10px] sm:text-[11px] uppercase font-mono tracking-widest text-neutral-500 dark:text-neutral-400 shrink-0 font-semibold">
              or continue with email
            </span>
            <div className="border-t border-neutral-200/80 dark:border-white/10 w-full" />
          </div>

          {/* Email/Password Form matching SWATVA */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5">
            <div>
              <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest font-mono text-neutral-500 dark:text-neutral-400 mb-1.5 font-semibold">
                Email address
              </label>
              <div className="relative flex items-center h-11.5 sm:h-12 w-full rounded-xl border border-neutral-200/80 dark:border-white/10 bg-neutral-50/80 dark:bg-white/[0.04] focus-within:border-neutral-900 dark:focus-within:border-neutral-300 transition-colors">
                <div className="w-11 sm:w-12 shrink-0 border-r border-neutral-200/80 dark:border-white/10 h-full flex items-center justify-center text-neutral-400 dark:text-neutral-500">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-full flex-1 w-full bg-transparent border-none outline-none px-3.5 text-xs sm:text-sm text-neutral-950 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 font-normal font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest font-mono text-neutral-500 dark:text-neutral-400 mb-1.5 font-semibold">
                Password
              </label>
              <div className="relative flex items-center h-11.5 sm:h-12 w-full rounded-xl border border-neutral-200/80 dark:border-white/10 bg-neutral-50/80 dark:bg-white/[0.04] focus-within:border-neutral-900 dark:focus-within:border-neutral-300 transition-colors">
                <div className="w-11 sm:w-12 shrink-0 border-r border-neutral-200/80 dark:border-white/10 h-full flex items-center justify-center text-neutral-400 dark:text-neutral-500">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="h-full flex-1 w-full bg-transparent border-none outline-none px-3.5 text-xs sm:text-sm text-neutral-950 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 font-normal font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundImage: 'var(--auth-btn-gradient, linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #334155 100%))'
              }}
              className="w-full h-11.5 sm:h-12 mt-3 flex items-center justify-center gap-2 px-4 rounded-xl text-xs sm:text-sm font-bold tracking-tight text-white hover:opacity-95 active:scale-[0.99] dark:!bg-white dark:!bg-none dark:!text-neutral-950 dark:hover:!bg-neutral-100 disabled:opacity-50 transition-all shadow-md cursor-pointer font-sans"
            >
              <span className="whitespace-nowrap font-bold">
                {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </span>
              <ArrowRight size={14} className="stroke-[2.2] flex-shrink-0" />
            </button>
          </form>

        </div>
      </main>

      {/* SWATVA Platform Fixed Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 px-3 sm:px-12 py-2 sm:py-3 border-t border-[var(--border-color)] bg-[var(--bg-card)]/90 backdrop-blur-xl flex items-center justify-between gap-1.5 sm:gap-3 shadow-xs pb-[calc(0.6rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <BrandLogo size="sm" animateOnHover={false} />
          <span className="text-xs font-bold tracking-tight text-[var(--text-main)] shrink-0">
            DOAB
          </span>
          <span className="h-3 w-px bg-[var(--border-color)] shrink-0" aria-hidden="true" />
          <span className="text-[8px] sm:text-[10px] uppercase tracking-normal sm:tracking-[0.16em] font-mono text-[var(--text-muted)] font-medium whitespace-nowrap truncate min-w-0">
            DETECT. ORDER. ALERT. BACK-CHECK.
          </span>
        </div>
        <Link
          to="/team"
          className="text-[8px] sm:text-[9px] uppercase tracking-tight sm:tracking-[0.18em] text-[var(--text-muted)] font-medium hover:text-[var(--text-main)] transition-colors cursor-pointer hover:underline shrink-0 whitespace-nowrap font-mono ml-1"
        >
          BY Contrarians
        </Link>
      </footer>
      {/* Google In-App Account Picker Dialog (Native Android Only) */}
      {Capacitor.isNativePlatform() && isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl p-5 relative overflow-hidden">
            <button
              type="button"
              onClick={() => setIsGoogleModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Google Header */}
            <div className="flex items-center gap-2.5 mb-4">
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-main)]">Sign in with Google</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Choose an account to continue to DOAB</p>
              </div>
            </div>

            {/* Quick 1-Click Option */}
            <div className="space-y-2 mb-4">
              <button
                type="button"
                onClick={() => handleGoogleAccountPick({
                  email: lastGoogleAccount?.email || 'citizen.operator@gmail.com',
                  name: lastGoogleAccount?.fullName || 'Civic Operator',
                  photoURL: lastGoogleAccount?.photoURL
                })}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--border-color)]/30 flex items-center justify-between text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold flex items-center justify-center text-xs shrink-0 ring-2 ring-amber-400/80 shadow-[0_0_10px_rgba(245,158,11,0.55)]">
                      G
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 border border-[var(--bg-card)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--text-main)] truncate">
                      {lastGoogleAccount?.fullName || 'Civic Operator'}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono truncate">
                      {lastGoogleAccount?.email || 'citizen.operator@gmail.com'}
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                  Quick
                </span>
              </button>
            </div>

            {/* Custom Google Account Entry */}
            <div className="pt-3 border-t border-[var(--border-color)]">
              <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-bold mb-2">
                Or Use Any Google Account
              </p>
              <div className="space-y-2 mb-3">
                <input
                  type="text"
                  placeholder="Your Full Name (e.g. Krish)"
                  value={customGoogleName}
                  onChange={(e) => setCustomGoogleName(e.target.value)}
                  className="w-full h-8.5 px-3 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-accent)]"
                />
                <input
                  type="email"
                  placeholder="your.email@gmail.com"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  className="w-full h-8.5 px-3 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-accent)]"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const email = customGoogleEmail.trim() || 'operator@gmail.com';
                  const name = customGoogleName.trim() || email.split('@')[0];
                  handleGoogleAccountPick({ email, name });
                }}
                className="w-full py-2 rounded-xl bg-[var(--text-main)] text-[var(--bg-card)] font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                <span>Continue with this account</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
