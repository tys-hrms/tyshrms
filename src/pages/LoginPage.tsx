import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { Package, Lock, ChevronRight, Delete, Fingerprint, MapPin, Loader2, XCircle } from 'lucide-react';

export default function LoginPage() {
  const { login, clockIn, loginBiometric, users } = useAuth();
  const { settings } = useSettings();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [shake, setShake] = useState(false);
  const [biometricsSupported, setBiometricsSupported] = useState(false);
  const maxPin = 6;

  useEffect(() => {
    if (window.PublicKeyCredential) {
      setBiometricsSupported(true);
    }
  }, []);


  const handleBiometricLogin = async () => {
    setError('');
    setIsVerifying(true);
    
    try {
      const res = await loginBiometric();
      if (!res.success) {
        setError(res.error || 'Biometric login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred during biometric login');
    } finally {
      setIsVerifying(false);
    }
  };


  const handleLogin = async (currentPin: string) => {
    setError('');
    
    const user = users.find(u => u.pinCode === currentPin);
    
    if (!user || (!user.isActive)) {
      setError(user ? 'Account inactive' : 'Invalid PIN');
      setPin('');
      setShake(true);
      setTimeout(() => setShake(false), 800);
      return;
    }

    setIsVerifying(true);
    try {
      const res = login(currentPin);
      
      if (res.success) {
        if (user.role === 'Worker') {
          clockIn(undefined, 'manual');
        }
      } else {
        setError(res.error || 'Login failed');
        setPin('');
        setShake(true);
        setTimeout(() => setShake(false), 800);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length >= maxPin) return;
    setError('');
    setPin(pin + digit);
  };

  const handleLoginSubmit = () => {
    if (pin.length >= 4 && pin.length <= maxPin) {
      handleLogin(pin);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-custom-blue/10 rounded-full blur-[100px]" />

      <div className="w-full max-w-sm relative z-10 font-inter">
        
        {/* Logo Area */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-xl relative group">
            <div className="absolute inset-0 bg-teal-400/20 rounded-2xl blur-xl group-hover:bg-teal-400/30 transition-all" />
            <Package className="w-8 h-8 text-teal-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">TYS-HRMS</h1>
          <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">Workspace Portal</p>
        </div>

        {/* PIN Entry Area */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-slate-800/50 rounded-full mb-4 text-custom-blue">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-1">Enter your PIN</h2>
            <p className="text-sm text-slate-400 text-center">
              Please enter your 6-digit access code
            </p>
          </div>


          {error && (
            <div className="mb-6 p-3 rounded-xl border flex items-start gap-3 text-sm font-medium bg-red-500/10 border-red-500/20 text-red-500">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 text-center pr-4">
                {error}
              </div>
            </div>
          )}

          {/* PIN Dots */}
          <div 
            className={`flex justify-center gap-4 mb-10 ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
            style={{ 
              animation: shake ? 'shake 0.4s cubic-bezier(.36,.07,.19,.97) both' : 'none' 
            }}
          >
            {[...Array(maxPin)].map((_, i) => (
              <div 
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  i < pin.length 
                    ? 'bg-custom-blue border-custom-blue shadow-[0_0_12px_rgba(45,124,246,0.5)] scale-110' 
                    : 'border-slate-700 bg-slate-800/50'
                }`}
              />
            ))}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleDigit(num.toString())}
                className="h-16 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-2xl font-medium text-white hover:bg-slate-700/50 active:bg-slate-700 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-custom-blue/50"
              >
                {num}
              </button>
            ))}
            <div className="col-start-2">
              <button
                onClick={() => handleDigit('0')}
                className="w-full h-16 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-2xl font-medium text-white hover:bg-slate-700/50 active:bg-slate-700 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-custom-blue/50"
              >
                0
              </button>
            </div>
            <div className="col-start-3">
              <button
                onClick={handleDelete}
                className="w-full h-16 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 active:bg-slate-700 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-slate-500/50"
              >
                <Delete className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Login Button */}
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={handleLoginSubmit}
              disabled={pin.length < 4 || pin.length > maxPin || isVerifying}
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center transition-all duration-200 active:scale-95 text-lg"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Login
                  <ChevronRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>

            {biometricsSupported && (
              <button
                onClick={handleBiometricLogin}
                className="w-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl border border-slate-700/50 flex items-center justify-center transition-all active:scale-95 text-sm"
              >
                <Fingerprint className="w-4 h-4 mr-2 text-custom-blue" />
                Login with Biometrics
              </button>
            )}
          </div>

        </div>

      </div>

      <style>{`
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
}
