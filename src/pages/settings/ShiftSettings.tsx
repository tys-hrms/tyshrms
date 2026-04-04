import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Shift } from '../../types';
import { Clock, Plus, Trash2 } from 'lucide-react';

export default function ShiftSettings() {
  const { shifts, addShift, updateShift, deleteShift } = useSettings();
  
  const [isAdding, setIsAdding] = useState(false);
  const [newShift, setNewShift] = useState<Partial<Shift>>({
    name: '', start_time: '09:00', end_time: '18:00', lunch_start: '13:00', lunch_end: '14:00'
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShift.name) return;
    
    addShift({
      name: newShift.name,
      start_time: newShift.start_time!,
      end_time: newShift.end_time!,
      lunch_start: newShift.lunch_start!,
      lunch_end: newShift.lunch_end!
    });
    
    setIsAdding(false);
    setNewShift({ name: '', start_time: '09:00', end_time: '18:00', lunch_start: '13:00', lunch_end: '14:00' });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Shift & Timings</h2>
          <p className="text-sm text-slate-400">
            Define working hours and mandatory lunch breaks. These are used to calculate total active working hours.
          </p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center px-4 py-2 bg-custom-blue hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Shift
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">New Shift Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">Shift Name</label>
              <input required type="text" value={newShift.name} onChange={e => setNewShift({...newShift, name: e.target.value})} placeholder="e.g. Morning Shift" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Start Time</label>
              <input required type="time" value={newShift.start_time} onChange={e => setNewShift({...newShift, start_time: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue outline-none [color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">End Time</label>
              <input required type="time" value={newShift.end_time} onChange={e => setNewShift({...newShift, end_time: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue outline-none [color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Lunch Start</label>
              <input required type="time" value={newShift.lunch_start} onChange={e => setNewShift({...newShift, lunch_start: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue outline-none [color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Lunch End</label>
              <input required type="time" value={newShift.lunch_end} onChange={e => setNewShift({...newShift, lunch_end: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue outline-none [color-scheme:dark]" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-custom-blue text-white rounded-xl font-medium hover:bg-blue-600 transition-colors">Save Shift</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shifts.map(shift => (
          <div key={shift.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-white">{shift.name}</h3>
              <button onClick={() => deleteShift(shift.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-slate-400">
                  <Clock className="w-4 h-4 mr-2" /> Working Hours
                </div>
                <span className="font-medium text-white">{shift.start_time} - {shift.end_time}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-orange-400/80">
                  <Clock className="w-4 h-4 mr-2" /> Lunch Break
                </div>
                <span className="font-medium text-slate-300">{shift.lunch_start} - {shift.lunch_end}</span>
              </div>
            </div>
          </div>
        ))}
        {shifts.length === 0 && !isAdding && (
           <div className="col-span-full text-center py-10 bg-slate-900/50 border border-dashed border-slate-700 rounded-2xl text-slate-500">
             No shifts defined yet.
           </div>
        )}
      </div>
    </div>
  );
}
