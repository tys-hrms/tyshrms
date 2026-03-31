import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Product, Assignment, WorkLog, InboundShipment, DispatchBatch, LeaveRequest, TaskDefinition, DailyStats, AssignmentCarryForward, LeaveLog, DefectReason, Notification
} from '../types';
import { db } from '../lib/database';
import { useSettings } from './SettingsContext';

const STORAGE_PREFIX = 'tys_hrms_';

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

  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  addProducts: (products: Omit<Product, 'id' | 'createdAt'>[]) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  clearProducts: () => Promise<void>;

  addAssignment: (data: Partial<Assignment> & { sku: string; userId: string; date: string }) => void;
  updateAssignment: (id: string, updates: Partial<Assignment>) => void;
  getAssignmentsForUser: (userId: string, date: string) => Assignment[];
  clearAssignments: () => Promise<void>;
  runCarryForwardJob: () => void;

  addWorkLog: (log: Partial<WorkLog> & { assignmentId: string; userId: string }) => void;

  addDispatchBatch: (batch: Omit<DispatchBatch, 'id' | 'packedAt'>) => void;
  updateDispatchBatch: (id: string, updates: Partial<DispatchBatch>) => void;

  requestLeave: (data: Omit<LeaveLog, 'id' | 'status'>) => void;
  respondToLeave: (id: string, status: 'approved' | 'rejected', reviewerId?: string) => void;

  addTask: (task: TaskDefinition) => void;
  updateTask: (id: string, updates: Partial<TaskDefinition>) => void;
  deleteTask: (id: string) => void;

  setWorkflowNodes: (nodes: any[]) => void;
  setWorkflowEdges: (edges: any[]) => void;
  getDailyStats: (date?: string) => DailyStats;

  addNotification: (noti: Partial<Notification> & { userId: string; title: string; message: string }) => Promise<void>;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => Promise<void>;
  signalHelp: (senderId: string, assignmentId: string) => Promise<void>;
  
  migrateLocalToCloud: () => Promise<{ success: boolean; count: number }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const useStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch { return initialValue; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
};

