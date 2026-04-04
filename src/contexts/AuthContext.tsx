import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AttendanceLog, BreakLog, UserRole, Notification, Tenant, BrandingSettings } from '../types';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { db } from '../lib/database';
import { useSettings } from './SettingsContext';
import { useRBAC } from './RBACContext';
import { calculateDistance } from '../lib/location';

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function generateTenantId(): string {
  const yearSuffix = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `${yearSuffix}-${random}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
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
  isSyncing: boolean;
  lastSyncedAt: number;
  discoverTenant: (tenantId: string) => Promise<{ success: boolean; tenant?: Tenant; error?: string }>;
  unifiedLogin: (tenantId: string, identifier: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  registerTenant: (data: any) => Promise<{ success: boolean; tenantId?: string; error?: string }>;
  loginAdmin: (email: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  loginStaff: (pin: string, faceDetected?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  createUser: (data: Omit<User, 'id' | 'createdAt' | 'isActive' | 'tenantId'>) => Promise<boolean>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  clockIn: (latLng?: string, method?: AttendanceLog['method']) => Promise<void>;
  clockOut: (latLng?: string) => Promise<void>;
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
  const [users, setUsers] = useState<User[]>([]);
  const [session, setSession] = useState<SessionState>(() => {
    try {
      const stored = localStorage.getItem('tys_hrms_session');
      return stored ? JSON.parse(stored) : defaultSession;
    } catch { return defaultSession; }
  });
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [breakLogs, setBreakLogs] = useState<BreakLog[]>([]);
  const { settings, updateSettings } = useSettings();
  const [unreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(Date.now());

  useEffect(() => {
    try {
      localStorage.setItem('tys_hrms_session', JSON.stringify(session));
    } catch { /* ignore */ }
  }, [session]);

  useEffect(() => {
    if (session.currentUser) {
      const updated = users.find(u => u.id === session.currentUser!.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(session.currentUser)) {
        setSession(prev => ({ ...prev, currentUser: updated }));
      }
    }
  }, [users, session.currentUser]);

  const pollAuthData = async () => {
    if (!settings.mongodb.isEnabled || !session.tenant) return;
    try {
      const [cUsers, cAttendance, cBreaks] = await Promise.all([
        db.tenants.findUsers(session.tenant.id),
        db.tenants.findAttendance(session.tenant.id),
        db.tenants.findBreaks(session.tenant.id)
      ]);
      if (cUsers.length) setUsers(cUsers);
      if (cAttendance.length) setAttendanceLogs(cAttendance);
      if (cBreaks.length) setBreakLogs(cBreaks);
      setLastSyncedAt(Date.now());
    } catch (e) {
      console.warn('[Heartbeat-Auth] Sync failed (silent):', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!settings.mongodb.isEnabled || !session.tenant) {
      setIsLoading(false);
      return;
    }

    const triggerAutoSync = async () => {
      const count = await db.sync.fromLocal(session.tenant!.id);
      if (count > 0) pollAuthData();
    };

    pollAuthData();
    triggerAutoSync();
  }, [settings.mongodb.isEnabled, session.tenant]);

  useEffect(() => {
    if (!settings.mongodb.isEnabled || !session.tenant || isSyncing) return;
    const intervalId = setInterval(pollAuthData, 1500); 
    return () => clearInterval(intervalId);
  }, [settings.mongodb.isEnabled, session.tenant, isSyncing]);

  useEffect(() => {
    const runAutoClockout = async () => {
      if (!session.tenant) return;
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const openLogs = attendanceLogs.filter(l => !l.clockOut);
      for (const log of openLogs) {
        const logDate = log.date;
        const clockInTime = new Date(log.clockIn!);
        const hoursActive = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

        if (logDate !== today || hoursActive > 16) {
          const autoOutTime = new Date(clockInTime.getTime() + 8 * 60 * 60 * 1000);
          const updated: AttendanceLog = {
            ...log,
            clockOut: autoOutTime < now ? autoOutTime.toISOString() : now.toISOString(),
            totalMinutes: 480,
            status: 'present',
            method: 'auto'
          };
          setAttendanceLogs(prev => prev.map(l => l.id === updated.id ? updated : l));
          if (settings.mongodb.isEnabled) await db.attendance.update({ id: updated.id }, updated as any);
        }
      }
    };
    const interval = setInterval(runAutoClockout, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [attendanceLogs.length, session.tenant, settings.mongodb.isEnabled]);

  const discoverTenant = async (identifier: string) => {
    try {
      const tenant = await db.tenants.findOne({ id: identifier });
      if (!tenant) return { success: false, error: 'Organization not found' };
      
      const resSettings = await db.tenants.getSettings(tenant.id);
      if (resSettings) updateSettings(resSettings);
      setSession(prev => ({ ...prev, tenant }));
      return { success: true, tenant };
    } catch (err: any) {
      return { success: false, error: err.message || 'Discovery failed' };
    }
  };

  /**
   * NEW: Unified Login for all roles
   * inputs: Tenant ID, Username/Identifier, PIN
   */
  const unifiedLogin = async (tenantId: string, identifier: string, pin: string) => {
    try {
      // 1. Ensure Tenant is set
      let tenant = session.tenant;
      if (!tenant || tenant.id !== tenantId) {
        const res = await discoverTenant(tenantId);
        if (!res.success) return { success: false, error: res.error };
        tenant = res.tenant!;
      }

      // 2. Find User (Unified SQL Check)
      const user = await db.users.findOne({ tenant_id: tenantId, pin_code: pin });
      if (!user) return { success: false, error: 'Invalid PIN' };
      
      // If user has a name/username, ensure it matches
      if (user.name !== identifier && user.username !== identifier && user.email !== identifier) {
         return { success: false, error: 'User PIN does not match the provided Username' };
      }

      setSession(prev => ({ ...prev, currentUser: user }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const registerTenant = async (data: Omit<Tenant, 'id' | 'createdAt' | 'isActive'> & { pin: string }) => {
    try {
      let id = generateTenantId();
      let exists = await db.tenants.findOne({ id });
      while (exists) {
        id = generateTenantId();
        exists = await db.tenants.findOne({ id });
      }
      
      const companySlug = slugify(data.name);
      // Map to Snake Case for SQL Schema
      const tenant: any = { 
        id, 
        name: data.name,
        admin_name: data.adminName,
        email: data.email,
        phone: data.phone,
        state: data.state,
        company_type: data.companyType,
        employee_count: (data as any).employeeCount,
        base_lat: (data as any).base_lat,
        base_lng: (data as any).base_lng,
        shift_start_time: (data as any).shift_start_time,
        grace_period_mins: (data as any).grace_period_mins,
        companySlug,
        isActive: true, 
        createdAt: new Date().toISOString() 
      };
      
      await db.tenants.insert(tenant);
      
      // Admin User with Unified Username
      const admin: any = { 
        id: generateId(), 
        tenant_id: id, 
        name: data.adminName, 
        username: (data as any).username, // Critical for Unified Login
        pin_code: data.pin, 
        role: 'Admin', 
        email: data.email, 
        phone: data.phone, 
        isActive: true, 
        created_at: new Date().toISOString() 
      };
      await db.users.insert(admin);
      
      await db.tenants.saveSettings(id, { branding: { companyName: data.name, primaryColor: '#2d7cf6', secondaryColor: '#14b8a6', accentColor: '#f59e0b', themeMode: 'light' } });
      return { success: true, tenantId: id };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const loginAdmin = async (email: string, pin: string) => {
    if (!session.tenant) return { success: false, error: 'Identify organization first' };
    let user = users.find(u => u.tenantId === session.tenant!.id && u.email === email && u.pinCode === pin && u.role === 'Admin');
    if (!user && settings.mongodb.isEnabled) {
      try {
        const cloudUser = await db.users.findOne({ tenantId: session.tenant.id, email, pinCode: pin, role: 'Admin' });
        if (cloudUser) user = cloudUser as User;
      } catch (e) {}
    }
    if (!user) return { success: false, error: 'Invalid credentials' };
    setSession(prev => ({ ...prev, currentUser: user as User }));
    return { success: true };
  };

  const loginStaff = async (pin: string, faceDetected?: boolean) => {
    if (!session.tenant) return { success: false, error: 'Identify organization first' };
    let user = users.find(u => u.tenantId === session.tenant!.id && u.pinCode === pin && u.isActive);
    if (!user && settings.mongodb.isEnabled) {
      try {
        const cloudUser = await db.users.findOne({ tenantId: session.tenant.id, pinCode: pin, isActive: true });
        if (cloudUser) user = cloudUser as User;
      } catch (e) {}
    }
    if (!user) return { success: false, error: 'Invalid PIN' };
    const today = new Date().toISOString().split('T')[0];
    const existingLog = attendanceLogs.find(l => l.userId === user!.id && l.date === today && !l.clockOut);
    const existingBreak = existingLog ? breakLogs.find(b => b.attendanceLogId === existingLog.id && !b.endTime) : null;
    setSession(prev => ({ ...prev, currentUser: user as User, attendanceLog: existingLog || null, activeBreak: existingBreak || null, isClockedIn: !!existingLog, isOnBreak: !!existingBreak, breakStartTime: existingBreak ? new Date(existingBreak.startTime).getTime() : null }));
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem('tys_hrms_session');
    setSession(defaultSession);
  };

  const createUser = async (data: Omit<User, 'id' | 'createdAt' | 'isActive' | 'tenantId'>) => {
    if (!session.tenant) return false;
    const newUser: User = { ...data, id: generateId(), tenantId: session.tenant.id, isActive: true, createdAt: new Date().toISOString() };
    setUsers(prev => [...prev, newUser]);
    if (settings.mongodb.isEnabled) {
      setIsSyncing(true);
      try { await db.users.insert(newUser as any); } finally { setIsSyncing(false); }
    }
    return true;
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    const user = users.find(u => u.id === id);
    if (user && settings.mongodb.isEnabled) {
      setIsSyncing(true);
      try { await db.users.update({ id }, { ...user, ...updates } as any); } finally { setIsSyncing(false); }
    }
  };

  const deleteUser = async (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    if (settings.mongodb.isEnabled) {
      setIsSyncing(true);
      try { await db.users.delete({ id }); } finally { setIsSyncing(false); }
    }
  };

  const clockIn = async (latLng?: string, method: AttendanceLog['method'] = 'manual') => {
    if (!session.currentUser || !session.tenant || session.isClockedIn) return;
    const log: AttendanceLog = { id: generateId(), tenantId: session.tenant.id, userId: session.currentUser.id, date: new Date().toISOString().split('T')[0], clockIn: new Date().toISOString(), latLngIn: latLng, method, status: 'present' };
    setAttendanceLogs(prev => [...prev, log]);
    setSession(prev => ({ ...prev, attendanceLog: log, isClockedIn: true }));
    if (settings.mongodb.isEnabled) {
      setIsSyncing(true);
      try { await db.attendance.insert(log as any); } finally { setIsSyncing(false); }
    }
  };

  const clockOut = async (latLng?: string) => {
    if (!session.currentUser || !session.isClockedIn || !session.attendanceLog) return;
    const now = new Date();
    const duration = Math.round((now.getTime() - new Date(session.attendanceLog.clockIn!).getTime()) / 60000);
    const updated: AttendanceLog = { ...session.attendanceLog, clockOut: now.toISOString(), latLngOut: latLng, totalMinutes: duration };
    setAttendanceLogs(prev => prev.map(l => l.id === updated.id ? updated : l));
    setSession(prev => ({ ...prev, attendanceLog: updated, isClockedIn: false, isOnBreak: false, activeBreak: null, breakStartTime: null }));
    if (settings.mongodb.isEnabled) {
      setIsSyncing(true);
      try { await db.attendance.update({ id: updated.id }, updated as any); } finally { setIsSyncing(false); }
    }
  };

  const startBreak = () => {
    if (!session.attendanceLog || session.isOnBreak) return;
    const b: BreakLog = { id: generateId(), attendanceLogId: session.attendanceLog.id, startTime: new Date().toISOString() };
    setBreakLogs(prev => [...prev, b]);
    setSession(prev => ({ ...prev, activeBreak: b, isOnBreak: true, breakStartTime: Date.now() }));
  };

  const endBreak = () => {
    if (!session.activeBreak || !session.isOnBreak) return;
    const ended = { ...session.activeBreak, endTime: new Date().toISOString() };
    setBreakLogs(prev => prev.map(b => b.id === ended.id ? ended : b));
    setSession(prev => ({ ...prev, activeBreak: null, isOnBreak: false, breakStartTime: null }));
  };

  const getTodayAttendance = (userId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return attendanceLogs.find(l => l.userId === userId && l.date === today);
  };

  const getAllTodayAttendance = () => {
    const today = new Date().toISOString().split('T')[0];
    return attendanceLogs.filter(l => l.date === today);
  };

  const setGeofenceBypass = (userId: string, hours: number) => {
    const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    updateUser(userId, { geofenceBypassUntil: until });
  };

  const registerBiometrics = async () => ({ success: false, error: 'WebAuthn needs tenant-aware proxy.' });

  const migrateLocalToCloud = async () => {
    if (!settings.mongodb.isEnabled || !session.tenant) return { success: false, count: 0 };
    return { success: true, count: 0 };
  };

  return (
    <AuthContext.Provider value={{
      users, session, attendanceLogs, breakLogs, unreadCount, isFirstRun: false, isLoading, isSyncing, lastSyncedAt,
      discoverTenant, unifiedLogin, registerTenant, loginAdmin, loginStaff, logout,
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
