import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Product, Assignment, WorkLog, InboundShipment, DispatchBatch, LeaveLog, LeaveType, LeaveStatus, TaskDefinition, DailyStats, AssignmentCarryForward, DefectReason, Notification
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

  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  addProducts: (products: Omit<Product, 'id' | 'createdAt'>[]) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  clearProducts: () => Promise<void>;

  addAssignment: (data: Partial<Assignment> & { sku: string; userId: string; date: string }) => Promise<void>;
  updateAssignment: (id: string, updates: Partial<Assignment>) => Promise<void>;
  getAssignmentsForUser: (userId: string, date: string) => Assignment[];
  clearAssignments: () => Promise<void>;
  runCarryForwardJob: () => void;

  addWorkLog: (log: Partial<WorkLog> & { assignmentId: string; userId: string }) => Promise<void>;

  addDispatchBatch: (batch: Omit<DispatchBatch, 'id' | 'packedAt'>) => Promise<void>;
  updateDispatchBatch: (id: string, updates: Partial<DispatchBatch>) => Promise<void>;

  requestLeave: (data: Omit<LeaveLog, 'id'>) => Promise<void>;
  respondToLeave: (id: string, status: LeaveStatus, reviewerId?: string) => Promise<void>;

  addTask: (task: TaskDefinition) => Promise<void>;
  updateTask: (id: string, updates: Partial<TaskDefinition>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  setWorkflowNodes: (nodes: any[]) => Promise<void>;
  setWorkflowEdges: (edges: any[]) => Promise<void>;
  getDailyStats: (date?: string) => DailyStats;

  addNotification: (noti: Partial<Notification> & { userId: string; title: string; message: string }) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  clearNotifications: () => Promise<void>;
  signalHelp: (senderId: string, assignmentId: string) => Promise<void>;
  
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
    if (!settings.mongodb.isEnabled || !session?.tenant?.id) {
      if (!session?.tenant?.id) setIsLoading(false);
      return;
    }
    try {
      const tid = session.tenant.id;
      
      const fetchData = async (col: string, Type: any) => {
        try {
          const r = await db.request('find', col, { filter: { tenantId: tid } });
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

      if (cProducts.length) setProducts(cProducts.map((p: Product) => ({ ...p, mongoSynced: true })));
      if (cAssignments.length) setAssignments(cAssignments);
      if (cLogs.length) setWorkLogs(cLogs);
      if (cLeaves.length) setLeaves(cLeaves);
      if (cTasks.length) setTasks(cTasks);
      if (cDefects.length) setDefectReasons(cDefects);
      if (cCarry.length) setCarryForwards(cCarry);
      if (n.length) setNotifications(n);
      if (cNodes.length) setWorkflowNodesState(cNodes);
      if (cEdges.length) setWorkflowEdgesState(cEdges);
      if (cDispatches.length) setDispatches(cDispatches);
      setLastSyncedAt(Date.now());
    } catch (e) {
      console.warn('[CloudSync] Global load error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCloudData();
  }, [settings.mongodb.isEnabled]);

  useEffect(() => {
    if (!settings.mongodb.isEnabled || isSyncing) return;
    const intervalId = setInterval(loadCloudData, 1500); 
    return () => clearInterval(intervalId);
  }, [settings.mongodb.isEnabled, session?.tenant, isSyncing]);

  const runCarryForwardJob = () => {
    const today = new Date().toISOString().split('T')[0];
    setAssignments(prev => {
      let changed = false;
      const next = [...prev];
      prev.forEach((a, idx) => {
        if (a.date < today && a.status !== 'completed') {
          const pending = (a.targetQty || a.piecesAssigned) + a.piecesCarriedForward - a.piecesCompleted;
          if (pending > 0) {
            const alreadyCarried = prev.find(clone => clone.date === today && clone.userId === a.userId && clone.sku === a.sku && clone.taskType === a.taskType);
            if (!alreadyCarried) {
              changed = true;
              next.push({ ...a, id: generateId(), date: today, piecesAssigned: 0, targetQty: pending, piecesCarriedForward: pending, piecesCompleted: 0, status: 'pending', notes: `Auto-carried forward from ${a.date}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
              next[idx] = { ...next[idx], status: 'completed', updatedAt: new Date().toISOString() };
            }
          } else {
            changed = true;
            next[idx] = { ...next[idx], status: 'completed', updatedAt: new Date().toISOString() };
          }
        }
      });
      return changed ? next : prev;
    });
  };

  useEffect(() => { runCarryForwardJob(); }, []);

  const addProduct = async (p: Omit<Product, 'id' | 'createdAt'>) => {
    if (!session?.tenant?.id) return;
    const newProduct: Product = { 
      ...p, 
      id: generateId(), 
      tenantId: session.tenant.id,
      createdAt: new Date().toISOString(), 
      inventory: p.inventory || 0 
    };
    setProducts(prev => [...prev, newProduct]);
    setIsSyncing(true);
    try {
      await db.save('products', newProduct);
      setProducts(prev => prev.map(pr => pr.id === newProduct.id ? { ...pr, mongoSynced: true } : pr));
    } finally {
      setIsSyncing(false);
    }
  };

  const addProducts = async (pArray: Omit<Product, 'id' | 'createdAt'>[]) => {
    const tid = session?.tenant?.id;
    if (!tid) return;
    const now = new Date().toISOString();
    const newProducts = pArray.map(p => ({ 
      ...p, 
      id: generateId(), 
      tenantId: tid,
      createdAt: now, 
      mongoSynced: false, 
      inventory: p.inventory || 0 
    }));
    setProducts(prev => [...prev, ...newProducts]);
    setIsSyncing(true);
    try {
        await db.request('insertMany', 'products', { documents: newProducts });
        setProducts(prev => prev.map(p => newProducts.some(np => np.id === p.id) ? { ...p, mongoSynced: true } : p));
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

  const addAssignment = async (a: Partial<Assignment> & { sku: string; userId: string; date: string }) => {
    if (!session?.tenant?.id) return;
    const newAssignment = { 
      taskType: 'Checking', 
      mode: 'single', 
      piecesAssigned: a.targetQty || 0, 
      targetQty: a.targetQty || 0, 
      notes: '', 
      ...a, 
      id: generateId(), 
      tenantId: session.tenant.id,
      piecesCompleted: 0, 
      piecesCarriedForward: 0, 
      status: a.status || 'pending', 
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString() 
    } as Assignment;
    setAssignments(prev => [...prev, newAssignment]);
    setIsSyncing(true);
    try { await db.save('assignments', newAssignment); } finally { setIsSyncing(false); }
  };

  const updateAssignment = async (id: string, updates: Partial<Assignment>) => {
    const now = new Date().toISOString();
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, ...updates, updatedAt: now } : a));
    const updated = assignments.find(a => a.id === id);
    if (updated) {
        setIsSyncing(true);
        try { await db.save('assignments', { ...updated, ...updates, updatedAt: now }); } finally { setIsSyncing(false); }
    }
  };

  const getAssignmentsForUser = (userId: string, date: string) => assignments.filter(a => a.userId === userId && a.date === date);

  const clearAssignments = async () => {
    setAssignments([]);
    setIsSyncing(true);
    try { await db.request('deleteMany', 'assignments', { filter: {} }); } finally { setIsSyncing(false); }
  };

  const addWorkLog = async (logData: Partial<WorkLog> & { assignmentId: string; userId: string }) => {
    if (!session?.tenant?.id) return;
    const log = { 
      date: new Date().toISOString().split('T')[0], 
      piecesIroned: 0, 
      piecesChecked: 0, 
      piecesLabeled: 0, 
      piecesPacked: 0, 
      piecesRejected: 0, 
      ...logData, 
      id: generateId(), 
      tenantId: session.tenant.id,
      loggedAt: new Date().toISOString() 
    } as WorkLog;
    setWorkLogs(prev => [...prev, log]);
    setIsSyncing(true);
    try { await db.save('worklogs', log); } finally { setIsSyncing(false); }
    
    const piecesDone = (log.piecesIroned || 0) + (log.piecesChecked || 0) + (log.piecesLabeled || 0) + (log.piecesPacked || 0);
    if (piecesDone > 0 || (log.piecesRejected || 0) > 0) {
      setAssignments(prev => prev.map(a => {
        if (a.id !== log.assignmentId) return a;
        const totalGoal = a.targetQty || (a.piecesAssigned + a.piecesCarriedForward);
        const newTotal = a.piecesCompleted + piecesDone;
        const updatedA = { ...a, piecesCompleted: newTotal, status: newTotal >= totalGoal ? 'completed' : 'in_progress', updatedAt: new Date().toISOString() };
        db.save('assignments', updatedA);
        return updatedA as any;
      }));
    }
  };

  const addDispatchBatch = async (batch: Omit<DispatchBatch, 'id' | 'packedAt'>) => {
    if (!session?.tenant?.id) return;
    const newBatch = { ...batch, id: generateId(), tenantId: session.tenant.id, packedAt: new Date().toISOString() };
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
    const newLeave: LeaveLog = { ...data, id: generateId(), tenantId: session.tenant.id, status: 'pending', totalDays: (data as any).totalDays || 1 };
    setLeaves(prev => [...prev, newLeave]);
    setIsSyncing(true);
    try { await db.save('leaves', newLeave); } finally { setIsSyncing(false); }
  };

  const respondToLeave = async (id: string, status: LeaveStatus, reviewerId?: string) => {
    const now = new Date().toISOString();
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status, reviewedBy: reviewerId, reviewedAt: now } : l));
    const updated = leaves.find(l => l.id === id);
    if (updated) {
        setIsSyncing(true);
        try { await db.save('leaves', { ...updated, status, reviewedBy: reviewerId, reviewedAt: now }); } finally { setIsSyncing(false); }
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
    const assigned = todaysAssignments.reduce((acc, a) => acc + (a.targetQty || a.piecesAssigned) + a.piecesCarriedForward, 0);
    const completed = todaysAssignments.reduce((acc, a) => acc + a.piecesCompleted, 0);
    return {
      date, totalPiecesAssigned: assigned, totalPiecesCompleted: completed, totalPiecesPending: Math.max(0, assigned - completed),
      totalIroned: todaysLogs.reduce((acc, l) => acc + (l.piecesIroned || 0), 0),
      totalChecked: todaysLogs.reduce((acc, l) => acc + (l.piecesChecked || 0), 0),
      totalLabeled: todaysLogs.reduce((acc, l) => acc + (l.piecesLabeled || 0), 0),
      totalPacked: todaysLogs.reduce((acc, l) => acc + (l.piecesPacked || 0), 0),
      totalRejected: todaysLogs.reduce((acc, l) => acc + (l.piecesRejected || 0), 0),
      activeWorkers: new Set(todaysLogs.map(l => l.userId)).size,
      presentToday: 0, onLeave: leaves.filter(l => l.date === date && l.status === 'approved').length,
      completedAssignments: todaysAssignments.filter(a => a.status === 'completed').length,
      pendingAssignments: todaysAssignments.filter(a => a.status !== 'completed').length,
    };
  };

  const addNotification = async (nData: Partial<Notification> & { userId: string; title: string; message: string }) => {
    const n: Notification = { ...nData, id: generateId(), read: false, createdAt: new Date().toISOString() } as Notification;
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

  const signalHelp = async (senderId: string, assignmentId: string) => {
    if (!session?.tenant?.id) return;
    const assignment = assignments.find(a => a.id === assignmentId);
    const n: Notification = { 
      id: generateId(), 
      tenantId: session.tenant.id,
      userId: 'broadcast_all', 
      senderId, 
      title: 'HELP REQUESTED', 
      message: `Worker needs assistance with ${assignment?.taskType || 'Task'} on SKU ${assignment?.sku || '...'}.`, 
      type: 'alert', 
      read: false, 
      createdAt: new Date().toISOString() 
    };
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
