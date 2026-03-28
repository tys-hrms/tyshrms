import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRBAC } from '../contexts/RBACContext';
import { useSettings } from '../contexts/SettingsContext';
import { UserPlus, Search, Edit2, Trash2, Shield, User as UserIcon, Building2, Briefcase, Key, MapPin } from 'lucide-react';
import UserRegistrationForm from './users/UserRegistrationForm';

export default function UsersPage() {
  const { users, updateUser, deleteUser, session } = useAuth();
  const { can } = useRBAC();
  const { settings } = useSettings();
  
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);

  const currentUserRole = session.currentUser?.role || 'Worker';
  const canCreate = can(currentUserRole, 'users', 'create');
  const canEdit = can(currentUserRole, 'users', 'edit');
  const canDelete = can(currentUserRole, 'users', 'delete');

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin': return <Shield className="w-4 h-4 text-purple-400" />;
      case 'Manager': return <Building2 className="w-4 h-4 text-custom-blue" />;
      default: return <Briefcase className="w-4 h-4 text-teal-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">User Management</h1>
          <p className="text-slate-400 text-sm mt-1">{users.length} registered members</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
              className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-custom-blue transition-colors w-full sm:w-64"
            />
          </div>
          {canCreate && !isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center px-4 py-2 bg-custom-blue hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </button>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-white mb-4">Edit User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Name</label>
                <input 
                  type="text" 
                  value={editingUser.name} 
                  onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-custom-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Role</label>
                <select 
                  value={editingUser.role} 
                  onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-custom-blue appearance-none"
                >
                  <option value="Worker">Worker</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              
              {editingUser.role === 'Worker' && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Assigned Tasks</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Ironing', 'Checking', 'Labeling', 'Packing'].map(task => (
                      <label key={task} className="flex items-center gap-2 bg-slate-800/50 p-2 rounded-lg border border-slate-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={editingUser.assignedTasks?.includes(task)}
                          onChange={e => {
                            const tasks = editingUser.assignedTasks || [];
                            if (e.target.checked) setEditingUser({...editingUser, assignedTasks: [...tasks, task]});
                            else setEditingUser({...editingUser, assignedTasks: tasks.filter((t: string) => t !== task)});
                          }}
                          className="rounded border-slate-600 bg-slate-700 text-custom-blue"
                        />
                        <span className="text-sm text-slate-300">{task}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Organization Location</label>
                <select 
                  value={editingUser.locationId || ''} 
                  onChange={e => setEditingUser({...editingUser, locationId: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-custom-blue appearance-none"
                >
                  <option value="">No specific location (Global)</option>
                  {(settings.locations || []).map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name} ({loc.type})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={editingUser.isActive} 
                  onChange={e => setEditingUser({...editingUser, isActive: e.target.checked})}
                  className="rounded border-slate-600 bg-slate-700 text-custom-blue w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-300 cursor-pointer">
                  Account is Active
                </label>
              </div>

            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button 
                onClick={() => setEditingUser(null)}
                className="px-5 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  updateUser(editingUser.id, editingUser);
                  setEditingUser(null);
                }}
                className="px-5 py-2 bg-custom-blue hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdding ? (
        <UserRegistrationForm 
          onSuccess={() => setIsAdding(false)} 
          onCancel={() => setIsAdding(false)} 
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 bg-slate-900/50 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Role & Access</th>
                  <th className="px-6 py-4">Details</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-medium shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white flex items-center">
                              {user.name}
                              {user.id === session.currentUser?.id && (
                                <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-custom-blue/20 text-custom-blue">YOU</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                              {user.email || 'No email provided'}
                              <span className="text-slate-600">&bull;</span>
                              <span className="font-mono text-custom-blue bg-custom-blue/10 px-1.5 py-0.5 rounded">PIN: {user.pinCode}</span>
                              {user.locationId && (
                                <>
                                  <span className="text-slate-600">&bull;</span>
                                  <span className="flex items-center gap-1 text-slate-300">
                                    <MapPin className="w-3 h-3 text-custom-blue" />
                                    {(settings.locations || []).find(l => l.id === user.locationId)?.name || 'Unknown Location'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/80 border border-slate-700/50">
                          {getRoleIcon(user.role)}
                          <span className="ml-2 text-slate-300">{user.role}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.role === 'Worker' && user.assignedTasks && (
                          <div className="flex flex-wrap gap-1">
                            {user.assignedTasks.map(t => (
                              <span key={t} className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {user.role === 'Manager' && (
                          <span className="text-xs text-slate-500">Manager Access</span>
                        )}
                        {user.role === 'Admin' && <span className="text-xs text-slate-500">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">

                          {currentUserRole === 'Admin' && (
                            <button 
                              onClick={() => {
                                const newPin = window.prompt(`Enter new 4-6 digit PIN for ${user.name}:`);
                                if (newPin) {
                                  if (newPin.length < 4 || newPin.length > 6 || /\D/.test(newPin)) {
                                    alert('Invalid PIN. Must be 4-6 digits.');
                                  } else {
                                    updateUser(user.id, { pinCode: newPin });
                                    alert('PIN updated successfully.');
                                  }
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-custom-blue rounded-lg hover:bg-slate-700 transition-colors"
                              title="Reset PIN"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                          )}
                          {canEdit && (
                            <button 
                              onClick={() => setEditingUser(user)}
                              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                              title="Edit User"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && user.id !== session.currentUser?.id && (
                            <button 
                              onClick={() => {
                                if (window.confirm(`Delete ${user.name}? This cannot be undone.`)) {
                                  deleteUser(user.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
