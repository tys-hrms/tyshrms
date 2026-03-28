import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Plus, Trash2, Edit2, MapPin, Building2, Store } from 'lucide-react';
import { Location, LocationType } from '../../types';

export default function LocationSettings() {
  const { settings, updateLocations } = useSettings();
  const locations = settings.locations || [];

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<Location, 'id'>>({
    name: '',
    type: 'branch',
    address: '',
    isPrimary: false,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingId) {
      updateLocations(locations.map(w => w.id === editingId ? { ...formData, id: editingId } : w));
    } else {
      updateLocations([...locations, { ...formData, id: crypto.randomUUID() }]);
    }
    
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', type: 'branch', address: '', isPrimary: false });
  };

  const startEdit = (w: Location) => {
    setEditingId(w.id);
    setFormData({ 
      name: w.name, 
      type: w.type, 
      address: w.address || '', 
      isPrimary: w.isPrimary || false 
    });
    setIsAdding(true);
  };

  const deleteLocation = (id: string) => {
    if (window.confirm('Delete this location? This may affect users assigned to it.')) {
      updateLocations(locations.filter(w => w.id !== id));
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
        case 'head_office': return <Building2 className="w-4 h-4 text-purple-400" />;
        case 'warehouse': return <Store className="w-4 h-4 text-custom-blue" />;
        default: return <MapPin className="w-4 h-4 text-teal-400" />;
    }
  };

  const formatType = (type: string) => {
      return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Ensure there's only one primary location if they select it
  const handlePrimaryToggle = (checked: boolean) => {
      if (checked) {
          // Unset others if needed, but for now just simple toggle in UI
          setFormData({ ...formData, isPrimary: true });
      } else {
          setFormData({ ...formData, isPrimary: false });
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Organization Locations</h2>
          <p className="text-sm text-slate-400 mt-1">Define your Head Office, Branches, and Warehouses.</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center px-4 py-2 bg-custom-blue hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Location
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4">{editingId ? 'Edit Location' : 'New Location'}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Location Name</label>
              <input 
                required 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Downtown Branch, Central Warehouse"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Location Type</label>
              <select 
                required 
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as LocationType })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue outline-none appearance-none"
              >
                <option value="head_office">Head Office</option>
                <option value="branch">Branch</option>
                <option value="warehouse">Warehouse</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">Address (Optional)</label>
              <input 
                type="text" 
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full street address..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue outline-none"
              />
            </div>
            
            <div className="md:col-span-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer bg-slate-800/50 p-3 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors w-fit">
                <input 
                    type="checkbox" 
                    checked={formData.isPrimary}
                    onChange={(e) => handlePrimaryToggle(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-700 text-custom-blue w-4 h-4 focus:ring-custom-blue focus:ring-offset-slate-900" 
                />
                <span className="text-sm font-medium text-slate-300">Mark as Primary/Headquarters Location</span>
              </label>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button 
              type="button" 
              onClick={() => { setIsAdding(false); setEditingId(null); setFormData({ name: '', type: 'branch', address: '', isPrimary: false }); }}
              className="px-5 py-2.5 text-slate-400 hover:text-white transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button type="submit" className="px-6 py-2.5 bg-custom-blue hover:bg-blue-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-custom-blue/20 transition-all">
              {editingId ? 'Update Location' : 'Save Location'}
            </button>
          </div>
        </form>
      )}

      {/* Grid of Locations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map(loc => (
          <div key={loc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors group relative overflow-hidden">
            {loc.isPrimary && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-custom-blue/20 to-transparent w-24 h-24 blur-2xl pointer-events-none" />
            )}
            <div className="flex justify-between items-start mb-3 relative">
              <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] uppercase font-bold tracking-wider text-slate-300">
                        {getTypeIcon(loc.type)}
                        {formatType(loc.type)}
                    </span>
                    {loc.isPrimary && (
                        <span className="px-2 py-0.5 bg-custom-blue/10 border border-custom-blue/20 rounded text-[10px] uppercase font-bold text-custom-blue">
                            Primary
                        </span>
                    )}
                </div>
                <h3 className="text-lg font-bold text-white mt-2">{loc.name}</h3>
              </div>
              
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => startEdit(loc)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => deleteLocation(loc.id)}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {loc.address && (
                <div className="flex items-start gap-2 mt-4 text-sm text-slate-400">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="line-clamp-2 leading-relaxed">{loc.address}</p>
                </div>
            )}
          </div>
        ))}

        {locations.length === 0 && !isAdding && (
          <div className="col-span-full py-16 text-center bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-2xl">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Locations Configured</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto">
              Define your company hierarchy by adding the Head Office, Branches, and Warehouses. This will be used for User Access Control and task routing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
