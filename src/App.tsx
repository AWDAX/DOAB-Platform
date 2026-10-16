import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import GlobalSidebar from './components/GlobalSidebar';
import MapPage from './pages/MapPage';
import OldRoutesPage from './pages/OldRoutesPage';
import BestRoutesPage from './pages/BestRoutesPage';
import NotificationPage from './pages/NotificationPage';
import ProfilePage from './pages/ProfilePage';
import AssistantPage from './pages/AssistantPage';
import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import TeamPage from './pages/TeamPage';
import DevAdminDashboard from './pages/DevAdminDashboard';
import NotFoundPage from './pages/NotFoundPage';
import PageTransition, { ScrollToTop } from './components/PageTransition';
import SplashLoader from './components/SplashLoader';
import RouteSEO from './components/RouteSEO';
import PreferencesModal from './components/PreferencesModal';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Map, Route as RouteIcon, Bell, User } from 'lucide-react';
import AIOrbIcon from './components/AIOrbIcon';
import { playClick, initGlobalClickSound } from './utils/soundFx';
import { RemoteAdminChannel } from './services/remoteAdminChannel';
import Lenis from 'lenis';

/**
 * Auto-detect seasonal climate mode:
 * Indian Monsoon (June to Sept -> Months 5, 6, 7, 8) => 'flood'
 * Indian Summer / Scarcity (March to May -> Months 2, 3, 4) => 'drought'
 * Post-Monsoon / Winter (Oct to Feb) => Defaults to user preference or 'flood'
 */
function getInitialSeasonalClimateMode(): 'flood' | 'drought' {
  try {
    const saved = localStorage.getItem('doab_env_mode_preference');
    if (saved === 'flood' || saved === 'drought') return saved;
  } catch {}

  const month = new Date().getMonth(); // 0-indexed (0 = Jan, 5 = June, 8 = Sept)
  if (month >= 5 && month <= 8) {
    return 'flood';
  } else if (month >= 2 && month <= 4) {
    return 'drought';
  }
  return 'flood';
}

