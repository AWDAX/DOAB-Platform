/**
 * useUserSettings — Unified user settings persistence hook.
 *
 * Architecture:
 *   - ACCOUNT-SCOPED keys (stored under `doab_account_profile`):
 *       role, vendorId, clearanceLimit, highElevationPriority, homeRegion
 *     These travel with the user's identity and are synced back on auth restore.
 *
 *   - DEVICE-SCOPED keys (individual localStorage keys — unchanged):
 *       doab_sounds_muted, doab_click_sound, theme, doab_env_mode_preference
 *     These are device/session conveniences that should NOT follow account sync.
 *
 *   - MAP-ENGINE key (`doab_map_engine`) is device-scoped (hardware-dependent
 *     choice — 3D GPU may not work on every device) but persisted across sessions.
 */

const ACCOUNT_PROFILE_KEY = 'doab_account_profile';
const MAP_ENGINE_KEY = 'doab_map_engine';

export interface AccountProfile {
  role: 'citizen' | 'delivery';
  vendorId: string;
  clearanceLimit: '15' | '20' | '25';
  highElevationPriority: boolean;
  homeRegion: string; // e.g. 'all', 'bengaluru', 'bihar'
}

const DEFAULT_PROFILE: AccountProfile = {
  role: 'citizen',
  vendorId: '',
  clearanceLimit: '15',
  highElevationPriority: true,
  homeRegion: 'all',
};

function readProfile(): AccountProfile {
  try {
    const raw = localStorage.getItem(ACCOUNT_PROFILE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

function writeProfile(profile: AccountProfile): void {
  try {
    localStorage.setItem(ACCOUNT_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Storage quota exceeded — silently ignore
  }
}

// ─── Account-profile helpers (used by ProfilePage + PreferencesModal) ─────────

export function getAccountProfile(): AccountProfile {
  return readProfile();
}

export function setAccountProfile(partial: Partial<AccountProfile>): AccountProfile {
  const current = readProfile();
  const next = { ...current, ...partial };
  writeProfile(next);
  // Dispatch custom event so other components can react without prop drilling
  try {
    window.dispatchEvent(new CustomEvent('doab:settings-changed', { detail: next }));
  } catch {
    // SSR / non-browser env guard
  }
  return next;
}

// ─── Map engine helpers (used by MapPage) ─────────────────────────────────────

export function getPreferredMapEngine(): 'leaflet' | 'maplibre' {
  try {
    const stored = localStorage.getItem(MAP_ENGINE_KEY);
    if (stored === 'maplibre' || stored === 'leaflet') return stored;
  } catch {
    // ignore
  }
  return 'leaflet';
}

export function setPreferredMapEngine(engine: 'leaflet' | 'maplibre'): void {
  try {
    localStorage.setItem(MAP_ENGINE_KEY, engine);
  } catch {
    // ignore
  }
}

// ─── React hook (optional convenience wrapper) ─────────────────────────────────

import { useState, useEffect, useCallback } from 'react';

export function useUserSettings() {
  const [profile, setProfileState] = useState<AccountProfile>(readProfile);
  const [mapEngine, setMapEngineState] = useState<'leaflet' | 'maplibre'>(getPreferredMapEngine);

  // Sync across tabs / components via storage event
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACCOUNT_PROFILE_KEY) setProfileState(readProfile());
      if (e.key === MAP_ENGINE_KEY) setMapEngineState(getPreferredMapEngine());
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<AccountProfile>).detail;
      if (detail) setProfileState(detail);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('doab:settings-changed', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('doab:settings-changed', onCustom);
    };
  }, []);

  const updateProfile = useCallback((partial: Partial<AccountProfile>) => {
    const next = setAccountProfile(partial);
    setProfileState(next);
  }, []);

  const updateMapEngine = useCallback((engine: 'leaflet' | 'maplibre') => {
    setPreferredMapEngine(engine);
    setMapEngineState(engine);
  }, []);

  return { profile, updateProfile, mapEngine, updateMapEngine };
}
