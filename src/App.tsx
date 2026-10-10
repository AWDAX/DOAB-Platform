import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import GlobalSidebar from './components/GlobalSidebar';
import MapPage from './pages/MapPage';
import OldRoutesPage from './pages/OldRoutesPage';
import BestRoutesPage from './pages/BestRoutesPage';
import NotificationPage from './pages/NotificationPage';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import TeamPage from './pages/TeamPage';
import PageTransition, { ScrollToTop } from './components/PageTransition';
import SplashLoader from './components/SplashLoader';
import PreferencesModal from './components/PreferencesModal';
import VoiceAssistant from './components/VoiceAssistant';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Map, History, Route as RouteIcon, Bell, User } from 'lucide-react';
import { playClick, initGlobalClickSound } from './utils/soundFx';

function BottomNav() {
  const location = useLocation();
  if (location.pathname === '/login' || location.pathname === '/landing' || location.pathname === '/team') return null;
  
  const navItems = [
    { path: '/', icon: Map, label: 'Map' },
    { path: '/routes/best', icon: RouteIcon, label: 'Routes' },
    { path: '/routes/old', icon: History, label: 'History' },
    { path: '/notifications', icon: Bell, label: 'Alerts', badge: '3' },
    { path: '/profile', icon: User, label: 'Profile' }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-card)]/92 backdrop-blur-2xl border-t border-[var(--border-color)] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
      <div className="flex justify-around items-center h-14 px-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              onClick={() => playClick()}
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 rounded-xl transition-all duration-200 active:scale-95 ${
                isActive 
                  ? 'text-[var(--color-brand-accent)] font-bold' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 h-3.5 min-w-[14px] px-1 rounded-full bg-[var(--color-brand-accent)] text-[var(--bg-card)] text-[9px] font-mono font-black flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-tight truncate max-w-[4rem] mt-0.5 ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[var(--color-brand-accent)] animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

import { onDOABAuthStateChanged } from './lib/firebase';
import PermissionsModal from './components/PermissionsModal';
import EmergencyDangerBroadcast from './components/EmergencyDangerBroadcast';
import GuidedTour from './components/GuidedTour';

function DashboardLayout({ 
  children,
  isStandalonePage
}: { 
  children: React.ReactNode; 
  isStandalonePage?: boolean;
}) {
  if (isStandalonePage) return <div className="flex-1 overflow-y-auto">{children}</div>;

  return (
    <div className="flex-1 min-h-0 w-full max-w-[1920px] 2xl:max-w-full mx-auto px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 flex flex-col md:flex-row gap-2.5 sm:gap-3 md:gap-4 z-10 overflow-hidden h-[calc(100dvh-4rem)] pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-2.5">
      <GlobalSidebar />
      
      <main className="flex-1 min-h-0 h-full rounded-2xl sm:rounded-3xl neo-glass-card shadow-sm overflow-hidden flex flex-col transition-colors duration-200 relative border border-[var(--border-color)]">
        {children}
      </main>
      
      <div id="tour-ai-copilot">
        <VoiceAssistant />
      </div>
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

  const isAuthenticated = Boolean(user);
  const isLanding = location.pathname === '/landing' || (location.pathname === '/' && !isAuthenticated);
  const isStandalonePage = isLanding || location.pathname === '/login' || location.pathname === '/team';

  // Mount Global Keyboard Shortcuts
  useKeyboardShortcuts({
    toggleTheme,
    toggleEnvMode,
    toggleShortcutsModal: () => setIsShortcutsOpen((prev: boolean) => !prev),
    togglePreferencesModal: () => setIsPreferencesOpen((prev: boolean) => !prev),
    toggleTour: () => setIsTourOpen((prev: boolean) => !prev),
    focusSearch: () => {
      const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
      searchInput?.focus();
    }
  });

  // Global event listener for permissions, danger broadcast & tour
  useEffect(() => {
    const handleOpenPermissions = () => setIsPermissionsOpen(true);
    const handleTriggerDanger = () => setIsDangerBroadcastOpen(true);
    const handleOpenTour = () => setIsTourOpen(true);
    const handleOpenPreferences = () => setIsPreferencesOpen(true);

    window.addEventListener('doab:open-permissions', handleOpenPermissions);
    window.addEventListener('doab:trigger-danger-broadcast', handleTriggerDanger);
    window.addEventListener('doab:open-tour', handleOpenTour);
    window.addEventListener('doab:open-preferences', handleOpenPreferences);

    return () => {
      window.removeEventListener('doab:open-permissions', handleOpenPermissions);
      window.removeEventListener('doab:trigger-danger-broadcast', handleTriggerDanger);
      window.removeEventListener('doab:open-tour', handleOpenTour);
      window.removeEventListener('doab:open-preferences', handleOpenPreferences);
    };
  }, [setIsPermissionsOpen, setIsDangerBroadcastOpen, setIsTourOpen, setIsPreferencesOpen]);

  return (
    <div className="h-[100dvh] max-h-[100dvh] flex flex-col font-sans transition-colors duration-200 max-w-full bg-[var(--bg-main)] text-[var(--text-main)] selection:bg-[var(--color-brand-accent)] selection:text-white antialiased overflow-hidden">
      <SplashLoader />
      
      {!isStandalonePage && (
        <Navbar 
          isDarkMode={isDarkMode} 
          toggleTheme={toggleTheme} 
          envMode={envMode} 
          toggleEnvMode={toggleEnvMode}
          onOpenTour={() => { playClick(); setIsTourOpen(true); }}
          onOpenPreferences={() => { playClick(); setIsPreferencesOpen(true); }}
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
                <TeamPage isDarkMode={isDarkMode} toggleTheme={toggleTheme} envMode={envMode} toggleEnvMode={toggleEnvMode} />
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
                  <MapPage envMode={envMode} />
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
        onTestDangerBroadcast={() => {
          setIsPermissionsOpen(false);
          setIsDangerBroadcastOpen(true);
        }}
      />

      {/* Emergency Danger Broadcast (SOS Full-Screen Danger Screen) */}
      <EmergencyDangerBroadcast
        isOpen={isDangerBroadcastOpen}
        onClose={() => setIsDangerBroadcastOpen(false)}
      />

      {/* Interactive Mode & Theme Aware Guided Product Tour */}
      <GuidedTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
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
        onOpenTour={() => {
          setIsPreferencesOpen(false);
          setIsTourOpen(true);
        }}
      />
    </div>
  );
}

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [envMode, setEnvMode] = useState<'flood' | 'drought'>('flood');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isDangerBroadcastOpen, setIsDangerBroadcastOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  useEffect(() => {
    initGlobalClickSound();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');

    if (envMode === 'drought') root.classList.add('theme-drought');
    else root.classList.remove('theme-drought');
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
