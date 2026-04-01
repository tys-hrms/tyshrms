import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Plus, Trash2, Edit2, MapPin, Building2, Store, Map as MapIcon, Globe, ShieldCheck } from 'lucide-react';
import { Location, LocationType } from '../../types';
import { extractCoordsFromIframe } from '../../lib/location';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function LocationSettings() {
  const { settings, updateLocations } = useSettings();
  const locations = settings.locations || [];
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mapIframe, setMapIframe] = useState('');

  const [formData, setFormData] = useState<Omit<Location, 'id'>>({
    name: '',
    type: 'branch',
    address: '',
    isPrimary: false,
    latitude: 0,
    longitude: 0,
    geofenceRadius: 50,
  });

  const handleIframePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMapIframe(val);
    const coords = extractCoordsFromIframe(val);
    if (coords) {
      setFormData(prev => ({
        ...prev,
        latitude: coords.lat,
        longitude: coords.lng
      }));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingId) {
      updateLocations(locations.map(w => w.id === editingId ? { ...formData, id: editingId } : w));
    } else {
      updateLocations([...locations, { ...formData, id: generateId() }]);
    }
    
    setIsAdding(false);
    setEditingId(null);
    setMapIframe('');
    setFormData({ name: '', type: 'branch', address: '', isPrimary: false, latitude: 0, longitude: 0, geofenceRadius: 50 });
  };

  const startEdit = (w: Location) => {
    setEditingId(w.id);
    setFormData({ 
      name: w.name, 
      type: w.type, 
      address: w.address || '', 
      isPrimary: w.isPrimary || false,
      latitude: w.latitude || 0,
      longitude: w.longitude || 0,
      geofenceRadius: w.geofenceRadius || 50,
    });
    setIsAdding(true);
  };

  const deleteLocation = (id: string) => {
    if (window.confirm('Delete this location?')) {
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

  const formatType = (type: string) => type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const handleResetForm = () => {
    setIsAdding(false); 
    setEditingId(null); 
    setMapIframe('');
    setFormData({ name: '', type: 'branch', address: '', isPrimary: false, latitude: 0, longitude: 0, geofenceRadius: 50 });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Organization Locations</h2>
          <p className="text-sm text-slate-400 mt-1">Define your Headquarters and regional warehouses with Geofencing.</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center px-4 py-2 bg-custom-blue hover:bg-blue-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-custom-blue/20"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Location
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4">{editingId ? 'Edit Location' : 'New Location'}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div className="md:col-span-2">
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4 mb-2">
                    <div className="flex items-center gap-2 text-custom-blue mb-2">
                        <MapIcon className="w-4 h-4" />
                        <label className="text-sm font-bold uppercase tracking-wider">Auto-Sync from Google Maps</label>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">Paste the Google Maps "Embed a map" iframe HTML here to automatically extract coordinates.</p>
                    <textarea 
                        placeholder='<iframe src="https://www.google.com/maps/embed?..." ...></iframe>'
                        value={mapIframe}
                        onChange={handleIframePaste}
                        className="w-full h-20 bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-300 focus:border-custom-blue outline-none font-mono"
                    />
                </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Location Name</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Location Type</label>
              <select required value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as LocationType })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue outline-none appearance-none">
                <option value="head_office">Head Office</option>
                <option value="branch">Branch</option>
                <option value="warehouse">Warehouse</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Address</label>
              <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-custom-blue outline-none" />
            </div>

            {/* Geofencing Fields */}
            <div className="md:col-span-2 grid grid-cols-3 gap-4 bg-slate-800/20 p-4 rounded-xl border border-slate-800">
                <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Latitude</label>
                    <input type="number" step="any" value={formData.latitude} onChange={e => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-custom-blue outline-none" />
                </div>
                <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Longitude</label>
                    <input type="number" step="any" value={formData.longitude} onChange={e => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-custom-blue outline-none" />
                </div>
                <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Radius (Meters)</label>
                    <input type="number" value={formData.geofenceRadius} onChange={e => setFormData({ ...formData, geofenceRadius: parseInt(e.target.value) || 50 })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-custom-blue outline-none" />
                </div>
            </div>
            
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer bg-slate-800/50 p-3 rounded-xl border border-slate-700 w-fit">
                <input type="checkbox" checked={formData.isPrimary} onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })} className="rounded bg-slate-700 text-custom-blue w-4 h-4" />
                <span className="text-sm font-medium text-slate-300">Mark as Headquarters</span>
              </label>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
            <button type="button" onClick={handleResetForm} className="px-5 py-2.5 text-slate-400 text-sm font-medium">Cancel</button>
            <button type="submit" className="px-8 py-2.5 bg-custom-blue text-white rounded-xl text-sm font-bold shadow-lg shadow-custom-blue/20">
              {editingId ? 'Update Location' : 'Save Location'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
        {locations.map(loc => (
          <div key={loc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors group relative overflow-hidden">
            {/* Geofence Status Indicator */}
            <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-custom-blue/5 rounded-full blur-2xl" />
            
            <div className="flex justify-between items-start mb-3 relative">
              <div>
                <div className="flex items-center gap-2 mb-1 text-[10px] uppercase font-bold text-slate-300">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 border border-slate-700 rounded">
                        {getTypeIcon(loc.type)} {formatType(loc.type)}
                    </span>
                    {loc.isPrimary && <span className="px-2 py-0.5 bg-custom-blue/10 border border-custom-blue/20 rounded text-custom-blue">Primary</span>}
                </div>
                <h3 className="text-lg font-bold text-white mt-2">{loc.name}</h3>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(loc)} className="p-2 text-slate-400 hover:text-white"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => deleteLocation(loc.id)} className="p-2 text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            
            <div className="space-y-4 relative">
                {loc.address && <div className="flex items-start gap-2 py-3 border-t border-slate-800/50 mt-3 text-sm text-slate-400"><MapPin className="w-4 h-4 shrink-0 mt-0.5 text-custom-blue/50" /><p className="line-clamp-2">{loc.address}</p></div>}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Globe className="w-3 h-3 text-teal-500/50" />
                        <span>{loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-teal-400 bg-teal-400/5 px-1.5 py-0.5 rounded border border-teal-400/10">
                        <ShieldCheck className="w-3 h-3" />
                        {loc.geofenceRadius}M RADIUS
                    </div>
                </div>
            </div>
          </div>
        ))}

        {locations.length === 0 && !isAdding && (
            <div className="col-span-full py-20 text-center bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-3xl">
                <Building2 className="w-16 h-16 text-slate-700 mx-auto mb-5" />
                <h3 className="text-xl font-bold text-white mb-2">No Locations Defined</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto">Add your headquarters and warehouses to complete your organization setup.</p>
                <button onClick={() => setIsAdding(true)} className="mt-8 px-6 py-3 bg-custom-blue/10 hover:bg-custom-blue text-custom-blue hover:text-white border border-custom-blue/20 rounded-xl font-bold transition-all">Start Setup Now</button>
            </div>
        )}
      </div>
    </div>
  );
}
