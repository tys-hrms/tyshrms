export type UserRole = string;
export type TaskType = string;
export type TaskMode = 'single' | 'jodi';
export type LeaveType = 'casual' | 'sick' | 'annual' | 'medical' | 'unpaid';
export type LeaveStatus = 'pending' | 'pending_manager' | 'pending_admin' | 'approved' | 'rejected';
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'half_day' | 'holiday';
export type AppModule = 'dashboard' | 'users' | 'products' | 'assignments' | 'attendance' | 'leaves' | 'settings' | 'rbac' | 'reports' | 'crm' | 'payroll';
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';
export type PermissionScope = 'global' | 'location' | 'own' | 'none';
export type LocationType = 'branch' | 'store' | 'warehouse' | 'head_office' | 'other';

export interface User {
  id: string;
  tenant_id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  pin_code: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  salary_structure?: SalaryStructure;
  geofence_bypass_until?: string;
  biometric_credentials?: any[];
  location_id?: string;
  bank_name?: string;
  account_no?: string;
  ifsc_code?: string;
}

export interface Tenant {
  id: string;
  name: string;
  admin_name: string;
  email: string;
  phone: string;
  state: string;
  company_type: string;
  employee_count: string;
  company_slug: string;
  is_active: boolean;
  created_at: string;
  base_lat?: number;
  base_lng?: number;
  shift_start_time?: string;
  grace_period_mins?: number;
  dob?: string;
  gst?: string;
}

export interface AttendanceLog {
  id: string;
  tenant_id: string;
  user_id: string;
  date: string;
  clock_in: string;
  clock_out?: string;
  lat_lng_in?: string;
  lat_lng_out?: string;
  total_minutes?: number;
  status: AttendanceStatus;
  method: 'manual' | 'face' | 'qr' | 'biometric';
}

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  address?: string;
  is_primary: boolean;
  latitude: number;
  longitude: number;
  geofence_radius: number;
}

export interface Workstation {
  id: string;
  name: string;
  task_types: string[];
  type: string;
  location_id?: string;
  is_active: boolean;
}

export interface BreakLog {
  id: string;
  attendance_log_id: string;
  start_time: string;
  end_time?: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  min_stock: number;
  created_at: string;
  is_synced?: boolean;
}

export interface Assignment {
  id: string;
  tenant_id: string;
  user_id: string;
  sku: string;
  task_type: TaskType;
  mode: TaskMode;
  pieces_assigned: number;
  target_qty: number;
  pieces_completed: number;
  pieces_carried_forward?: number;
  status: 'pending' | 'in_progress' | 'completed';
  date: string;
  due_date?: string;
  table?: string;
  assigned_by: string;
  created_at: string;
  updated_at: string;
  notes?: string;
}

export interface WorkLog {
  id: string;
  tenant_id: string;
  user_id: string;
  assignment_id: string;
  date: string;
  pieces_ironed: number;
  pieces_checked: number;
  pieces_labeled: number;
  pieces_packed: number;
  pieces_rejected: number;
  reject_reason?: string;
  logged_at: string;
}

export interface LeaveLog {
  id: string;
  tenant_id: string;
  user_id: string;
  date: string;
  end_date?: string;
  total_days: number;
  type: LeaveType;
  reason: string;
  status: LeaveStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  medical_certificate_url?: string;
}

export interface Shift {
  id: string;
  tenant_id: string;
  name: string;
  start_time: string;
  end_time: string;
  lunch_start?: string;
  lunch_end?: string;
  created_at: string;
}

export interface PayrollSettings {
  epf_enabled: boolean;
  epf_rate: number;
  esi_enabled: boolean;
  esi_rate: number;
  pt_enabled: boolean;
  pt_threshold: number;
  pt_amount: number;
  ot_multiplier: number;
  gratuity_enabled: boolean;
  gst_number?: string;
  pan_number?: string;
  holiday_list: { date: string; label: string; isWorking: boolean }[];
  weekends: number[];
}

export interface SalaryStructure {
  basic: number;
  hra: number;
  other_allowances: number;
  is_epf_member: boolean;
  is_esi_member: boolean;
  is_pt_member: boolean;
}

export interface LeaveAutomationSettings {
  enabled: boolean;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  whatsapp_template: string;
  email_template: string;
}

export interface ShopifySettings {
  store_url: string;
  access_token: string;
  api_version: string;
  sync_enabled: boolean;
}

export interface BrandingSettings {
  company_name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  theme_mode: 'light' | 'dark';
}

