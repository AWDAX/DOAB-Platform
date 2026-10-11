import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShortcutHandlers {
  toggleTheme: () => void;
  toggleEnvMode: () => void;
  toggleShortcutsModal: () => void;
  togglePreferencesModal?: () => void;
  toggleCopilot?: () => void;
  focusSearch?: () => void;
  toggleTour?: () => void;
}

export function useKeyboardShortcuts({
  toggleTheme,
  toggleEnvMode,
  toggleShortcutsModal,
  togglePreferencesModal,
  toggleCopilot,
  focusSearch,
  toggleTour
}: ShortcutHandlers) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut keys if user is actively typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Global Escape key
      if (e.key === 'Escape') {
        // Can be handled by individual open modals
        return;
      }

      // Ctrl + K or Cmd + K (Focus Search)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (focusSearch) {
          focusSearch();
        } else {
          const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
          searchInput?.focus();
        }
        return;
      }

      // Ctrl + , (Open Preferences / Settings)
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        togglePreferencesModal?.();
        return;
      }

      // Ctrl + J or Cmd + J (Toggle Copilot)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        toggleCopilot?.();
        return;
      }

      if (isInput) return;

      // Shift + S (Toggle Preferences / Settings Modal)
      if (e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        togglePreferencesModal?.();
        return;
      }

      // Shift + ? (Open Shortcuts Cheatsheet)
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        toggleShortcutsModal();
        return;
      }

      // Shift + G (Toggle Guided Tour)
      if (e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        toggleTour?.();
        return;
      }

      // Shift + T (Toggle Theme: Light/Dark)
      if (e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // Shift + E (Toggle Environmental Mode: Flood/Drought)
      if (e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        toggleEnvMode();
        return;
      }

      // 1-5 Quick Page Navigation & 'A' for Assistant
      if (e.key === '1') {
        e.preventDefault();
        navigate('/');
      } else if (e.key === '2') {
        e.preventDefault();
        navigate('/routes/best');
      } else if (e.key === '3') {
        e.preventDefault();
        navigate('/routes/old');
      } else if (e.key === '4') {
        e.preventDefault();
        navigate('/notifications');
      } else if (e.key === '5') {
        e.preventDefault();
        navigate('/profile');
      } else if (e.key.toLowerCase() === 'a') {
        e.preventDefault();
        navigate('/assistant');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, toggleTheme, toggleEnvMode, toggleShortcutsModal, toggleCopilot, focusSearch]);
}