function BottomNav() {
  const location = useLocation();
  const [user, setUser] = useState<any>(() => {
    try {
      const raw = localStorage.getItem('doab_demo_user_v1');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const unsub = onDOABAuthStateChanged((u) => setUser(u));
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const [hasUnreadAlerts, setHasUnreadAlerts] = useState<boolean>(() => {
    try {
      return localStorage.getItem('doab_notifications_read') !== 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleAlertsRead = () => setHasUnreadAlerts(false);
    const handleNewAlert = () => setHasUnreadAlerts(true);
    window.addEventListener('doab:alerts-read', handleAlertsRead);
    window.addEventListener('doab:admin-alerts-updated', handleNewAlert);
    return () => {
      window.removeEventListener('doab:alerts-read', handleAlertsRead);
      window.removeEventListener('doab:admin-alerts-updated', handleNewAlert);
    };
  }, []);

  if (location.pathname === '/login' || location.pathname === '/landing' || location.pathname === '/team') return null;
  
  // DOAB layout: Leftmost All Alerts, Routes, Center Raised Map, Assistant, Profile
  const leftItems = [
    { path: '/notifications', icon: Bell, label: 'All Alerts', badge: hasUnreadAlerts ? '!' : undefined },
    { path: '/routes/best', icon: RouteIcon, label: 'Routes' }
  ];

  const rightItems = [
    { path: '/assistant', icon: AIOrbIcon, label: 'Assistant', badge: 'AI' },
    { path: '/profile', icon: User, label: 'Profile' }
  ];

  const isMapActive = location.pathname === '/';

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-card)]/95 backdrop-blur-2xl border-t border-[var(--border-color)] pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-1 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
    >
      <div className="max-w-md mx-auto flex items-center h-16 relative px-2">
        {/* Left cluster: All Alerts & Routes */}
        <div className="flex-1 flex items-center justify-around">
          {leftItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => playClick()}
                className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 rounded-xl transition-all duration-200 active:scale-95 ${
                  isActive ? 'text-[var(--text-main)] font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <div className="relative">
                  <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-2 h-3.5 min-w-[14px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-mono font-black flex items-center justify-center shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] tracking-tight truncate max-w-[4.5rem] mt-0.5 ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 w-1 h-1 rounded-full bg-[var(--text-main)] animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Center Raised Primary Action FAB: Map Button (Shifted up & bigger for mobile touch) */}
        <div className="relative w-20 flex justify-center shrink-0">
          <Link
            to="/"
            onClick={() => playClick()}
            aria-label="Operations Grid Map"
            title="Operations Grid Map"
            className="absolute -top-8 h-[62px] w-[62px] rounded-2xl flex items-center justify-center shadow-2xl cursor-pointer transition-all duration-200 active:scale-95 border-2 border-[var(--border-color)] dark:border-white/20 dark:bg-[var(--bg-card)] dark:hover:bg-[var(--bg-main)] hover:-translate-y-0.5"
            style={{
              backgroundImage: 'var(--auth-btn-gradient, linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #334155 100%))'
            }}
          >
            {/* White SVG in light theme (using text-white), Black SVG in dark theme (using dark:text-slate-900) */}
            <Map className="h-7 w-7 text-white dark:text-slate-100 stroke-[2.3] transition-transform duration-200 hover:scale-105" />
            {isMapActive && (
              <span className="absolute -bottom-1.5 w-2 h-2 rounded-full bg-amber-400 dark:bg-sky-400 shadow-[0_0_10px_rgba(245,158,11,0.9)]" />
            )}
          </Link>
        </div>

        {/* Right cluster: Assistant & Profile */}
        <div className="flex-1 flex items-center justify-around">
          {rightItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => playClick()}
                className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 rounded-xl transition-all duration-200 active:scale-95 ${
                  isActive ? 'text-[var(--text-main)] font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <div className="relative">
                  {item.path === '/profile' && user ? (
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-amber-400/80 shadow-[0_0_8px_rgba(245,158,11,0.55)] border border-white/20">
                      <img
                        src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'User')}&background=0284c7&color=fff&bold=true`}
                        alt="avatar"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                  )}
                  {item.badge && (
                    <span className="absolute -top-1 -right-2 h-3.5 min-w-[14px] px-1 rounded-full bg-[var(--text-main)] text-[var(--bg-card)] text-[9px] font-mono font-black flex items-center justify-center shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] tracking-tight truncate max-w-[4.5rem] mt-0.5 ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 w-1 h-1 rounded-full bg-[var(--text-main)] animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

import { onDOABAuthStateChanged } from './lib/firebase';
import PermissionsModal from './components/PermissionsModal';
import EmergencyDangerBroadcast from './components/EmergencyDangerBroadcast';
import DestinationArrivalModal from './components/DestinationArrivalModal';
import GuidedTour, { WelcomeTourPromptModal } from './components/GuidedTour';
import VoiceAssistant from './components/VoiceAssistant';

function DashboardLayout({ 
  children,
  isStandalonePage
}: { 
  children: React.ReactNode; 
  isStandalonePage?: boolean;
}) {
  if (isStandalonePage) return <div className="flex-1 w-full">{children}</div>;

  return (
    <div className="flex-1 min-h-0 w-full max-w-[1920px] 2xl:max-w-full mx-auto px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 flex flex-col md:flex-row gap-2.5 sm:gap-3 md:gap-4 z-10 overflow-hidden h-[calc(100dvh-4rem)] pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-2.5">
      <GlobalSidebar />
      
      <main 
        data-lenis-prevent
        className="flex-1 min-h-0 h-full rounded-2xl sm:rounded-3xl neo-glass-card shadow-sm overflow-hidden flex flex-col transition-colors duration-200 relative border border-[var(--border-color)]"
      >
        {children}
      </main>
    </div>
  );
}

function AppContent({ 
  isDarkMode, 
  toggleTheme, 
  envMode, 
  toggleEnvMode, 
  isShortcutsOpen, 
  setIsShortcutsOpen,
  isPreferencesOpen,
  setIsPreferencesOpen,
  isPermissionsOpen,
  setIsPermissionsOpen,
  isDangerBroadcastOpen,
  setIsDangerBroadcastOpen,
  isTourOpen,
  setIsTourOpen
}: any) {
  const location = useLocation();
  const [user, setUser] = useState<any>(() => {
    try {
      const raw = localStorage.getItem('doab_demo_user_v1');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Keep auth state synchronized
  useEffect(() => {
    const unsubscribe = onDOABAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const [showWelcomeTour, setShowWelcomeTour] = useState(false);

  // Check for first-time login welcome tour prompt (DOAB standard)
  useEffect(() => {
    if (user) {
      const alreadyPrompted = localStorage.getItem('doab_tour_first_login_prompted');
      const alreadyCompleted = localStorage.getItem('doab_tour_completed');
      if (!alreadyPrompted && !alreadyCompleted) {
        // Slight delay to allow dashboard components to fully mount
        const timer = setTimeout(() => {
          setShowWelcomeTour(true);
        }, 600);
        return () => clearTimeout(timer);
      } else {
        // If tour was already done/prompted, check if life-safety permissions have been prompted or fully granted
        const permsPrompted = localStorage.getItem('doab_permissions_prompted');
        let allEnabled = false;
        try {
          const savedPerms = JSON.parse(localStorage.getItem('doab_user_permissions_v2') || '{}');
          if (savedPerms.location && savedPerms.notifications && savedPerms.geofence && savedPerms.dndBroadcast) {
            allEnabled = true;
          }
        } catch {}

        // Never prompt if all permissions are enabled or user has already configured/dismissed
        if (!permsPrompted && !allEnabled) {
          const permTimer = setTimeout(() => {
            setIsPermissionsOpen(true);
          }, 800);
          return () => clearTimeout(permTimer);
        }
      }
    }
  }, [user]);

  const handleAcceptWelcomeTour = () => {
    localStorage.setItem('doab_tour_first_login_prompted', 'true');
    setShowWelcomeTour(false);
    setActiveTourType('global');
    setIsTourOpen(true);
  };

  const handleCloseWelcomeTour = () => {
    localStorage.setItem('doab_tour_first_login_prompted', 'true');
    setShowWelcomeTour(false);
  };

  const isAuthenticated = Boolean(user);
  const isLanding = location.pathname === '/landing' || (location.pathname === '/' && !isAuthenticated);
  const isStandalonePage = isLanding || location.pathname === '/login' || location.pathname === '/team' || location.pathname.startsWith('/admin') || location.pathname.startsWith('/dev-console');

  // Mount Global Keyboard Shortcuts
  useKeyboardShortcuts({
    toggleTheme,
    toggleEnvMode,
    toggleShortcutsModal: () => setIsShortcutsOpen((prev: boolean) => !prev),
    togglePreferencesModal: () => setIsPreferencesOpen((prev: boolean) => !prev),
    toggleTour: () => {
      setActiveTourType('global');
      setIsTourOpen((prev: boolean) => !prev);
    },
    focusSearch: () => {
      const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
      searchInput?.focus();
    }
  });

  const [activeTourType, setActiveTourType] = useState<string | undefined>(undefined);

  // Global event listener for permissions, danger broadcast & tour
  const [dangerPayload, setDangerPayload] = useState<{
    title?: string;
    ward?: string;
    distanceAhead?: string;
    waterDepthCm?: number;
    description?: string;
  } | undefined>(undefined);
  const [isGlobalArrivalOpen, setIsGlobalArrivalOpen] = useState(false);
  const [arrivalModalRoute, setArrivalModalRoute] = useState<any>(null);

  useEffect(() => {
    const handleOpenPermissions = () => setIsPermissionsOpen(true);
    const handleTriggerDanger = (e?: CustomEvent) => {
      // Suppress full-screen modal takeover on the Admin Console itself so the admin can continue controlling the dashboard
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        return;
      }
      if (e?.detail) {
        setDangerPayload(e.detail);
      } else {
        setDangerPayload(undefined);
      }
      setIsDangerBroadcastOpen(true);
    };
    const handleClearDanger = () => {
      setIsDangerBroadcastOpen(false);
      setDangerPayload(undefined);
    };
    const handleOpenTour = (e?: CustomEvent) => {
      setActiveTourType(e?.detail?.pageKey || 'global');
      setIsTourOpen(true);
    };
    const handleOpenPageTour = (e: CustomEvent) => {
      setActiveTourType(e.detail?.pageKey || 'global');
      setIsTourOpen(true);
    };
    const handleOpenPreferences = () => setIsPreferencesOpen(true);
    const handleTriggerArrival = (e?: CustomEvent) => {
      const payload = e?.detail || {
        summary: 'Koramangala 80ft Road → Domlur Safe Haven Corridor',
        distance_meters: 4200,
        duration_seconds: 720,
        mean_risk: 0.08,
        maps_url: 'https://maps.google.com',
      };
      setArrivalModalRoute(payload);
      setIsGlobalArrivalOpen(true);
    };

    window.addEventListener('doab:open-permissions', handleOpenPermissions);
    window.addEventListener('doab:trigger-danger-broadcast', handleTriggerDanger as EventListener);
    window.addEventListener('doab:clear-danger-broadcast', handleClearDanger as EventListener);
    window.addEventListener('doab:open-tour', handleOpenTour as EventListener);
    window.addEventListener('doab:start-tour', handleOpenTour as EventListener);
    window.addEventListener('doab:start-page-tour', handleOpenPageTour as EventListener);
    window.addEventListener('doab:open-preferences', handleOpenPreferences);
    window.addEventListener('doab:trigger-destination-arrival', handleTriggerArrival as EventListener);

    // Initialize Global Real-Time Remote Admin Telemetry Channel (Connects Laptop Admin Console to Mobile Phone)
    const stopRemoteListener = RemoteAdminChannel.listen();

    return () => {
      window.removeEventListener('doab:open-permissions', handleOpenPermissions);
      window.removeEventListener('doab:trigger-danger-broadcast', handleTriggerDanger as EventListener);
      window.removeEventListener('doab:clear-danger-broadcast', handleClearDanger as EventListener);
      window.removeEventListener('doab:open-tour', handleOpenTour as EventListener);
      window.removeEventListener('doab:start-tour', handleOpenTour as EventListener);
      window.removeEventListener('doab:start-page-tour', handleOpenPageTour as EventListener);
      window.removeEventListener('doab:open-preferences', handleOpenPreferences);
      window.removeEventListener('doab:trigger-destination-arrival', handleTriggerArrival as EventListener);
      if (typeof stopRemoteListener === 'function') stopRemoteListener();
    };
  }, [setIsPermissionsOpen, setIsDangerBroadcastOpen, setIsTourOpen, setIsPreferencesOpen]);

  return (
    <div className={`flex flex-col font-sans transition-colors duration-200 max-w-full bg-[var(--bg-main)] text-[var(--text-main)] selection:bg-[var(--color-brand-accent)] selection:text-white antialiased ${
      isStandalonePage ? 'min-h-[100dvh]' : 'h-[100dvh] max-h-[100dvh] overflow-hidden'
    }`}>
      <RouteSEO />
      <SplashLoader />
      
      {!isStandalonePage && (
        <Navbar 
          isDarkMode={isDarkMode} 
          toggleTheme={toggleTheme} 
          envMode={envMode} 
          toggleEnvMode={toggleEnvMode}
          onOpenTour={() => { playClick(); setIsTourOpen(true); }}
          onOpenPreferences={() => { playClick(); setIsPreferencesOpen(true); }}
          user={user}
        />
      )}
      
      <ScrollToTop />
      <DashboardLayout isStandalonePage={isStandalonePage}>
        <Routes location={location} key={location.pathname}>
          <Route 
            path="/landing" 
            element={
              <PageTransition>
                <LandingPage 
                  isDarkMode={isDarkMode} 
                  toggleTheme={toggleTheme} 
                  envMode={envMode} 
                  toggleEnvMode={toggleEnvMode} 
                  user={user} 
                  onOpenPreferences={() => { playClick(); setIsPreferencesOpen(true); }}
                />
              </PageTransition>
            } 
          />
          <Route 
            path="/team" 
            element={
              <PageTransition>
                <TeamPage 
                  isDarkMode={isDarkMode} 
                  toggleTheme={toggleTheme} 
                  envMode={envMode} 
                  toggleEnvMode={toggleEnvMode} 
                />
              </PageTransition>
            } 
          />
          <Route 
            path="/login" 
            element={
              <PageTransition>
                <AuthPage isDarkMode={isDarkMode} toggleTheme={toggleTheme} envMode={envMode} toggleEnvMode={toggleEnvMode} />
              </PageTransition>
            } 
          />
          <Route 
            path="/" 
            element={
              isAuthenticated ? (
                <PageTransition>
                  <MapPage envMode={envMode} isDarkMode={isDarkMode} />
                </PageTransition>
              ) : (
                <PageTransition>
                  <LandingPage 
                    isDarkMode={isDarkMode} 
                    toggleTheme={toggleTheme} 
                    envMode={envMode} 
                    toggleEnvMode={toggleEnvMode} 
                    user={user} 
                    onOpenPreferences={() => { playClick(); setIsPreferencesOpen(true); }}
                  />
                </PageTransition>
              )
            } 
          />
          <Route 
            path="/map" 
            element={
              isAuthenticated ? (
                <PageTransition>
                  <MapPage envMode={envMode} isDarkMode={isDarkMode} />
                </PageTransition>
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/routes/old" 
            element={
              isAuthenticated ? (
                <PageTransition>
                  <OldRoutesPage />
                </PageTransition>
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/routes/best" 
            element={
              isAuthenticated ? (
                <PageTransition>
                  <BestRoutesPage />
                </PageTransition>
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/assistant" 
            element={
              isAuthenticated ? (
                <PageTransition>
                  <AssistantPage />
                </PageTransition>
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/notifications" 
            element={
              isAuthenticated ? (
                <PageTransition>
                  <NotificationPage />
                </PageTransition>
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/profile" 
            element={
              isAuthenticated ? (
                <PageTransition>
                  <ProfilePage />
                </PageTransition>
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/admin" 
            element={
              <PageTransition>
                <DevAdminDashboard 
                  isDarkMode={isDarkMode} 
                  toggleTheme={toggleTheme} 
                  envMode={envMode} 
                  toggleEnvMode={toggleEnvMode} 
                />
              </PageTransition>
            } 
          />
          <Route 
            path="/dev-console" 
            element={
              <PageTransition>
                <DevAdminDashboard 
                  isDarkMode={isDarkMode} 
                  toggleTheme={toggleTheme} 
                  envMode={envMode} 
                  toggleEnvMode={toggleEnvMode} 
                />
              </PageTransition>
            } 
          />
          <Route 
            path="*" 
            element={
              <PageTransition>
                <NotFoundPage envMode={envMode} />
              </PageTransition>
            } 
          />
        </Routes>
      </DashboardLayout>

      {!isStandalonePage && <BottomNav />}

      {/* Global Keyboard Shortcuts Cheatsheet Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Global Permissions & Life-Safety Center Sheet */}
      <PermissionsModal
        isOpen={isPermissionsOpen}
        onClose={() => setIsPermissionsOpen(false)}
      />

      {/* Emergency Danger Broadcast (SOS Full-Screen Danger Screen) */}
      <EmergencyDangerBroadcast
        isOpen={isDangerBroadcastOpen}
        onClose={() => setIsDangerBroadcastOpen(false)}
        title={dangerPayload?.title}
        ward={dangerPayload?.ward}
        distanceAhead={dangerPayload?.distanceAhead}
        waterDepthCm={dangerPayload?.waterDepthCm}
        description={dangerPayload?.description}
      />

      {/* Global Destination Arrival & Probability Feedback Modal */}
      <DestinationArrivalModal
        isOpen={isGlobalArrivalOpen}
        onClose={() => setIsGlobalArrivalOpen(false)}
        route={arrivalModalRoute}
        riskDisplay={arrivalModalRoute?.mean_risk ? `${(arrivalModalRoute.mean_risk * 100).toFixed(0)}% Inundation Risk` : 'Low Risk (Safe)'}
      />

      {/* Interactive Mode & Theme Aware Guided Product Tour */}
      <GuidedTour
        isOpen={isTourOpen}
        onClose={() => {
          setIsTourOpen(false);
          setActiveTourType(undefined);
        }}
        envMode={envMode}
        tourType={activeTourType}
      />

      {/* First-Time Login Welcome Guided Tour Prompt Modal (DOAB standard) */}
      <WelcomeTourPromptModal
        isOpen={showWelcomeTour}
        onClose={handleCloseWelcomeTour}
        onAccept={handleAcceptWelcomeTour}
        envMode={envMode}
      />

      {/* Global Preferences / Settings Modal */}
      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        envMode={envMode}
        toggleEnvMode={toggleEnvMode}
        user={user}
      />

      {/* Global Draggable AI Orb & Adaptive Voice/Text Assistant Window */}
      <VoiceAssistant />
    </div>
  );
}

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [envMode, setEnvMode] = useState<'flood' | 'drought'>(getInitialSeasonalClimateMode);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isDangerBroadcastOpen, setIsDangerBroadcastOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Initialize Lenis smooth scroll everywhere
  useEffect(() => {
    let lenis: Lenis | null = null;
    try {
      lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        touchMultiplier: 1.5,
        infinite: false,
        prevent: (node: any) => {
          if (!node || !(node instanceof HTMLElement)) return false;
          // Don't intercept scroll if node or any ancestor has data-lenis-prevent,
          // custom-scrollbar, or is an overflow container inside main dashboard
          return Boolean(
            node.closest('[data-lenis-prevent]') ||
            node.closest('.custom-scrollbar') ||
            node.closest('main') ||
            node.closest('#tour-assistant-chat')
          );
        }
      });

      (window as any).lenis = lenis;

      let rafId: number;
      function raf(time: number) {
        lenis?.raf(time);
        rafId = requestAnimationFrame(raf);
      }
      rafId = requestAnimationFrame(raf);

      return () => {
        cancelAnimationFrame(rafId);
        lenis?.destroy();
        (window as any).lenis = null;
      };
    } catch {
      // Graceful fallback if Lenis fails to initialize
    }
  }, []);

  useEffect(() => {
    initGlobalClickSound();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');

    if (envMode === 'drought') root.classList.add('theme-drought');
    else root.classList.remove('theme-drought');

    try {
      localStorage.setItem('doab_env_mode_preference', envMode);
    } catch {}
  }, [isDarkMode, envMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const toggleEnvMode = () => setEnvMode(envMode === 'flood' ? 'drought' : 'flood');

  return (
    <Router>
      <AppContent 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme} 
        envMode={envMode} 
        toggleEnvMode={toggleEnvMode}
        isShortcutsOpen={isShortcutsOpen}
        setIsShortcutsOpen={setIsShortcutsOpen}
        isPreferencesOpen={isPreferencesOpen}
        setIsPreferencesOpen={setIsPreferencesOpen}
        isPermissionsOpen={isPermissionsOpen}
        setIsPermissionsOpen={setIsPermissionsOpen}
        isDangerBroadcastOpen={isDangerBroadcastOpen}
        setIsDangerBroadcastOpen={setIsDangerBroadcastOpen}
        isTourOpen={isTourOpen}
        setIsTourOpen={setIsTourOpen}
      />
    </Router>
  );
}

export default App;
