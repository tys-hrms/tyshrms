import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useApp } from '../../contexts/AppContext';
import { Plus, Trash2, Edit2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Workstation } from '../../types';
export default function WorkstationSettings() {
  const { settings, updateWorkstations } = useSettings();
  const { tasks } = useApp();
  const workstations = settings.workstations || [];

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<Workstation, 'id'>>({
    name: '',
    taskTypes: [],
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.taskTypes.length === 0) return;

    if (editingId) {
      updateWorkstations(workstations.map(w => w.id === editingId ? { ...formData, id: editingId } : w));
    } else {
      updateWorkstations([...workstations, { ...formData, id: crypto.randomUUID() }]);
    }
    
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', taskTypes: [] });
  };

  const startEdit = (w: Workstation) => {
    setEditingId(w.id);
    setFormData({ name: w.name, taskTypes: w.taskTypes || (w as any).taskType ? [(w as any).taskType] : [] });
    setIsAdding(true);
  };

  const deleteStation = (id: string) => {
    if (window.confirm('Delete this workstation?')) {
      updateWorkstations(workstations.filter(w => w.id !== id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Workstations & Tables</h2>
          <p className="text-sm text-slate-400 mt-1">Define tables and assign them specific task types.</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center px-4 py-2 bg-custom-blue hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Table
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative">
          <h3 className="text-lg font-bold text-white mb-4">{editingId ? 'Edit Table' : 'New Table'}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Table Name</label>
              <input 
                required 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Table 1, Ironing Station A"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Assigned Task Type</label>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 grid grid-cols-2 gap-2 h-[120px] overflow-y-auto custom-scrollbar">
                {tasks.map(t => (
                  <label key={t.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-700/50 rounded-lg group transition-colors">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-custom-blue focus:ring-custom-blue focus:ring-offset-slate-800"
                      checked={formData.taskTypes.includes(t.name)}
                      onChange={e => {
                        const types = e.target.checked
                          ? [...formData.taskTypes, t.name]
                          : formData.taskTypes.filter(x => x !== t.name);
                        setFormData({ ...formData, taskTypes: types });
                      }}
                    />
                    <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors select-none">{t.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button 
              type="button" 
              onClick={() => { setIsAdding(false); setEditingId(null); setFormData({ name: '', taskTypes: [] }); }}
              className="px-5 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-custom-blue hover:bg-blue-600 text-white rounded-xl font-medium transition-colors">
              Save Table
            </button>
          </div>
        </form>
      )}

      {/* Grid of Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workstations.map(station => (
          <div key={station.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors group">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-bold text-white">{station.name}</h3>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => startEdit(station)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => deleteStation(station.id)}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-slate-500">Tasks:</span>
              <div className="flex flex-wrap gap-1">
                {(station.taskTypes || ((station as any).taskType ? [(station as any).taskType] : [])).map((tt: string) => (
                  <span key={tt} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md text-xs font-semibold uppercase tracking-wider">
                    {tt}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}

        {workstations.length === 0 && !isAdding && (
          <div className="col-span-full py-12 text-center bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-2xl">
            <h3 className="text-lg font-medium text-white mb-2">No Workstations Configured</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-4">
              Define physical tables or stations in your warehouse and assign them to specific task types (e.g., Table 1 for Checking).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
