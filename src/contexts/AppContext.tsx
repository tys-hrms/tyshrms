import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Product, Assignment, WorkLog, InboundShipment, DispatchBatch, LeaveLog, LeaveStatus, TaskDefinition, DailyStats, AssignmentCarryForward, DefectReason, Notification
} from '../types';
import { db } from '../lib/database';
import { useSettings } from './SettingsContext';
import { useAuth } from './AuthContext';

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const DEFAULT_TASKS: TaskDefinition[] = [];
const DEFAULT_DEFECT_REASONS: DefectReason[] = [];

interface AppContextType {
  products: Product[];
  assignments: Assignment[];
  workLogs: WorkLog[];
  shipments: InboundShipment[];
  dispatches: DispatchBatch[];
  dispatchBatches: DispatchBatch[];
  leaves: LeaveLog[];
  tasks: TaskDefinition[];
  carryForwards: AssignmentCarryForward[];
  defectReasons: DefectReason[];
  workflowNodes: any[];
  workflowEdges: any[];
  notifications: Notification[];
  isSyncing: boolean;
  lastSyncedAt: number;
  isLoading: boolean;

  addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Promise<void>;
  addProducts: (products: Omit<Product, 'id' | 'created_at'>[]) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  clearProducts: () => Promise<void>;

  addAssignment: (data: Partial<Assignment> & { sku: string; user_id: string; date: string }) => Promise<void>;
  updateAssignment: (id: string, updates: Partial<Assignment>) => Promise<void>;
  getAssignmentsForUser: (user_id: string, date: string) => Assignment[];
  clearAssignments: () => Promise<void>;
  runCarryForwardJob: () => void;

  addWorkLog: (log: Partial<WorkLog> & { assignment_id: string; user_id: string }) => Promise<void>;

  addDispatchBatch: (batch: Omit<DispatchBatch, 'id' | 'packed_at'>) => Promise<void>;
  updateDispatchBatch: (id: string, updates: Partial<DispatchBatch>) => Promise<void>;

  requestLeave: (data: Omit<LeaveLog, 'id'>) => Promise<void>;
  respondToLeave: (id: string, status: LeaveStatus, reviewer_id?: string) => Promise<void>;

  addTask: (task: TaskDefinition) => Promise<void>;
  updateTask: (id: string, updates: Partial<TaskDefinition>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  setWorkflowNodes: (nodes: any[]) => Promise<void>;
  setWorkflowEdges: (edges: any[]) => Promise<void>;
  getDailyStats: (date?: string) => DailyStats;

  addNotification: (noti: Partial<Notification> & { user_id: string; title: string; message: string }) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  clearNotifications: () => Promise<void>;
  signalHelp: (sender_id: string, assignment_id: string) => Promise<void>;
  
  migrateLocalToCloud: () => Promise<{ success: boolean; count: number }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const { session } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [shipments, setShipments] = useState<InboundShipment[]>([]);
  const [dispatches, setDispatches] = useState<DispatchBatch[]>([]);
  const [leaves, setLeaves] = useState<LeaveLog[]>([]);
  const [tasks, setTasks] = useState<TaskDefinition[]>(DEFAULT_TASKS);
  const [carryForwards, setCarryForwards] = useState<AssignmentCarryForward[]>([]);
  const [defectReasons, setDefectReasons] = useState<DefectReason[]>(DEFAULT_DEFECT_REASONS);
  const [workflowNodes, setWorkflowNodesState] = useState<any[]>([]);
  const [workflowEdges, setWorkflowEdgesState] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState(true);

  const loadCloudData = async () => {
    if (!session?.tenant?.id) {
       setIsLoading(false);
       return;
    }
    try {
      const tid = session.tenant.id;
      
      const fetchData = async (col: string, Type: any) => {
        try {
          const r = await db.request('find', col, { filter: { tenant_id: tid } });
          return (r.documents || []) as typeof Type;
        } catch (e) {
          console.warn(`[CloudSync] Failed to load ${col}:`, e);
          return [];
        }
      };

      const [cProducts, cAssignments, cLogs, cLeaves, cTasks, cDefects, cCarry, n, cNodes, cEdges, cDispatches] = await Promise.all([
        fetchData('products', [] as Product[]),
        fetchData('assignments', [] as Assignment[]),
        fetchData('worklogs', [] as WorkLog[]),
        fetchData('leaves', [] as LeaveLog[]),
        fetchData('tasks', [] as TaskDefinition[]),
        fetchData('defect_reasons', [] as DefectReason[]),
        fetchData('carry_forwards', [] as AssignmentCarryForward[]),
        fetchData('notifications', [] as Notification[]),
        fetchData('workflow_nodes', [] as any[]),
        fetchData('workflow_edges', [] as any[]),
        fetchData('dispatches', [] as DispatchBatch[]),
      ]);

      setProducts(cProducts.map((p: Product) => ({ ...p, mongo_synced: true })));
      setAssignments(cAssignments);
      setWorkLogs(cLogs);
      setLeaves(cLeaves);
      setTasks(cTasks);
      setDefectReasons(cDefects);
      setCarryForwards(cCarry);
      setNotifications(n);
      setWorkflowNodesState(cNodes);
      setWorkflowEdgesState(cEdges);
      setDispatches(cDispatches);
      setLastSyncedAt(Date.now());
    } catch (e) {
      console.warn('[CloudSync] Global load error:', e);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.tenant?.id || isSyncing) return;
    const intervalId = setInterval(loadCloudData, 10000); 
    return () => clearInterval(intervalId);
  }, [session?.tenant?.id, isSyncing]);

