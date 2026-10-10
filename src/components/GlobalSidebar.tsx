import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Map, Route as RouteIcon, History, Bell, User, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { playClick } from '../utils/soundFx';
import { firebaseSignOut } from '../lib/firebase';
import Tooltip from './Tooltip';

export default function GlobalSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSignOut = async () => {
    playClick();
    await firebaseSignOut();
    navigate('/login');
  };

  const navItems = [
    { id: 'map', path: '/', icon: Map, label: 'Live Map', shortcut: '1' },
    { id: 'best', path: '/routes/best', icon: RouteIcon, label: 'Safe Routes', shortcut: '2' },
    { id: 'history', path: '/routes/old', icon: History, label: 'History', shortcut: '3' },
    { id: 'notifications', path: '/notifications', icon: Bell, label: 'Alerts', badge: '3', shortcut: '4' },
  ];

  const bottomItems = [
    { id: 'profile', path: '/profile', icon: User, label: 'Profile', shortcut: '5' },
  ];

  const renderLink = (item: any) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    const linkContent = (
      <Link
        key={item.path}
        id={item.id === 'best' ? 'tour-nav-routes' : undefined}
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
          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            <Icon className={`h-4.5 w-4.5 transition-colors ${isActive ? 'text-current' : 'text-[var(--text-muted)] group-hover:text-[var(--text-main)]'}`} />
          </div>
          {isExpanded && <span className="truncate text-left font-medium">{item.label}</span>}
        </div>
        
        {/* Theme-Adaptive Notification Badge (Flood & Drought, Light & Dark) */}
        {isExpanded && item.badge && (
          <span 
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border transition-all duration-200 shadow-2xs shrink-0 ${
              isActive 
                ? 'bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)]' 
                : 'bg-[var(--color-brand-accent)]/10 text-[var(--color-brand-accent)] border-[var(--color-brand-accent)]/25'
            }`}
          >
            {item.badge}
          </span>
        )}

        {/* Theme-Adaptive Collapsed Indicator Dot */}
        {!isExpanded && item.badge && (
          <span className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full border border-[var(--border-color)] ring-2 ring-[var(--bg-card)] transition-colors ${
            isActive ? 'bg-[var(--text-main)]' : 'bg-[var(--color-brand-accent)]'
          }`} />
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
      {/* Top Header Toggle Button */}
      <div className={`flex items-center mb-3 h-10 ${!isExpanded ? 'justify-center' : 'justify-between px-3'}`}>
        {isExpanded ? (
          <>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] font-bold truncate">
              Civic Dashboard
            </span>
            <button
              type="button"
              onClick={() => { playClick(); setIsExpanded(false); }}
              className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--text-main)]/5 transition-colors cursor-pointer"
              aria-label="Collapse Sidebar"
            >
              <PanelLeftClose className="h-4.5 w-4.5" />
            </button>
          </>
        ) : (
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
            className="group relative flex items-center justify-between h-10 w-full rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <LogOut className="h-4.5 w-4.5 transition-colors text-[var(--text-muted)] group-hover:text-red-500 dark:group-hover:text-red-400" />
              </div>
              <span className="truncate text-left font-medium">Sign Out</span>
            </div>
            <span className="text-[10px] font-mono text-[var(--text-muted)] group-hover:text-red-500/80 px-1 py-0.5 rounded border border-transparent group-hover:border-red-500/20">
              Exit
            </span>
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
