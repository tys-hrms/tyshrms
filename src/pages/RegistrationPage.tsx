import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Building2, 
  User as UserIcon, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Database,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldCheck,
  Loader2
} from 'lucide-react';

export default function RegistrationPage() {
  const navigate = useNavigate();
  const { registerTenant } = useAuth();

  const [regData, setRegData] = useState({
    admin_name: '', username: '', pin_code: '', dob: '', name: '', gst: '',
    company_type: 'Garment Manufacturing', employee_count: '1-10', state: 'Maharashtra',
    email: '', phone: '', countryCode: '+91', baseLat: '', baseLng: '',
    shift_start_time: '09:00', grace_period_mins: '15', termsAccepted: false
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regData.name || !regData.username || !regData.pin_code || !regData.baseLat) {
      setRegError('Complete all sections before submission');
      return;
    }
    if (!regData.termsAccepted) {
      setRegError('Geofencing setup required to proceed');
      return;
    }
    if (parseInt(userCaptcha) !== captcha.a) {
      setRegError('Security sum validation failed');
      return;
    }

    setIsRegistering(true);
    try {
      const result = await registerTenant({
        name: regData.name, 
        admin_name: regData.admin_name, 
        username: regData.username,
        email: regData.email, 
        phone: `${regData.countryCode}${regData.phone}`,
        pin_code: regData.pin_code, 
        state: regData.state, 
        company_type: regData.company_type,
        employee_count: regData.employee_count, 
        gst: regData.gst, 
        dob: regData.dob,
        base_lat: parseFloat(regData.baseLat), 
        base_lng: parseFloat(regData.baseLng),
        shift_start_time: regData.shift_start_time + ':00',
        grace_period_mins: parseInt(regData.grace_period_mins)
      });
      if (result.success && result.tenantId) {
        setSuccessResult({ id: result.tenantId, username: regData.username });
      } else {
        setRegError(result.error || 'System initialization failed');
      }
    } catch (err: any) {
      setRegError(err.message || 'Fatal system fault');
    } finally {
      setIsRegistering(false);
    }
  };

  const captureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setRegData(p => ({ ...p, baseLat: pos.coords.latitude.toFixed(6), baseLng: pos.coords.longitude.toFixed(6) }));
      }, () => setRegError('Location hardware access denied'));
    }
  };

  const states = ["Maharashtra", "Karnataka", "Tamil Nadu", "Gujarat", "Delhi", "West Bengal", "Uttar Pradesh", "Telangana", "Andhra Pradesh", "Kerala", "Punjab", "Haryana", "Rajasthan", "Bihar", "Odisha", "Madhya Pradesh"];
  const segments = ["Garment Manufacturing", "Textile / Fabric Processing", "Apparel Export House", "Retail Brand / Franchise", "Boutique / Design Studio", "Others"];

  return (
    <div className="min-h-screen bg-white flex flex-col font-inter selection:bg-brand-500 selection:text-white overflow-hidden">
      <div className="flex-1 flex flex-col lg:flex-row relative">
        <div className="flex-1 p-6 lg:p-12 bg-slate-50 border-r border-slate-100 overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto flex flex-col justify-center min-h-full py-8">
            <div className="mb-10 text-center lg:text-left">
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                HRMSCore <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded font-black tracking-normal self-center uppercase">v2.2.1-stable</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-3">Organization Initialization Form</p>
            </div>

            {successResult ? (
              <div className="bg-emerald-50 border border-emerald-100 p-10 rounded-3xl shadow-sm animate-in fade-in zoom-in duration-500 text-center max-w-md mx-auto">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Organization Ready</h2>
                <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">Your secure workspace has been provisioned. Please record your ID carefully.</p>
                
                <div className="bg-white border border-emerald-200 p-8 rounded-2xl mb-8 shadow-sm">
                    <span className="text-[9px] uppercase font-black text-slate-400 block mb-2 tracking-[0.2em]">YOUR TENANT ID</span>
                    <span className="text-4xl font-mono font-black text-emerald-600 tracking-tighter tabular-nums">{successResult.id}</span>
                </div>
                
                <Link 
                  to="/login" 
                  className="w-full py-5 bg-brand-600 hover:bg-brand-700 text-white font-black uppercase tracking-[0.4em] text-[10px] rounded-2xl transition-all shadow-xl block"
                >
                  Access Workspace →
                </Link>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-6">
                {regError && <div className="p-4 bg-red-50 border-l-4 border-red-500 text-[10px] text-red-700 uppercase font-black tracking-widest">{regError}</div>}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-4">
                  <div className="md:col-span-3 pb-2 border-b border-slate-200 flex items-center gap-2">
                    <Database className="w-4 h-4 text-brand-600" /><span className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em]">Business Entity</span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-400 font-black uppercase tracking-widest ml-1">Company Name</label>
                    <input name="name" value={regData.name} onChange={x => setRegData(p=>({...p, name:x.target.value}))} className="w-full bg-white border border-slate-200 p-3 text-xs text-slate-900 font-bold outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 rounded-xl shadow-sm placeholder:text-slate-300 transition-all" placeholder="Legal Org Name" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-400 font-black uppercase tracking-widest ml-1">GST ID</label>
                    <input name="gst" value={regData.gst} onChange={x => setRegData(p=>({...p, gst:x.target.value}))} className="w-full bg-white border border-slate-200 p-3 text-xs text-slate-900 font-bold outline-none rounded-xl shadow-sm placeholder:text-slate-300 transition-all" placeholder="GST Number" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-400 font-black uppercase tracking-widest ml-1">HQ State</label>
                    <select name="state" value={regData.state} onChange={x => setRegData(p=>({...p, state:x.target.value}))} className="w-full bg-white border border-slate-200 p-3 text-xs text-slate-900 font-bold rounded-xl shadow-sm appearance-none cursor-pointer">
                      {states.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-400 font-black uppercase tracking-widest ml-1">Industry</label>
                    <select name="company_type" value={regData.company_type} onChange={x => setRegData(p=>({...p, company_type:x.target.value}))} className="w-full bg-white border border-slate-200 p-3 text-xs text-slate-900 font-bold rounded-xl shadow-sm cursor-pointer">
                      {segments.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-400 font-black uppercase tracking-widest ml-1">Workforce</label>
                    <select name="employee_count" value={regData.employee_count} onChange={x => setRegData(p=>({...p, employee_count:x.target.value}))} className="w-full bg-white border border-slate-200 p-3 text-xs text-slate-900 font-bold rounded-xl shadow-sm">
                      <option value="1-10">1-10 Employees</option><option value="11-50">11-50 Employees</option><option value="51-200">51-200 Employees</option><option value="201+">201+ Employees</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-400 font-black uppercase tracking-widest ml-1">Contact Phone</label>
                    <input name="phone" value={regData.phone} onChange={x => setRegData(p=>({...p, phone:x.target.value}))} className="w-full bg-white border border-slate-200 p-3 text-xs text-slate-900 font-bold rounded-xl shadow-sm placeholder:text-slate-300 transition-all" placeholder="Phone" />
                  </div>

                  <div className="md:col-span-3 pt-4 pb-2 border-b border-slate-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-brand-600" /><span className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em]">Administrative Setup</span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-400 font-black uppercase tracking-widest ml-1">Login Username</label>
                    <input name="username" value={regData.username} onChange={x => setRegData(p=>({...p, username:x.target.value}))} className="w-full bg-brand-50 border border-brand-100 p-3 text-xs text-brand-700 font-black rounded-xl shadow-sm placeholder:text-brand-300" placeholder="CHOOSE USERNAME" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-400 font-black uppercase tracking-widest ml-1">Administrator PIN</label>
                    <div className="relative">
                      <input type={showRegPin?'text':'password'} value={regData.pin_code} onChange={x => setRegData(p=>({...p, pin_code:x.target.value.replace(/\D/g,'').slice(0,6)}))} className="w-full bg-white border border-slate-200 p-3 text-xs text-center text-slate-900 font-mono tracking-[0.5em] rounded-xl shadow-sm placeholder:text-slate-200" placeholder="6X PIN" />
                      <button type="button" onClick={()=>setShowRegPin(!showRegPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-brand-500 transition-colors focus:outline-none">{showRegPin?<EyeOff size={14}/>:<Eye size={14}/>}</button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-400 font-black uppercase tracking-widest ml-1">Admin Full Name</label>
                    <input name="admin_name" value={regData.admin_name} onChange={x => setRegData(p=>({...p, admin_name:x.target.value}))} className="w-full bg-white border border-slate-200 p-3 text-xs text-slate-900 font-bold rounded-xl shadow-sm placeholder:text-slate-300" placeholder="Full Name" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-400 font-black uppercase tracking-widest ml-1">DOB</label>
                    <input type="date" name="dob" value={regData.dob} onChange={x => setRegData(p=>({...p, dob:x.target.value}))} className="w-full bg-white border border-slate-200 p-3 text-xs text-slate-900 font-mono rounded-xl shadow-sm" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[9px] text-slate-400 font-black uppercase tracking-widest ml-1">Email Address</label>
                    <input name="email" value={regData.email} onChange={x => setRegData(p=>({...p, email:x.target.value}))} className="w-full bg-white border border-slate-200 p-3 text-xs text-slate-900 font-bold rounded-xl shadow-sm placeholder:text-slate-300" placeholder="admin@domain.com" />
                  </div>

                  <div className="md:col-span-3 pt-4 pb-2 border-b border-slate-200 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand-600" /><span className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em]">Environment Settings</span>
                  </div>
                  <div className="md:col-span-2 flex gap-3 pt-1">
                    <div className="flex-1 bg-slate-100 border border-slate-200 p-3 rounded-xl text-[10px] text-slate-500 font-mono flex items-center justify-between">
                      <span className="text-slate-900 font-black">{regData.baseLat || '0.000'} | {regData.baseLng || '0.000'}</span>
                      <Navigation size={12} className={regData.baseLat ? 'text-emerald-500 animate-pulse' : 'text-slate-300'} />
                    </div>
                    <button type="button" onClick={captureGPS} className="px-6 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">Pin HQ</button>
                  </div>
                  <div className="flex gap-3 items-center pt-1 md:col-span-1">
                    <div className="flex-1"><label className="text-[8px] text-slate-400 block uppercase font-black tracking-widest mb-1">Shift</label><input type="time" value={regData.shift_start_time} onChange={x=>setRegData(p=>({...p, shift_start_time:x.target.value}))} className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-[10px] text-slate-900 font-bold" /></div>
                    <div className="flex-1"><label className="text-[8px] text-slate-400 block uppercase font-black tracking-widest mb-1">Grace</label><input type="number" value={regData.grace_period_mins} onChange={x=>setRegData(p=>({...p, grace_period_mins:x.target.value}))} className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-[10px] text-slate-900 font-bold" /></div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center pt-4 border-t border-slate-100">
                  <div className="flex-1 flex gap-3 w-full md:w-auto">
                    <input value={userCaptcha} onChange={x=>setUserCaptcha(x.target.value)} className="flex-1 bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center text-xs font-black text-slate-900 shadow-inner placeholder:text-slate-400" placeholder={`${captcha.q} = ?`} />
                    <button type="button" onClick={generateCaptcha} className="px-3 text-slate-300 hover:text-brand-500 transition-all"><RefreshCw size={16}/></button>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer group py-2">
                    <input type="checkbox" checked={regData.termsAccepted} onChange={x=>setRegData(p=>({...p, termsAccepted:x.target.checked}))} className="w-5 h-5 rounded-lg border-slate-300 text-brand-600 focus:ring-0 transition-all" />
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-none group-hover:text-slate-800 transition-colors">Apply Geofencing Protection</span>
                  </label>
                </div>

                <button type="submit" disabled={isRegistering} className="w-full py-5 bg-brand-600 hover:bg-brand-700 text-white font-black uppercase tracking-[0.5em] text-[10px] rounded-2xl transition-all shadow-xl active:scale-[0.99] flex items-center justify-center gap-3">
                  {isRegistering ? <Loader2 size={16} className="animate-spin"/> : <>Complete Organization Initialization <ShieldCheck size={18}/></>}
                </button>

                <div className="text-center pt-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Already have a workspace?</p>
                    <Link 
                      to="/login" 
                      className="text-brand-600 hover:text-brand-700 font-black text-xs uppercase tracking-[0.2em] transition-all"
                    >
                      ← Return to Access Portal
                    </Link>
                </div>
              </form>
            )}
          </div>
        </div>
        
        {/* Visual Sidebar */}
        <div className="hidden lg:flex lg:w-[350px] bg-slate-900 p-12 flex-col justify-between text-white relative overflow-hidden">
            <div className="relative z-10">
                <h3 className="text-2xl font-black tracking-tighter mb-6 uppercase">Enterprise Node</h3>
                <div className="space-y-6">
                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm">
                        <span className="text-[8px] font-black uppercase tracking-widest text-brand-400 block mb-2">Benefit 01</span>
                        <p className="text-xs font-bold leading-relaxed opacity-80">100% Supabase-driven cloud synchronization with biometric security integration.</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm">
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 block mb-2">Benefit 02</span>
                        <p className="text-xs font-bold leading-relaxed opacity-80">Advanced geofencing and shift compliance with instant statutory reports.</p>
                    </div>
                </div>
            </div>
            
            <div className="relative z-10 opacity-30 text-[8px] font-black uppercase tracking-[1em] vertical-text">
                HRMSCore Stability Phase
            </div>
            
            {/* Ambient effects */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] -mr-48 -mt-24"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -ml-32 -mb-24"></div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .vertical-text { writing-mode: vertical-rl; }
      `}</style>
    </div>
  );
}
