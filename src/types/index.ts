// HRMSCore V2 — Core TypeScript Types

// ─── Tenant & SaaS ─────────────────────────────────────────────────────────

export interface Tenant {
  id: string; // 6-digit random number (e.g., "827192")
  name: string;
  adminName: string;
  dob: string;
  companyType: string;
  employeeCount: string;
  email: string;
  phone: string;
  companySlug?: string; // e.g. "acme-corp"
  gst?: string;
  isActive: boolean;
  
  // Regional & Payroll Compliance (V9)
  state: string;           // Indian State (e.g. "Maharashtra", "Karnataka")
  payrollSettings: {
    epfEnabled: boolean;
    esiEnabled: boolean;
    ptEnabled: boolean;
    gratuityEnabled: boolean;
    holidayList: {
      date: string;
      label: string;
      isWorking: boolean; 
    }[];
    weekends?: number[]; // [0, 6] for Sat/Sun
  };
  
  createdAt: string;
}

// ─── User & Auth ───────────────────────────────────────────────────────────

export type UserRole = string; // E.g., 'Admin', 'Manager', 'Worker', or custom types

export interface Shift {
  id: string;
  tenantId?: string;
  name: string;
  startTime: string;    // "HH:MM"
  endTime: string;
  lunchStart: string;
  lunchEnd: string;
  createdAt: string;
}

export interface BiometricCredential {
  id: string;
  publicKey: string;
  transports?: string[];
  createdAt: string;
}

export interface User {
  id: string;
  tenantId?: string;
  name: string;
  pinCode: string;
  role: UserRole;
  salaryDetails?: {
    basicSalary: number;
    allowances: number;
    epfEnabled: boolean;
  };
  email?: string;
  phone?: string;
  contactNumber?: string;
  shiftId?: string;
  locationId?: string;
  assignedTasks?: TaskType[];   // for Worker
  isActive: boolean;
  biometricCredentials?: BiometricCredential[];
  geofenceBypassUntil?: string; // ISO Date String for temporary bypass
  createdAt: string;
  leaveBalances?: {
    casual: number;
    sick: number;
    annual: number;
  };
  salaryStructure?: {
    basic: number;
    hra: number;
    otherAllowances: number;
    isEpfMember: boolean;
    isEsiMember: boolean;
    isPtMember: boolean;
    gratuityEnabled: boolean;
  };
}


// ─── RBAC ──────────────────────────────────────────────────────────────────

export type AppModule =
  | 'dashboard'
  | 'users'
  | 'products'
  | 'assignments'
  | 'attendance'
  | 'leaves'
  | 'settings'
  | 'rbac'
  | 'reports'
  | 'crm'
  | 'payroll';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';
export type PermissionScope = 'none' | 'location' | 'global';

export interface RolePermission {
  role: UserRole;
  module: AppModule;
  viewScope: PermissionScope;
  createScope: PermissionScope;
  editScope: PermissionScope;
  deleteScope: PermissionScope;
  features?: {
    biometricAllowed?: boolean;
    systemPrintAllowed?: boolean;
    aiAssistantAllowed?: boolean;
    calculatorAllowed?: boolean;
  };
}

// ─── Tasks ─────────────────────────────────────────────────────────────────

export type TaskType = 'Ironing' | 'Checking' | 'Labeling' | 'Packing' | string;
export type TaskMode = 'single' | 'jodi';

export interface TaskDefinition {
  id: string;
  tenantId?: string;
  name: TaskType;
  allowedModes: TaskMode[];  // Ironing/Checking: both; Labeling/Packing: ['single']
  defaultMode: TaskMode;
  icon?: string;
  createdAt: string;
}

// ─── Products ──────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  tenantId?: string;
  sku: string;
  title: string;
  barcode?: string;
  imageUrl?: string;
  unit: string;
  inventory?: number;      // Current stock level (Pieces)
  shopifyProductId?: string;
  shopifyVariantId?: string;
  syncedAt?: string;
  mongoSynced?: boolean;   // true when confirmed pushed to / fetched from MongoDB
  createdAt: string;
}

// ─── Assignments ───────────────────────────────────────────────────────────

export type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'paused';

