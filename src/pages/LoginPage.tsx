import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Building2, 
  User as UserIcon, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Delete, 
  Loader2 
} from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { unifiedLogin } = useAuth();

  const [loginData, setLoginData] = useState({ tenantId: '', username: '', pin: '' });
  const [showLoginPin, setShowLoginPin] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginData.tenantId || !loginData.username || !loginData.pin) {
      setLoginError('All fields required');
      return;
    }
    setIsLoggingIn(true);
    try {
      const res = await unifiedLogin(loginData.tenantId, loginData.username, loginData.pin);
      if (res.success) {
        navigate('/');
      } else {
        setLoginError(res.error || 'Authentication Failed');
      }
    } catch (err: any) {
      setLoginError(err.message || 'System error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-inter items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        <div className="p-8 lg:p-12">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center justify-center gap-2">
              HRMSCore <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded font-black tracking-normal self-center uppercase">v2.2.1-stable</span>
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-black mt-3">Enterprise Access Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {loginError && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 text-[10px] text-red-700 uppercase font-black tracking-widest animate-in fade-in slide-in-from-top-1">
                {loginError}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Workspace ID</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  value={loginData.tenantId} 
                  onChange={x => setLoginData(p => ({ ...p, tenantId: x.target.value }))} 
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 pl-11 rounded-2xl text-sm text-slate-900 font-bold shadow-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all placeholder:text-slate-400" 
                  placeholder="Organization ID" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">User Identifier</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  value={loginData.username} 
                  onChange={x => setLoginData(p => ({ ...p, username: x.target.value }))} 
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 pl-11 rounded-2xl text-sm text-slate-900 font-bold shadow-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all placeholder:text-slate-400" 
                  placeholder="Username / Email" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Access PIN</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  type={showLoginPin ? 'text' : 'password'} 
                  readOnly 
                  value={loginData.pin} 
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-center text-slate-900 font-mono text-2xl tracking-[0.5em] shadow-sm placeholder:text-slate-200" 
                  placeholder="••••••" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowLoginPin(!showLoginPin)} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-brand-500 transition-colors"
                >
                  {showLoginPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <button 
                  key={n} 
                  type="button" 
                  onClick={() => loginData.pin.length < 6 && setLoginData(p => ({ ...p, pin: p.pin + n }))} 
                  className="h-14 bg-white border border-slate-200 text-slate-900 font-black hover:bg-slate-50 active:scale-95 text-lg shadow-sm rounded-2xl transition-all"
                >
                  {n}
                </button>
              ))}
              <button 
                type="button" 
                onClick={() => setLoginData(p => ({ ...p, pin: '' }))} 
                className="h-14 bg-slate-100 text-slate-400 text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                CLR
              </button>
              <button 
                type="button" 
                onClick={() => loginData.pin.length < 6 && setLoginData(p => ({ ...p, pin: p.pin + '0' }))} 
                className="h-14 bg-white border border-slate-200 text-slate-900 font-black hover:bg-slate-50 shadow-sm rounded-2xl active:scale-95 transition-all text-lg"
              >
                0
              </button>
              <button 
                type="button" 
                onClick={() => setLoginData(p => ({ ...p, pin: p.pin.slice(0, -1) }))} 
                className="h-14 bg-slate-100 text-slate-400 flex items-center justify-center rounded-2xl hover:bg-slate-200 transition-all"
              >
                <Delete size={20} />
              </button>
            </div>

            <button 
              type="submit" 
              disabled={isLoggingIn} 
              className="w-full py-5 bg-brand-600 hover:bg-brand-700 text-white font-black uppercase tracking-[0.4em] text-[10px] rounded-2xl transition-all mt-4 flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]"
            >
              {isLoggingIn ? <Loader2 size={16} className="animate-spin" /> : <>Access Workspace <ShieldCheck size={18} /></>}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Don't have a workspace?</p>
            <Link 
              to="/register" 
              className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-black text-xs uppercase tracking-widest transition-all group"
            >
              Initialize Organization
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center text-[9px] text-slate-400 font-black tracking-[0.8em] uppercase">
        HRMSCore Unified System
      </div>
    </div>
  );
}
