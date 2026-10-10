import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, LogIn, UserPlus, AlertTriangle } from 'lucide-react';
import { signInWithGoogle, signInWithFirebaseEmail, onDOABAuthStateChanged } from '../lib/firebase';
import BrandLogo from '../components/BrandLogo';
import MinimalBrandHeader from '../components/MinimalBrandHeader';

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
    const unsubscribe = onDOABAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        navigate('/', { replace: true });
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [navigate]);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleSignIn = async (loginHint: any = null) => {
    setError(null);
    setGoogleLoading(true);

    const result = await signInWithGoogle(loginHint);
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
      navigate('/', { replace: true });
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

    try {
      const res = await signInWithFirebaseEmail(emailTrimmed, password);
      if (res && res.error) {
        setError(res.error);
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col items-center justify-center relative px-4 transition-colors duration-300 bg-[var(--bg-main)] overflow-y-auto sm:overflow-hidden select-none">
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
        <div className="w-full p-6 sm:p-8 md:p-9 rounded-2xl sm:rounded-3xl border border-amber-500/25 dark:border-amber-400/20 bg-gradient-to-b from-[var(--bg-card)]/92 via-[var(--bg-card)]/85 to-[var(--bg-card)]/92 backdrop-blur-2xl shadow-[0_20px_50px_-12px_rgba(217,119,6,0.12),0_12px_24px_-8px_rgba(0,0,0,0.06)] dark:shadow-[0_25px_60px_-15px_rgba(245,158,11,0.16),0_0_0_1px_rgba(245,158,11,0.12)] relative overflow-hidden transition-all duration-300">
          
          {/* Subtle Top Amber-Gold Shimmer Rim */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500/60 dark:via-amber-400/70 to-transparent" />
          <div className="absolute top-1 inset-x-0 h-px bg-white/20 dark:bg-amber-300/10 pointer-events-none" />
          
          <h1 className="flex items-center justify-center gap-2 text-base sm:text-lg font-bold text-[var(--text-main)] text-center mb-5 sm:mb-6 tracking-tight">
            {mode === 'login' ? (
              <>
                <LogIn size={19} className="stroke-[2.2] text-[var(--color-brand-accent)]" />
                <span>Sign in to DOAB</span>
              </>
            ) : (
              <>
                <UserPlus size={19} className="stroke-[2.2] text-[var(--color-brand-accent)]" />
                <span>Create DOAB Account</span>
              </>
            )}
          </h1>

          {/* Clean Segmented Control / Pill Mode Switcher */}
          <div className="mb-5 sm:mb-6 p-1 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)]">
            <div className="relative grid grid-cols-2 gap-1">
              <span
                className={`absolute inset-y-0 left-0 w-[calc(50%-2px)] rounded-lg bg-[var(--text-main)] transition-transform duration-300 ease-out ${
                  mode === 'register' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                }`}
              />
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className={`relative z-10 h-8.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  mode === 'login' ? 'text-[var(--bg-card)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className={`relative z-10 h-8.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  mode === 'register' ? 'text-[var(--bg-card)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-5 sm:mb-6 p-3 sm:p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          {/* Unified Height-Constant Google OAuth Button */}
          <button
            type="button"
            onClick={() => handleGoogleSignIn(mode === 'login' && lastGoogleAccount?.email ? lastGoogleAccount.email : null)}
            disabled={loading || googleLoading}
            className="w-full h-11.5 sm:h-12 mb-5 sm:mb-6 flex items-center justify-between px-4 rounded-xl text-xs sm:text-sm font-semibold tracking-wide border border-amber-500/25 dark:border-amber-400/20 bg-[var(--bg-main)]/90 backdrop-blur-md hover:border-amber-500/40 text-[var(--text-main)] transition-all duration-200 shadow-xs active:scale-[0.99] disabled:opacity-50 cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              {googleLoading ? (
                <div className="w-4 h-4 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin shrink-0" />
              ) : mode === 'login' && lastGoogleAccount?.photoURL ? (
                <img
                  src={lastGoogleAccount.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full object-cover shrink-0 border border-amber-500/30 shadow-2xs"
                />
              ) : (
                <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              )}
              <span className="truncate">
                {mode === 'login'
                  ? (lastGoogleAccount ? `Continue as ${lastGoogleAccount.fullName?.split(' ')[0] || 'User'}` : 'Continue with Google')
                  : 'Sign up with Google'}
              </span>
            </div>

            {mode === 'login' && lastGoogleAccount ? (
              <span className="text-[11px] font-mono text-[var(--text-muted)] group-hover:text-[var(--text-main)] truncate max-w-[170px] hidden sm:inline">
                {lastGoogleAccount.email}
              </span>
            ) : (
              <span className="mono-badge text-[10px] text-[var(--text-main)] dark:text-neutral-200 bg-[var(--bg-card)] dark:bg-white/10 border border-[var(--border-color)] dark:border-white/20 px-2.5 py-0.5 rounded-full hidden sm:inline shrink-0">
                1-Click OAuth
              </span>
            )}
          </button>

          <div className="relative flex items-center justify-center my-5 sm:my-6">
            <div className="border-t border-[var(--border-color)] w-full" />
            <span className="bg-[var(--bg-card)] px-3 text-[10px] sm:text-[11px] uppercase font-mono tracking-widest text-[var(--text-muted)] shrink-0 font-medium">
              or use credentials
            </span>
            <div className="border-t border-[var(--border-color)] w-full" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5">
            <div>
              <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest font-mono text-[var(--text-muted)] mb-1.5 font-semibold">
                Entity Email
              </label>
              <div className="relative flex items-center h-11.5 sm:h-12 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/80 backdrop-blur-md focus-within:border-amber-500/60 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
                <div className="w-11 sm:w-12 shrink-0 border-r border-[var(--border-color)] h-full flex items-center justify-center text-[var(--text-muted)]">
                  <Mail size={17} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="h-full flex-1 w-full bg-transparent border-none outline-none px-3.5 text-xs sm:text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest font-mono text-[var(--text-muted)] mb-1.5 font-semibold">
                Access Code / Password
              </label>
              <div className="relative flex items-center h-11.5 sm:h-12 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/80 backdrop-blur-md focus-within:border-amber-500/60 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
                <div className="w-11 sm:w-12 shrink-0 border-r border-[var(--border-color)] h-full flex items-center justify-center text-[var(--text-muted)]">
                  <Lock size={17} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="h-full flex-1 w-full bg-transparent border-none outline-none px-3.5 text-xs sm:text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11.5 sm:h-12 mt-2.5 flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--bg-card)] bg-[var(--text-main)] hover:opacity-90 active:scale-[0.99] disabled:opacity-50 transition-all shadow-md cursor-pointer"
            >
              <span>{loading ? 'Processing...' : mode === 'login' ? 'Authenticate' : 'Initialize Account'}</span>
              <ArrowRight size={15} className="stroke-[2.5]" />
            </button>
          </form>

        </div>
      </main>

      {/* SWATVA Platform Fixed Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 px-4 sm:px-12 py-2.5 sm:py-3 border-t border-[var(--border-color)] bg-[var(--bg-card)]/90 backdrop-blur-xl flex items-center justify-between gap-2 sm:gap-3 shadow-xs pb-[calc(0.6rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandLogo size="sm" animateOnHover={false} />
          <span className="text-xs font-bold tracking-tight text-[var(--text-main)]">
            DOAB
          </span>
          <span className="h-3 w-px bg-[var(--border-color)]" aria-hidden="true" />
          <span className="text-[10px] uppercase tracking-[0.16em] font-mono text-[var(--text-muted)] font-medium truncate min-w-0">
            DETECT. ORDER. ALERT. BACK-CHECK.
          </span>
        </div>
        <Link
          to="/team"
          className="text-[9px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-medium hover:text-[var(--text-main)] transition-colors cursor-pointer hover:underline flex-shrink-0 whitespace-nowrap font-mono"
        >
          BY Contrarians
        </Link>
      </footer>
    </div>
  );
}