export interface Assignment {
  id: string;
  tenantId?: string;
  date: string;                    // "YYYY-MM-DD"
  dueDate?: string;
  userId: string;
  sku: string;
  taskType: TaskType;
  mode: TaskMode;
  piecesAssigned: number;          // original assignment
  targetQty: number;               // Alias used by some modules
  piecesCarriedForward: number;    // added from previous days
  piecesCompleted: number;         // cumulative done so far
  status: AssignmentStatus;
  table?: string;                  // Table assigned to the task
  assignedBy: string;              // userId of assigner
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CRMInteraction {
  id: string;
  type: 'call' | 'whatsapp' | 'email' | 'note' | 'meeting';
  note: string;
  createdBy: string;
  createdAt: string;
}

// pending balance = piecesAssigned + piecesCarriedForward - piecesCompleted

// ─── Work Logs ─────────────────────────────────────────────────────────────

export interface AssignmentCarryForward {
  id: string;
  originalAssignmentId: string;
  date: string;
  piecesRemaining: number;
}

export interface WorkLog {
  id: string;
  tenantId?: string;
  assignmentId: string;
  userId: string;
  date: string;
  action?: 'pass' | 'reject';      // Used by Checker
  piecesProcessed?: number;        // Used by Checker
  piecesIroned: number;
  piecesChecked: number;
  piecesLabeled: number;
  piecesPacked: number;
  piecesRejected: number;
  rejectReason?: string;
  barcodeScanned?: string;
  notes?: string;
  loggedAt: string;
}

export interface DefectReason {
  id: string;
  tenantId?: string;
  label: string;
}


// ─── Attendance ────────────────────────────────────────────────────────────

export type AttendanceMethod = 'manual' | 'auto';

export interface AttendanceLog {
  id: string;
  tenantId?: string;
  userId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  latLngIn?: string;
  latLngOut?: string;
  method: AttendanceMethod;
  totalMinutes?: number;
  status: 'present' | 'absent' | 'on_leave' | 'half_day' | 'holiday';
}

export interface SalaryRecord {
  id: string;
  tenantId: string;
  userId: string;
  month: string; // YYYY-MM
  workingDays: number;
  grossPay: number;
  epfDeduction: number;
  esiDeduction: number;
  ptDeduction: number;
  otherDeductions: number;
  netPay: number;
  status: 'draft' | 'processed' | 'paid';
  createdAt: string;
  processedAt?: string;
  paidAt?: string;
}

export interface BreakLog {
  id: string;
  attendanceLogId: string;
  startTime: string;
  endTime?: string;
}

// ─── Leave Management ──────────────────────────────────────────────────────

export type LeaveType = 'casual' | 'sick' | 'annual' | 'unpaid' | 'medical';
export type LeaveStatus = 'pending_manager' | 'pending_admin' | 'approved' | 'rejected' | 'cancelled' | 'pending';

export interface LeaveLog {
  id: string;
  tenantId?: string;
  userId: string;
  date: string; // Start Date
  endDate?: string;
  totalDays: number;
  type: LeaveType;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: string;     // Final Approval (Admin/Manager)
  reviewedAt?: string;
  managerApprovedBy?: string; // Step 1 of Hierarchy
  medicalCertificateUrl?: string; // V9 Upload Feature
}

// ─── Shipments & Dispatch ──────────────────────────────────────────────────

export interface InboundShipment {
  id: string;
  tenantId?: string;
  receiverId: string;
  sku: string;
  quantity: number;
  supplierName?: string;
  poNumber?: string;
  notes?: string;
  receivedAt: string;
}

export interface DispatchBatch {
  id: string;
  tenantId?: string;
  packerId: string;
  sku?: string;
  labelScanned?: string;
  quantity: number;
  status: 'ready' | 'dispatched';
  packedAt: string;
  dispatchedAt?: string;
}

// ─── Settings ──────────────────────────────────────────────────────────────

export interface ShopifySettings {
  storeUrl: string;
  accessToken: string;
  apiVersion: string;
  syncEnabled: boolean;
  lastSyncedAt?: string;
}


export interface MongoSettings {
  appId: string;
  apiKey: string;
  dataSource: string;
  database: string;
  isEnabled: boolean;
}

export interface LeaveAutomationSettings {
  enabled: boolean;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  whatsappTemplate: string;
  emailTemplate: string;
}

export interface Workstation {
  id: string;
  tenantId?: string;
  name: string;      // e.g. "Table 1"
  taskTypes: string[]; // e.g. ["Checking", "Ironing"]
}

export type LocationType = 'head_office' | 'branch' | 'warehouse';

export interface Location {
  id: string;
  tenantId?: string;
  name: string;
  type: LocationType;
  address?: string;
  latitude?: number;
  longitude?: number;
  geofenceRadius?: number; // in meters, default 50
  isPrimary?: boolean;
}

export interface BrandingSettings {
  companyName: string;
  logoUrl?: string;
  primaryColor: string;    // e.g., "#2d7cf6"
  secondaryColor: string;  // e.g., "#14b8a6"
  accentColor: string;     // e.g., "#f59e0b"
  themeMode: 'dark' | 'light';
}

export interface AppSettings {
  tenantId: string;
  shopify: ShopifySettings;
  mongodb: MongoSettings;
  leaveAutomation: LeaveAutomationSettings;
  workstations: Workstation[];
  locations: Location[];
  branding: BrandingSettings;
  
