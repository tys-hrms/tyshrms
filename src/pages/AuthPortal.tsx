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
  Loader2,
  Users,
  Briefcase,
  Calendar,
  Globe
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
    username: '', 
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
        <div className="flex-1 p-6 lg:p-16 bg-slate-900/50 backdrop-blur-sm border-r border-white/5 relative overflow-y-auto max-h-screen lg:max-h-none custom-scrollbar">
          
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-10">
              <Building2 className="w-8 h-8 text-brand-400" />
              <div>
                <h1 className="text-xl font-black text-white uppercase tracking-tighter italic leading-none">Infrastructure Setup</h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Tenant Provisioning v2.2</p>
              </div>
            </div>

            {successResult ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-10 rounded shadow-2xl animate-in fade-in slide-in-from-left duration-700">
                <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-8 rounded-full">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2 font-outfit">Environment Ready</h2>
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mb-8 font-mono">Infrastructure deployed successfully on Supabase</p>
                
                <div className="bg-black/40 border border-emerald-500/20 p-8 rounded relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    <span className="text-[9px] uppercase tracking-[0.3em] text-slate-500 block mb-2 font-black">Organization Account ID</span>
                    <span className="text-4xl font-mono font-black text-emerald-400 tracking-tighter">{successResult.id}</span>
                </div>
                
                <p className="text-[10px] text-slate-500 mt-8 font-bold leading-relaxed uppercase tracking-widest italic animate-pulse">
                  Use the identifier {successResult.id} on the right side to enter your new workspace.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-10 pb-10">
                
                {regError && (
                  <div className="p-4 bg-red-500/10 border-l-4 border-red-500 flex items-center gap-4 animate-in slide-in-from-top">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-[10px] text-red-200 uppercase font-black tracking-widest leading-relaxed">{regError}</p>
                  </div>
                )}

                {/* Section 1: Corporate Entity */}
                <div className="space-y-6">
                  <h3 className="text-[10px] text-brand-400 font-black uppercase tracking-[0.5em] flex items-center gap-3 mb-6 pb-2 border-b border-white/5">
                    <Database className="w-3 h-3"/> Workspace & Entity Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                      <input name="companyName" value={regData.companyName} onChange={e => setRegData(p => ({ ...p, companyName: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 p-4 pl-10 text-white text-xs placeholder:text-slate-800 focus:border-brand-500 outline-none transition-all" placeholder="Legal Organization Name" />
                    </div>
                    
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                      <input name="gst" value={regData.gst} onChange={e => setRegData(p => ({ ...p, gst: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 p-4 pl-10 text-white text-xs placeholder:text-slate-800 focus:border-brand-500 outline-none" placeholder="GST Number (Optional)" />
                    </div>

                    <select name="state" value={regData.state} onChange={e => setRegData(p => ({ ...p, state: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 p-4 text-white text-xs appearance-none outline-none focus:border-brand-500">
                      {["Maharashtra", "Karnataka", "Tamil Nadu", "Gujarat", "Delhi", "West Bengal", "Uttar Pradesh"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <div className="relative">
                       <select name="companyType" value={regData.companyType} onChange={e => setRegData(p => ({ ...p, companyType: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 p-4 text-white text-xs appearance-none outline-none focus:border-brand-500">
                          <option value="Garment Manufacturing">Garment Manufacturing</option>
                          <option value="Textile Processing">Textile Processing</option>
                          <option value="Luxury Retail">Luxury Retail</option>
                       </select>
                    </div>

                    <div className="relative">
                       <select name="employeeCount" value={regData.employeeCount} onChange={e => setRegData(p => ({ ...p, employeeCount: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 p-4 text-white text-xs appearance-none outline-none focus:border-brand-500">
                          <option value="1-10">1-10 Workforce</option>
                          <option value="11-50">11-50 Workforce</option>
                          <option value="51-500">51-500 Workforce</option>
                       </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Unified Identity */}
                <div className="space-y-6">
                  <h3 className="text-[10px] text-brand-400 font-black uppercase tracking-[0.5em] flex items-center gap-3 mb-6 pb-2 border-b border-white/5">
                    <ShieldCheck className="w-3 h-3"/> Identity & Access
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                       <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500/40" />
                       <input name="username" value={regData.username} onChange={e => setRegData(p => ({ ...p, username: e.target.value }))} className="w-full bg-brand-500/5 border border-brand-500/20 p-4 pl-10 text-white text-xs placeholder:text-brand-500/20 focus:border-brand-500 outline-none font-bold tracking-widest" placeholder="CHOOSE LOGIN ID" />
                    </div>
                    
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                      <input 
                        type={showRegPin ? 'text' : 'password'} 
                        value={regData.pin} 
                        onChange={e => setRegData(p => ({ ...p, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))} 
                        className="w-full bg-slate-950 border border-slate-800 p-4 pl-10 text-white font-mono text-center text-lg tracking-[0.4em] outline-none focus:border-brand-500" 
                        placeholder="SECURITY PIN" 
                      />
                      <button type="button" onClick={() => setShowRegPin(!showRegPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700">
                        {showRegPin ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                      </button>
                    </div>

                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                      <input name="adminName" value={regData.adminName} onChange={e => setRegData(p => ({ ...p, adminName: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 p-4 pl-10 text-white text-xs placeholder:text-slate-800 outline-none focus:border-brand-500" placeholder="Administrator Name" />
                    </div>

                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                      <input type="date" name="dob" value={regData.dob} onChange={e => setRegData(p => ({ ...p, dob: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 p-4 pl-10 text-white text-xs placeholder:text-slate-800 outline-none focus:border-brand-500 uppercase font-mono" />
                    </div>

                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                      <input name="email" value={regData.email} onChange={e => setRegData(p => ({ ...p, email: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 p-4 pl-10 text-white text-xs placeholder:text-slate-800 outline-none focus:border-brand-500" placeholder="Contact Email ID" />
                    </div>

                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                      <input name="phone" value={regData.phone} onChange={e => setRegData(p => ({ ...p, phone: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 p-4 pl-10 text-white text-xs placeholder:text-slate-800 outline-none focus:border-brand-500" placeholder="Phone Number" />
                    </div>
                  </div>
                </div>

                {/* Section 3: Attendance Rules */}
                <div className="space-y-6">
                  <h3 className="text-[10px] text-brand-400 font-black uppercase tracking-[0.5em] flex items-center gap-3 mb-6 pb-2 border-b border-white/5">
                    <MapPin className="w-3 h-3"/> Workforce Geofencing
                  </h3>
                  
                  <div className="p-6 bg-slate-950 border border-slate-800 rounded relative group">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-1">
                        <label className="text-[8px] text-slate-600 font-black uppercase tracking-widest ml-1">Latitude</label>
                        <input readOnly value={regData.baseLat} className="w-full bg-black/40 border border-slate-800 p-3 text-[10px] text-slate-500 font-mono" placeholder="00.000000" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] text-slate-600 font-black uppercase tracking-widest ml-1">Longitude</label>
                        <input readOnly value={regData.baseLng} className="w-full bg-black/40 border border-slate-800 p-3 text-[10px] text-slate-500 font-mono" placeholder="00.000000" />
                      </div>
                    </div>
                    <button type="button" onClick={captureGPS} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-brand-400 text-[10px] font-black uppercase tracking-[0.4em] border border-slate-700 flex items-center justify-center gap-4 transition-all">
                      <Navigation className="w-4 h-4 animate-pulse"/> PIN HEADQUARTERS
                    </button>
                    <p className="text-[9px] text-slate-600 mt-4 italic text-center font-bold uppercase tracking-wide">Employees must be within 100m of this point to clock-in.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Daily Shift Commencement</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                          <input type="time" name="shiftStartTime" value={regData.shiftStartTime} onChange={e => setRegData(p => ({ ...p, shiftStartTime: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 p-4 pl-10 text-white text-xs outline-none focus:border-brand-500" />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Lateness Grace (Mins)</label>
                        <input type="number" name="gracePeriod" value={regData.gracePeriod} onChange={e => setRegData(p => ({ ...p, gracePeriod: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 p-4 text-white text-xs outline-none focus:border-brand-500" placeholder="15" />
                     </div>
                  </div>
                </div>

                {/* Confirmations */}
                <div className="space-y-6 pt-10 border-t border-white/5">
                   <div className="flex gap-2">
                      <input value={userCaptcha} onChange={e => setUserCaptcha(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 p-5 text-white text-lg font-black text-center tracking-[0.2em]" placeholder={`${captcha.q} = ?`} />
                      <button type="button" onClick={generateCaptcha} className="px-8 bg-slate-800 text-slate-600 hover:text-white transition-colors"><RefreshCw className="w-5 h-5"/></button>
                   </div>
                   
                   <label className="flex items-start gap-4 cursor-pointer group bg-black/20 p-6 rounded border border-white/5">
                      <input type="checkbox" checked={regData.termsAccepted} onChange={e => setRegData(p => ({ ...p, termsAccepted: e.target.checked }))} className="mt-1 w-6 h-6 rounded-none bg-slate-950 border-slate-800 text-brand-500 focus:ring-0" />
                      <span className="text-[10px] text-slate-500 uppercase tracking-tight font-black leading-relaxed group-hover:text-slate-300 transition-colors">
                        Deploy Organization into the Ironclad Network. I acknowledge that GPS isolation and strict shift compliance will be active from the moment of deployment for all personnel.
                      </span>
                   </label>
                </div>

                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full py-7 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-all font-black text-white uppercase tracking-[0.6em] text-sm flex items-center justify-center gap-6 shadow-[0_0_50px_rgba(45,124,246,0.3)] active:scale-95 group/btn"
                >
                  {isRegistering ? <Loader2 className="w-6 h-6 animate-spin"/> : <>DEPLOY INFRASTRUCTURE <ShieldCheck className="w-6 h-6 group-hover/btn:scale-110 transition-transform"/></>}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ─── VERTICAL DIVIDER ─────────────────────────────────────────── */}
        <div className="hidden lg:flex flex-col items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
           <div className="w-[1px] h-64 bg-gradient-to-t from-transparent via-slate-700 to-transparent" />
           <div className="w-14 h-14 bg-slate-950 border border-slate-700 rounded-full flex items-center justify-center text-[11px] font-black text-slate-500 tracking-[0.3em] my-4 backdrop-blur-md">OR</div>
           <div className="w-[1px] h-64 bg-gradient-to-b from-transparent via-slate-700 to-transparent" />
        </div>

        {/* ─── RIGHT: LOGIN ─────────────────────────────────────────────── */}
        <div className="flex-1 p-8 lg:p-20 bg-black/40 relative flex flex-col justify-center">
          
          <div className="max-w-md mx-auto w-full">
             <div className="flex flex-col items-center text-center mb-16">
               <div className="w-20 h-20 bg-brand-500/5 border border-brand-500/10 flex items-center justify-center mb-6 rounded-3xl rotate-45 group hover:rotate-0 transition-all duration-700">
                 <div className="-rotate-45 group-hover:rotate-0 transition-all duration-700">
                    <ShieldCheck className="w-10 h-10 text-brand-400" />
                 </div>
               </div>
               <h1 className="text-2xl font-black text-white uppercase tracking-tighter font-outfit">Unified Access Portal</h1>
               <p className="text-[10px] text-slate-600 uppercase tracking-widest font-black mt-2">Personnel Authentication Protocol v2</p>
             </div>

             <form onSubmit={handleLogin} className="space-y-8">
                {loginError && (
                  <div className="p-5 bg-red-500/10 border border-red-500/20 flex items-center gap-5 animate-in slide-in-from-top">
                    <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                    <p className="text-[10px] text-red-400 uppercase font-black tracking-widest leading-relaxed">{loginError}</p>
                  </div>
                )}

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[9px] text-slate-600 font-black uppercase tracking-[0.4em] ml-1">Workspace Identity</label>
                    <div className="relative group">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 group-focus-within:text-brand-500 transition-colors" />
                      <input 
                        value={loginData.tenantId} 
                        onChange={e => setLoginData(p => ({ ...p, tenantId: e.target.value }))} 
                        className="w-full bg-slate-950 border border-slate-800 p-4 pl-12 text-white font-mono text-sm tracking-widest focus:border-brand-500 outline-none transition-all" 
                        placeholder="Organization ID" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] text-slate-600 font-black uppercase tracking-[0.4em] ml-1">User Credentials</label>
                    <div className="relative group">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 group-focus-within:text-brand-500 transition-colors" />
                      <input 
                        value={loginData.username} 
                        onChange={e => setLoginData(p => ({ ...p, username: e.target.value }))} 
                        className="w-full bg-slate-950 border border-slate-800 p-4 pl-12 text-white text-sm focus:border-brand-500 outline-none transition-all font-bold" 
                        placeholder="Authenticated Username" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] text-slate-600 font-black uppercase tracking-[0.4em] ml-1">Security PIN</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 group-focus-within:text-brand-500 transition-colors" />
                      <input 
                        type={showLoginPin ? 'text' : 'password'} 
                        readOnly 
                        value={loginData.pin} 
                        className="w-full bg-slate-950 border border-slate-800 p-4 pl-12 text-white font-mono text-center text-3xl tracking-[0.8em] focus:border-brand-500 outline-none transition-all" 
                        placeholder="••••••" 
                      />
                      <button type="button" onClick={() => setShowLoginPin(!showLoginPin)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 hover:text-white transition-colors">
                        {showLoginPin ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pin Pad */}
                <div className="grid grid-cols-3 gap-3 pt-4">
                  {[1,2,3,4,5,6,7,8,9].map(n => (
                    <button key={n} type="button" onClick={() => handlePinPad(n.toString())} className="h-16 bg-slate-900/40 border border-slate-800 text-white font-black hover:bg-slate-800 hover:border-slate-600 active:scale-95 transition-all duration-75 text-xl font-mono">{n}</button>
                  ))}
                  <button type="button" onClick={() => setLoginData(p => ({ ...p, pin: '' }))} className="h-16 bg-slate-950 border border-slate-800 text-slate-600 text-[11px] font-black tracking-[0.2em] hover:text-white transition-colors uppercase font-mono">CLR</button>
                  <button type="button" onClick={() => handlePinPad('0')} className="h-16 bg-slate-900/40 border border-slate-800 text-white font-black hover:bg-slate-800 transition-all text-xl font-mono">0</button>
                  <button type="button" onClick={() => setLoginData(p => ({ ...p, pin: p.pin.slice(0, -1) }))} className="h-16 bg-slate-950 border border-slate-800 text-slate-600 flex items-center justify-center hover:text-white transition-colors"><Delete className="w-6 h-6"/></button>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-7 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-all font-black text-white uppercase tracking-[0.5em] text-sm flex items-center justify-center gap-6 shadow-[0_0_60px_rgba(45,124,246,0.2)] mt-10 active:scale-[0.98] group/loginbtn"
                >
                  {isLoggingIn ? <Loader2 className="w-7 h-7 animate-spin"/> : <>INITIATE SECURE SESSION <ShieldCheck className="w-7 h-7 group-hover/loginbtn:scale-110 transition-transform"/></>}
                </button>
             </form>
          </div>

        </div>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(45,124,246,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(45,124,246,0.4); }
      `}</style>

    </div>
  );
}
