// HRMSCore V2 — Core TypeScript Types (Supabase Optimized)

// ─── Tenant & SaaS ─────────────────────────────────────────────────────────

export interface Tenant {
  id: string; // 6-digit random number (e.g., "24-1234")
  name: string;
  admin_name?: string;
  dob?: string;
  company_type: string;
  employee_count: string;
  email: string;
  phone: string;
  companySlug?: string;
  gst?: string;
  isActive: boolean;
  
  state: string;
  payrollSettings?: {
    epfEnabled: boolean;
    esiEnabled: boolean;
    ptEnabled: boolean;
    gratuityEnabled: boolean;
    holidayList: {
      date: string;
      label: string;
      isWorking: boolean; 
    }[];
    weekends?: number[];
  };
  
  created_at: string;

  base_lat?: number;
  base_lng?: number;
  shift_start_time?: string;
  grace_period_mins?: number;
}

// ─── User & Auth ───────────────────────────────────────────────────────────

export type UserRole = string;

export interface Shift {
  id: string;
  tenant_id: string;
  name: string;
  startTime: string; 
  endTime: string;
  lunchStart: string;
  lunchEnd: string;
  created_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  name: string;
  username?: string;
  pin_code: string;
  role: UserRole;
  salaryDetails?: {
    basicSalary: number;
    allowances: number;
    epfEnabled: boolean;
  };
  email?: string;
  phone?: string;
  shiftId?: string;
  isActive: boolean;
  geofenceBypassUntil?: string;
  created_at: string;
}

// ─── Tasks ─────────────────────────────────────────────────────────────────

export type TaskType = 'Ironing' | 'Checking' | 'Labeling' | 'Packing' | string;
export type TaskMode = 'single' | 'jodi';

// ─── Products ──────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  tenant_id: string;
  sku: string;
  title: string;
  barcode?: string;
  image_url?: string;
  unit: string;
  inventory?: number;
  created_at: string;
}

// ─── Assignments ───────────────────────────────────────────────────────────

export type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'paused';

export interface Assignment {
  id: string;
  tenant_id: string;
  date: string;
  userId: string;
  user_id: string; // SQL Mapping
  sku: string;
  task_type: string;
  mode: TaskMode;
  pieces_assigned: number;
  pieces_carried_forward: number;
  pieces_completed: number;
  status: AssignmentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ─── Work Logs ─────────────────────────────────────────────────────────────

export interface WorkLog {
  id: string;
  tenant_id: string;
  assignment_id: string;
  user_id: string;
  date: string;
  pieces_ironed: number;
  pieces_checked: number;
  pieces_labeled: number;
  pieces_packed: number;
  pieces_rejected: number;
  reject_reason?: string;
  logged_at: string;
}

// ─── Attendance ────────────────────────────────────────────────────────────

export type AttendanceMethod = 'manual' | 'auto';

export interface AttendanceLog {
  id: string;
  tenant_id: string;
  user_id: string;
  date: string;
  clock_in?: string;
  clock_out?: string;
  lat_lng_in?: string;
  lat_lng_out?: string;
  method: AttendanceMethod;
  total_minutes?: number;
  status: 'present' | 'absent' | 'on_leave' | 'half_day' | 'holiday';
}

export interface BreakLog {
  id: string;
  attendanceLogId: string;
  startTime: string;
  endTime?: string;
}

// ─── Settings ──────────────────────────────────────────────────────────────

export interface BrandingSettings {
  companyName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  themeMode: 'dark' | 'light';
}

export interface AppSettings {
  tenantId: string;
  branding: BrandingSettings;
  state: string;
}
