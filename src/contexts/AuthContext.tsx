import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AttendanceLog, BreakLog, UserRole, Notification } from '../types';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { db } from '../lib/database';
import { useSettings } from './SettingsContext';
import { useRBAC } from './RBACContext';

const STORAGE_KEY_USERS = 'tys_hrms_users_v2';
const STORAGE_KEY_SESSION = 'tys_hrms_session_v2';
const STORAGE_KEY_ATTENDANCE = 'tys_hrms_attendance_v2';
const STORAGE_KEY_BREAKS = 'tys_hrms_breaks_v2';

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface SessionState {
  currentUser: User | null;
  attendanceLog: AttendanceLog | null;
  activeBreak: BreakLog | null;
  isClockedIn: boolean;
  isOnBreak: boolean;
  breakStartTime: number | null;
}

interface AuthContextType {
  users: User[];
  session: SessionState;
  attendanceLogs: AttendanceLog[];
  breakLogs: BreakLog[];
  unreadCount: number;
  isFirstRun: boolean;
  isLoading: boolean;
  createInitialAdmin: (name: string, pin: string) => boolean;
  createUser: (data: Omit<User, 'id' | 'createdAt' | 'isActive'>) => boolean;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  login: (pin: string) => { success: boolean; error?: string };
  logout: () => void;
  clockIn: (latLng?: string, method?: AttendanceLog['method']) => void;
  clockOut: (latLng?: string) => void;
  startBreak: () => void;
  endBreak: () => void;
  registerBiometrics: () => Promise<{ success: boolean; error?: string }>;
  loginBiometric: () => Promise<{ success: boolean; error?: string }>;
  getTodayAttendance: (userId: string) => AttendanceLog | undefined;
  getAllTodayAttendance: () => AttendanceLog[];
  migrateLocalToCloud: () => Promise<{ success: boolean; count: number }>;
}

