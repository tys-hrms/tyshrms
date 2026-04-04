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
  Globe
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-inter selection:bg-brand-500 selection:text-white transition-colors duration-500">
      
      <div className="flex-1 flex flex-col lg:flex-row relative">
        
        {/* ─── LEFT: REGISTRATION ────────────────────────────────────────── */}
        <div className="flex-1 p-4 lg:p-8 bg-white border-b lg:border-b-0 lg:border-r border-slate-200">
          <div className="max-w-4xl mx-auto h-full flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-brand-50 rounded-lg"><Building2 className="w-6 h-6 text-brand-600" /></div>
              <h1 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Infrastructure Setup</h1>
            </div>

            {successResult ? (
              <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-xl shadow-sm animate-in fade-in zoom-in duration-500 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-1">Organization Ready</h2>
                <p className="text-xs text-slate-500 mb-6 font-mono">Infrastructure safely deployed on Supabase</p>
                <div className="bg-white border border-emerald-200 p-6 rounded-lg relative overflow-hidden inline-block px-10">
                    <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">WORKSPACE ID</span>
                    <span className="text-3xl font-mono font-black text-emerald-600 tracking-tighter">{successResult.id}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-6 font-bold uppercase tracking-widest italic animate-pulse">Use this ID on the Right to enter.</p>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-6">
                {regError && <div className="p-3 bg-red-50 border-l-4 border-red-500 text-[10px] text-red-700 uppercase font-black tracking-widest">{regError}</div>}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Entity Data */}
                  <div className="md:col-span-3 pb-1 border-b border-slate-100 flex items-center gap-2">
                    <Database className="w-3 h-3 text-brand-600" /><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Workspace Entity</span>
                  </div>
                  <input name="companyName" value={regData.companyName} onChange={x => setRegData(p=>({...p, companyName:x.target.value}))} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs outline-none focus:ring-1 focus:ring-brand-500" placeholder="Legal Organization Name" />
                  <input name="gst" value={regData.gst} onChange={x => setRegData(p=>({...p, gst:x.target.value}))} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs outline-none focus:ring-1 focus:ring-brand-500" placeholder="GST Number" />
                  <select name="state" value={regData.state} onChange={x => setRegData(p=>({...p, state:x.target.value}))} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs text-slate-700">
                    {["Maharashtra","Karnataka","Tamil Nadu","Gujarat","Delhi"].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                  <select name="companyType" value={regData.companyType} onChange={x => setRegData(p=>({...p, companyType:x.target.value}))} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs text-slate-700">
                    <option>Garment Manufacturing</option><option>Textile Processing</option><option>Luxury Retail</option>
                  </select>
                  <select name="employeeCount" value={regData.employeeCount} onChange={x => setRegData(p=>({...p, employeeCount:x.target.value}))} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs text-slate-700">
                    <option>1-10 Workforce</option><option>11-50 Workforce</option><option>51-500 Workforce</option>
                  </select>
                  <input name="phone" value={regData.phone} onChange={x => setRegData(p=>({...p, phone:x.target.value}))} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs" placeholder="Contact Phone" />

                  {/* Identity Data */}
                  <div className="md:col-span-3 pt-2 pb-1 border-b border-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3 text-brand-600" /><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Access Credentials</span>
                  </div>
                  <input name="username" value={regData.username} onChange={x => setRegData(p=>({...p, username:x.target.value}))} className="w-full bg-brand-50 border border-brand-100 p-2.5 rounded text-xs text-brand-700 font-bold" placeholder="CHOOSE LOGIN ID" />
                  <div className="relative">
                    <input type={showRegPin?'text':'password'} value={regData.pin} onChange={x => setRegData(p=>({...p, pin:x.target.value.replace(/\D/g,'').slice(0,6)}))} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs text-center font-mono tracking-widest" placeholder="PIN CODE" />
                    <button type="button" onClick={()=>setShowRegPin(!showRegPin)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 focus:outline-none">{showRegPin?<EyeOff size={14}/>:<Eye size={14}/>}</button>
                  </div>
                  <input name="adminName" value={regData.adminName} onChange={x => setRegData(p=>({...p, adminName:x.target.value}))} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs" placeholder="Admin Full Name" />
                  <input type="date" name="dob" value={regData.dob} onChange={x => setRegData(p=>({...p, dob:x.target.value}))} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs font-mono" />
                  <input name="email" value={regData.email} onChange={x => setRegData(p=>({...p, email:x.target.value}))} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs md:col-span-2" placeholder="Corporate Email Address" />

                  {/* Attendance Data */}
                  <div className="md:col-span-3 pt-2 pb-1 border-b border-slate-100 flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-brand-600" /><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Operational Environment</span>
                  </div>
                  <div className="md:col-span-2 flex gap-2">
                    <div className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded text-[10px] text-slate-400 font-mono flex items-center justify-between">
                      <span>{regData.baseLat || '0.000'} | {regData.baseLng || '0.000'}</span>
                      <Navigation size={12} className={regData.baseLat ? 'text-emerald-500' : 'text-slate-300'} />
                    </div>
                    <button type="button" onClick={captureGPS} className="px-4 bg-slate-800 text-white rounded text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all">Pin HQ</button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1"><label className="text-[8px] text-slate-400 block uppercase font-bold">Shift Start</label><input type="time" value={regData.shiftStartTime} onChange={x=>setRegData(p=>({...p, shiftStartTime:x.target.value}))} className="w-full bg-slate-50 border border-slate-200 p-1 rounded text-xs" /></div>
                    <div className="flex-1"><label className="text-[8px] text-slate-400 block uppercase font-bold">Grace (min)</label><input type="number" value={regData.gracePeriod} onChange={x=>setRegData(p=>({...p, gracePeriod:x.target.value}))} className="w-full bg-slate-50 border border-slate-200 p-1 rounded text-xs" /></div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center pt-2">
                  <div className="flex-1 flex gap-2">
                    <input value={userCaptcha} onChange={x=>setUserCaptcha(x.target.value)} className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded text-center text-sm font-black" placeholder={`${captcha.q} = ?`} />
                    <button type="button" onClick={generateCaptcha} className="px-4 text-slate-300"><RefreshCw size={14}/></button>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={regData.termsAccepted} onChange={x=>setRegData(p=>({...p, termsAccepted:x.target.checked}))} className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-0" />
                    <span className="text-[9px] text-slate-500 font-bold uppercase leading-tight tracking-tight">Accept strict geofencing isolation protocols</span>
                  </label>
                </div>

                <button type="submit" disabled={isRegistering} className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-black uppercase tracking-[0.4em] text-xs rounded transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-3">
                  {isRegistering ? <Loader2 size={16} className="animate-spin"/> : <>Confirm Setup <ShieldCheck size={16}/></>}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ─── RIGHT: LOGIN ─────────────────────────────────────────────── */}
        <div className="lg:w-[450px] p-6 lg:p-12 bg-white flex flex-col justify-center">
          <div className="max-w-sm mx-auto w-full">
             <div className="text-center mb-8">
               <div className="w-12 h-12 bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-3 rounded-lg"><ShieldCheck size={24} className="text-brand-600" /></div>
               <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Unified Portal</h1>
               <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mt-1">Identity Access Hub v2.2</p>
             </div>

             <form onSubmit={handleLogin} className="space-y-4">
                {loginError && <div className="p-2.5 bg-red-50 border-l-2 border-red-500 text-[9px] text-red-600 uppercase font-black">{loginError}</div>}
                
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Workspace ID</span>
                  <div className="relative">
                     <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                     <input value={loginData.tenantId} onChange={x=>setLoginData(p=>({...p, tenantId:x.target.value}))} className="w-full bg-slate-50 border border-slate-200 p-2.5 pl-10 rounded text-xs font-mono" placeholder="Tenant Identification Code" />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">User Identifier</span>
                  <div className="relative">
                     <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                     <input value={loginData.username} onChange={x=>setLoginData(p=>({...p, username:x.target.value}))} className="w-full bg-slate-50 border border-slate-200 p-2.5 pl-10 rounded text-xs font-bold" placeholder="Username" />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure PIN</span>
                  <div className="relative">
                     <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                     <input type={showLoginPin?'text':'password'} readOnly value={loginData.pin} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-center font-mono text-xl tracking-[0.4em]" placeholder="••••••" />
                     <button type="button" onClick={()=>setShowLoginPin(!showLoginPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">{showLoginPin?<EyeOff size={16}/>:<Eye size={16}/>}</button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-2">
                  {[1,2,3,4,5,6,7,8,9].map(n=><button key={n} type="button" onClick={()=>loginData.pin.length<6 && setLoginData(p=>({...p, pin:p.pin+n}))} className="h-10 bg-slate-50 border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 active:scale-95 text-sm">{n}</button>)}
                  <button type="button" onClick={()=>setLoginData(p=>({...p, pin:''}))} className="h-10 bg-slate-100 text-slate-400 text-[8px] font-black">CLR</button>
                  <button type="button" onClick={()=>loginData.pin.length<6 && setLoginData(p=>({...p, pin:p.pin+'0'}))} className="h-10 bg-slate-50 border border-slate-200 text-slate-600 font-bold hover:bg-slate-100">0</button>
                  <button type="button" onClick={()=>setLoginData(p=>({...p, pin:p.pin.slice(0,-1)}))} className="h-10 bg-slate-100 text-slate-400 flex items-center justify-center"><Delete size={14}/></button>
                </div>

                <button type="submit" disabled={isLoggingIn} className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-black uppercase tracking-[0.4em] text-xs rounded transition-all mt-4 flex items-center justify-center gap-3">
                   {isLoggingIn ? <Loader2 size={16} className="animate-spin"/> : <>Access Workspace <ShieldCheck size={16}/></>}
                </button>
             </form>
          </div>
        </div>

      </div>
      
      <div className="py-6 text-center border-t border-slate-100 bg-white">
        <p className="text-[10px] text-slate-400 font-black tracking-[0.8em] uppercase">HRMSCore Unified Architecture</p>
      </div>

    </div>
  );
}
