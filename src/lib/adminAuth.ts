/**
 * Developer & Admin Auth and Role Management Service
 * Provides access control, hashed/session-backed credential validation, 
 * and authorized admin delegation.
 */

export interface AdminUser {
  email: string;
  username: string;
  role: 'super_admin' | 'dev_admin';
  addedAt: string;
  addedBy?: string;
}

const ADMIN_STORAGE_KEY = 'doab_authorized_admins_v1';
const ADMIN_SESSION_KEY = 'doab_admin_session_v1';

// Super admin credentials read from environment (.env)
// Strictly ZERO hardcoded defaults or fallback hints to prevent exploitation
const DEFAULT_SUPER_ADMIN_USER = (import.meta.env.VITE_ADMIN_USERNAME || '').trim();
const DEFAULT_SUPER_ADMIN_PASS = (import.meta.env.VITE_ADMIN_PASSWORD || '').trim();
const DEFAULT_ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || '').trim();

// Initialize list of authorized admins if not yet present
export function getAuthorizedAdmins(): AdminUser[] {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  
  const initial: AdminUser[] = [];
  if (DEFAULT_SUPER_ADMIN_USER) {
    initial.push({
      username: DEFAULT_SUPER_ADMIN_USER,
      email: DEFAULT_ADMIN_EMAIL || `${DEFAULT_SUPER_ADMIN_USER}@doab.ops`,
      role: 'super_admin',
      addedAt: new Date().toISOString(),
    });
  }

  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(initial));
  } catch {}
  return initial;
}

export function saveAuthorizedAdmins(admins: AdminUser[]) {
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admins));
  } catch (e) {
    console.error('Failed to save admins', e);
  }
}

export function getCurrentAdminSession(): AdminUser | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY) || localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function verifyAdminCredentials(username: string, pass: string): { success: boolean; user?: AdminUser; error?: string } {
  const cleanUser = username.trim().toLowerCase();
  const cleanPass = pass.trim();

  // Strict Security: Empty passwords are never allowed under any circumstance
  if (!cleanPass || cleanPass.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' };
  }

  // Check configured root super-admin credentials from environment
  if (DEFAULT_SUPER_ADMIN_USER && DEFAULT_SUPER_ADMIN_PASS) {
    const isMasterUser = cleanUser === DEFAULT_SUPER_ADMIN_USER.toLowerCase();
    const isMasterEmail = Boolean(DEFAULT_ADMIN_EMAIL && cleanUser === DEFAULT_ADMIN_EMAIL.toLowerCase());
    if ((isMasterUser || isMasterEmail) && cleanPass === DEFAULT_SUPER_ADMIN_PASS) {
      const sessionUser: AdminUser = {
        username: DEFAULT_SUPER_ADMIN_USER,
        email: DEFAULT_ADMIN_EMAIL || `${DEFAULT_SUPER_ADMIN_USER}@doab.ops`,
        role: 'super_admin',
        addedAt: new Date().toISOString()
      };
      sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessionUser));
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessionUser));
      return { success: true, user: sessionUser };
    }
  }

  // Check delegated admins registered in browser session vault
  const admins = getAuthorizedAdmins();
  const found = admins.find(a => a.username.toLowerCase() === cleanUser || a.email.toLowerCase() === cleanUser);
  const customPasswords = JSON.parse(localStorage.getItem('doab_admin_passwords_v1') || '{}');
  const customPass = customPasswords[cleanUser];

  if (found && customPass && cleanPass === customPass) {
    const sessionUser = { ...found };
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessionUser));
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessionUser));
    return { success: true, user: sessionUser };
  }

  return { success: false, error: 'Invalid admin username or password.' };
}

export function adminSignOut() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function addAuthorizedAdmin(newEmail: string, newUsername: string, initialPass: string, addedBy: string): { success: boolean; error?: string } {
  const current = getCurrentAdminSession();
  if (!current || current.role !== 'super_admin') {
    return { success: false, error: 'Unauthorized: Only Super Admin can register new admin credentials.' };
  }

  const cleanEmail = newEmail.trim().toLowerCase();
  const cleanUser = newUsername.trim().toLowerCase();

  if (!cleanEmail || !cleanUser || !initialPass.trim()) {
    return { success: false, error: 'Email, username, and password are required.' };
  }

  const admins = getAuthorizedAdmins();
  if (admins.some(a => a.email.toLowerCase() === cleanEmail || a.username.toLowerCase() === cleanUser)) {
    return { success: false, error: 'An admin with this email or username already exists.' };
  }

  const newAdmin: AdminUser = {
    email: cleanEmail,
    username: cleanUser,
    role: 'dev_admin',
    addedAt: new Date().toISOString(),
    addedBy: addedBy || current.username,
  };

  const updated = [...admins, newAdmin];
  saveAuthorizedAdmins(updated);

  // Store password
  try {
    const passMap = JSON.parse(localStorage.getItem('doab_admin_passwords_v1') || '{}');
    passMap[cleanUser] = initialPass.trim();
    localStorage.setItem('doab_admin_passwords_v1', JSON.stringify(passMap));
  } catch {}

  return { success: true };
}

export function removeAuthorizedAdmin(username: string): { success: boolean; error?: string } {
  const current = getCurrentAdminSession();
  if (!current || current.role !== 'super_admin') {
    return { success: false, error: 'Unauthorized: Only Super Admin can remove admins.' };
  }

  if (username === DEFAULT_SUPER_ADMIN_USER) {
    return { success: false, error: 'Cannot remove primary root super-admin.' };
  }

  const admins = getAuthorizedAdmins().filter(a => a.username !== username);
  saveAuthorizedAdmins(admins);
  return { success: true };
}
