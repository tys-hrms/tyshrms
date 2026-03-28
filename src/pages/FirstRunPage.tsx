import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Package, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function FirstRunPage() {
  const { createInitialAdmin } = useAuth();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!/^\d+$/.test(pin)) {
      setError('PIN must contain only numbers');
      return;
    }
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    if (createInitialAdmin(name.trim(), pin)) {
      setSuccess(true);
    } else {
      setError('Failed to create admin account');
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
            <Package className="w-8 h-8 text-brand-400" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Welcome to TYS-HRMS</h1>
            <p className="text-surface-400 text-sm mt-1">Set up your admin account to get started</p>
          </div>
        </div>

        {success ? (
          <div className="glass-card p-6 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white">Admin Created Successfully!</h2>
              <p className="text-surface-400 text-sm mt-1">Please log in with your new PIN</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card p-6 flex flex-col gap-5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-brand-400" />
              <h2 className="text-lg font-semibold text-white">Create Super Admin</h2>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-300">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name"
                className="input-field"
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-300">PIN Code</label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="4-6 digit PIN"
                  className="input-field pr-12"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white"
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-300">Confirm PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Re-enter PIN"
                className="input-field"
                inputMode="numeric"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button type="submit" className="btn-primary w-full mt-2">
              Create Admin Account
            </button>

            <p className="text-surface-500 text-xs text-center">
              Role: Super Admin · This is the first account in the system
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
