// TYS-HRMS V2 — Core TypeScript Types

// ─── User & Auth ───────────────────────────────────────────────────────────

export type UserRole = 'Admin' | 'Manager' | 'Worker';

export interface Shift {
  id: string;
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
  name: string;
  pinCode: string;
  role: UserRole;
  email?: string;
  phone?: string;
  contactNumber?: string;
  shiftId?: string;
  locationId?: string;
  assignedTasks?: TaskType[];   // for Worker
  isActive: boolean;
  biometricCredentials?: BiometricCredential[];
  createdAt: string;
  leaveBalances?: {
    casual: number;
    sick: number;
    annual: number;
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
  | 'reports';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';
export type PermissionScope = 'none' | 'location' | 'global';

export interface RolePermission {
  role: UserRole;
  module: AppModule;
  viewScope: PermissionScope;
  createScope: PermissionScope;
  editScope: PermissionScope;
  deleteScope: PermissionScope;
}

// ─── Tasks ─────────────────────────────────────────────────────────────────

export type TaskType = 'Ironing' | 'Checking' | 'Labeling' | 'Packing' | string;
export type TaskMode = 'single' | 'jodi';

export interface TaskDefinition {
  id: string;
  name: TaskType;
  allowedModes: TaskMode[];  // Ironing/Checking: both; Labeling/Packing: ['single']
  defaultMode: TaskMode;
  icon?: string;
  createdAt: string;
}

// ─── Products ──────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  sku: string;
  title: string;
  barcode?: string;
  imageUrl?: string;
  unit: string;
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
  label: string;
}


// ─── Attendance ────────────────────────────────────────────────────────────

export type AttendanceMethod = 'manual' | 'geofence' | 'auto';

export interface AttendanceLog {
  id: string;
  userId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  latLngIn?: string;
  latLngOut?: string;
  method: AttendanceMethod;
  totalMinutes?: number;
  status: 'present' | 'absent' | 'on_leave' | 'half_day';
}

export interface BreakLog {
  id: string;
  attendanceLogId: string;
  startTime: string;
  endTime?: string;
}

// ─── Leave Management ──────────────────────────────────────────────────────

export type LeaveType = 'casual' | 'sick' | 'annual' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  userId: string;
  date: string;
  type: LeaveType;
  reason?: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface LeaveLog {
  id: string;
  userId: string;
  date: string; // Start Date
  endDate?: string;
  totalDays: number;
  type: LeaveType;
  status: LeaveStatus;
  reason: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

// ─── Shipments & Dispatch ──────────────────────────────────────────────────

export interface InboundShipment {
  id: string;
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
  name: string;      // e.g. "Table 1"
  taskTypes: string[]; // e.g. ["Checking", "Ironing"]
}

export type LocationType = 'head_office' | 'branch' | 'warehouse';

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  address?: string;
  isPrimary?: boolean;
}

export interface AppSettings {
  shopify: ShopifySettings;
  mongodb: MongoSettings;
  leaveAutomation: LeaveAutomationSettings;
  workstations: Workstation[];
  locations: Location[];
}


// ─── Notifications ─────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;      // recipient
  senderId?: string;   // who triggered it
  title: string;
  message: string;
  type: 'assignment' | 'leave' | 'system' | 'alert';
  read: boolean;
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