export function AppProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [products, setProducts] = useStorage<Product[]>('products_v2', []);
  const [assignments, setAssignments] = useStorage<Assignment[]>('assignments_v2', []);
  const [workLogs, setWorkLogs] = useStorage<WorkLog[]>('worklogs_v2', []);
  const [shipments, setShipments] = useStorage<InboundShipment[]>('shipments_v2', []);
  const [dispatches, setDispatches] = useStorage<DispatchBatch[]>('dispatches_v2', []);
  const [leaves, setLeaves] = useStorage<LeaveLog[]>('leaves_v2_logs', []);
  const [tasks, setTasks] = useStorage<TaskDefinition[]>('tasks_v2', DEFAULT_TASKS);
  const [carryForwards, setCarryForwards] = useStorage<AssignmentCarryForward[]>('carry_forwards_v2', []);
  const [defectReasons, setDefectReasons] = useStorage<DefectReason[]>('defect_reasons', DEFAULT_DEFECT_REASONS);
  const [workflowNodes, setWorkflowNodesState] = useStorage<any[]>('workflow_nodes', []);
  const [workflowEdges, setWorkflowEdgesState] = useStorage<any[]>('workflow_edges', []);
  const [notifications, setNotifications] = useStorage<Notification[]>('notifications_v2', []);

  // --- Auto-Purge Legacy Demo Data ---
  useEffect(() => {
    const demoAssignmentIds = ['a1', 'a2', 'a3'];
    const demoProductIds = ['p1', 'p2', 'p3'];
    setAssignments(prev => prev.filter(a => !demoAssignmentIds.includes(a.id) && !['SKU-001', 'SKU-002', 'SKU-003'].includes(a.sku)));
    setProducts(prev => prev.filter(p => !demoProductIds.includes(p.id) && !['SKU-001', 'SKU-002', 'SKU-003'].includes(p.sku)));
  }, [setAssignments, setProducts]);

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

  // --- Zero-Touch Auto-Migration ---
  useEffect(() => {
    if (!settings.mongodb.isEnabled) return;
    
    const hasSynced = localStorage.getItem('tys_hrms_cloud_synced_v2');
    if (hasSynced === 'true') return;

    const performAutoSync = async () => {
      console.log('[AutoSync] Performing first-time local to cloud migration...');
      try {
        await migrateLocalToCloud();
        localStorage.setItem('tys_hrms_cloud_synced_v2', 'true');
        console.log('[AutoSync] Successful.');
      } catch (e) {
        console.error('[AutoSync] Failed:', e);
      }
    };
    
    const timer = setTimeout(performAutoSync, 2000);
    return () => clearTimeout(timer);
  }, [settings.mongodb.isEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Silent Heartbeat: 5-Second Background Polling ---
  useEffect(() => {
    if (!settings.mongodb.isEnabled) return;
    
    const pollCloudData = async () => {
      try {
        const [cLogs, cNotifications, cAssignments] = await Promise.all([
          db.getAll<WorkLog>('worklogs'),
          db.getAll<Notification>('notifications'),
          db.getAll<Assignment>('assignments')
        ]);
        
        // Silent update (only if data actually changed)
        if (cLogs.length) setWorkLogs(cLogs);
        if (cNotifications.length) setNotifications(cNotifications);
        if (cAssignments.length) setAssignments(cAssignments);
      } catch (e) {
        console.warn('[Heartbeat] Sync failed (silent):', e);
      }
    };

    const intervalId = setInterval(pollCloudData, 5000);
    return () => clearInterval(intervalId);
  }, [settings.mongodb.isEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Cloud Sync: Initial Load ---
  useEffect(() => {
    if (!settings.mongodb.isEnabled) return;
    const loadCloudData = async () => {
      console.log('[CloudSync] Loading initial data from MongoDB...');
      const [cProducts, cAssignments, cLogs, cTasks, cDefects, cCarry, cNotifications] = await Promise.all([
        db.getAll<Product>('products'),
        db.getAll<Assignment>('assignments'),
        db.getAll<WorkLog>('worklogs'),
        db.getAll<TaskDefinition>('tasks'),
        db.getAll<DefectReason>('defect_reasons'),
        db.getAll<AssignmentCarryForward>('carry_forwards'),
        db.getAll<Notification>('notifications')
      ]);
      if (cProducts.length) setProducts(cProducts.map(p => ({ ...p, mongoSynced: true })));
      if (cAssignments.length) setAssignments(cAssignments);
      if (cLogs.length) setWorkLogs(cLogs);
      if (cTasks.length) setTasks(cTasks);
      if (cDefects.length) setDefectReasons(cDefects);
      if (cCarry.length) setCarryForwards(cCarry);
      if (cNotifications.length) setNotifications(cNotifications);
      const cNodes = await db.getAll<any>('workflow_nodes');
      const cEdges = await db.getAll<any>('workflow_edges');
      if (cNodes.length) setWorkflowNodesState(cNodes);
      if (cEdges.length) setWorkflowEdgesState(cEdges);
    };
    loadCloudData();
  }, [settings.mongodb.isEnabled]);

  useEffect(() => {
    runCarryForwardJob();
  }, []);

  const addProduct = (p: Omit<Product, 'id' | 'createdAt'>) => {
    const newProduct: Product = { ...p, id: generateId(), createdAt: new Date().toISOString(), inventory: p.inventory || 0 };
    setProducts(prev => [...prev, newProduct]);
    if (settings.mongodb.isEnabled) db.save('products', newProduct).then(() => setProducts(prev => prev.map(pr => pr.id === newProduct.id ? { ...pr, mongoSynced: true } : pr)));
  };

  const addProducts = async (pArray: Omit<Product, 'id' | 'createdAt'>[]) => {
    const now = new Date().toISOString();
    const newProducts = pArray.map(p => ({ ...p, id: generateId(), createdAt: now, mongoSynced: false, inventory: p.inventory || 0 }));
    setProducts(prev => [...prev, ...newProducts]);
    if (settings.mongodb.isEnabled) {
      await db.request('insertMany', 'products', { documents: newProducts });
      const ids = new Set(newProducts.map(p => p.id));
      setProducts(prev => prev.map(p => ids.has(p.id) ? { ...p, mongoSynced: true } : p));
    }
  };

  const clearProducts = async () => {
    setProducts([]);
    if (settings.mongodb.isEnabled) await db.request('deleteMany', 'products', { filter: {} });
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      if (settings.mongodb.isEnabled) {
        const updated = next.find(p => p.id === id);
        if (updated) db.save('products', updated);
      }
      return next;
    });
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    if (settings.mongodb.isEnabled) db.delete('products', id);
  };

  const addAssignment = (a: Partial<Assignment> & { sku: string; userId: string; date: string }) => {
    const newAssignment = { taskType: 'Checking', mode: 'single', piecesAssigned: a.targetQty || 0, targetQty: a.targetQty || 0, notes: '', ...a, id: generateId(), piecesCompleted: 0, piecesCarriedForward: 0, status: a.status || 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Assignment;
    setAssignments(prev => [...prev, newAssignment]);
    if (settings.mongodb.isEnabled) db.save('assignments', newAssignment);
  };

  const updateAssignment = (id: string, updates: Partial<Assignment>) => {
    setAssignments(prev => {
      const next = prev.map(a => a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a);
      if (settings.mongodb.isEnabled) {
        const updated = next.find(a => a.id === id);
        if (updated) db.save('assignments', updated);
      }
      return next;
    });
  };

  const getAssignmentsForUser = (userId: string, date: string) => assignments.filter(a => a.userId === userId && a.date === date);

  const clearAssignments = async () => {
    setAssignments([]);
    if (settings.mongodb.isEnabled) await db.request('deleteMany', 'assignments', { filter: {} });
  };

  const addWorkLog = (logData: Partial<WorkLog> & { assignmentId: string; userId: string }) => {
    const log = { date: new Date().toISOString().split('T')[0], piecesIroned: 0, piecesChecked: 0, piecesLabeled: 0, piecesPacked: 0, piecesRejected: 0, ...logData, id: generateId(), loggedAt: new Date().toISOString() } as WorkLog;
    setWorkLogs(prev => [...prev, log]);
    if (settings.mongodb.isEnabled) db.save('worklogs', log);
    const piecesDone = (log.piecesIroned || 0) + (log.piecesChecked || 0) + (log.piecesLabeled || 0) + (log.piecesPacked || 0);
    if (piecesDone > 0 || (log.piecesRejected || 0) > 0) {
      setAssignments(prev => prev.map(a => {
        if (a.id !== log.assignmentId) return a;
        const totalGoal = a.targetQty || (a.piecesAssigned + a.piecesCarriedForward);
        const newTotal = a.piecesCompleted + piecesDone;
        return { ...a, piecesCompleted: newTotal, status: newTotal >= totalGoal ? 'completed' : 'in_progress', updatedAt: new Date().toISOString() };
      }));
    }
  };

  const addDispatchBatch = (batch: Omit<DispatchBatch, 'id' | 'packedAt'>) => {
    const newBatch = { ...batch, id: generateId(), packedAt: new Date().toISOString() };
    setDispatches(prev => [...prev, newBatch]);
    if (settings.mongodb.isEnabled) db.save('dispatches', newBatch);
  };

  const updateDispatchBatch = (id: string, updates: Partial<DispatchBatch>) => {
    setDispatches(prev => {
      const next = prev.map(b => b.id === id ? { ...b, ...updates } : b);
      if (settings.mongodb.isEnabled) {
        const updated = next.find(b => b.id === id);
        if (updated) db.save('dispatches', updated);
      }
      return next;
    });
  };

  const requestLeave = (data: Omit<LeaveLog, 'id' | 'status'>) => {
    const newLeave: LeaveLog = { ...data, id: generateId(), status: 'pending', totalDays: (data as any).totalDays || 1 };
    setLeaves(prev => [...prev, newLeave]);
    if (settings.mongodb.isEnabled) db.save('leaves', newLeave);
  };

  const respondToLeave = (id: string, status: 'approved' | 'rejected', reviewerId?: string) => {
    setLeaves(prev => {
      const next = prev.map(l => l.id === id ? { ...l, status, reviewedBy: reviewerId, reviewedAt: new Date().toISOString() } : l);
      if (settings.mongodb.isEnabled) {
        const updated = next.find(l => l.id === id);
        if (updated) db.save('leaves', updated);
      }
      return next;
    });
  };

  const addTask = (task: TaskDefinition) => {
    setTasks(prev => [...prev, task]);
    if (settings.mongodb.isEnabled) db.save('tasks', task);
  };

  const updateTask = (id: string, updates: Partial<TaskDefinition>) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      if (settings.mongodb.isEnabled) {
        const updated = next.find(t => t.id === id);
        if (updated) db.save('tasks', updated);
      }
      return next;
    });
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (settings.mongodb.isEnabled) db.delete('tasks', id);
  };

  const setWorkflowNodes = (nodes: any[]) => {
    setWorkflowNodesState(nodes);
    if (settings.mongodb.isEnabled) db.request('deleteMany', 'workflow_nodes', { filter: {} }).then(() => db.saveMany('workflow_nodes', nodes));
  };

  const setWorkflowEdges = (edges: any[]) => {
    setWorkflowEdgesState(edges);
    if (settings.mongodb.isEnabled) db.request('deleteMany', 'workflow_edges', { filter: {} }).then(() => db.saveMany('workflow_edges', edges));
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
    if (settings.mongodb.isEnabled) await db.save('notifications', n);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n);
      if (settings.mongodb.isEnabled) {
        const updated = next.find(n => n.id === id);
        if (updated) db.save('notifications', updated);
      }
      return next;
    });
  };

  const clearNotifications = async () => {
    setNotifications([]);
    if (settings.mongodb.isEnabled) await db.request('deleteMany', 'notifications', { filter: {} });
  };

  const signalHelp = async (senderId: string, assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    const n: Notification = { id: generateId(), userId: 'broadcast_all', senderId, title: 'HELP REQUESTED', message: `Worker needs assistance with ${assignment?.taskType || 'Task'} on SKU ${assignment?.sku || '...'}.`, type: 'alert', read: false, createdAt: new Date().toISOString() };
    setNotifications(prev => [n, ...prev]);
    if (settings.mongodb.isEnabled) await db.save('notifications', n);
  };

  const migrateLocalToCloud = async () => {
    if (!settings.mongodb.isEnabled) return { success: false, count: 0 };
    await db.saveMany('products', products);
    await db.saveMany('assignments', assignments);
    await db.saveMany('worklogs', workLogs);
    await db.saveMany('tasks', tasks);
    await db.saveMany('defect_reasons', defectReasons);
    await db.saveMany('notifications', notifications);
    await db.saveMany('carry_forwards', carryForwards);
    setProducts(prev => prev.map(p => ({ ...p, mongoSynced: true })));
    return { success: true, count: products.length + assignments.length + workLogs.length + tasks.length + notifications.length };
  };

  return (
    <AppContext.Provider value={{
      products, assignments, carryForwards, workLogs, shipments, dispatches, dispatchBatches: dispatches, leaves, tasks, defectReasons,
      addProduct, addProducts, updateProduct, deleteProduct, clearProducts, addAssignment, updateAssignment, getAssignmentsForUser, clearAssignments,
      addWorkLog, addDispatchBatch, updateDispatchBatch, runCarryForwardJob, getDailyStats, requestLeave, respondToLeave, addTask, updateTask, deleteTask,
      workflowNodes, workflowEdges, setWorkflowNodes, setWorkflowEdges, addNotification, markNotificationRead, clearNotifications, signalHelp, migrateLocalToCloud, notifications,
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
