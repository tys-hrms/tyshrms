import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AttendanceLog, BreakLog, UserRole, Notification, Tenant, BrandingSettings } from '../types';
import { db } from '../lib/database';
import { useSettings } from './SettingsContext';

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function generateTenantId(): string {
  const yearSuffix = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `${yearSuffix}-${random}`;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
}

interface SessionState {
  currentUser: User | null;
  tenant: Tenant | null;
  attendance_log: AttendanceLog | null;
  active_break: BreakLog | null;
  is_clocked_in: boolean;
  is_on_break: boolean;
  break_start_time: number | null;
}

interface AuthContextType {
  users: User[];
  session: SessionState;
  attendanceLogs: AttendanceLog[];
  breakLogs: BreakLog[];
  unread_count: number;
  is_first_run: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: number;
  discoverTenant: (tenantId: string) => Promise<{ success: boolean; tenant?: Tenant; error?: string }>;
  unifiedLogin: (tenantId: string, identifier: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  registerTenant: (data: any) => Promise<{ success: boolean; tenantId?: string; error?: string }>;
  logout: () => void;
  createUser: (data: Omit<User, 'id' | 'created_at' | 'is_active' | 'tenant_id'>) => Promise<boolean>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  clockIn: (latLng?: string, method?: AttendanceLog['method']) => Promise<void>;
  clockOut: (latLng?: string) => Promise<void>;
  startBreak: () => void;
  endBreak: () => void;
  getTodayAttendance: (userId: string) => AttendanceLog | undefined;
  getAllTodayAttendance: () => AttendanceLog[];
  setGeofenceBypass: (userId: string, hours: number) => void;
  registerBiometrics: (userId: string) => Promise<{ success: boolean; error?: string }>;
  migrateLocalToCloud: () => Promise<{ success: boolean; count: number }>;
}

const defaultSession: SessionState = {
  currentUser: null,
  tenant: null,
  attendance_log: null,
  active_break: null,
  is_clocked_in: false,
  is_on_break: false,
  break_start_time: null,
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
  const { updateSettings } = useSettings();
  const [unread_count] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(Date.now());

  useEffect(() => {
    try {
      localStorage.setItem('tys_hrms_session', JSON.stringify(session));
    } catch { /* ignore */ }
  }, [session]);

  const pollAuthData = async () => {
    if (!session.tenant) return;
    try {
      const [cUsers, cAttendance, cBreaks] = await Promise.all([
        db.tenants.findUsers(session.tenant.id),
        db.tenants.findAttendance(session.tenant.id),
        db.tenants.findBreaks(session.tenant.id)
      ]);
      if (cUsers) setUsers(cUsers);
      if (cAttendance) setAttendanceLogs(cAttendance);
      if (cBreaks) setBreakLogs(cBreaks);
      setLastSyncedAt(Date.now());
    } catch (e) {
      console.warn('[Heartbeat] Sync failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!session.tenant) { setIsLoading(false); return; }
    pollAuthData();
    const intervalId = setInterval(pollAuthData, 3000); 
    return () => clearInterval(intervalId);
  }, [session.tenant]);

  const discoverTenant = async (identifier: string) => {
    try {
      const tenant = await db.tenants.findOne({ id: identifier });
      if (!tenant) return { success: false, error: 'Organization not found' };
      setSession(prev => ({ ...prev, tenant }));
      return { success: true, tenant };
    } catch (err: any) {
      return { success: false, error: err.message || 'Discovery failed' };
    }
  };

  const unifiedLogin = async (tenantId: string, identifier: string, pin: string) => {
    try {
      let tenant = session.tenant;
      if (!tenant || tenant.id !== tenantId) {
        const res = await discoverTenant(tenantId);
        if (!res.success) return { success: false, error: res.error };
        tenant = res.tenant!;
      }
      const user = await db.users.findOne({ tenant_id: tenantId, pin_code: pin });
      if (!user) return { success: false, error: 'Invalid PIN' };
      if (user.username !== identifier && user.name !== identifier && user.email !== identifier) {
         return { success: false, error: 'Identifier mismatch' };
      }
      setSession(prev => ({ ...prev, currentUser: user }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const registerTenant = async (data: any) => {
    try {
      let id = generateTenantId();
      const tenant: any = { 
        id, 
        name: data.name,
        admin_name: data.admin_name,
        email: data.email,
        phone: data.phone,
        state: data.state,
        company_type: data.company_type,
        employee_count: data.employee_count,
        base_lat: data.base_lat,
        base_lng: data.base_lng,
        shift_start_time: data.shift_start_time,
        grace_period_mins: data.grace_period_mins,
        company_slug: slugify(data.name),
        is_active: true, 
        created_at: new Date().toISOString() 
      };
      await db.tenants.insert(tenant);
      const admin: User = { 
        id: generateId(), 
        tenant_id: id, 
        name: data.admin_name, 
        username: data.username,
        pin_code: data.pin_code, 
        role: 'Admin', 
        email: data.email, 
        phone: data.phone, 
        is_active: true, 
        created_at: new Date().toISOString() 
      };
      await db.users.insert(admin);
      return { success: true, tenantId: id };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('tys_hrms_session');
    setSession(defaultSession);
  };

  const createUser = async (data: any) => {
    if (!session.tenant) return false;
    const newUser: User = { ...data, id: generateId(), tenant_id: session.tenant.id, is_active: true, created_at: new Date().toISOString() };
    await db.users.insert(newUser);
    return true;
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    await db.users.update({ id }, updates);
  };

  const deleteUser = async (id: string) => {
    await db.users.delete({ id });
  };

  const clockIn = async (latLng?: string, method: AttendanceLog['method'] = 'manual') => {
    if (!session.currentUser || !session.tenant || session.is_clocked_in) return;
    const log: AttendanceLog = { 
      id: generateId(), 
      tenant_id: session.tenant.id, 
      user_id: session.currentUser.id, 
      date: new Date().toISOString().split('T')[0], 
      clock_in: new Date().toISOString(), 
      lat_lng_in: latLng, 
      method, 
      status: 'present' 
    };
    await db.attendance.insert(log);
    setSession(prev => ({ ...prev, attendance_log: log, is_clocked_in: true }));
  };

  const clockOut = async (latLng?: string) => {
    if (!session.currentUser || !session.is_clocked_in || !session.attendance_log) return;
    const now = new Date();
    const duration = Math.round((now.getTime() - new Date(session.attendance_log.clock_in!).getTime()) / 60000);
    const updated: Partial<AttendanceLog> = { clock_out: now.toISOString(), lat_lng_out: latLng, total_minutes: duration };
    await db.attendance.update({ id: session.attendance_log.id }, updated);
    setSession(prev => ({ ...prev, attendance_log: null, is_clocked_in: false, is_on_break: false }));
  };

  const startBreak = () => {};
  const endBreak = () => {};

  const getTodayAttendance = (userId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return attendanceLogs.find(l => l.user_id === userId && l.date === today);
  };

  const getAllTodayAttendance = () => {
    const today = new Date().toISOString().split('T')[0];
    return attendanceLogs.filter(l => l.date === today);
  };

  const setGeofenceBypass = (userId: string, hours: number) => {
    const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    updateUser(userId, { geofence_bypass_until: until });
  };

  const registerBiometrics = async (userId: string) => {
    return { success: false, error: 'Biometric hardware not detected' };
  };

  const migrateLocalToCloud = async () => {
    if (!session.tenant) return { success: false, count: 0 };
    const count = await db.sync.fromLocal(session.tenant.id);
    return { success: true, count };
  };

  return (
    <AuthContext.Provider value={{
      users, session, attendanceLogs, breakLogs, unread_count, is_first_run: false, isLoading, isSyncing, lastSyncedAt,
      discoverTenant, unifiedLogin, registerTenant, logout,
      createUser, updateUser, deleteUser, clockIn, clockOut, startBreak, endBreak,
      getTodayAttendance, getAllTodayAttendance, setGeofenceBypass, registerBiometrics, migrateLocalToCloud
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