const defaultSession: SessionState = {
  currentUser: null,
  attendanceLog: null,
  activeBreak: null,
  isClockedIn: false,
  isOnBreak: false,
  breakStartTime: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const { permissions } = useRBAC();
  const [users, setUsers] = useState<User[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]'); } catch { return []; }
  });

  const [session, setSession] = useState<SessionState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SESSION);
      return stored ? JSON.parse(stored) : defaultSession;
    } catch { return defaultSession; }
  });

  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_ATTENDANCE) || '[]'); } catch { return []; }
  });

  const [breakLogs, setBreakLogs] = useState<BreakLog[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_BREAKS) || '[]'); } catch { return []; }
  });

  const [unreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session)); }, [session]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(attendanceLogs)); }, [attendanceLogs]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_BREAKS, JSON.stringify(breakLogs)); }, [breakLogs]);

  useEffect(() => {
    if (session.currentUser) {
      const updated = users.find(u => u.id === session.currentUser!.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(session.currentUser)) {
        setSession(prev => ({ ...prev, currentUser: updated }));
      }
    }
  }, [users, session.currentUser]);

  useEffect(() => {
    if (!settings.mongodb.isEnabled) return;
    const hasSynced = localStorage.getItem('tys_hrms_auth_cloud_synced_v2');
    if (hasSynced === 'true') return;

    const performAuthAutoSync = async () => {
      try {
        await migrateLocalToCloud();
        localStorage.setItem('tys_hrms_auth_cloud_synced_v2', 'true');
      } catch (e) {
        console.error('[AutoSync-Auth] Failed:', e);
      }
    };
    
    const timer = setTimeout(performAuthAutoSync, 1500);
    return () => clearTimeout(timer);
  }, [settings.mongodb.isEnabled]);

  useEffect(() => {
    if (!settings.mongodb.isEnabled) return;
    const pollAuthData = async () => {
      try {
        const [cUsers, cAttendance, cBreaks] = await Promise.all([
          db.getAll<User>('users'),
          db.getAll<AttendanceLog>('attendance'),
          db.getAll<BreakLog>('breaks')
        ]);
        if (cUsers.length) setUsers(cUsers);
        if (cAttendance.length) setAttendanceLogs(cAttendance);
        if (cBreaks.length) setBreakLogs(cBreaks);
      } catch (e) {
        console.warn('[Heartbeat-Auth] Sync failed (silent):', e);
      }
    };
    const intervalId = setInterval(pollAuthData, 6000);
    return () => clearInterval(intervalId);
  }, [settings.mongodb.isEnabled]);

  // --- Cloud Sync: Initial Load ---
  useEffect(() => {
    if (!settings.mongodb.isEnabled) {
      setIsLoading(false);
      return;
    }

    // Safety Fallback: Force load completion after 5 seconds to prevent hanging
    const fallbackTimeout = setTimeout(() => {
      console.warn('[CloudSync] Fallback triggered: Loading takes too long, continuing with local data.');
      setIsLoading(false);
    }, 5000);

    const loadCloudAuthData = async () => {
      console.log('[CloudSync] Initializing Auth data from MongoDB...');
      try {
        const [cUsers, cAttendance, cBreaks] = await Promise.all([
          db.getAll<User>('users'),
          db.getAll<AttendanceLog>('attendance'),
          db.getAll<BreakLog>('breaks')
        ]);
        if (cUsers.length) setUsers(cUsers);
        if (cAttendance.length) setAttendanceLogs(cAttendance);
        if (cBreaks.length) setBreakLogs(cBreaks);
      } catch (e) {
        console.error('[CloudSync] Failed initial load:', e);
      } finally {
        clearTimeout(fallbackTimeout);
        setIsLoading(false);
      }
    };
    loadCloudAuthData();

    return () => clearTimeout(fallbackTimeout);
  }, [settings.mongodb.isEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const demoUserIds = ['w1', 'w2', 'w3', 'w4', 'm1', 'm2'];
    setUsers(prev => {
      const filtered = prev.filter(u => !demoUserIds.includes(u.id));
      return filtered.length !== prev.length ? filtered : prev;
    });
  }, []);

  const isFirstRun = !isLoading && users.length === 0;

  const createInitialAdmin = (name: string, pin: string): boolean => {
    if (users.some(u => u.pinCode === pin)) return false;
    const admin: User = {
      id: generateId(), name: name.trim(), pinCode: pin,
      role: 'Admin', isActive: true, createdAt: new Date().toISOString(),
    };
    setUsers([admin]);
    if (settings.mongodb.isEnabled) db.save('users', admin);
    return true;
  };

  const createUser = (data: Omit<User, 'id' | 'createdAt' | 'isActive'>): boolean => {
    if (users.some(u => u.pinCode === data.pinCode)) return false;
    const newUser: User = { ...data, id: generateId(), isActive: true, createdAt: new Date().toISOString() };
    setUsers(prev => [...prev, newUser]);
    if (settings.mongodb.isEnabled) db.save('users', newUser);
    return true;
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(prev => {
      const next = prev.map(u => u.id === id ? { ...u, ...updates } : u);
      if (settings.mongodb.isEnabled) {
        const updated = next.find(u => u.id === id);
        if (updated) db.save('users', updated);
      }
      return next;
    });
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    if (settings.mongodb.isEnabled) db.delete('users', id);
  };

  const login = (pin: string): { success: boolean, error?: string } => {
    const user = users.find(u => u.pinCode === pin && u.isActive);
    if (!user) return { success: false, error: 'Invalid PIN' };

    const today = new Date().toISOString().split('T')[0];
    const existingLog = attendanceLogs.find(l => l.userId === user.id && l.date === today && !l.clockOut);
    const existingBreak = existingLog
      ? breakLogs.find(b => b.attendanceLogId === existingLog.id && !b.endTime)
      : null;

    setSession({
      currentUser: user,
      attendanceLog: existingLog || null,
      activeBreak: existingBreak || null,
      isClockedIn: !!existingLog,
      isOnBreak: !!existingBreak,
      breakStartTime: existingBreak ? new Date(existingBreak.startTime).getTime() : null,
    });
    return { success: true };
  };

  const logout = () => setSession(defaultSession);

  const clockIn = (latLng?: string, method: AttendanceLog['method'] = 'manual') => {
    if (!session.currentUser || session.isClockedIn) return;
    const now = new Date();
    const log: AttendanceLog = {
      id: generateId(),
      userId: session.currentUser.id,
      date: now.toISOString().split('T')[0],
      clockIn: now.toISOString(),
      latLngIn: latLng,
      method,
      status: 'present',
    };
    setAttendanceLogs(prev => [...prev, log]);
    setSession(prev => ({ ...prev, attendanceLog: log, isClockedIn: true }));
    if (settings.mongodb.isEnabled) db.save('attendance', log);
  };

  const clockOut = (latLng?: string) => {
    if (!session.currentUser || !session.isClockedIn || !session.attendanceLog) return;
    if (session.isOnBreak && session.activeBreak) {
      const ended = { ...session.activeBreak, endTime: new Date().toISOString() };
      setBreakLogs(prev => prev.map(b => b.id === ended.id ? ended : b));
    }
    const now = new Date();
    const clockInTime = new Date(session.attendanceLog.clockIn!);
    const totalMinutes = Math.round((now.getTime() - clockInTime.getTime()) / 60000);
    const updated: AttendanceLog = { ...session.attendanceLog, clockOut: now.toISOString(), latLngOut: latLng, totalMinutes };
    setAttendanceLogs(prev => prev.map(l => l.id === updated.id ? updated : l));
    setSession(prev => ({ ...prev, attendanceLog: updated, isClockedIn: false, isOnBreak: false, activeBreak: null, breakStartTime: null }));
    if (settings.mongodb.isEnabled) db.save('attendance', updated);
  };

  const startBreak = () => {
    if (!session.attendanceLog || session.isOnBreak) return;
    const b: BreakLog = { id: generateId(), attendanceLogId: session.attendanceLog.id, startTime: new Date().toISOString() };
    setBreakLogs(prev => [...prev, b]);
    setSession(prev => ({ ...prev, activeBreak: b, isOnBreak: true, breakStartTime: Date.now() }));
    if (settings.mongodb.isEnabled) db.save('breaks', b);
  };

  const endBreak = () => {
    if (!session.activeBreak || !session.isOnBreak) return;
    const ended = { ...session.activeBreak, endTime: new Date().toISOString() };
    setBreakLogs(prev => prev.map(b => b.id === ended.id ? ended : b));
    setSession(prev => ({ ...prev, activeBreak: null, isOnBreak: false, breakStartTime: null }));
    if (settings.mongodb.isEnabled) db.save('breaks', ended);
  };

  const getTodayAttendance = (userId: string): AttendanceLog | undefined => {
    const today = new Date().toISOString().split('T')[0];
    return attendanceLogs.find(l => l.userId === userId && l.date === today);
  };

  const getAllTodayAttendance = (): AttendanceLog[] => {
    const today = new Date().toISOString().split('T')[0];
    return attendanceLogs.filter(l => l.date === today);
  };

  const registerBiometrics = async (): Promise<{ success: boolean; error?: string }> => {
    if (!session.currentUser) return { success: false, error: 'Not logged in' };
    if (!window.PublicKeyCredential) return { success: false, error: 'Biometrics not supported' };

    try {
      const optionsRes = await fetch('/api/auth/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.currentUser.id, userName: session.currentUser.name }),
      });
      const options = await optionsRes.json();
      if (options.error) throw new Error(options.error);

      const credential = await startRegistration(options);

      const verifyRes = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: credential, userId: session.currentUser.id }),
      });
      const result = await verifyRes.json();

      if (result.success) {
        const updatedUsers = await db.getAll<User>('users');
        setUsers(updatedUsers);
        return { success: true };
      }
      return { success: false, error: result.error || 'Registration failed' };
    } catch (err: any) {
      console.error('Biometric Registration Error:', err);
      return { success: false, error: err.message };
    }
  };

  const loginBiometric = async (): Promise<{ success: boolean, error?: string }> => {
    if (!window.PublicKeyCredential) return { success: false, error: 'Biometrics not supported' };

    try {
      const optionsRes = await fetch('/api/auth/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ }),
      });
      const options = await optionsRes.json();
      if (options.error) throw new Error(options.error);

      const assertion = await startAuthentication(options);
      const user = users.find(u => u.biometricCredentials?.some(c => c.id === assertion.id));
      if (!user) return { success: false, error: 'Device not registered for any user' };

      const verifyRes = await fetch('/api/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: assertion, userId: user.id }),
      });
      const result = await verifyRes.json();

      if (result.success) {
        const loginRes = login(user.pinCode);
        return { success: loginRes.success, error: loginRes.error };
      }
      return { success: false, error: result.error || 'Authentication failed' };
    } catch (err: any) {
      console.error('Biometric Login Error:', err);
      return { success: false, error: err.message };
    }
  };

  const migrateLocalToCloud = async () => {
    if (!settings.mongodb.isEnabled) return { success: false, count: 0 };
    await db.saveMany('users', users);
    await db.saveMany('attendance', attendanceLogs);
    await db.saveMany('breaks', breakLogs);
    return { success: true, count: users.length + attendanceLogs.length + breakLogs.length };
  };

  return (
    <AuthContext.Provider value={{
      users, session, attendanceLogs, breakLogs, unreadCount, isFirstRun, isLoading,
      createInitialAdmin, createUser, updateUser, deleteUser,
      login, logout, clockIn, clockOut, startBreak, endBreak,
      getTodayAttendance, getAllTodayAttendance,
      registerBiometrics, loginBiometric, migrateLocalToCloud
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
