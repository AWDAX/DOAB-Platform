import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Map, Route as RouteIcon, History, Bell, User, LogOut, PanelLeftClose, PanelLeftOpen, Users2, Compass } from 'lucide-react';
import AIOrbIcon from './AIOrbIcon';
import { playClick } from '../utils/soundFx';
import { firebaseSignOut } from '../lib/firebase';
import Tooltip from './Tooltip';

export default function GlobalSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);

  // Dynamic unread telemetry state:
  const [hasUnreadAi, setHasUnreadAi] = useState<boolean>(() => {
    try {
      return localStorage.getItem('doab_has_unread_ai_response') === 'true';
    } catch {
      return false;
    }
  });

  const [hasUnreadAlerts, setHasUnreadAlerts] = useState<boolean>(() => {
    try {
      return localStorage.getItem('doab_notifications_read') !== 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleAiRead = () => setHasUnreadAi(false);
    const handleAiNew = () => setHasUnreadAi(true);
    const handleAlertsRead = () => setHasUnreadAlerts(false);

    window.addEventListener('doab:ai-read', handleAiRead);
    window.addEventListener('doab:ai-response-received', handleAiNew);
    window.addEventListener('doab:alerts-read', handleAlertsRead);

    return () => {
      window.removeEventListener('doab:ai-read', handleAiRead);
      window.removeEventListener('doab:ai-response-received', handleAiNew);
      window.removeEventListener('doab:alerts-read', handleAlertsRead);
    };
  }, []);

  // Clear unread indicator when navigating to that page
  useEffect(() => {
    if (location.pathname === '/assistant') {
      setHasUnreadAi(false);
      try {
        localStorage.removeItem('doab_has_unread_ai_response');
      } catch (_) {}
    } else if (location.pathname === '/notifications') {
      setHasUnreadAlerts(false);
      try {
        localStorage.setItem('doab_notifications_read', 'true');
      } catch (_) {}
    }
  }, [location.pathname]);

  const handleSignOut = async () => {
    playClick();
    await firebaseSignOut();
    navigate('/login');
  };

  const navItems = [
    { id: 'map', path: '/', icon: Map, label: 'Live Map', shortcut: '1' },
    { id: 'best', path: '/routes/best', icon: RouteIcon, label: 'Safe Routes', shortcut: '2' },
    { id: 'history', path: '/routes/old', icon: History, label: 'History', shortcut: '3' },
    { 
      id: 'notifications', 
      path: '/notifications', 
      icon: Bell, 
      label: 'All Alerts', 
      hasUnread: hasUnreadAlerts,
      shortcut: '4' 
    },
    { 
      id: 'assistant', 
      path: '/assistant',
      icon: AIOrbIcon, 
      label: 'DOAB Assistant', 
      hasUnread: hasUnreadAi,
      shortcut: 'A',
    },
  ];

  const bottomItems = [
    { id: 'profile', path: '/profile', icon: User, label: 'Profile', shortcut: '5' },
    { id: 'team', path: '/team', icon: Users2, label: 'Meet Contrarians', shortcut: '6' },
  ];

  const renderLink = (item: any) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    const showIndicator = item.hasUnread && !isActive;

    if (item.isAction) {
      const buttonContent = (
        <button
          key={item.id}
          type="button"
          onClick={item.onClick}
          className={`group relative flex items-center h-10 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
            !isExpanded 
              ? 'w-10 h-10 justify-center mx-auto p-0' 
              : 'w-full justify-between px-3 py-2'
          } text-[var(--color-brand-accent)] hover:bg-[var(--color-brand-accent)]/10`}
        >
          <div className={`flex items-center gap-3 min-w-0 ${!isExpanded ? 'justify-center w-full' : ''}`}>
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              <Icon className="h-4.5 w-4.5 text-[var(--color-brand-accent)]" />
            </div>
            {isExpanded && <span className="truncate text-left font-medium">{item.label}</span>}
          </div>
        </button>
      );

      if (!isExpanded) {
        return (
          <Tooltip key={item.id} content={item.label} shortcut={item.shortcut} position="right" className="w-full flex justify-center">
            {buttonContent}
          </Tooltip>
        );
      }
      return buttonContent;
    }

    const linkContent = (
      <Link
        key={item.path}
        id={`tour-nav-${item.id}`}
        to={item.path}
        onClick={() => playClick()}
        className={`group relative flex items-center h-10 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
          !isExpanded 
            ? 'w-10 h-10 justify-center mx-auto p-0' 
            : 'w-full justify-between px-3 py-2'
        } ${
          isActive
            ? 'bg-[var(--text-main)] text-[var(--bg-card)] shadow-xs'
            : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--text-main)]/5'
        }`}
      >
        <div className={`flex items-center gap-3 min-w-0 ${!isExpanded ? 'justify-center w-full' : ''}`}>
          <div className="w-5 h-5 flex items-center justify-center shrink-0 relative">
            <Icon className={`h-4.5 w-4.5 transition-colors ${isActive ? 'text-current' : 'text-[var(--text-muted)] group-hover:text-[var(--text-main)]'}`} />
            
            {/* Minimalist, subtle unread indicator dot directly anchored to icon (Thin professional hairline ring) */}
            {showIndicator && (
              <span 
                className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--color-brand-accent)] ring-1 ring-[var(--bg-card)] ring-offset-[0.5px] ring-offset-transparent pointer-events-none"
                title="Unread updates available"
              />
            )}
          </div>
          {isExpanded && <span className="truncate text-left font-medium">{item.label}</span>}
        </div>
        
        {/* Subtle Pill Counter for Expanded Mode (Only shown if unread and not active) */}
        {isExpanded && showIndicator && (
          <span 
            className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded-full border border-[var(--color-brand-accent)]/20 bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)] transition-all shadow-2xs shrink-0"
          >
            New
          </span>
        )}
      </Link>
    );

    if (!isExpanded) {
      return (
        <Tooltip key={item.path} content={item.label} shortcut={item.shortcut} position="right" className="w-full flex justify-center">
          {linkContent}
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <aside 
      className={`hidden md:flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out select-none ${
        !isExpanded ? 'w-14' : 'w-56'
      }`}
    >
      {/* Top Header Toggle Button with Tour Guide Button alongside Collapse Button */}
      <div className={`flex items-center mb-3 h-10 ${!isExpanded ? 'flex-col gap-1 h-auto py-1' : 'justify-between px-3'}`}>
        {isExpanded ? (
          <>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] font-bold truncate">
              Civic Dashboard
            </span>
            <div className="flex items-center gap-1">
              <Tooltip content="Start Page Tour" shortcut="Shift+T" position="bottom">
                <button
                  type="button"
                  id="tour-guide-btn"
                  onClick={() => {
                    playClick();
                    window.dispatchEvent(new CustomEvent('doab:open-tour'));
                  }}
                  className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--text-main)]/5 transition-colors cursor-pointer"
                  aria-label="Start Page Guided Tour"
                >
                  <Compass className="h-4.5 w-4.5 text-current transition-transform duration-500 hover:rotate-45" />
                </button>
              </Tooltip>
              <button
                type="button"
                onClick={() => { playClick(); setIsExpanded(false); }}
                className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--text-main)]/5 transition-colors cursor-pointer"
                aria-label="Collapse Sidebar"
              >
                <PanelLeftClose className="h-4.5 w-4.5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 w-full">
            <Tooltip content="Start Page Tour" shortcut="Shift+T" position="right" className="w-full flex justify-center">
              <button
                type="button"
                id="tour-guide-btn"
                onClick={() => {
                  playClick();
                  window.dispatchEvent(new CustomEvent('doab:open-tour'));
                }}
                className="w-10 h-10 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--text-main)]/5 transition-colors flex items-center justify-center cursor-pointer mx-auto"
                aria-label="Start Page Guided Tour"
              >
                <Compass className="h-4.5 w-4.5 text-current" />
              </button>
            </Tooltip>
            <Tooltip content="Expand Sidebar" shortcut="[" position="right" className="w-full flex justify-center">
              <button
                type="button"
                onClick={() => { playClick(); setIsExpanded(true); }}
                className="w-10 h-10 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--text-main)]/5 transition-colors flex items-center justify-center cursor-pointer mx-auto"
                aria-label="Expand Sidebar"
              >
                <PanelLeftOpen className="h-4.5 w-4.5" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Main Nav Items */}
      <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto no-scrollbar">
        {navItems.map(renderLink)}
      </div>

      {/* Bottom Profile & Sign Out Items */}
      <div className="pt-2.5 mt-2.5 mb-3 pb-1 border-t border-[var(--border-color)] flex flex-col gap-1.5">
        {bottomItems.map(renderLink)}

        {/* Dedicated Sign Out Button */}
        {isExpanded ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="group relative flex items-center h-10 w-full rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <LogOut className="h-4.5 w-4.5 transition-colors text-[var(--text-muted)] group-hover:text-red-500 dark:group-hover:text-red-400" />
              </div>
              <span className="truncate text-left font-medium">Sign Out</span>
            </div>
          </button>
        ) : (
          <Tooltip content="Sign Out" position="right" className="w-full flex justify-center">
            <button
              type="button"
              onClick={handleSignOut}
              className="group relative flex items-center justify-center w-10 h-10 rounded-xl text-[var(--text-muted)] hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 cursor-pointer mx-auto"
              aria-label="Sign Out of DOAB"
            >
              <LogOut className="h-4.5 w-4.5 transition-colors" />
            </button>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}
