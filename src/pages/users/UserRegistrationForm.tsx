import React, { useState } from 'react';
import { UserRole, TaskType, Shift } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useApp } from '../../contexts/AppContext';

interface UserRegistrationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function UserRegistrationForm({ onSuccess, onCancel }: UserRegistrationFormProps) {
  const { createUser } = useAuth();
  const { settings, shifts } = useSettings();
  const { tasks } = useApp();

  const [role, setRole] = useState<UserRole>('Worker');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [assignedTasks, setAssignedTasks] = useState<TaskType[]>([]);
  const [error, setError] = useState('');

  const toggleTask = (taskId: string) => {
    setAssignedTasks(prev => 
      prev.includes(taskId) ? prev.filter(t => t !== taskId) : [...prev, taskId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Name is required');
    if (pin.length < 4) return setError('PIN must be at least 4 digits');
    if (!/^\d+$/.test(pin)) return setError('PIN must be numeric');
    if (role === 'Worker' && assignedTasks.length === 0) {
      return setError('Worker must have at least one assigned task');
    }

    const success = createUser({
      name: name.trim(),
      pinCode: pin,
      role,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      shiftId: shiftId || undefined,
      locationId: locationId || undefined,
      assignedTasks: role === 'Worker' ? assignedTasks : undefined,
    });

    if (success) {
      onSuccess();
    } else {
      setError('A user with that PIN already exists. Try another PIN.');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Create New User</h2>
        <p className="text-sm text-slate-400">Set up a new {role} account</p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Role Selection */}
        <div className="grid grid-cols-3 gap-3">
          {(['Admin', 'Manager', 'Worker'] as UserRole[]).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => { setRole(r); setAssignedTasks([]); }}
              className={`py-2 px-4 rounded-xl text-sm font-medium border transition-all ${
                role === r 
                  ? 'bg-custom-blue border-custom-blue text-white shadow-lg shadow-custom-blue/20' 
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-custom-blue focus:ring-1 focus:ring-custom-blue transition-colors"
              placeholder="e.g. John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Login PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-custom-blue focus:ring-1 focus:ring-custom-blue transition-colors"
              placeholder="4-6 digits"
            />
          </div>
        </div>

        {/* Contact Info (Admins/Managers) */}
        {(role === 'Admin' || role === 'Manager') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email <span className="text-slate-500 text-xs">(optional)</span></label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-custom-blue focus:ring-1 focus:ring-custom-blue transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Phone <span className="text-slate-500 text-xs">(optional)</span></label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-custom-blue focus:ring-1 focus:ring-custom-blue transition-colors"
              />
            </div>
          </div>
        )}

        {/* Shift Assignment */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Working Shift <span className="text-slate-500 text-xs">(optional)</span></label>
          <select
            value={shiftId}
            onChange={e => setShiftId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-custom-blue focus:ring-1 focus:ring-custom-blue transition-colors appearance-none"
          >
            <option value="">No specific shift (Open)</option>
            {shifts.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
            ))}
          </select>
        </div>

        {/* Location Assignment */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Organization Location</label>
          <select
            value={locationId}
            onChange={e => setLocationId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-custom-blue focus:ring-1 focus:ring-custom-blue transition-colors appearance-none"
          >
            <option value="">No specific location (Global)</option>
            {(settings.locations || []).map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name} ({loc.type})</option>
            ))}
          </select>
        </div>

        {/* Tasks Assignment (Worker) */}
        {role === 'Worker' && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Assigned Tasks</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {tasks.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTask(t.name)}
                  className={`py-2 px-3 rounded-lg text-sm border flex items-center justify-between transition-colors ${
                    assignedTasks.includes(t.name)
                      ? 'bg-teal-500/20 border-teal-500/50 text-teal-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {t.name}
                  {assignedTasks.includes(t.name) && <span className="w-2 h-2 rounded-full bg-teal-400 ml-2" />}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl font-medium bg-custom-blue text-white hover:bg-blue-600 transition-colors"
          >
            Create User
          </button>
        </div>
      </form>
    </div>
  );
}
