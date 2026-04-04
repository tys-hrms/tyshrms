import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { TaskMode, TaskDefinition } from '../../types';
import { Plus, Trash2, Settings2, Edit, X, Save } from 'lucide-react';

const SYSTEM_TASK_NAMES = ['Ironing', 'Checking', 'Labeling', 'Packing'];

export default function TasksManager() {
  const { tasks, addTask, updateTask, deleteTask } = useApp();
  const { session } = useAuth();
  const role = session.currentUser?.role;
  const canEdit = role === 'Admin' || role === 'Manager';

  // Form state (shared for add + edit)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formModes, setFormModes] = useState<TaskMode[]>(['single']);
  const [formDefault, setFormDefault] = useState<TaskMode>('single');

  const toggleMode = (mode: TaskMode) => {
    setFormModes(prev => {
      if (prev.includes(mode)) {
        const next = prev.filter(m => m !== mode);
        return next.length > 0 ? next : prev;
      }
      return [...prev, mode];
    });
  };

  const openAdd = () => {
    setEditingId(null);
    setFormName('');
    setFormModes(['single']);
    setFormDefault('single');
    setIsFormOpen(true);
  };

  const openEdit = (task: TaskDefinition) => {
    setEditingId(task.id);
    setFormName(task.name);
    setFormModes([...task.allowed_modes]);
    setFormDefault(task.default_mode);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const validDefault: TaskMode = formModes.includes(formDefault) ? formDefault : formModes[0];

    if (editingId) {
      updateTask(editingId, {
        name: formName.trim(),
        allowed_modes: formModes,
        default_mode: validDefault,
      });
    } else {
      addTask({
        id: `task_${Date.now()}`,
        name: formName.trim(),
        allowed_modes: formModes,
        default_mode: validDefault,
        created_at: new Date().toISOString(),
      });
    }
    closeForm();
  };

  const isEditing = editingId !== null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-start">
        <div className="max-w-xl">
          <h2 className="text-xl font-bold text-white mb-2">Warehouse Task Types</h2>
          <p className="text-sm text-slate-400">
            Define the types of physical work that can be assigned to workers, and which
            assignment modes (Single item vs paired Jodi) apply.
          </p>
        </div>
        {canEdit && !isFormOpen && (
          <button
            onClick={openAdd}
            className="flex items-center px-4 py-2 bg-custom-blue hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" /> Custom Task
          </button>
        )}
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">
              {isEditing ? `Edit Task — ${formName}` : 'Create New Task Definition'}
            </h3>
            <button type="button" onClick={closeForm} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">Task Name</label>
              <input
                required
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g. Quality Assurance"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center text-sm font-medium text-slate-300 mb-3">
                <Settings2 className="w-4 h-4 mr-2 text-slate-400" />
                Allowed Modes Configuration
              </label>
              <div className="flex gap-4">
                {(['single', 'jodi'] as TaskMode[]).map(mode => (
                  <label key={mode} className="flex items-center space-x-3 cursor-pointer p-4 bg-slate-800 rounded-xl border border-slate-700 flex-1">
                    <input
                      type="checkbox"
                      checked={formModes.includes(mode)}
                      onChange={() => toggleMode(mode)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-custom-blue focus:ring-custom-blue"
                    />
                    <div>
                      <div className="text-white font-medium text-sm">{mode === 'single' ? 'Single Mode' : 'Jodi Mode'}</div>
                      <div className="text-slate-400 text-xs mt-0.5">{mode === 'single' ? '1 assigned = 1 piece' : '1 assigned = 2 pieces pair'}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {formModes.length > 1 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Default Mode</label>
                <div className="flex gap-3">
                  {formModes.map(mode => (
                    <label key={mode} className="flex items-center gap-2 cursor-pointer p-3 bg-slate-800 rounded-xl border border-slate-700">
                      <input
                        type="radio"
                        name="defaultMode"
                        value={mode}
                        checked={formDefault === mode}
                        onChange={() => setFormDefault(mode)}
                        className="text-custom-blue focus:ring-custom-blue"
                      />
                      <span className="text-white text-sm capitalize">{mode}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" onClick={closeForm} className="px-5 py-2 text-slate-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" className="flex items-center px-5 py-2 bg-custom-blue text-white rounded-xl font-medium hover:bg-blue-600 transition-colors">
              <Save className="w-4 h-4 mr-2" />
              {isEditing ? 'Update Task' : 'Save Task'}
            </button>
          </div>
        </form>
      )}

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map(task => {
          const isSystem = SYSTEM_TASK_NAMES.includes(task.name);

          return (
            <div key={task.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <h3 className="text-base font-bold text-white truncate">{task.name}</h3>
                  {isSystem && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                      System
                    </span>
                  )}
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button
                      onClick={() => openEdit(task)}
                      title="Edit task"
                      className="p-1.5 text-slate-500 hover:text-custom-blue hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {!isSystem && (
                      <button
                        onClick={() => deleteTask(task.id)}
                        title="Delete task"
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="text-sm">
                  <span className="text-slate-500 block mb-1.5">Supported Modes</span>
                  <div className="flex gap-2 flex-wrap">
                    {task.allowed_modes.map(m => (
                      <span
                        key={m}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase ${
                          m === 'single'
                            ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-sm border-t border-slate-800/60 pt-3 flex justify-between">
                  <span className="text-slate-500">Default Flow</span>
                  <span className="text-slate-300 font-medium capitalize">{task.default_mode} Mode</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