export interface AppSettings {
  tenant_id: string;
  shopify: ShopifySettings;
  leave_automation: LeaveAutomationSettings;
  branding: BrandingSettings;
  workstations: any[];
  locations: any[];
  state: string;
  payroll_settings: PayrollSettings;
  openai_key?: string;
}

export interface TaskDefinition {
  id: string;
  name: string;
  allowed_modes: TaskMode[];
  default_mode: TaskMode;
  created_at: string;
}

export interface AssignmentCarryForward {
  id: string;
  assignment_id: string;
  from_date: string;
  to_date: string;
  pieces: number;
}

export interface DefectReason {
  id: string;
  label: string;
}

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  sender_id?: string;
  title: string;
  message: string;
  type: 'info' | 'alert' | 'success';
  read: boolean;
  created_at: string;
}

export interface DailyStats {
  date: string;
  total_pieces_assigned: number;
  total_pieces_completed: number;
  total_pieces_pending: number;
  total_ironed: number;
  total_checked: number;
  total_labeled: number;
  total_packed: number;
  total_rejected: number;
  active_workers: number;
  present_today: number;
  on_leave: number;
  completed_assignments: number;
  pending_assignments: number;
}

export interface InboundShipment {
  id: string;
  tenant_id: string;
  sku: string;
  quantity: number;
  received_at: string;
}

export interface DispatchBatch {
  id: string;
  tenant_id: string;
  skus: { sku: string; quantity: number }[];
  packed_at: string;
  status: 'pending' | 'shipped';
}

export interface SalaryRecord {
  id: string;
  tenant_id: string;
  user_id: string;
  month: string;
  working_days: number;
  gross_pay: number;
  epf_deduction: number;
  esi_deduction: number;
  pt_deduction: number;
  net_pay: number;
  status: 'pending' | 'draft' | 'processed' | 'paid';
  created_at: string;
}

// CRM TYPES
export type CRMLeadSource = 'whatsapp' | 'instagram' | 'facebook' | 'linkedin' | 'youtube' | 'word_of_mouth' | 'manual' | 'other';
export type CRMLeadStage = 'lead_in' | 'qualification' | 'negotiation' | 'fulfillment' | 'won' | 'lost';
export type CRMLeadPriority = 'low' | 'medium' | 'high';

export interface CRMOrderItem {
  sku: string;
  quantity: number;
  base_price: number;
  discount_percent: number;
  gst_percent: number;
  total: number;
}

export interface CRMLead {
  id: string;
  tenant_id: string;
  ticket_number: string;
  customer_name: string;
  company_name?: string;
  email?: string;
  phone: string;
  source_notes?: string;
  gst_number?: string;
  source: CRMLeadSource;
  stage: CRMLeadStage;
  status: 'active' | 'won' | 'lost';
  priority: CRMLeadPriority;
  items: CRMOrderItem[];
  transportation_charges: number;
  total_value: number;
  currency: string;
  is_gst_compliant: boolean;
  business_type: string;
  lead_temperature: 'Cold' | 'Warm' | 'Hot';
  expected_timeline: string;
  client_category: 'B2B' | 'B2C' | 'Wholesale';
  lead_brief?: string;
  primary_rep_id?: string;
  tagged_rep_ids: string[];
  assigned_manager_id?: string;
  is_breached: boolean;
  sla_breach_at: string;
  interactions?: CRMInteraction[];
  last_contacted_at?: string;
  next_follow_up_at?: string;
  converted_order_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CRMInteraction {
  id: string;
  type: 'call' | 'whatsapp' | 'email' | 'meeting' | 'note';
  note: string;
  created_by: string;
  created_at: string;
}

export interface CRMOrder {
  id: string;
  tenant_id: string;
  ticket_number: string;
  lead_id: string;
  customer_id: string;
  items: CRMOrderItem[];
  total_value: number;
  fulfillment_status: 'ordered' | 'processed' | 'shipped' | 'delivered';
  created_at: string;
}

export interface CRMSettings {
  tenant_id: string;
  ticket_prefix: string;
  enable_smart_assignment: boolean;
  sla_config: Record<string, number>;
  stages: any[];
  badges: any[];
  escalation_user_ids: string[];
}

// RBAC TYPES
export interface RolePermission {
  role: UserRole;
  module: AppModule;
  view_scope: PermissionScope;
  create_scope: PermissionScope;
  edit_scope: PermissionScope;
  delete_scope: PermissionScope;
  features?: {
    biometric_allowed?: boolean;
    system_print_allowed?: boolean;
    ai_assistant_allowed?: boolean;
    calculator_allowed?: boolean;
  };
}