  // Regional & Payroll (V9)
  state: string;
  payrollSettings: {
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
  // AI Configuration (cloud-stored, not localStorage)
  openAiKey?: string;
}


// ─── Notifications ─────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  tenantId?: string;
  userId: string;      // recipient
  senderId?: string;   // who triggered it
  title: string;
  message: string;
  type: 'assignment' | 'leave' | 'system' | 'alert' | 'crm_lead' | 'crm_breach' | 'success';
  read: boolean;
  ticketId?: string; // Link to CRM Ticket if applicable
  createdAt: string;
}

// ─── Dashboard Stats ───────────────────────────────────────────────────────

export interface DailyStats {
  date: string;
  totalPiecesAssigned: number;
  totalPiecesCompleted: number;
  totalPiecesPending: number;
  totalIroned: number;
  totalChecked: number;
  totalLabeled: number;
  totalPacked: number;
  totalRejected: number;
  activeWorkers: number;
  presentToday: number;
  onLeave: number;
  completedAssignments: number;
  pendingAssignments: number;
}

// ─── CRM & Lead Management ────────────────────────────────────────────────
 
export type CRMLeadSource = 
  | 'whatsapp' 
  | 'instagram' 
  | 'facebook' 
  | 'linkedin' 
  | 'youtube' 
  | 'word_of_mouth' 
  | 'other' 
  | 'manual';

export interface CRMOrderItem {
  sku: string;
  quantity: number;
  basePrice: number;
  discountPercent: number; // Applied per-line
  gstPercent: number;      // 0, 5, 12, 18
  total: number;
}

export type CRMLeadStage = string; // e.g. "Lead In", "Negotiation", "Fulfillment"

export interface CRMLead {
  id: string;              // Internal ID
  ticketNumber: string;    // TKT-YYYY-DDMM-XXXXXX
  tenantId: string;
  source: CRMLeadSource;
  sourceNotes?: string;    // For "other" or manual details
  
  // Qualification (V8/V10)
  businessType: string;
  leadTemperature: 'Cold' | 'Warm' | 'Hot';
  expectedTimeline: string;
  clientCategory: 'B2B' | 'B2C';
  leadBrief?: string;
  
  // Contact Info
  customerName: string;
  companyName?: string;
  phone: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  isGstCompliant: boolean;

  // Assignment & Hierarchy
  primaryRepId?: string;   // Clocked-in Rep
  taggedRepIds: string[];  // Multiple collaborative reps
  assignedManagerId?: string; // Failsafe redirection
  // Engagement
  stage: CRMLeadStage;
  status: 'active' | 'won' | 'lost' | 'archived';
  priority: 'low' | 'medium' | 'high';
  interactions?: CRMInteraction[];

  // Financials
  items: CRMOrderItem[];
  transportationCharges: number;
  totalValue: number;
  currency: string;        // Default "INR"
  
  // SLA & Timers
  createdAt: string;
  updatedAt: string;
  slaBreachAt: string;     // ISO String calculation based on settings
  isBreached: boolean;

  // Conversion
  convertedOrderId?: string;
  
  // Metadata
  lastContactedAt?: string;
  nextFollowUpAt?: string;
}

export type OrderFulfillmentStatus = 
  | 'ordered' 
  | 'fulfilled' 
  | 'dispatched' 
  | 'delivered';

export interface CRMOrder {
  id: string;
  ticketNumber: string;
  tenantId: string;
  leadId: string;
  customerId: string;
  items: CRMOrderItem[];
  totalValue: number;
  fulfillmentStatus: OrderFulfillmentStatus;
  trackingNumber?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface CRMSettings {
  tenantId: string;
  ticketPrefix: string;    // e.g. "TKT"
  enableSmartAssignment: boolean;
  
  // SLA Timers in minutes
  slaConfig: {
    whatsapp: number;
    instagram: number;
    facebook: number;
    linkedin: number;
    youtube: number;
    word_of_mouth: number;
    manual: number;
    other: number;
  };
  
  // Pipeline Workflow
  stages: {
    id: string;
    label: string;
    color: string;
    order: number;
  }[];
  
  badges: {
    label: string;
    color: string;
  }[];

  // Escalation Matrix
  escalationUserIds?: string[];
}