  const runCarryForwardJob = () => {
    const today = new Date().toISOString().split('T')[0];
    setAssignments(prev => {
      let changed = false;
      const next = [...prev];
      prev.forEach((a, idx) => {
        if (a.date < today && a.status !== 'completed') {
          const pending = (a.target_qty || a.pieces_assigned) + (a.pieces_carried_forward || 0) - (a.pieces_completed || 0);
          if (pending > 0) {
            const alreadyCarried = prev.find(clone => clone.date === today && clone.user_id === a.user_id && clone.sku === a.sku && clone.task_type === a.task_type);
            if (!alreadyCarried) {
              changed = true;
              next.push({ ...a, id: generateId(), date: today, pieces_assigned: 0, target_qty: pending, pieces_carried_forward: pending, pieces_completed: 0, status: 'pending', notes: `Auto-carried forward from ${a.date}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
              next[idx] = { ...next[idx], status: 'completed', updated_at: new Date().toISOString() };
            }
          } else {
            changed = true;
            next[idx] = { ...next[idx], status: 'completed', updated_at: new Date().toISOString() };
          }
        }
      });
      return changed ? next : prev;
    });
  };

  useEffect(() => { runCarryForwardJob(); }, []);

  const addProduct = async (p: Omit<Product, 'id' | 'created_at'>) => {
    if (!session?.tenant?.id) return;
    const newProduct: Product = { 
      ...p, 
      id: generateId(), 
      tenant_id: session.tenant.id,
      created_at: new Date().toISOString(), 
      quantity: p.quantity || 0 
    } as Product;
    setProducts(prev => [...prev, newProduct]);
    setIsSyncing(true);
    try {
      await db.save('products', newProduct);
      setProducts(prev => prev.map(pr => pr.id === newProduct.id ? { ...pr, mongo_synced: true } : pr));
    } finally {
      setIsSyncing(false);
    }
  };

  const addProducts = async (pArray: Omit<Product, 'id' | 'created_at'>[]) => {
    const tid = session?.tenant?.id;
    if (!tid) return;
    const now = new Date().toISOString();
    const newProducts = pArray.map(p => ({ 
      ...p, 
      id: generateId(), 
      tenant_id: tid,
      created_at: now, 
      mongo_synced: false, 
      quantity: p.quantity || 0 
    }));
    setProducts(prev => [...prev, ...newProducts]);
    setIsSyncing(true);
    try {
        await db.request('insertMany', 'products', { documents: newProducts });
        setProducts(prev => prev.map(p => newProducts.some(np => np.id === p.id) ? { ...p, mongo_synced: true } : p));
    } finally {
        setIsSyncing(false);
    }
  };

  const clearProducts = async () => {
    setProducts([]);
    setIsSyncing(true);
    try { await db.request('deleteMany', 'products', { filter: {} }); } finally { setIsSyncing(false); }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    const updated = products.find(p => p.id === id);
    if (updated) {
        setIsSyncing(true);
        try { await db.save('products', { ...updated, ...updates }); } finally { setIsSyncing(false); }
    }
  };

  const deleteProduct = async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    setIsSyncing(true);
    try { await db.delete('products', id); } finally { setIsSyncing(false); }
  };

  const addAssignment = async (a: Partial<Assignment> & { sku: string; user_id: string; date: string }) => {
    if (!session?.tenant?.id) return;
    const newAssignment = { 
      task_type: 'Checking', 
      mode: 'single', 
      pieces_assigned: a.target_qty || 0, 
      target_qty: a.target_qty || 0, 
      notes: '', 
      ...a, 
      id: generateId(), 
      tenant_id: session.tenant.id,
      user_id: a.user_id,
      pieces_completed: 0, 
      pieces_carried_forward: 0, 
      status: a.status || 'pending', 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString() 
    };
    setAssignments(prev => [...prev, newAssignment as any]);
    setIsSyncing(true);
    try { await db.save('assignments', newAssignment); } finally { setIsSyncing(false); }
  };

  const updateAssignment = async (id: string, updates: Partial<Assignment>) => {
    const now = new Date().toISOString();
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, ...updates, updated_at: now } : a));
    const updated = assignments.find(a => a.id === id);
    if (updated) {
        setIsSyncing(true);
        try { await db.save('assignments', { ...updated, ...updates, updated_at: now }); } finally { setIsSyncing(false); }
    }
  };

  const getAssignmentsForUser = (user_id: string, date: string) => assignments.filter(a => a.user_id === user_id && a.date === date);

  const clearAssignments = async () => {
    setAssignments([]);
    setIsSyncing(true);
    try { await db.request('deleteMany', 'assignments', { filter: {} }); } finally { setIsSyncing(false); }
  };

  const addWorkLog = async (logData: Partial<WorkLog> & { assignment_id: string; user_id: string }) => {
    if (!session?.tenant?.id) return;
    const log = { 
      date: new Date().toISOString().split('T')[0], 
      pieces_ironed: 0, 
      pieces_checked: 0, 
      pieces_labeled: 0, 
      pieces_packed: 0, 
      pieces_rejected: 0, 
      ...logData, 
      id: generateId(), 
      tenant_id: session.tenant.id,
      logged_at: new Date().toISOString() 
    } as any;
    setWorkLogs(prev => [...prev, log]);
    setIsSyncing(true);
    try { await db.save('worklogs', log); } finally { setIsSyncing(false); }
    
    const piecesDone = (log.pieces_ironed || 0) + (log.pieces_checked || 0) + (log.pieces_labeled || 0) + (log.pieces_packed || 0);
    if (piecesDone > 0 || (log.pieces_rejected || 0) > 0) {
      setAssignments(prev => prev.map(a => {
        if (a.id !== log.assignment_id) return a;
        const totalGoal = a.target_qty || ((a.pieces_assigned || 0) + (a.pieces_carried_forward || 0));
        const newTotal = (a.pieces_completed || 0) + piecesDone;
        const updatedA = { ...a, pieces_completed: newTotal, status: newTotal >= totalGoal ? 'completed' : 'in_progress', updated_at: new Date().toISOString() };
        db.save('assignments', updatedA);
        return updatedA as any;
      }));
    }
  };

  const addDispatchBatch = async (batch: Omit<DispatchBatch, 'id' | 'packed_at'>) => {
    if (!session?.tenant?.id) return;
    const newBatch = { ...batch, id: generateId(), tenant_id: session.tenant.id, packed_at: new Date().toISOString() };
    setDispatches(prev => [...prev, newBatch]);
    setIsSyncing(true);
    try { await db.save('dispatches', newBatch); } finally { setIsSyncing(false); }
  };

  const updateDispatchBatch = async (id: string, updates: Partial<DispatchBatch>) => {
    setDispatches(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    const updated = dispatches.find(b => b.id === id);
    if (updated) {
        setIsSyncing(true);
        try { await db.save('dispatches', { ...updated, ...updates }); } finally { setIsSyncing(false); }
    }
  };

  const requestLeave = async (data: Omit<LeaveLog, 'id' | 'status'>) => {
    if (!session?.tenant?.id) return;
    const newLeave: LeaveLog = { ...data, id: generateId(), tenant_id: session.tenant.id, status: 'pending', total_days: (data as any).totalDays || 1 } as LeaveLog;
    setLeaves(prev => [...prev, newLeave]);
    setIsSyncing(true);
    try { await db.save('leaves', newLeave); } finally { setIsSyncing(false); }
  };

  const respondToLeave = async (id: string, status: LeaveStatus, reviewer_id?: string) => {
    const now = new Date().toISOString();
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status, reviewed_by: reviewer_id, reviewed_at: now } : l));
    const updated = leaves.find(l => l.id === id);
    if (updated) {
        setIsSyncing(true);
        try { await db.save('leaves', { ...updated, status, reviewed_by: reviewer_id, reviewed_at: now }); } finally { setIsSyncing(false); }
    }
  };

  const addTask = async (task: TaskDefinition) => {
    setTasks(prev => [...prev, task]);
    setIsSyncing(true);
    try { await db.save('tasks', task); } finally { setIsSyncing(false); }
  };

  const updateTask = async (id: string, updates: Partial<TaskDefinition>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    const updated = tasks.find(t => t.id === id);
    if (updated) {
        setIsSyncing(true);
        try { await db.save('tasks', { ...updated, ...updates }); } finally { setIsSyncing(false); }
    }
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setIsSyncing(true);
    try { await db.delete('tasks', id); } finally { setIsSyncing(false); }
  };

  const setWorkflowNodes = async (nodes: any[]) => {
    setWorkflowNodesState(nodes);
    setIsSyncing(true);
    try {
        await db.request('deleteMany', 'workflow_nodes', { filter: {} });
        await db.saveMany('workflow_nodes', nodes);
    } finally {
        setIsSyncing(false);
    }
  };

  const setWorkflowEdges = async (edges: any[]) => {
    setWorkflowEdgesState(edges);
    setIsSyncing(true);
    try {
        await db.request('deleteMany', 'workflow_edges', { filter: {} });
        await db.saveMany('workflow_edges', edges);
    } finally {
        setIsSyncing(false);
    }
  };

  const getDailyStats = (dateStr?: string): DailyStats => {
    const date = dateStr || new Date().toISOString().split('T')[0];
    const todaysAssignments = assignments.filter(a => a.date === date);
    const todaysLogs = workLogs.filter(l => l.date === date);
    const assigned = todaysAssignments.reduce((acc, a) => acc + (a.target_qty || a.pieces_assigned || 0) + (a.pieces_carried_forward || 0), 0);
    const completed = todaysAssignments.reduce((acc, a) => acc + (a.pieces_completed || 0), 0);
    return {
      date, 
      total_pieces_assigned: assigned, 
      total_pieces_completed: completed, 
      total_pieces_pending: Math.max(0, assigned - completed),
      total_ironed: todaysLogs.reduce((acc, l) => acc + (l.pieces_ironed || 0), 0),
      total_checked: todaysLogs.reduce((acc, l) => acc + (l.pieces_checked || 0), 0),
      total_labeled: todaysLogs.reduce((acc, l) => acc + (l.pieces_labeled || 0), 0),
      total_packed: todaysLogs.reduce((acc, l) => acc + (l.pieces_packed || 0), 0),
      total_rejected: todaysLogs.reduce((acc, l) => acc + (l.pieces_rejected || 0), 0),
      active_workers: new Set(todaysLogs.map(l => l.user_id)).size,
      present_today: 0, 
      on_leave: leaves.filter(l => l.date === date && l.status === 'approved').length,
      completed_assignments: todaysAssignments.filter(a => a.status === 'completed').length,
      pending_assignments: todaysAssignments.filter(a => a.status !== 'completed').length,
    };
  };

  const addNotification = async (nData: Partial<Notification> & { user_id: string; title: string; message: string }) => {
    const n: Notification = { ...nData, id: generateId(), read: false, created_at: new Date().toISOString() } as Notification;
    setNotifications(prev => [n, ...prev]);
    setIsSyncing(true);
    try { await db.save('notifications', n); } finally { setIsSyncing(false); }
  };

  const markNotificationRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const updated = notifications.find(n => n.id === id);
    if (updated) {
        setIsSyncing(true);
        try { await db.save('notifications', { ...updated, read: true }); } finally { setIsSyncing(false); }
    }
  };

  const clearNotifications = async () => {
    setNotifications([]);
    setIsSyncing(true);
    try { await db.request('deleteMany', 'notifications', { filter: {} }); } finally { setIsSyncing(false); }
  };

  const signalHelp = async (sender_id: string, assignment_id: string) => {
    if (!session?.tenant?.id) return;
    const assignment = assignments.find(a => a.id === assignment_id);
    const n: Notification = { 
      id: generateId(), 
      tenant_id: session.tenant.id,
      user_id: 'broadcast_all', 
      sender_id, 
      title: 'HELP REQUESTED', 
      message: `Worker needs assistance with ${assignment?.task_type || 'Task'} on SKU ${assignment?.sku || '...'}.`, 
      type: 'alert', 
      read: false, 
      created_at: new Date().toISOString() 
    } as any;
    setNotifications(prev => [n, ...prev]);
    setIsSyncing(true);
    try { await db.save('notifications', n); } finally { setIsSyncing(false); }
  };

  const migrateLocalToCloud = async () => {
    if (!session?.tenant?.id) return { success: false, count: 0 };
    const count = await db.sync.fromLocal(session.tenant.id);
    if (count > 0) await loadCloudData();
    return { success: true, count };
  };

  return (
    <AppContext.Provider value={{
      products, assignments, carryForwards, workLogs, shipments, dispatches, dispatchBatches: dispatches, leaves, tasks, defectReasons, workflowNodes, workflowEdges, notifications,
      isSyncing, lastSyncedAt, isLoading,
      addProduct, addProducts, updateProduct, deleteProduct, clearProducts, addAssignment, updateAssignment, getAssignmentsForUser, clearAssignments,
      addWorkLog, addDispatchBatch, updateDispatchBatch, runCarryForwardJob, getDailyStats, requestLeave, respondToLeave, addTask, updateTask, deleteTask,
      setWorkflowNodes, setWorkflowEdges, addNotification, markNotificationRead, clearNotifications, signalHelp, migrateLocalToCloud,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
