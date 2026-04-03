import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  MarkerType,
  ReactFlowInstance,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  EdgeProps,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useSettings } from '../../contexts/SettingsContext';
import {
  User as UserIcon,
  Briefcase,
  ShieldCheck,
  UserCog,
  Trash2,
  Plus,
  Layers,
  Box,
  Search,
  ChevronRight,
  ChevronDown,
  X,
  Layout,
  Save,
} from 'lucide-react';

// ─── Custom Node ──────────────────────────────────────────────────────────────

const GenericNode = ({ data, selected }: { data: any; selected?: boolean }) => {
  const Icon = data.icon || UserIcon;
  const borderColor = data.borderColor || 'border-slate-700';
  const accentColor = data.accentColor || 'text-slate-400';

  return (
    <div
      className={`bg-slate-900 border-2 ${
        selected ? 'border-custom-blue' : borderColor
      } rounded-2xl px-4 py-3 min-w-[180px] shadow-2xl transition-all overflow-hidden relative`}
    >
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/10 to-transparent -mr-8 -mt-8 rounded-full blur-2xl" />
      <div className="flex items-center gap-3 relative z-10">
        <div
          className={`w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center ${accentColor} shrink-0 shadow-inner border border-white/5`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm font-bold text-white leading-tight">{data.name}</div>
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
            {data.subtext || data.role}
          </div>
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className="w-2.5 h-2.5 bg-slate-700 border-2 border-slate-900 hover:bg-custom-blue transition-colors"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-2.5 h-2.5 bg-slate-700 border-2 border-slate-900 hover:bg-custom-blue transition-colors"
      />
    </div>
  );
};

// ─── Custom Deletable Edge ────────────────────────────────────────────────────
// Uses a custom event so it doesn't need to call hooks inside a non-hook context

const DeletableEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, strokeWidth: 2 }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            className="w-6 h-6 bg-slate-800 border border-slate-700 text-rose-400 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-lg cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('delete-flow-edge', { detail: id }));
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

// ─── Node / Edge type maps (defined outside component to avoid re-creation) ──

const nodeTypes = {
  admin: GenericNode,
  manager: GenericNode,
  worker: GenericNode,
  task: GenericNode,
  table: GenericNode,
};

const edgeTypes = {
  deletable: DeletableEdge,
};

// ─── Icon helpers (not serialisable → resolved at runtime) ────────────────────

function iconForRole(role: string) {
  if (role === 'Admin') return ShieldCheck;
  if (role === 'Manager') return UserCog;
  return UserIcon;
}

function borderForRole(role: string) {
  if (role === 'Admin') return 'border-rose-500/30';
  if (role === 'Manager') return 'border-amber-500/30';
  return 'border-custom-blue/30';
}

function accentForRole(role: string) {
  if (role === 'Admin') return 'text-rose-400';
  if (role === 'Manager') return 'text-amber-400';
  return 'text-custom-blue';
}

