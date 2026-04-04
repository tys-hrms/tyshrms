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
  Briefcase,
  Calendar,
  Globe,
  Users
} from 'lucide-react';

export default function AuthPortal() {
  const navigate = useNavigate();
  const { registerTenant, unifiedLogin } = useAuth();

  // ─── LOGIN STATE ─────────────────────────────────────────────────────────
  const [loginData, setLoginData] = useState({ tenantId: '', username: '', pin: '' });
  const [showLoginPin, setShowLoginPin] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // ─── REGISTRATION STATE ──────────────────────────────────────────────────
  const [regData, setRegData] = useState({
    adminName: '', username: '', pin: '', dob: '', companyName: '', gst: '',
    companyType: 'Garment Manufacturing', employeeCount: '1-10', state: 'Maharashtra',
    email: '', phone: '', countryCode: '+91', baseLat: '', baseLng: '',
    shiftStartTime: '09:00', gracePeriod: '15', termsAccepted: false
  });
  const [showRegPin, setShowRegPin] = useState(false);
  const [regError, setRegError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [successResult, setSuccessResult] = useState<{ id: string; username: string }|null>(null);

  const [captcha, setCaptcha] = useState({ q: '', a: 0 });
  const [userCaptcha, setUserCaptcha] = useState('');

  useEffect(() => { generateCaptcha(); }, []);
  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ q: `${n1} + ${n2}`, a: n1 + n2 });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError('');
    if (!loginData.tenantId || !loginData.username || !loginData.pin) { setLoginError('Fields required'); return; }
    setIsLoggingIn(true);
    try {
      const res = await unifiedLogin(loginData.tenantId, loginData.username, loginData.pin);
      if (res.success) navigate('/'); else setLoginError(res.error || 'Authentication Failed');
    } catch (err: any) { setLoginError(err.message || 'System error'); } finally { setIsLoggingIn(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setRegError('');
    if (!regData.companyName || !regData.username || !regData.pin || !regData.baseLat) { setRegError('Complete all sections'); return; }
    if (!regData.termsAccepted) { setRegError('Accept geofencing terms'); return; }
    if (parseInt(userCaptcha) !== captcha.a) { setRegError('Security sum invalid'); return; }

    setIsRegistering(true);
    try {
      const result = await registerTenant({
        name: regData.companyName, adminName: regData.adminName, username: regData.username,
        email: regData.email, phone: `${regData.countryCode}${regData.phone}`,
        pin: regData.pin, state: regData.state, companyType: regData.companyType,
        employeeCount: regData.employeeCount, gst: regData.gst, dob: regData.dob,
        base_lat: parseFloat(regData.baseLat), base_lng: parseFloat(regData.baseLng),
        shift_start_time: regData.shiftStartTime, grace_period_mins: parseInt(regData.gracePeriod)
      });
      if (result.success && result.tenantId) {
        setSuccessResult({ id: result.tenantId, username: regData.username });
        setLoginData(p => ({ ...p, tenantId: result.tenantId!, username: regData.username }));
      } else setRegError(result.error || 'Setup failed');
    } catch (err: any) { setRegError(err.message || 'System fault'); } finally { setIsRegistering(false); }
  };

  const captureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setRegData(p => ({ ...p, baseLat: pos.coords.latitude.toFixed(6), baseLng: pos.coords.longitude.toFixed(6) }));
      }, () => setRegError('Location access denied'));
    }
  };

  const states = ["Maharashtra", "Karnataka", "Tamil Nadu", "Gujarat", "Delhi", "West Bengal", "Uttar Pradesh", "Telangana", "Andhra Pradesh", "Kerala", "Punjab", "Haryana", "Rajasthan", "Bihar", "Odisha", "Madhya Pradesh"];
  const segments = ["Garment Manufacturing", "Textile / Fabric Processing", "Apparel Export House", "Retail Brand / Franchise", "Boutique / Design Studio", "Others"];

  return (
    <div className="min-h-screen bg-white flex flex-col font-inter selection:bg-brand-500 selection:text-white transition-colors duration-500 overflow-hidden">
      
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        
        {/* ─── LEFT: REGISTRATION ────────────────────────────────────────── */}
        <div className="flex-1 p-4 lg:p-6 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto flex flex-col min-h-full justify-center py-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-brand-600 rounded-lg"><ShieldCheck className="w-5 h-5 text-white" /></div>
              <div>
                 <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">HRMSCore</h1>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Enterprise Registration v2.2.1-stable</p>
              </div>
            </div>

            {successResult ? (
              <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-xl shadow-sm animate-in fade-in zoom-in duration-500 text-center max-w-md mx-auto">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-1">Organization Ready</h2>
                <div className="bg-white border border-emerald-200 p-5 rounded-lg my-6 shadow-sm">
                    <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">YOUR TENANT ID</span>
                    <span className="text-3xl font-mono font-black text-emerald-600 tracking-tighter">{successResult.id}</span>
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic animate-pulse">Use this ID on the Right to enter.</p>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                {regError && <div className="p-3 bg-red-50 border-l-4 border-red-500 text-[10px] text-red-700 uppercase font-black tracking-widest">{regError}</div>}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-4">
                  {/* Entity Data */}
                  <div className="md:col-span-3 pb-1 border-b border-slate-200 flex items-center gap-2">
                    <Database className="w-3 h-3 text-brand-600" /><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Business Entity</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-slate-400 font-black uppercase tracking-widest ml-1">Company Name</label>
                    <input name="companyName" value={regData.companyName} onChange={x => setRegData(p=>({...p, companyName:x.target.value}))} className="w-full bg-white border border-slate-200 p-2 text-xs outline-none focus:ring-1 focus:ring-brand-500 rounded shadow-sm" placeholder="Legal Organization Name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-slate-400 font-black uppercase tracking-widest ml-1">GST Identification</label>
                    <input name="gst" value={regData.gst} onChange={x => setRegData(p=>({...p, gst:x.target.value}))} className="w-full bg-white border border-slate-200 p-2 text-xs outline-none focus:ring-1 focus:ring-brand-500 rounded shadow-sm" placeholder="GST Number" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-slate-400 font-black uppercase tracking-widest ml-1">Operations Base</label>
                    <select name="state" value={regData.state} onChange={x => setRegData(p=>({...p, state:x.target.value}))} className="w-full bg-white border border-slate-200 p-2 text-xs text-slate-700 appearance-none rounded shadow-sm">
                      {states.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-slate-400 font-black uppercase tracking-widest ml-1">Industry Segment</label>
                    <select name="companyType" value={regData.companyType} onChange={x => setRegData(p=>({...p, companyType:x.target.value}))} className="w-full bg-white border border-slate-200 p-2 text-xs text-slate-700 appearance-none rounded shadow-sm">
                      {segments.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-slate-400 font-black uppercase tracking-widest ml-1">Workforce Size</label>
                    <select name="employeeCount" value={regData.employeeCount} onChange={x => setRegData(p=>({...p, employeeCount:x.target.value}))} className="w-full bg-white border border-slate-200 p-2 text-xs text-slate-700 rounded shadow-sm">
                      <option value="1-10">1-10 Employees</option><option value="11-50">11-50 Employees</option><option value="51-200">51-200 Employees</option><option value="201+">201+ Employees</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-slate-400 font-black uppercase tracking-widest ml-1">Contact Number</label>
                    <input name="phone" value={regData.phone} onChange={x => setRegData(p=>({...p, phone:x.target.value}))} className="w-full bg-white border border-slate-200 p-2 text-xs rounded shadow-sm" placeholder="Phone Number" />
                  </div>

                  {/* Identity Data */}
                  <div className="md:col-span-3 pt-1 pb-1 border-b border-slate-200 flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3 text-brand-600" /><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Admin Credentials</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-slate-400 font-black uppercase tracking-widest ml-1">Login Username</label>
                    <input name="username" value={regData.username} onChange={x => setRegData(p=>({...p, username:x.target.value}))} className="w-full bg-brand-50 border border-brand-100 p-2 text-xs text-brand-700 font-bold rounded shadow-sm" placeholder="CHOOSE USERNAME" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-slate-400 font-black uppercase tracking-widest ml-1">Access PIN</label>
                    <div className="relative">
                      <input type={showRegPin?'text':'password'} value={regData.pin} onChange={x => setRegData(p=>({...p, pin:x.target.value.replace(/\D/g,'').slice(0,6)}))} className="w-full bg-white border border-slate-200 p-2 text-xs text-center font-mono tracking-widest rounded shadow-sm" placeholder="6X PIN" />
                      <button type="button" onClick={()=>setShowRegPin(!showRegPin)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 focus:outline-none">{showRegPin?<EyeOff size={12}/>:<Eye size={12}/>}</button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-slate-400 font-black uppercase tracking-widest ml-1">Administrator Name</label>
                    <input name="adminName" value={regData.adminName} onChange={x => setRegData(p=>({...p, adminName:x.target.value}))} className="w-full bg-white border border-slate-200 p-2 text-xs rounded shadow-sm" placeholder="Full Name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-slate-400 font-black uppercase tracking-widest ml-1">Date of Birth</label>
                    <input type="date" name="dob" value={regData.dob} onChange={x => setRegData(p=>({...p, dob:x.target.value}))} className="w-full bg-white border border-slate-200 p-2 text-xs font-mono rounded shadow-sm" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[8px] text-slate-400 font-black uppercase tracking-widest ml-1">Email Address</label>
                    <input name="email" value={regData.email} onChange={x => setRegData(p=>({...p, email:x.target.value}))} className="w-full bg-white border border-slate-200 p-2 text-xs rounded shadow-sm" placeholder="admin@company.com" />
                  </div>

                  {/* Attendance Data */}
                  <div className="md:col-span-3 pt-1 pb-1 border-b border-slate-200 flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-brand-600" /><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Environment</span>
                  </div>
                  <div className="md:col-span-2 flex gap-2 pt-1">
                    <div className="flex-1 bg-slate-100 border border-slate-200 p-2 rounded text-[9px] text-slate-500 font-mono flex items-center justify-between">
                      <span>{regData.baseLat || '0.000'} | {regData.baseLng || '0.000'}</span>
                      <Navigation size={10} className={regData.baseLat ? 'text-emerald-500' : 'text-slate-300'} />
                    </div>
                    <button type="button" onClick={captureGPS} className="px-3 bg-slate-900 text-white rounded text-[8px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-sm">Pin HQ</button>
                  </div>
                  <div className="flex gap-2 items-center pt-1 md:col-span-1">
                    <div className="flex-1"><label className="text-[7px] text-slate-400 block uppercase font-black">Shift Start</label><input type="time" value={regData.shiftStartTime} onChange={x=>setRegData(p=>({...p, shiftStartTime:x.target.value}))} className="w-full bg-white border border-slate-200 p-1 rounded text-[10px]" /></div>
                    <div className="flex-1"><label className="text-[7px] text-slate-400 block uppercase font-black">Grace (m)</label><input type="number" value={regData.gracePeriod} onChange={x=>setRegData(p=>({...p, gracePeriod:x.target.value}))} className="w-full bg-white border border-slate-200 p-1 rounded text-[10px]" /></div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 items-center pt-2">
                  <div className="flex-1 flex gap-2 w-full md:w-auto">
                    <input value={userCaptcha} onChange={x=>setUserCaptcha(x.target.value)} className="flex-1 bg-white border border-slate-200 p-2 rounded text-center text-xs font-black shadow-sm" placeholder={`${captcha.q} = ?`} />
                    <button type="button" onClick={generateCaptcha} className="px-2 text-slate-300 hover:text-slate-500 transition-colors"><RefreshCw size={12}/></button>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer group p-1">
                    <input type="checkbox" checked={regData.termsAccepted} onChange={x=>setRegData(p=>({...p, termsAccepted:x.target.checked}))} className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-0" />
                    <span className="text-[8px] text-slate-400 font-black uppercase tracking-tight leading-none group-hover:text-slate-600 transition-colors">Apply Geofencing Protection</span>
                  </label>
                </div>

                <button type="submit" disabled={isRegistering} className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-black uppercase tracking-[0.4em] text-[10px] rounded transition-all shadow-lg active:scale-[0.99] flex items-center justify-center gap-2">
                  {isRegistering ? <Loader2 size={14} className="animate-spin"/> : <>Complete Registration <ShieldCheck size={14}/></>}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ─── RIGHT: LOGIN ─────────────────────────────────────────────── */}
        <div className="lg:w-[400px] p-4 lg:p-10 bg-white flex flex-col justify-center border-t lg:border-t-0 border-slate-200 overflow-hidden">
          <div className="max-w-sm mx-auto w-full py-4 h-full flex flex-col justify-center">
             <div className="text-center mb-8">
               <div className="w-12 h-12 bg-brand-600 border border-brand-700 shadow-lg flex items-center justify-center mx-auto mb-3 rounded-lg"><ShieldCheck size={24} className="text-white" /></div>
               <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">HRMSCore</h1>
               <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mt-2">Identity Access Portal v2.2.1-stable</p>
             </div>

             <form onSubmit={handleLogin} className="space-y-4">
                {loginError && <div className="p-2 bg-red-50 border-l-2 border-red-500 text-[8px] text-red-600 uppercase font-black">{loginError}</div>}
                
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Workspace ID</span>
                  <div className="relative">
                     <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
                     <input value={loginData.tenantId} onChange={x=>setLoginData(p=>({...p, tenantId:x.target.value}))} className="w-full bg-slate-50 border border-slate-200 p-2.5 pl-9 rounded text-xs font-mono shadow-inner outline-none focus:border-brand-500 transition-all" placeholder="Enter Tenant Code" />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">User Identifier</span>
                  <div className="relative">
                     <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
                     <input value={loginData.username} onChange={x=>setLoginData(p=>({...p, username:x.target.value}))} className="w-full bg-slate-50 border border-slate-200 p-2.5 pl-9 rounded text-xs font-bold shadow-inner outline-none focus:border-brand-500 transition-all" placeholder="Login Username" />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Access PIN</span>
                  <div className="relative">
                     <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
                     <input type={showLoginPin?'text':'password'} readOnly value={loginData.pin} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-center font-mono text-xl tracking-[0.4em] shadow-inner" placeholder="••••••" />
                     <button type="button" onClick={()=>setShowLoginPin(!showLoginPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">{showLoginPin?<EyeOff size={14}/>:<Eye size={14}/>}</button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-2">
                  {[1,2,3,4,5,6,7,8,9].map(n=><button key={n} type="button" onClick={()=>loginData.pin.length<6 && setLoginData(p=>({...p, pin:p.pin+n}))} className="h-10 bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 active:scale-95 text-xs shadow-sm rounded">{n}</button>)}
                  <button type="button" onClick={()=>setLoginData(p=>({...p, pin:''}))} className="h-10 bg-slate-100 text-slate-400 text-[8px] font-black rounded">CLR</button>
                  <button type="button" onClick={()=>loginData.pin.length<6 && setLoginData(p=>({...p, pin:p.pin+'0'}))} className="h-10 bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 shadow-sm rounded">0</button>
                  <button type="button" onClick={()=>setLoginData(p=>({...p, pin:p.pin.slice(0,-1)}))} className="h-10 bg-slate-100 text-slate-400 flex items-center justify-center rounded"><Delete size={12}/></button>
                </div>

                <button type="submit" disabled={isLoggingIn} className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-black uppercase tracking-[0.4em] text-[10px] rounded transition-all mt-4 flex items-center justify-center gap-2 shadow-xl">
                   {isLoggingIn ? <Loader2 size={14} className="animate-spin"/> : <>Access Workspace <ShieldCheck size={14}/></>}
                </button>
             </form>
          </div>
        </div>

      </div>
      
      <div className="py-4 text-center border-t border-slate-200 bg-slate-50">
        <p className="text-[9px] text-slate-400 font-bold tracking-[0.6em] uppercase">HRMSCore Enterprise Suite v2.2.1-stable</p>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
}
