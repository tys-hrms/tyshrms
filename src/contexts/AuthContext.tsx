import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AttendanceLog, BreakLog, UserRole, Notification, Tenant, BrandingSettings } from '../types';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { db } from '../lib/database';
import { useSettings } from './SettingsContext';
import { useRBAC } from './RBACContext';
import { calculateDistance } from '../lib/location';

const STORAGE_KEY_USERS = 'hrmscore_users_v2';
const STORAGE_KEY_SESSION = 'hrmscore_session_v2';
const STORAGE_KEY_ATTENDANCE = 'hrmscore_attendance_v2';
const STORAGE_KEY_BREAKS = 'hrmscore_breaks_v2';

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function generateTenantId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

interface SessionState {
  currentUser: User | null;
  tenant: Tenant | null;
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
  discoverTenant: (tenantId: string) => Promise<{ success: boolean; tenant?: Tenant; error?: string }>;
  registerTenant: (data: Omit<Tenant, 'id' | 'createdAt' | 'isActive'> & { pin: string }) => Promise<{ success: boolean; tenantId?: string; error?: string }>;
  loginAdmin: (email: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  loginStaff: (pin: string, faceDetected?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  createUser: (data: Omit<User, 'id' | 'createdAt' | 'isActive' | 'tenantId'>) => boolean;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  clockIn: (latLng?: string, method?: AttendanceLog['method']) => void;
  clockOut: (latLng?: string) => void;
  startBreak: () => void;
  endBreak: () => void;
  registerBiometrics: () => Promise<{ success: boolean; error?: string }>;
  getTodayAttendance: (userId: string) => AttendanceLog | undefined;
  getAllTodayAttendance: () => AttendanceLog[];
  setGeofenceBypass: (userId: string, hours: number) => void;
  migrateLocalToCloud: () => Promise<{ success: boolean; count: number }>;
}

const defaultSession: SessionState = {
  currentUser: null,
  tenant: null,
  attendanceLog: null,
  activeBreak: null,
  isClockedIn: false,
  isOnBreak: false,
  breakStartTime: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { settings, updateSettings } = useSettings();
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

  // --- Cloud Sync: Polling (Tenant Scoped) ---
  useEffect(() => {
    if (!settings.mongodb.isEnabled || !session.tenant) {
      setIsLoading(false);
      return;
    }

    const pollAuthData = async () => {
      try {
        const tenantFilter = { tenantId: session.tenant!.id };
        const [cUsers, cAttendance, cBreaks] = await Promise.all([
          db.tenants.findUsers(session.tenant!.id),
          db.tenants.findAttendance(session.tenant!.id),
          db.tenants.findBreaks(session.tenant!.id)
        ]);
        if (cUsers.length) setUsers(cUsers);
        if (cAttendance.length) setAttendanceLogs(cAttendance);
        if (cBreaks.length) setBreakLogs(cBreaks);
      } catch (e) {
        console.warn('[Heartbeat-Auth] Sync failed (silent):', e);
      } finally {
        setIsLoading(false);
      }
    };
    pollAuthData();
    const intervalId = setInterval(pollAuthData, 15000);
    return () => clearInterval(intervalId);
  }, [settings.mongodb.isEnabled, session.tenant]);

  const isFirstRun = false; // Registration flow handles this now

  const discoverTenant = async (tenantId: string): Promise<{ success: boolean; tenant?: Tenant; error?: string }> => {
    try {
      const tenant = await db.tenants.findOne({ id: tenantId });
      if (!tenant) return { success: false, error: 'Organization not found' };
      
      // Load tenant-specific branding
      const tenantSettings = await db.tenants.getSettings(tenantId);
      if (tenantSettings) {
        updateSettings(tenantSettings);
      }
      
      setSession(prev => ({ ...prev, tenant }));
      return { success: true, tenant };
    } catch (err: any) {
      return { success: false, error: err.message || 'Discovery failed' };
    }
  };

  const registerTenant = async (data: Omit<Tenant, 'id' | 'createdAt' | 'isActive'> & { pin: string }): Promise<{ success: boolean; tenantId?: string; error?: string }> => {
    try {
      // 1. Generate Unique ID
      let id = generateTenantId();
      let exists = await db.tenants.findOne({ id });
      while (exists) {
        id = generateTenantId();
        exists = await db.tenants.findOne({ id });
      }

      // 2. Create Tenant
      const tenant: Tenant = {
        id,
        ...data,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      await db.tenants.insert(tenant as any);

      // 3. Create Admin User
      const admin: User = {
        id: generateId(),
        tenantId: id,
        name: data.adminName,
        pinCode: data.pin,
        role: 'Admin',
        email: data.email,
        phone: data.phone,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      await db.users.insert(admin as any);

      // 4. Initialize Default Settings
      const branding: BrandingSettings = {
        companyName: data.name,
        primaryColor: '#2d7cf6',
        secondaryColor: '#14b8a6',
        accentColor: '#f59e0b',
        themeMode: 'light'
      };
      await db.tenants.saveSettings(id, { branding });

      return { success: true, tenantId: id };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const loginAdmin = async (email: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    if (!session.tenant) return { success: false, error: 'Identify organization first' };
    
    // Find admin in the discovered tenant
    const user = users.find(u => u.tenantId === session.tenant!.id && u.email === email && u.pinCode === pin && u.role === 'Admin');
    if (!user) return { success: false, error: 'Invalid credentials or not an Admin' };

    setSession(prev => ({ ...prev, currentUser: user }));
    return { success: true };
  };

  const loginStaff = async (pin: string, faceDetected?: boolean): Promise<{ success: boolean; error?: string }> => {
    if (!session.tenant) return { success: false, error: 'Identify organization first' };
    if (faceDetected === false) return { success: false, error: 'Face recognition required' };

    const user = users.find(u => u.tenantId === session.tenant!.id && u.pinCode === pin && u.isActive);
    if (!user) return { success: false, error: 'Invalid PIN' };

    const today = new Date().toISOString().split('T')[0];
    const existingLog = attendanceLogs.find(l => l.userId === user.id && l.date === today && !l.clockOut);
    const existingBreak = existingLog
      ? breakLogs.find(b => b.attendanceLogId === existingLog.id && !b.endTime)
      : null;

    setSession(prev => ({
      ...prev,
      currentUser: user,
      attendanceLog: existingLog || null,
      activeBreak: existingBreak || null,
      isClockedIn: !!existingLog,
      isOnBreak: !!existingBreak,
      breakStartTime: existingBreak ? new Date(existingBreak.startTime).getTime() : null,
    }));
    return { success: true };
  };

  const logout = () => setSession(defaultSession);

  const createUser = (data: Omit<User, 'id' | 'createdAt' | 'isActive' | 'tenantId'>): boolean => {
    if (!session.tenant) return false;
    if (users.some(u => u.tenantId === session.tenant!.id && u.pinCode === data.pinCode)) return false;
    
    const newUser: User = { 
      ...data, 
      id: generateId(), 
      tenantId: session.tenant.id,
      isActive: true, 
      createdAt: new Date().toISOString() 
    };
    setUsers(prev => [...prev, newUser]);
    if (settings.mongodb.isEnabled) db.users.insert(newUser as any);
    return true;
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(prev => {
      const next = prev.map(u => u.id === id ? { ...u, ...updates } : u);
      const updated = next.find(u => u.id === id);
      if (updated && settings.mongodb.isEnabled) {
        db.users.update({ id }, updated as any);
      }
      return next;
    });
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    if (settings.mongodb.isEnabled) db.users.delete({ id });
  };

  const clockIn = (latLng?: string, method: AttendanceLog['method'] = 'manual') => {
    if (!session.currentUser || !session.tenant || session.isClockedIn) return;
    const now = new Date();
    const log: AttendanceLog = {
      id: generateId(),
      tenantId: session.tenant.id,
      userId: session.currentUser.id,
      date: now.toISOString().split('T')[0],
      clockIn: now.toISOString(),
      latLngIn: latLng,
      method,
      status: 'present',
    };
    setAttendanceLogs(prev => [...prev, log]);
    setSession(prev => ({ ...prev, attendanceLog: log, isClockedIn: true }));
    if (settings.mongodb.isEnabled) db.attendance.insert(log as any);
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
    if (settings.mongodb.isEnabled) db.attendance.update({ id: updated.id }, updated as any);
  };

  const startBreak = () => {
    if (!session.attendanceLog || session.isOnBreak) return;
    const b: BreakLog = { id: generateId(), attendanceLogId: session.attendanceLog.id, startTime: new Date().toISOString() };
    setBreakLogs(prev => [...prev, b]);
    setSession(prev => ({ ...prev, activeBreak: b, isOnBreak: true, breakStartTime: Date.now() }));
    // Note: breaks don't strictly need tenantId if they are tied to attendanceLogId, but we could add it
  };

  const endBreak = () => {
    if (!session.activeBreak || !session.isOnBreak) return;
    const ended = { ...session.activeBreak, endTime: new Date().toISOString() };
    setBreakLogs(prev => prev.map(b => b.id === ended.id ? ended : b));
    setSession(prev => ({ ...prev, activeBreak: null, isOnBreak: false, breakStartTime: null }));
  };

  const getTodayAttendance = (userId: string): AttendanceLog | undefined => {
    const today = new Date().toISOString().split('T')[0];
    return attendanceLogs.find(l => l.userId === userId && l.date === today);
  };

  const getAllTodayAttendance = (): AttendanceLog[] => {
    const today = new Date().toISOString().split('T')[0];
    return attendanceLogs.filter(l => l.date === today);
  };

  const setGeofenceBypass = (userId: string, hours: number) => {
    const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    updateUser(userId, { geofenceBypassUntil: until });
  };

  const registerBiometrics = async (): Promise<{ success: boolean; error?: string }> => {
    if (!session.currentUser) return { success: false, error: 'Not logged in' };
    return { success: false, error: 'WebAuthn needs tenant-aware proxy.' };
  };

  const migrateLocalToCloud = async () => {
    if (!settings.mongodb.isEnabled || !session.tenant) return { success: false, count: 0 };
    
    // Add tenantId to local items before pushing
    const tUsers = users.map(u => ({ ...u, tenantId: session.tenant!.id }));
    const tAttendance = attendanceLogs.map(a => ({ ...a, tenantId: session.tenant!.id }));
    
    await Promise.all([
      ...tUsers.map(u => db.users.insert(u as any)),
      ...tAttendance.map(a => db.attendance.insert(a as any))
    ]);
    
    return { success: true, count: tUsers.length + tAttendance.length };
  };

  return (
    <AuthContext.Provider value={{
      users, session, attendanceLogs, breakLogs, unreadCount, isFirstRun, isLoading,
      discoverTenant, registerTenant, loginAdmin, loginStaff, logout,
      createUser, updateUser, deleteUser, clockIn, clockOut, startBreak, endBreak,
      getTodayAttendance, getAllTodayAttendance, setGeofenceBypass, registerBiometrics,
      migrateLocalToCloud
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
