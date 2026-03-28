import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useApp } from '../../contexts/AppContext';
import { TaskType, TaskMode, Assignment } from '../../types';
import {
  Plus, Search, Calendar, CheckCircle2, Clock, CheckSquare,
  AlertCircle, ScanBarcode, Edit, X, Save, Users, Filter, ChevronDown, LayoutGrid, Network, Trash2
} from 'lucide-react';
import QRScanner from '../../components/ui/QRScanner';
import WorkflowBuilder from './WorkflowBuilder';
import GanttView from './GanttView';

type FormMode = 'add' | 'edit' | 'bulk' | null;
type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed';

const today = new Date().toISOString().split('T')[0];

export default function AssignmentManager() {
  const { session, users } = useAuth();
  const { settings } = useSettings();
  const { products, tasks, assignments, addAssignment, updateAssignment, clearAssignments } = useApp();
  const isAdmin = session.currentUser?.role === 'Admin';

  const workstations = settings.workstations || [];

  // ─── Form state ────────────────────────────────────────────────────────────
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'visual' | 'timeline'>('list');

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]); // supports bulk
  const [selectedSku, setSelectedSku] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<TaskType[]>([]);
  const [selectedMode, setSelectedMode] = useState<TaskMode>('single');
  const [pieces, setPieces] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [table, setTable] = useState('');
  const [isScanningSku, setIsScanningSku] = useState(false);
  const [skuSearch, setSkuSearch] = useState('');

  // ─── Filter state ───────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWorker, setFilterWorker] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [filterLocation, setFilterLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const workers = users.filter(u => u.role === 'Worker');
  const activeTaskObj = selectedTasks.length > 0 ? tasks.find(t => t.name === selectedTasks[0]) : null;

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormMode(null);
    setEditingId(null);
    setSelectedTasks([]);
    setSelectedMode('single');
    setPieces('');
    setDueDate('');
    setTable('');
    setSelectedUsers([]);
    setSkuSearch('');
  };

  const openAdd = () => {
    resetForm();
    setFormMode('add');
  };

  const openBulk = () => {
    resetForm();
    setFormMode('bulk');
  };

  const openEdit = (a: Assignment) => {
    setFormMode('edit');
    setEditingId(a.id);
    setSelectedUsers([a.userId]);
    setSelectedSku(a.sku);
    setSelectedTasks([a.taskType]);
    setSelectedMode(a.mode);
    setPieces(String(a.piecesAssigned));
    setDueDate(a.dueDate || '');
    setTable(a.table || '');
  };

  const toggleBulkUser = (id: string) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    );
  };

  const handleScanSku = (v: string) => {
    const match = products.find(p => p.barcode === v || p.sku === v);
    setSelectedSku(match ? match.sku : v);
    setIsScanningSku(false);
  };

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSku || selectedTasks.length === 0 || !pieces) return;

    if (formMode === 'edit' && editingId) {
      updateAssignment(editingId, {
        sku: selectedSku,
        taskType: selectedTasks[0],
        mode: selectedMode,
        piecesAssigned: parseInt(pieces, 10),
        targetQty: parseInt(pieces, 10),
        dueDate: dueDate || undefined,
        table: table || undefined,
      });
    } else {
      // Add or Bulk: one assignment per selected user
      let targets = selectedUsers.length > 0 ? [...selectedUsers] : [];
      
      if (formMode === 'add') {
        if (selectedMode === 'single') targets = [selectedUsers[0]];
        if (selectedMode === 'jodi') {
           if (!selectedUsers[0] || !selectedUsers[1]) {
             alert('Please select two different workers for Jodi assignment.');
             return;
           }
           if (selectedUsers[0] === selectedUsers[1]) {
             alert('Cannot select the same worker twice for a Jodi assignment.');
             return;
           }
           targets = [selectedUsers[0], selectedUsers[1]];
        }
      }

      if (targets.length === 0 || !targets[0]) return;
      
      targets.forEach(uid => {
        selectedTasks.forEach(taskType => {
          addAssignment({
            date: today,
            dueDate: dueDate || undefined,
            userId: uid,
            sku: selectedSku,
            taskType: taskType,
            mode: selectedMode,
            piecesAssigned: parseInt(pieces, 10),
            targetQty: parseInt(pieces, 10),
            table: table || undefined,
            assignedBy: session.currentUser!.id,
          });
        });
      });
    }
    resetForm();
  };

  const handleClearAssignments = async () => {
    setClearing(true);
    setShowClearConfirm(false);
    try {
      await clearAssignments();
    } finally {
      setClearing(false);
    }
  };

  // ─── Filtered assignments ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return assignments
      .filter(a => {
        const worker = users.find(u => u.id === a.userId);
        const text = `${a.sku} ${a.taskType} ${worker?.name || ''}`.toLowerCase();
        if (searchTerm && !text.includes(searchTerm.toLowerCase())) return false;
        if (filterWorker && a.userId !== filterWorker) return false;
        if (filterDate && a.date !== filterDate) return false;
        if (filterStatus !== 'all' && a.status !== filterStatus) return false;
        if (filterLocation && worker?.locationId !== filterLocation) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [assignments, users, searchTerm, filterWorker, filterDate, filterStatus, filterLocation]);

  const activeFilterCount = [filterWorker, filterDate, filterLocation, filterStatus !== 'all'].filter(Boolean).length;

  const statusColors: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-500/10',
    in_progress: 'text-blue-400 bg-blue-500/10',
    completed: 'text-teal-400 bg-teal-500/10',
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Assignment Management</h1>
          <p className="text-slate-400 text-sm mt-1">
            {filtered.length} of {assignments.length} assignments shown
          </p>
        </div>
        
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'list' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <LayoutGrid className="w-4 h-4 mr-2" /> List
          </button>
          <button
            onClick={() => setViewMode('visual')}
            className={`flex items-center px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              viewMode === 'visual' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Network className="w-4 h-4 mr-2" /> Visual Flow
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`flex items-center px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              viewMode === 'timeline' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" /> Timeline
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${showFilters || activeFilterCount > 0 ? 'bg-custom-blue/10 border-custom-blue/40 text-custom-blue' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'}`}
          >
            <Filter className="w-4 h-4 mr-1.5" />
            Filters {activeFilterCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-custom-blue text-white rounded-full text-[10px] font-bold">{activeFilterCount}</span>}
            <ChevronDown className={`w-3.5 h-3.5 ml-1.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          
          <button
            onClick={openBulk}
            className="flex items-center px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors border border-slate-700"
          >
            <Users className="w-4 h-4 mr-2" /> Bulk Assign
          </button>

          {isAdmin && assignments.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={clearing}
              title="Clear all assignments (Admin only)"
              className={`flex items-center px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 rounded-xl text-sm font-medium transition-all ${clearing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Trash2 className={`w-4 h-4 mr-2 ${clearing ? 'animate-pulse' : ''}`} />
              {clearing ? 'Clearing...' : 'Clear All'}
            </button>
          )}

          <button
            onClick={openAdd}
            className="flex items-center px-4 py-2 bg-custom-blue text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-2" /> New Assignment
          </button>
        </div>
      </div>

      {viewMode === 'visual' ? (
        <WorkflowBuilder />
      ) : viewMode === 'timeline' ? (
        <GanttView />
      ) : (
        <>
          {/* Search + Filters */}
          <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by SKU, task, or worker name..."
            className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white w-full focus:border-custom-blue outline-none"
          />
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Worker</label>
              <select
                value={filterWorker}
                onChange={e => setFilterWorker(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-custom-blue"
              >
                <option value="">All Workers</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-custom-blue [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as StatusFilter)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-custom-blue"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Location</label>
              <select
                value={filterLocation}
                onChange={e => setFilterLocation(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-custom-blue"
              >
                <option value="">All Locations</option>
                {settings.locations?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setFilterWorker(''); setFilterDate(''); setFilterStatus('all'); setFilterLocation(''); }}
                className="sm:col-span-4 text-xs text-red-400 hover:text-red-300 transition-colors text-left"
              >
                ✕ Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit / Bulk Form */}
      {formMode && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {formMode === 'edit' && <><Edit className="w-5 h-5 text-custom-blue" /> Edit Assignment</>}
              {formMode === 'add' && <><CheckSquare className="w-5 h-5 text-custom-blue" /> New Assignment</>}
              {formMode === 'bulk' && <><Users className="w-5 h-5 text-custom-blue" /> Bulk Assign</>}
            </h2>
            <button type="button" onClick={resetForm} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

            {/* Worker select (single or bulk) */}
            {formMode === 'bulk' ? (
              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Select Workers <span className="text-slate-500 text-xs">({selectedUsers.length} selected)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {workers.map(w => {
                    const active = selectedUsers.includes(w.id);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => toggleBulkUser(w.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm font-medium transition-all ${active ? 'bg-custom-blue/10 border-custom-blue/50 text-custom-blue' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                      >
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {w.name[0]}
                        </div>
                        <span className="truncate">{w.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300 mb-2">Worker(s)</label>
                <select
                  required
                  value={selectedUsers[0] || ''}
                  onChange={e => {
                    const newUsers = [...selectedUsers];
                    newUsers[0] = e.target.value;
                    setSelectedUsers(newUsers);
                  }}
                  disabled={formMode === 'edit'}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-custom-blue disabled:opacity-50"
                >
                  <option value="">Select worker 1...</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>

                {selectedMode === 'jodi' && formMode === 'add' && (
                  <select
                    required
                    value={selectedUsers[1] || ''}
                    onChange={e => {
                      const newUsers = [...selectedUsers];
                      newUsers[1] = e.target.value;
                      setSelectedUsers(newUsers);
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-custom-blue animate-in slide-in-from-top-2"
                  >
                    <option value="">Select worker 2...</option>
                    {workers.map(w => <option key={w.id} value={w.id} disabled={w.id === selectedUsers[0]}>{w.name}</option>)}
                  </select>
                )}
              </div>
            )}

            {/* SKU */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-300">Product SKU</label>
                <button
                  type="button"
                  onClick={() => setIsScanningSku(true)}
                  className="text-xs flex items-center text-teal-400 hover:text-teal-300 bg-teal-400/10 px-2 py-1 rounded-lg"
                >
                  <ScanBarcode className="w-3.5 h-3.5 mr-1" /> Scan
                </button>
              </div>
              <div className="flex gap-2">
                <div className="relative w-40 shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={skuSearch}
                    onChange={e => setSkuSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2.5 text-sm text-white outline-none focus:border-custom-blue placeholder-slate-600"
                  />
                </div>
                <select
                  required
                  value={selectedSku}
                  onChange={e => setSelectedSku(e.target.value)}
                  className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-custom-blue"
                >
                  <option value="">Select SKU...</option>
                  {products
                    .filter(p => {
                      const q = skuSearch.toLowerCase();
                      return !q || p.sku.toLowerCase().includes(q) || p.title.toLowerCase().includes(q);
                    })
                    .map(p => (
                      <option key={p.sku} value={p.sku}>{p.sku} — {p.title}</option>
                    ))
                  }
                </select>
              </div>
              {skuSearch && (
                <p className="text-[10px] text-slate-500 mt-1">
                  {products.filter(p => p.sku.toLowerCase().includes(skuSearch.toLowerCase()) || p.title.toLowerCase().includes(skuSearch.toLowerCase())).length} result(s)
                </p>
              )}
            </div>

            {/* Task Type */}
            <div className={formMode !== 'edit' ? 'lg:col-span-3' : ''}>
              <label className="block text-sm font-medium text-slate-300 mb-2">Task Type(s)</label>
              {formMode === 'edit' ? (
                <select
                  required
                  value={selectedTasks[0] || ''}
                  onChange={e => setSelectedTasks([e.target.value as TaskType])}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-custom-blue"
                >
                  <option value="">Select task...</option>
                  {tasks.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tasks.map(t => {
                    const active = selectedTasks.includes(t.name as TaskType);
                    return (
                      <label 
                        key={t.id} 
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-all ${active ? 'bg-custom-blue/10 border-custom-blue/50 text-custom-blue' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={active}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedTasks([...selectedTasks, t.name as TaskType]);
                            else setSelectedTasks(selectedTasks.filter(x => x !== t.name));
                          }}
                        />
                        {t.name}
                      </label>
                    );
                  })}
                  {selectedTasks.length === 0 && (
                     <p className="text-xs text-red-400 mt-2 w-full">Please select at least one task type.</p>
                  )}
                </div>
              )}
            </div>

            {/* Mode */}
            {activeTaskObj && activeTaskObj.allowedModes.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Mode</label>
                <div className="flex gap-2">
                  {activeTaskObj.allowedModes.map(m => (
                    <button
                      key={m} type="button" onClick={() => setSelectedMode(m)}
                      className={`flex-1 py-2.5 rounded-xl font-medium text-sm capitalize border transition-all ${selectedMode === m ? 'bg-teal-500/20 border-teal-500/50 text-teal-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pieces */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Target Quantity (pieces)</label>
              <input
                required type="number" min="1" value={pieces}
                onChange={e => setPieces(e.target.value)}
                placeholder="e.g. 100"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-custom-blue"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Due Date (Optional)</label>
              <input
                type="date" value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                min={today}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-custom-blue [color-scheme:dark]"
              />
            </div>

            {/* Table (Optional) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Table / Station (Optional)</label>
              <select
                value={table}
                onChange={e => setTable(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-custom-blue disabled:opacity-50"
              >
                <option value="">No specific table</option>
                {workstations
                  .filter(w => {
                    const types = w.taskTypes || ((w as any).taskType ? [(w as any).taskType] : []);
                    return selectedTasks.length === 0 || selectedTasks.some(t => types.includes(t));
                  })
                  .map(w => (
                    <option key={w.id} value={w.name}>{w.name}</option>
                  ))
                }
              </select>
            </div>
          </div>

          {isScanningSku && (
            <QRScanner onScan={handleScanSku} onClose={() => setIsScanningSku(false)} />
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" onClick={resetForm} className="px-5 py-2.5 text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button
              type="submit"
              disabled={formMode === 'bulk' && selectedUsers.length === 0}
              className="flex items-center px-6 py-2.5 bg-custom-blue text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-custom-blue/20"
            >
              <Save className="w-4 h-4 mr-2" />
              {formMode === 'edit' ? 'Update Assignment' : formMode === 'bulk' ? `Assign to ${selectedUsers.length} Worker${selectedUsers.length !== 1 ? 's' : ''}` : 'Create Assignment'}
            </button>
          </div>
        </form>
      )}

      {/* Assignments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(assignment => {
          const worker = users.find(u => u.id === assignment.userId);
          const totalGoal = (assignment.targetQty || assignment.piecesAssigned) + assignment.piecesCarriedForward;
          const progress = totalGoal > 0 ? Math.min(100, Math.round((assignment.piecesCompleted / totalGoal) * 100)) : 0;
          const isPending = assignment.status !== 'completed';
          const statusClass = statusColors[assignment.status] || 'text-slate-400 bg-slate-800';

          return (
            <div key={assignment.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-xs font-semibold text-slate-300 uppercase tracking-wider">{assignment.sku}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${assignment.mode === 'jodi' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-400'}`}>{assignment.mode}</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${statusClass}`}>{assignment.status.replace('_', ' ')}</span>
                  </div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {assignment.taskType}
                    {assignment.table && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        {assignment.table}
                      </span>
                    )}
                  </h3>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isPending && (
                    <button
                      onClick={() => openEdit(assignment)}
                      title="Edit assignment"
                      className="p-1.5 text-slate-500 hover:text-custom-blue hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  <div className={`p-2 rounded-xl ml-1 ${isPending ? 'bg-yellow-500/10 text-yellow-500' : 'bg-teal-500/10 text-teal-500'}`}>
                    {isPending ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              <div className="flex items-center mb-5">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-sm font-bold mr-3 shrink-0">
                  {worker?.name?.[0] || '?'}
                </div>
                <div className="text-sm">
                  <p className="text-white font-medium">{worker?.name || 'Unknown User'}</p>
                  <div className="flex items-center text-xs text-slate-500 mt-0.5">
                    <Calendar className="w-3 h-3 mr-1" />
                    {assignment.date}{assignment.dueDate ? ` → Due ${assignment.dueDate}` : ''}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/50">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Progress</span>
                  <span className="font-bold text-white">
                    {assignment.piecesCompleted} / {totalGoal} <span className="text-slate-500 font-normal text-xs">({progress}%)</span>
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isPending ? 'bg-custom-blue' : 'bg-teal-400'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {assignment.piecesCarriedForward > 0 && (
                  <p className="text-xs text-orange-400 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {assignment.piecesCarriedForward} pieces carried forward
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && !formMode && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl">
            <CheckSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-1">No Assignments Found</h3>
            <p className="text-slate-400 text-sm">
              {activeFilterCount > 0 ? 'Try adjusting your filters.' : "Click 'New Assignment' to assign tasks to your workforce."}
            </p>
          </div>
        )}
      </div>
        </>
      )}
      {/* Admin-only: Clear All Assignments confirm modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Clear All Assignments?</h3>
                <p className="text-sm text-slate-400">{assignments.length} assignments will be removed.</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              This will permanently delete all assignments from local storage{' '}
              <span className="text-red-400 font-medium">and from MongoDB</span>. Work logs will be preserved. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAssignments}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
