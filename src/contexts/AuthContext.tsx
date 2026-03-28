import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AttendanceLog, BreakLog, UserRole } from '../types';
import { db } from '../lib/database';
import { useSettings } from './SettingsContext';

const STORAGE_KEY_USERS = 'tys_hrms_users_v2';
const STORAGE_KEY_SESSION = 'tys_hrms_session_v2';
const STORAGE_KEY_ATTENDANCE = 'tys_hrms_attendance_v2';
const STORAGE_KEY_BREAKS = 'tys_hrms_breaks_v2';
const STORAGE_KEY_NOTIFICATIONS = 'tys_hrms_notifications_v2';

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
  geofenceStatus: 'inside' | 'outside' | 'unknown' | 'disabled';
}

interface UnreadNotif {
  userId: string;
  count: number;
}

interface AuthContextType {
  users: User[];
  session: SessionState;
  attendanceLogs: AttendanceLog[];
  breakLogs: BreakLog[];
  unreadCount: number;
  isFirstRun: boolean;
  // User management
  createInitialAdmin: (name: string, pin: string) => boolean;
  createUser: (data: Omit<User, 'id' | 'createdAt' | 'isActive'>) => boolean;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  // Auth
  login: (pin: string) => { success: boolean; geofenceStatus?: string };
  logout: () => void;
  // Attendance
  clockIn: (latLng?: string, method?: AttendanceLog['method']) => void;
  clockOut: (latLng?: string) => void;
  startBreak: () => void;
  endBreak: () => void;
  // Geofence

  // Biometrics
  registerBiometrics: () => Promise<{ success: boolean; error?: string }>;
  loginBiometric: () => Promise<{ success: boolean; error?: string }>;
  // Stats helpers
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
  geofenceStatus: 'unknown',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
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

  useEffect(() => { localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session)); }, [session]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(attendanceLogs)); }, [attendanceLogs]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_BREAKS, JSON.stringify(breakLogs)); }, [breakLogs]);

  // Sync current user if updated
  useEffect(() => {
    if (session.currentUser) {
      const updated = users.find(u => u.id === session.currentUser!.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(session.currentUser)) {
        setSession(prev => ({ ...prev, currentUser: updated }));
      }
    }
  }, [users]);

  // --- Zero-Touch Auto-Migration ---
  useEffect(() => {
    if (!settings.mongodb.isEnabled) return;
    const hasSynced = localStorage.getItem('tys_hrms_auth_cloud_synced_v2');
    if (hasSynced === 'true') return;

    const performAuthAutoSync = async () => {
      console.log('[AutoSync-Auth] Performing first-time local to cloud migration...');
      try {
        await migrateLocalToCloud();
        localStorage.setItem('tys_hrms_auth_cloud_synced_v2', 'true');
        console.log('[AutoSync-Auth] Successful.');
      } catch (e) {
        console.error('[AutoSync-Auth] Failed:', e);
      }
    };
    
    const timer = setTimeout(performAuthAutoSync, 1500);
    return () => clearTimeout(timer);
  }, [settings.mongodb.isEnabled, users]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Cloud Sync: Initial Load ---
  useEffect(() => {
    if (!settings.mongodb.isEnabled) return;
    const loadCloudAuthData = async () => {
      console.log('[CloudSync] Loading Auth data from MongoDB...');
      const [cUsers, cAttendance, cBreaks] = await Promise.all([
        db.getAll<User>('users'),
        db.getAll<AttendanceLog>('attendance'),
        db.getAll<BreakLog>('breaks')
      ]);
      if (cUsers.length) setUsers(cUsers);
      if (cAttendance.length) setAttendanceLogs(cAttendance);
      if (cBreaks.length) setBreakLogs(cBreaks);
    };
    loadCloudAuthData();
  }, [settings.mongodb.isEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const demoUserIds = ['w1', 'w2', 'w3', 'w4', 'm1', 'm2'];
    setUsers(prev => {
      const filtered = prev.filter(u => !demoUserIds.includes(u.id));
      return filtered.length !== prev.length ? filtered : prev;
    });
  }, []);

  const isFirstRun = users.length === 0;

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


  const login = (pin: string): { success: boolean } => {
    const user = users.find(u => u.pinCode === pin && u.isActive);
    if (!user) return { success: false };

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
      geofenceStatus: 'unknown',
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
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userID = new TextEncoder().encode(session.currentUser.id);

      const options: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: { name: 'TYS-HRMS' },
          user: {
            id: userID,
            name: session.currentUser.name,
            displayName: session.currentUser.name,
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
          authenticatorSelection: { userVerification: 'required' },
          timeout: 60000,
        },
      };

      const credential = await navigator.credentials.create(options) as any;
      if (!credential) return { success: false, error: 'Failed to create credential' };

      const b64Id = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      // In a real app, we'd send 'credential.response' to the server to verify and store public key.
      // Here we mock it by storing the ID.
      
      const newCred = {
        id: b64Id,
        publicKey: 'MOCKED_PUBLIC_KEY', // Placeholder
        createdAt: new Date().toISOString(),
      };

      const updatedCreds = [...(session.currentUser.biometricCredentials || []), newCred];
      updateUser(session.currentUser.id, { biometricCredentials: updatedCreds });

      return { success: true };
    } catch (err: any) {
      console.error('Biometric Registration Error:', err);
      return { success: false, error: err.message };
    }
  };

  const loginBiometric = async (): Promise<{ success: boolean; error?: string }> => {
    if (!window.PublicKeyCredential) return { success: false, error: 'Biometrics not supported' };

    try {
      // For local-only mock, we have to know which users might have registered.
      // In real WebAuthn, we'd send a challenge and get an assertion.
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          userVerification: 'required',
          timeout: 60000,
        },
      }) as any;

      if (!credential) return { success: false, error: 'Biometric failed' };

      const b64Id = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      
      // Find user who owns this credential ID
      const user = users.find(u => u.biometricCredentials?.some(c => c.id === b64Id));
      if (!user) return { success: false, error: 'Device not registered for any user' };

      // Reuse login logic
      const loginRes = login(user.pinCode);
      return { success: loginRes.success };
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
      users, session, attendanceLogs, breakLogs, unreadCount, isFirstRun,
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
