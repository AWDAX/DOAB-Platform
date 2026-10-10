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
      return raw ? JSON.parse(raw) : null;
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
    <div className="min-h-[100dvh] flex flex-col items-center justify-center relative p-4 pt-20 pb-24 transition-colors duration-300 bg-[var(--bg-main)]">
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

      {/* Large Background Watermark */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none z-0 overflow-hidden">
        <span className="text-[22vw] font-black tracking-tighter text-slate-900/[0.03] dark:text-white/[0.03] leading-none font-mono">
          DOAB
        </span>
      </div>

      {/* Main Authentication Form Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-6 pt-16 sm:pt-20 pb-16 sm:pb-24 w-full max-w-[720px] z-10 my-auto">
        <div className="w-full p-5 sm:p-8 sm:pb-10 neo-glass-card shadow-2xl rounded-2xl sm:rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]/90 backdrop-blur-2xl">
          
          <h1 className="flex items-center justify-center gap-2 text-base font-bold text-[var(--text-main)] text-center mb-5 tracking-tight">
            {mode === 'login' ? (
              <>
                <LogIn size={17} className="stroke-[2.2]" />
                <span>Sign in to DOAB</span>
              </>
            ) : (
              <>
                <UserPlus size={17} className="stroke-[2.2]" />
                <span>Create DOAB Account</span>
              </>
            )}
          </h1>

          {/* Clean Segmented Control / Pill Mode Switcher */}
          <div className="mb-5 p-1 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)]">
            <div className="relative grid grid-cols-2 gap-1">
              <span
                className={`absolute inset-y-0 left-0 w-[calc(50%-2px)] rounded-lg bg-[var(--text-main)] transition-transform duration-300 ease-out ${
                  mode === 'register' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                }`}
              />
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className={`relative z-10 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'login' ? 'text-[var(--bg-card)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className={`relative z-10 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'register' ? 'text-[var(--bg-card)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2.5">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          {/* Google Quick Sign-In or 1-Click Account Re-Auth Card */}
          {mode === 'login' && lastGoogleAccount ? (
            <div className="mb-5 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/80 backdrop-blur-xl shadow-md flex flex-col gap-3 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  {lastGoogleAccount.photoURL ? (
                    <img
                      src={lastGoogleAccount.photoURL}
                      alt={lastGoogleAccount.fullName}
                      className="w-10 h-10 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--text-main)]/10 text-[var(--text-main)] font-bold flex items-center justify-center text-sm shrink-0 border border-[var(--border-color)]">
                      {lastGoogleAccount.fullName?.charAt(0) || 'G'}
                    </div>
                  )}
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-[var(--text-main)] truncate">
                        {lastGoogleAccount.fullName}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-medium tracking-wide border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Last used
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-[var(--text-muted)] truncate mt-0.5">
                      {lastGoogleAccount.email}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleGoogleSignIn(lastGoogleAccount.email)}
                  disabled={loading || googleLoading}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[var(--bg-card)] bg-[var(--text-main)] hover:opacity-90 active:scale-[0.98] transition-all shadow-sm shrink-0 cursor-pointer w-full sm:w-auto"
                >
                  {googleLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  )}
                  <span>Continue as {lastGoogleAccount.fullName?.split(' ')[0] || 'User'}</span>
                </button>
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => handleGoogleSignIn(null)}
                  disabled={loading || googleLoading}
                  className="text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer hover:underline"
                >
                  Sign in with a different Google account
                </button>
              </div>
            </div>
          ) : (
            /* Standard Google Quick Sign-In */
            <button
              type="button"
              onClick={() => handleGoogleSignIn(null)}
              disabled={loading || googleLoading}
              className="w-full h-11 mb-5 flex items-center justify-center gap-3 px-4 rounded-xl text-xs font-semibold tracking-wide border border-[var(--border-color)] bg-[var(--bg-main)] hover:border-[var(--text-muted)] text-[var(--text-main)] transition-all duration-200 shadow-xs active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {googleLoading ? (
                 <div className="w-4 h-4 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
              ) : (
                 <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                   <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                   <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                   <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                   <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                 </svg>
              )}
              <span>Continue with Google</span>
            </button>
          )}

          <div className="relative flex items-center justify-center my-5">
            <div className="border-t border-[var(--border-color)] w-full" />
            <span className="bg-[var(--bg-card)] px-3 text-[10px] uppercase font-mono tracking-widest text-[var(--text-muted)] shrink-0 font-medium">
              or use credentials
            </span>
            <div className="border-t border-[var(--border-color)] w-full" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-mono text-[var(--text-muted)] mb-1.5 font-semibold">
                Entity Email
              </label>
              <div className="relative flex items-center h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] focus-within:border-[var(--text-main)] transition-colors">
                <div className="w-11 shrink-0 border-r border-[var(--border-color)] h-full flex items-center justify-center text-[var(--text-muted)]">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="h-full flex-1 w-full bg-transparent border-none outline-none px-3.5 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-mono text-[var(--text-muted)] mb-1.5 font-semibold">
                Access Code / Password
              </label>
              <div className="relative flex items-center h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] focus-within:border-[var(--text-main)] transition-colors">
                <div className="w-11 shrink-0 border-r border-[var(--border-color)] h-full flex items-center justify-center text-[var(--text-muted)]">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="h-full flex-1 w-full bg-transparent border-none outline-none px-3.5 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 flex items-center justify-center gap-2 rounded-xl text-xs font-bold uppercase tracking-wider text-[var(--bg-card)] bg-[var(--text-main)] hover:opacity-90 active:scale-[0.99] disabled:opacity-50 transition-all shadow-md cursor-pointer"
            >
              <span>{loading ? 'Processing...' : mode === 'login' ? 'Authenticate' : 'Initialize Account'}</span>
              <ArrowRight size={14} className="stroke-[2.5]" />
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
