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

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'visual' | 'timeline'>('list');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedSku, setSelectedSku] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<TaskType[]>([]);
  const [selectedMode, setSelectedMode] = useState<TaskMode>('single');
  const [pieces, setPieces] = useState('');
  const [due_date, setDueDate] = useState('');
  const [table, setTable] = useState('');
  const [isScanningSku, setIsScanningSku] = useState(false);
  const [skuSearch, setSkuSearch] = useState('');
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

  const openAdd = () => { resetForm(); setFormMode('add'); };
  const openBulk = () => { resetForm(); setFormMode('bulk'); };

  const openEdit = (a: Assignment) => {
    setFormMode('edit');
    setEditingId(a.id);
    setSelectedUsers([a.user_id]);
    setSelectedSku(a.sku);
    setSelectedTasks([a.task_type]);
    setSelectedMode(a.mode);
    setPieces(String(a.pieces_assigned));
    setDueDate(a.due_date || '');
    setTable(a.table || '');
  };

  const toggleBulkUser = (id: string) => {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]);
  };

  const handleScanSku = (v: string) => {
    const match = products.find(p => p.sku === v);
    setSelectedSku(match ? match.sku : v);
    setIsScanningSku(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSku || selectedTasks.length === 0 || !pieces) return;

    if (formMode === 'edit' && editingId) {
      updateAssignment(editingId, {
        sku: selectedSku,
        task_type: selectedTasks[0],
        mode: selectedMode,
        pieces_assigned: parseInt(pieces, 10),
        target_qty: parseInt(pieces, 10),
        due_date: due_date || undefined,
        table: table || undefined,
      });
    } else {
      let targets = selectedUsers.length > 0 ? [...selectedUsers] : [];
      if (targets.length === 0 || !targets[0]) return;
      
      targets.forEach(uid => {
        selectedTasks.forEach(taskType => {
          addAssignment({
            date: today,
            due_date: due_date || undefined,
            user_id: uid,
            sku: selectedSku,
            task_type: taskType,
            mode: selectedMode,
            pieces_assigned: parseInt(pieces, 10),
            target_qty: parseInt(pieces, 10),
            table: table || undefined,
            assigned_by: session.currentUser!.id,
          });
        });
      });
    }
    resetForm();
  };

  const handleClearAssignments = async () => {
    setClearing(true);
    setShowClearConfirm(false);
    try { await clearAssignments(); } finally { setClearing(false); }
  };

  const filtered = useMemo(() => {
    return assignments
      .filter(a => {
        const worker = users.find(u => u.id === a.user_id);
        const text = `${a.sku} ${a.task_type} ${worker?.name || ''}`.toLowerCase();
        if (searchTerm && !text.includes(searchTerm.toLowerCase())) return false;
        if (filterWorker && a.user_id !== filterWorker) return false;
        if (filterDate && a.date !== filterDate) return false;
        if (filterStatus !== 'all' && a.status !== filterStatus) return false;
        if (filterLocation && worker?.location_id !== filterLocation) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [assignments, users, searchTerm, filterWorker, filterDate, filterStatus, filterLocation]);

  const activeFilterCount = [filterWorker, filterDate, filterLocation, filterStatus !== 'all'].filter(Boolean).length;
  const statusColors: Record<string, string> = { pending: 'text-yellow-400 bg-yellow-500/10', in_progress: 'text-blue-400 bg-blue-500/10', completed: 'text-teal-400 bg-teal-500/10' };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Assignment Management</h1>
          <p className="text-slate-400 text-sm mt-1">{filtered.length} assignments shown</p>
        </div>
        
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button onClick={() => setViewMode('list')} className={`flex items-center px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}><LayoutGrid className="w-4 h-4 mr-2" /> List</button>
          <button onClick={() => setViewMode('visual')} className={`flex items-center px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${viewMode === 'visual' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}><Network className="w-4 h-4 mr-2" /> Visual Flow</button>
          <button onClick={() => setViewMode('timeline')} className={`flex items-center px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${viewMode === 'timeline' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}><Calendar className="w-4 h-4 mr-2" /> Timeline</button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(v => !v)} className={`flex items-center px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${showFilters || activeFilterCount > 0 ? 'bg-custom-blue/10 border-custom-blue/40 text-custom-blue' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'}`}><Filter className="w-4 h-4 mr-1.5" /> Filters {activeFilterCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-custom-blue text-white rounded-full text-[10px] font-bold">{activeFilterCount}</span>}<ChevronDown className={`w-3.5 h-3.5 ml-1.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} /></button>
          <button onClick={openBulk} className="flex items-center px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors border border-slate-700"><Users className="w-4 h-4 mr-2" /> Bulk Assign</button>
          {isAdmin && assignments.length > 0 && <button onClick={() => setShowClearConfirm(true)} disabled={clearing} className="flex items-center px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-medium rounded-xl text-sm transition-all"><Trash2 className="w-4 h-4 mr-2" /> Clear All</button>}
          <button onClick={openAdd} className="flex items-center px-4 py-2 bg-custom-blue text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors whitespace-nowrap"><Plus className="w-4 h-4 mr-2" /> New Assignment</button>
        </div>
      </div>

      {viewMode === 'visual' ? <WorkflowBuilder /> : viewMode === 'timeline' ? <GanttView /> : (
        <>
          <div className="space-y-3">
             <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by SKU, task, or worker name..." className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white w-full focus:border-custom-blue outline-none" /></div>
             {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                   <select value={filterWorker} onChange={e => setFilterWorker(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-custom-blue"><option value="">All Workers</option>{workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
                   <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-custom-blue [color-scheme:dark]" />
                   <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as StatusFilter)} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-custom-blue"><option value="all">All Statuses</option><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select>
                   <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-custom-blue"><option value="">All Locations</option>{settings.locations?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
                </div>
             )}
          </div>

          {formMode && (
             <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-white flex items-center gap-2">{formMode === 'edit' ? 'Edit Assignment' : formMode === 'bulk' ? 'Bulk Assign' : 'New Assignment'}</h2><button type="button" onClick={resetForm} className="p-1.5 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                   <div className="lg:col-span-3">
                      <label className="block text-sm font-medium text-slate-300 mb-2">{formMode === 'bulk' ? 'Select Workers' : 'Worker'}</label>
                      {formMode === 'bulk' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{workers.map(w => <button key={w.id} type="button" onClick={() => toggleBulkUser(w.id)} className={`p-2.5 rounded-xl border text-sm font-medium transition-all ${selectedUsers.includes(w.id) ? 'bg-custom-blue/10 border-custom-blue/50 text-custom-blue' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>{w.name}</button>)}</div>
                      ) : (
                        <select required value={selectedUsers[0] || ''} onChange={e => setSelectedUsers([e.target.value])} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue"><option value="">Select worker...</option>{workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
                      )}
                   </div>
                   <div><label className="block text-sm font-medium text-slate-300 mb-2">Product SKU</label><select required value={selectedSku} onChange={e => setSelectedSku(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue"><option value="">Select SKU...</option>{products.map(p => <option key={p.sku} value={p.sku}>{p.sku} — {p.name}</option>)}</select></div>
                   <div><label className="block text-sm font-medium text-slate-300 mb-2">Task Type</label><select required value={selectedTasks[0] || ''} onChange={e => setSelectedTasks([e.target.value as TaskType])} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue"><option value="">Select task...</option>{tasks.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}</select></div>
                   <div><label className="block text-sm font-medium text-slate-300 mb-2">Target Quantity</label><input required type="number" min="1" value={pieces} onChange={e => setPieces(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue" /></div>
                   <div><label className="block text-sm font-medium text-slate-300 mb-2">Due Date</label><input type="date" value={due_date} onChange={e => setDueDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue [color-scheme:dark]" /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800"><button type="button" onClick={resetForm} className="px-5 py-2.5 text-slate-400 hover:text-white">Cancel</button><button type="submit" className="px-6 py-2.5 bg-custom-blue text-white rounded-xl font-medium shadow-lg shadow-custom-blue/20">Save Assignment</button></div>
             </form>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
             {filtered.map(assignment => {
                const worker = users.find(u => u.id === assignment.user_id);
                const totalGoal = (assignment.target_qty || assignment.pieces_assigned) + (assignment.pieces_carried_forward || 0);
                const progress = totalGoal > 0 ? Math.min(100, Math.round((assignment.pieces_completed / totalGoal) * 100)) : 0;
                return (
                   <div key={assignment.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors group">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap"><span className="px-2.5 py-1 rounded bg-slate-800 text-[10px] font-black text-slate-300 uppercase tracking-widest">{assignment.sku}</span><span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${statusColors[assignment.status]}`}>{assignment.status.replace('_', ' ')}</span></div>
                          <h3 className="text-base font-bold text-white flex items-center gap-2">{assignment.task_type} {assignment.table && <span className="px-2 py-0.5 rounded-md text-[8px] uppercase font-black bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">{assignment.table}</span>}</h3>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">{assignment.status !== 'completed' && <button onClick={() => openEdit(assignment)} className="p-1.5 text-slate-500 hover:text-custom-blue transition-colors"><Edit className="w-4 h-4" /></button>}<div className={`p-2 rounded-xl ml-1 ${assignment.status !== 'completed' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-teal-500/10 text-teal-500'}`}>{assignment.status !== 'completed' ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}</div></div>
                      </div>
                      <div className="flex items-center mb-5"><div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-xs font-bold mr-3">{worker?.name?.[0] || '?'}</div><div className="text-xs"><p className="text-white font-bold">{worker?.name || 'Unknown'}</p><div className="flex items-center text-slate-500 mt-0.5 font-bold uppercase tracking-widest text-[8px]"><Calendar className="w-3 h-3 mr-1" />{assignment.date}</div></div></div>
                      <div className="pt-4 border-t border-slate-800/50">
                        <div className="flex justify-between text-[10px] mb-2 font-black uppercase tracking-widest"><span className="text-slate-500">Progress</span><span className="text-white">{assignment.pieces_completed} / {totalGoal} ({progress}%)</span></div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full transition-all duration-500 ${assignment.status === 'completed' ? 'bg-emerald-400' : 'bg-custom-blue'}`} style={{ width: `${progress}%` }} /></div>
                      </div>
                   </div>
                );
             })}
          </div>
        </>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex flex-col items-center text-center mb-8"><div className="w-16 h-16 rounded-3xl bg-rose-500/10 flex items-center justify-center mb-6"><AlertCircle className="w-8 h-8 text-rose-500" /></div><h3 className="text-xl font-black text-white uppercase tracking-tighter">Wipe Ledger?</h3><p className="text-xs text-slate-500 mt-2 font-bold leading-relaxed uppercase tracking-widest font-black">This will delete all assignments from the cloud database.</p></div>
            <div className="flex flex-col gap-3"><button onClick={() => setShowClearConfirm(false)} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Cancel</button><button onClick={handleClearAssignments} className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-rose-500/20">Confirm Wipe</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