function iconForNodeType(nodeType: string) {
  if (nodeType === 'admin') return ShieldCheck;
  if (nodeType === 'manager') return UserCog;
  if (nodeType === 'task') return Briefcase;
  if (nodeType === 'worker') return UserIcon;
  return Box;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorkflowBuilder() {
  const { users } = useAuth();
  const { settings } = useSettings();
  const {
    tasks: taskDefinitions,
    assignments,
    addAssignment,
    workflowNodes: persistedNodes,
    workflowEdges: persistedEdges,
    setWorkflowNodes,
    setWorkflowEdges,
  } = useApp();

  // ── Local ReactFlow state (decoupled from persistence) ──────────────────────
  // This prevents every node drag from triggering MongoDB writes.
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [initialized, setInitialized] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // ── Hydrate from persisted state on mount only ──────────────────────────────
  useEffect(() => {
    if (initialized) return;

    if (persistedNodes && persistedNodes.length > 0) {
      // Re-attach icons (functions aren't JSON-serialisable)
      const hydrated = persistedNodes.map((n: Node) => ({
        ...n,
        data: {
          ...n.data,
          icon: n.data.role
            ? iconForRole(n.data.role as string)
            : iconForNodeType(n.type || ''),
          borderColor: n.data.role
            ? borderForRole(n.data.role as string)
            : n.data.borderColor,
          accentColor: n.data.role
            ? accentForRole(n.data.role as string)
            : n.data.accentColor,
        },
      }));
      setNodes(hydrated);
      setEdges((persistedEdges as Edge[]) || []);
      setInitialized(true);
      return;
    }

    // No persisted state → auto-populate from active assignments
    if (assignments.length === 0) { setInitialized(true); return; }

    const activeUserIds = new Set(
      assignments.filter(a => a.status !== 'completed').map(a => a.userId)
    );
    const activeTaskTypes = new Set(
      assignments.filter(a => a.status !== 'completed').map(a => a.taskType)
    );

    const autoNodes: Node[] = [];

    users.filter(u => activeUserIds.has(u.id)).forEach((u, i) => {
      autoNodes.push({
        id: `${u.role.toLowerCase()}-${u.id}`,
        type: u.role.toLowerCase(),
        position: { x: 50, y: 100 + i * 110 },
        data: {
          name: u.name,
          role: u.role,
          id: u.id,
          icon: iconForRole(u.role),
          borderColor: borderForRole(u.role),
          accentColor: accentForRole(u.role),
        },
      });
    });

    taskDefinitions.filter(t => activeTaskTypes.has(t.name)).forEach((t, i) => {
      autoNodes.push({
        id: `task-${t.id}`,
        type: 'task',
        position: { x: 500, y: 100 + i * 120 },
        data: {
          name: t.name,
          id: t.id,
          icon: Briefcase,
          borderColor: 'border-teal-500/30',
          accentColor: 'text-teal-400',
          subtext: 'Process Phase',
        },
      });
    });

    const autoEdges: Edge[] = assignments
      .filter(a => a.status !== 'completed')
      .map(a => {
        const taskObj = taskDefinitions.find(t => t.name === a.taskType);
        if (!taskObj) return null;
        return {
          id: `e-${a.id}`,
          source: `worker-${a.userId}`,
          target: `task-${taskObj.id}`,
          type: 'deletable',
          animated: true,
          style: { stroke: '#0ea5e9' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
        } as Edge;
      })
      .filter(Boolean) as Edge[];

    setNodes(autoNodes);
    setEdges(autoEdges);
    setInitialized(true);
  }, [persistedNodes, persistedEdges, assignments, taskDefinitions, users, initialized]); // eslint-disable-line

  // ── Edge deletion via custom event ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail;
      setEdges(prev => prev.filter(edge => edge.id !== id));
    };
    window.addEventListener('delete-flow-edge', handler);
    return () => window.removeEventListener('delete-flow-edge', handler);
  }, [setEdges]);

  // ── Connect handler ────────────────────────────────────────────────────────
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        ...params,
        id: `e-${Date.now()}`,
        type: 'deletable',
        animated: true,
        style: { stroke: '#0ea5e9' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
      };
      setEdges(prev => addEdge(newEdge, prev));
    },
    [setEdges]
  );

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  const onDragStart = (event: React.DragEvent, nodeType: string, data: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ nodeType, data }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!reactFlowWrapper.current || !rfInstance) return;
      const rawData = event.dataTransfer.getData('application/reactflow');
      if (!rawData) return;
      const { nodeType, data } = JSON.parse(rawData);
      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode: Node = {
        id: `${nodeType}-${data.id || Date.now()}`,
        type: nodeType,
        position,
        data: {
          ...data,
          icon: iconForNodeType(nodeType),
          borderColor:
            nodeType === 'admin'
              ? 'border-rose-500/30'
              : nodeType === 'manager'
              ? 'border-amber-500/30'
              : nodeType === 'worker'
              ? 'border-custom-blue/30'
              : 'border-teal-500/30',
          accentColor:
            nodeType === 'admin'
              ? 'text-rose-400'
              : nodeType === 'manager'
              ? 'text-amber-400'
              : nodeType === 'worker'
              ? 'text-custom-blue'
              : 'text-teal-400',
        },
      };
      setNodes(prev => prev.concat(newNode));
    },
    [rfInstance, setNodes]
  );

  // ── Save / Deploy ──────────────────────────────────────────────────────────
  const handleDeploy = () => {
    setSaveStatus('saving');

    // Persist layout to AppContext (→ MongoDB cloud)
    // Strip non-serialisable icon functions before saving
    const serializableNodes = nodes.map(n => ({
      ...n,
      data: { ...n.data, icon: undefined },
    }));
    setWorkflowNodes(serializableNodes);
    setWorkflowEdges(edges);

    // Process Worker → Task connections into assignments
    const todayStr = new Date().toISOString().split('T')[0];
    edges.forEach(e => {
      if (e.source.startsWith('worker-') && e.target.startsWith('task-')) {
        const userId = e.source.replace('worker-', '');
        const taskId = e.target.replace('task-', '');
        const taskObj = taskDefinitions.find(t => t.id === taskId);
        if (taskObj) {
          const exists = assignments.some(
            a =>
              a.userId === userId &&
              a.taskType === taskObj.name &&
              a.status !== 'completed'
          );
          if (!exists) {
            addAssignment({
              sku: 'VISUAL-BATCH',
              userId,
              taskType: taskObj.name as any,
              date: todayStr,
              targetQty: 100,
            });
          }
        }
      }
    });

    setTimeout(() => setSaveStatus('saved'), 800);
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  // ── Sidebar sections ───────────────────────────────────────────────────────
  const sections = [
    {
      id: 'workers',
      name: 'Workers',
      icon: UserIcon,
      items: users.filter(u => u.role === 'Worker'),
      type: 'worker',
    },
    {
      id: 'managers',
      name: 'Managers',
      icon: UserCog,
      items: users.filter(u => u.role === 'Manager'),
      type: 'manager',
    },
    {
      id: 'admins',
      name: 'Admins',
      icon: ShieldCheck,
      items: users.filter(u => u.role === 'Admin'),
      type: 'admin',
    },
    {
      id: 'tasks',
      name: 'Task Types',
      icon: Briefcase,
      items: taskDefinitions.map(t => ({ id: t.id, name: t.name })),
      type: 'task',
    },
    {
      id: 'tables',
      name: 'Packing Tables',
      icon: Layout,
      items: (settings.workstations || []).map(w => ({ id: w.id, name: w.name })),
      type: 'table',
    },
  ];

  return (
    <div className="flex gap-6 h-[800px] animate-in fade-in duration-700">
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <div className="w-80 flex flex-col gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col h-full overflow-hidden shadow-2xl">
          <div className="mb-6">
            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
              <Layers className="w-6 h-6 text-custom-blue" /> Components
            </h3>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Drag components to the workspace to build your flow.
            </p>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search components..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:border-custom-blue outline-none transition-all"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {sections.map(section => (
              <div
                key={section.id}
                className="bg-slate-950/50 border border-slate-800/50 rounded-2xl overflow-hidden shadow-sm"
              >
                <button
                  onClick={() =>
                    setActiveDropdown(activeDropdown === section.id ? null : section.id)
                  }
                  className="w-full flex items-center justify-between p-4 bg-slate-900/50 hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <section.icon
                      className={`w-4 h-4 ${
                        activeDropdown === section.id ? 'text-custom-blue' : 'text-slate-500'
                      }`}
                    />
                    <span className="text-sm font-bold text-slate-300">{section.name}</span>
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded-full">
                      {section.items.length}
                    </span>
                  </div>
                  {activeDropdown === section.id ? (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {activeDropdown === section.id && (
                  <div className="p-3 grid grid-cols-1 gap-2 animate-in slide-in-from-top-2 duration-200">
                    {section.items
                      .filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
                      .map(item => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={e => onDragStart(e, section.type, item)}
                          className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 hover:border-custom-blue/50 hover:bg-custom-blue/5 rounded-xl cursor-grab active:cursor-grabbing transition-all group"
                        >
                          <div className="w-7 h-7 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-custom-blue transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-semibold text-slate-400 group-hover:text-white transition-colors truncate">
                            {item.name}
                          </span>
                        </div>
                      ))}
                    {section.items.length === 0 && (
                      <div className="text-[10px] text-slate-600 p-2 italic">None registered.</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => { setNodes([]); setEdges([]); }}
            className="mt-6 flex items-center justify-center gap-2 py-3 border border-rose-500/20 text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
          >
            <Trash2 className="w-4 h-4" /> Clear Canvas
          </button>
        </div>
      </div>

      {/* ── Workspace ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <Plus className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                Design Workspace
              </h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-60">
                {nodes.length} nodes · {edges.length} connections
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDeploy}
              disabled={saveStatus === 'saving'}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 ${
                saveStatus === 'saved'
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                  : saveStatus === 'saving'
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-custom-blue hover:bg-blue-600 text-white shadow-custom-blue/20'
              }`}
            >
              <Save className="w-4 h-4" />
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved ✓' : 'Deploy & Save'}
            </button>
          </div>
        </div>

        <div
          className="flex-1 bg-slate-950 border border-slate-800 rounded-[2.5rem] overflow-hidden relative shadow-inner"
          ref={reactFlowWrapper}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            fitView
            className="selection:bg-custom-blue/20"
          >
            <Controls className="!bg-slate-800 !border-slate-700 !text-slate-300 !left-6 !bottom-6" />
            <MiniMap
              nodeStrokeColor={n => {
                if (n.type === 'worker') return '#0ea5e9';
                if (n.type === 'task') return '#2dd4bf';
                return '#1e293b';
              }}
              className="!bg-slate-900 !border-slate-800 !right-6 !bottom-6"
              maskColor="rgba(15, 23, 42, 0.7)"
            />
            <Background color="#1e293b" gap={20} size={1} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
