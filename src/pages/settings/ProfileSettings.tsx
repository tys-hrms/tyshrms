import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Key, UserCircle, CheckCircle2, AlertCircle, Fingerprint } from 'lucide-react';

import type { User } from '../../types';

export default function ProfileSettings() {
  const { session, updateUser, users, registerBiometrics } = useAuth();
  const user = session.currentUser;

  const [name, setName] = useState(user?.name || '');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (name.trim().length < 2) {
      setError('Name is too short');
      return;
    }

    const updates: Partial<User> = { name: name.trim() };

    if (pin) {
      if (pin.length < 4 || pin.length > 6) {
        setError('PIN must be 4-6 digits');
        return;
      }
      if (pin !== confirmPin) {
        setError('PINs do not match');
        return;
      }
      if (users.some(u => u.pin_code === pin && u.id !== user.id)) {
        setError('This PIN is already in use by another user');
        return;
      }
      updates.pin_code = pin;
    }

    updateUser(user.id, updates);
    setIsSaved(true);
    setPin('');
    setConfirmPin('');
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleRegisterBiometric = async () => {
    setError('');
    const res = await registerBiometrics(user.id);
    if (res.success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } else {
      setError(res.error || 'Failed to register biometrics');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl animate-in slide-in-from-bottom-2 duration-400">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-custom-blue/10 flex items-center justify-center text-custom-blue">
            <UserCircle className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white leading-tight">{user.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                <Shield className="w-3 h-3 mr-1" /> {user.role}
              </span>
              <span className="text-xs text-slate-500">Member since {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-custom-blue transition-colors"
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 italic opacity-50">Role (Locked)</label>
              <div className="w-full bg-slate-900/50 border border-slate-800/50 rounded-xl px-4 py-2.5 text-slate-500 cursor-not-allowed">
                {user.role}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-slate-300 font-medium mb-2">
              <Key className="w-4 h-4 text-custom-blue" />
              <span>Security PIN Settings</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Leave PIN fields blank if you don't want to change your login password.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">New PIN (4-6 digits)</label>
                <input
                  type="password"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-custom-blue transition-colors"
                  placeholder="••••"
                  maxLength={6}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Confirm New PIN</label>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-custom-blue transition-colors"
                  placeholder="••••"
                  maxLength={6}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-slate-300 font-medium mb-2">
              <Fingerprint className="w-4 h-4 text-custom-blue" />
              <span>Biometric Access</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-950/50 border border-slate-800/50 rounded-2xl">
              <div>
                <p className="text-sm font-medium text-slate-200">Enable Biometric Login</p>
                <p className="text-xs text-slate-500">
                  {user.biometric_credentials?.length 
                    ? `${user.biometric_credentials.length} device(s) registered for your account.` 
                    : 'Log in instantly using Fingerprint or FaceID on your device.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRegisterBiometric}
                className="flex items-center px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all active:scale-95"
              >
                <Fingerprint className="w-4 h-4 mr-2 text-teal-400" />
                {user.biometric_credentials?.length ? 'Register Another Device' : 'Setup Biometrics'}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 p-3 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="pt-6 flex items-center justify-between border-t border-slate-800">
            <div className="text-xs text-slate-500 max-w-[200px]">
              Note: Profile updates take effect immediately.
            </div>
            <button
              type="submit"
              className="flex items-center px-8 py-3 bg-custom-blue hover:bg-blue-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-custom-blue/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSaved ? <><CheckCircle2 className="w-5 h-5 mr-2" /> Changes Saved</> : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
