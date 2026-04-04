import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Building2, 
  User as UserIcon, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  Database,
  MapPin,
  Clock,
  Navigation,
  RefreshCw,
  ShieldCheck,
  Delete,
  Loader2
} from 'lucide-react';

export default function AuthPortal() {
  const navigate = useNavigate();
  const { registerTenant, unifiedLogin } = useAuth();

  // ─── LOGIN STATE ─────────────────────────────────────────────────────────
  const [loginData, setLoginData] = useState({
    tenantId: '',
    username: '',
    pin: ''
  });
  const [showLoginPin, setShowLoginPin] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // ─── REGISTRATION STATE ──────────────────────────────────────────────────
  const [regData, setRegData] = useState({
    adminName: '',
    username: '', // Standardized Unified ID
    pin: '',
    dob: '',
    companyName: '',
    gst: '',
    companyType: 'Garment Manufacturing',
    employeeCount: '1-10',
    state: 'Maharashtra',
    email: '',
    phone: '',
    countryCode: '+91',
    baseLat: '',
    baseLng: '',
    shiftStartTime: '09:00',
    gracePeriod: '15',
    termsAccepted: false
  });
  const [showRegPin, setShowRegPin] = useState(false);
  const [regError, setRegError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [successResult, setSuccessResult] = useState<{ id: string; username: string } | null>(null);

  // Captcha for registration
  const [captcha, setCaptcha] = useState({ q: '', a: 0 });
  const [userCaptcha, setUserCaptcha] = useState('');

  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ q: `${n1} + ${n2}`, a: n1 + n2 });
  };

  // ─── HANDLERS ────────────────────────────────────────────────────────────
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginData.tenantId || !loginData.username || !loginData.pin) {
      setLoginError('All login fields are required'); return;
    }
    setIsLoggingIn(true);
    try {
      const res = await unifiedLogin(loginData.tenantId, loginData.username, loginData.pin);
      if (res.success) navigate('/');
      else setLoginError(res.error || 'Authentication Failed');
    } catch (err: any) {
      setLoginError(err.message || 'System error. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    
    // Quick Register Validation
    if (!regData.companyName || !regData.username || !regData.pin || !regData.baseLat) {
       setRegError('Complete all registration sections first'); return;
    }
    if (!regData.termsAccepted) {
       setRegError('Please accept the workforce geofencing terms'); return;
    }
    if (parseInt(userCaptcha) !== captcha.a) {
       setRegError('Security sum invalid'); return;
    }

    setIsRegistering(true);
    try {
      const result = await registerTenant({
        name: regData.companyName,
        adminName: regData.adminName,
        username: regData.username,
        email: regData.email,
        phone: `${regData.countryCode}${regData.phone}`,
        pin: regData.pin,
        state: regData.state,
        companyType: regData.companyType,
        employeeCount: regData.employeeCount,
        gst: regData.gst,
        dob: regData.dob,
        base_lat: parseFloat(regData.baseLat),
        base_lng: parseFloat(regData.baseLng),
        shift_start_time: regData.shiftStartTime,
        grace_period_mins: parseInt(regData.gracePeriod)
      });

      if (result.success && result.tenantId) {
        setSuccessResult({ id: result.tenantId, username: regData.username });
        // Auto-fill login side
        setLoginData(prev => ({ ...prev, tenantId: result.tenantId!, username: regData.username }));
      } else {
        setRegError(result.error || 'Infrastructure deployment failed');
      }
    } catch (err: any) {
      setRegError(err.message || 'System fault');
    } finally {
      setIsRegistering(false);
    }
  };

  const captureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setRegData(prev => ({ 
          ...prev, 
          baseLat: pos.coords.latitude.toFixed(6), 
          baseLng: pos.coords.longitude.toFixed(6) 
        }));
      }, () => setRegError('Location access denied'));
    }
  };

  const handlePinPad = (digit: string) => {
    if (loginData.pin.length >= 6) return;
    setLoginData(prev => ({ ...prev, pin: prev.pin + digit }));
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-inter selection:bg-brand-500 selection:text-white relative overflow-x-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-brand-500/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row relative z-10">
        
        {/* ─── LEFT: REGISTRATION ────────────────────────────────────────── */}
        <div className="flex-1 p-8 lg:p-20 bg-slate-900/50 backdrop-blur-sm border-r border-white/5 relative">
          
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-12">
              <Building2 className="w-8 h-8 text-brand-400" />
              <div>
                <h1 className="text-xl font-black text-white uppercase tracking-tighter italic">Infrastructure Setup</h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Provision your Organization</p>
              </div>
            </div>

            {successResult ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-10 rounded shadow-2xl animate-in fade-in slide-in-from-left duration-700">
                <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-8 rounded-full">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Environment Ready</h2>
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mb-8">Infrastructure deployed successfully on Supabase</p>
                
                <div className="bg-black/40 border border-emerald-500/20 p-8 rounded relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    <span className="text-[9px] uppercase tracking-[0.3em] text-slate-500 block mb-2 font-black">Organization Account ID</span>
                    <span className="text-4xl font-mono font-black text-emerald-400 tracking-tighter">{successResult.id}</span>
                    <div className="mt-8 space-y-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <div className="flex justify-between border-b border-white/5 pb-1"><span>Username</span><span className="text-white">{successResult.username}</span></div>
                      <div className="flex justify-between border-b border-white/5 pb-1"><span>Status</span><span className="text-emerald-400">IRONCLAD ACTIVE</span></div>
                    </div>
                </div>
                
                <p className="text-[10px] text-slate-500 mt-8 font-bold leading-relaxed uppercase tracking-widest italic animate-pulse">
                  Use the identifier {successResult.id} on the right side to enter your new workspace.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-12">
                
                {regError && (
                  <div className="p-4 bg-red-500/10 border-l-4 border-red-500 flex items-center gap-4 animate-in slide-in-from-top">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-[10px] text-red-200 uppercase font-black tracking-widest">{regError}</p>
                  </div>
                )}

                {/* Grid Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Identity */}
                  <div className="space-y-6">
                    <h3 className="text-[10px] text-brand-400 font-black uppercase tracking-[0.4em] flex items-center gap-2 mb-4">
                      <Database className="w-3 h-3"/> Workspace Data
                    </h3>
                    <input name="companyName" value={regData.companyName} onChange={e => setRegData(p => ({ ...p, companyName: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 p-4 text-white text-xs placeholder:text-slate-800 focus:border-brand-500 outline-none" placeholder="Organization Legal Name" />
                    <div className="flex gap-2">
                       <input name="username" value={regData.username} onChange={e => setRegData(p => ({ ...p, username: e.target.value }))} className="flex-1 bg-brand-500/5 border border-brand-500/20 p-4 text-white text-xs placeholder:text-brand-500/30 focus:border-brand-500 outline-none font-bold italic" placeholder="CHOOSE USERNAME" />
                       <div className="relative flex-1">
                          <input type={showRegPin ? 'text' : 'password'} name="pin" value={regData.pin} onChange={e => setRegData(p => ({ ...p, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))} className="w-full bg-slate-950 border border-slate-800 p-4 text-white text-xs text-center tracking-[0.5em]" placeholder="6X PIN" />
                          <button type="button" onClick={() => setShowRegPin(!showRegPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700">{showRegPin ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <input name="adminName" value={regData.adminName} onChange={e => setRegData(p => ({ ...p, adminName: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 p-3 text-white text-[10px]" placeholder="Admin Full Name" />
                       <input name="email" value={regData.email} onChange={e => setRegData(p => ({ ...p, email: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 p-3 text-white text-[10px]" placeholder="Email Address" />
                    </div>
                  </div>

                  {/* Operational Rules */}
                  <div className="space-y-6">
                    <h3 className="text-[10px] text-brand-400 font-black uppercase tracking-[0.4em] flex items-center gap-2 mb-4">
                      <MapPin className="w-3 h-3"/> Attendance Core
                    </h3>
                    <div>
                       <div className="flex gap-2 mb-2">
                         <input readOnly value={regData.baseLat} className="flex-1 bg-slate-950/50 border border-slate-800 p-3 text-[10px] text-slate-500 font-mono" placeholder="LAT" />
                         <input readOnly value={regData.baseLng} className="flex-1 bg-slate-950/50 border border-slate-800 p-3 text-[10px] text-slate-500 font-mono" placeholder="LNG" />
                       </div>
                       <button type="button" onClick={captureGPS} className="w-full py-4 bg-slate-800 text-brand-400 text-[10px] font-black uppercase tracking-widest border border-slate-700 flex items-center justify-center gap-3">
                         <Navigation className="w-4 h-4"/> Pin Headquarters
                       </button>
                    </div>
                    <div className="flex gap-2">
                       <div className="flex-1">
                          <label className="text-[8px] text-slate-600 block mb-1 font-black">SHIFT START</label>
                          <input type="time" name="shiftStartTime" value={regData.shiftStartTime} onChange={e => setRegData(p => ({ ...p, shiftStartTime: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 p-3 text-white text-xs" />
                       </div>
                       <div className="flex-1">
                          <label className="text-[8px] text-slate-600 block mb-1 font-black">GRACE (MINS)</label>
                          <input type="number" name="gracePeriod" value={regData.gracePeriod} onChange={e => setRegData(p => ({ ...p, gracePeriod: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 p-3 text-white text-xs" />
                       </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-10 border-t border-white/5">
                   <div className="flex gap-2">
                      <input value={userCaptcha} onChange={e => setUserCaptcha(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 p-4 text-white text-sm font-black text-center" placeholder={`${captcha.q} = ?`} />
                      <button type="button" onClick={generateCaptcha} className="px-6 bg-slate-800 text-slate-500"><RefreshCw className="w-4 h-4"/></button>
                   </div>
                   <label className="flex items-start gap-4 cursor-pointer group">
                      <input type="checkbox" checked={regData.termsAccepted} onChange={e => setRegData(p => ({ ...p, termsAccepted: e.target.checked }))} className="mt-1 w-5 h-5 bg-slate-950 border-slate-800 text-brand-500" />
                      <span className="text-[10px] text-slate-500 uppercase tracking-tight font-black leading-relaxed group-hover:text-slate-300 transition-colors">
                        Deploy Organization into the Ironclad Network. I acknowledge GPS geofencing will be enforced for all employees.
                      </span>
                   </label>
                </div>

                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full py-6 bg-brand-500 hover:bg-brand-600 transition-all font-black text-white uppercase tracking-[0.4em] flex items-center justify-center gap-6 shadow-[0_0_40px_rgba(45,124,246,0.3)]"
                >
                  {isRegistering ? <Loader2 className="w-6 h-6 animate-spin"/> : <>Confirm Deployment <ShieldCheck className="w-6 h-6"/></>}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ─── VERTICAL DIVIDER ─────────────────────────────────────────── */}
        <div className="hidden lg:flex flex-col items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
           <div className="w-[1px] h-32 bg-gradient-to-t from-transparent via-slate-700 to-transparent" />
           <div className="w-12 h-12 bg-slate-950 border border-slate-700 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500 tracking-widest my-4">OR</div>
           <div className="w-[1px] h-32 bg-gradient-to-b from-transparent via-slate-700 to-transparent" />
        </div>

        {/* ─── RIGHT: LOGIN ─────────────────────────────────────────────── */}
        <div className="flex-1 p-8 lg:p-20 bg-black/40 relative">
          
          <div className="max-w-md mx-auto">
             <div className="flex flex-col items-center text-center mb-16">
               <div className="w-16 h-16 bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
                 <ShieldCheck className="w-8 h-8 text-emerald-400" />
               </div>
               <h1 className="text-xl font-black text-white uppercase tracking-tighter">Unified Access Portal</h1>
               <p className="text-[10px] text-slate-600 uppercase tracking-widest font-black mt-1">Personnel Authentication Hub</p>
             </div>

             <form onSubmit={handleLogin} className="space-y-8">
                {loginError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 flex items-center gap-4">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-[10px] text-red-400 uppercase font-black tracking-widest leading-relaxed">{loginError}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] ml-1">Workspace Identity</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                      <input 
                        value={loginData.tenantId} 
                        onChange={e => setLoginData(p => ({ ...p, tenantId: e.target.value }))} 
                        className="w-full bg-slate-950 border border-slate-800 p-4 pl-12 text-white font-mono text-sm tracking-wider" 
                        placeholder="Organization ID" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] ml-1">User Credentials</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                      <input 
                        value={loginData.username} 
                        onChange={e => setLoginData(p => ({ ...p, username: e.target.value }))} 
                        className="w-full bg-slate-950 border border-slate-800 p-4 pl-12 text-white text-sm" 
                        placeholder="Login Username" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] ml-1">Security PIN</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                      <input 
                        type={showLoginPin ? 'text' : 'password'} 
                        readOnly 
                        value={loginData.pin} 
                        className="w-full bg-slate-950 border border-slate-800 p-4 pl-12 text-white font-mono text-center text-2xl tracking-[0.8em]" 
                        placeholder="••••••" 
                      />
                      <button type="button" onClick={() => setShowLoginPin(!showLoginPin)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700">
                        {showLoginPin ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pin Pad */}
                <div className="grid grid-cols-3 gap-2">
                  {[1,2,3,4,5,6,7,8,9].map(n => (
                    <button key={n} type="button" onClick={() => handlePinPad(n.toString())} className="h-14 bg-slate-900/50 border border-slate-800 text-white font-black hover:bg-slate-800 active:scale-95 transition-all">{n}</button>
                  ))}
                  <button type="button" onClick={() => setLoginData(p => ({ ...p, pin: '' }))} className="h-14 bg-slate-950 border border-slate-800 text-slate-500 text-[10px] font-black tracking-widest">CLR</button>
                  <button type="button" onClick={() => handlePinPad('0')} className="h-14 bg-slate-900/50 border border-slate-800 text-white font-black hover:bg-slate-800">0</button>
                  <button type="button" onClick={() => setLoginData(p => ({ ...p, pin: p.pin.slice(0, -1) }))} className="h-14 bg-slate-950 border border-slate-800 text-slate-500 flex items-center justify-center"><Delete className="w-5 h-5"/></button>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn || !loginData.tenantId || !loginData.username}
                  className="w-full py-6 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-all font-black text-white uppercase tracking-[0.4em] flex items-center justify-center gap-6 shadow-[0_0_40px_rgba(45,124,246,0.3)] mt-8"
                >
                  {isLoggingIn ? <Loader2 className="w-6 h-6 animate-spin"/> : <>Initiate Access <ShieldCheck className="w-6 h-6"/></>}
                </button>
             </form>
          </div>

        </div>

      </div>

      {/* Footer Branding */}
      <div className="py-12 flex flex-col items-center relative z-10 border-t border-white/5 bg-slate-950">
        <p className="text-[10px] text-slate-600 uppercase tracking-[0.8em] font-black">
          HRMSCore Unified Architecture v2.2.1
        </p>
      </div>

    </div>
  );
}
