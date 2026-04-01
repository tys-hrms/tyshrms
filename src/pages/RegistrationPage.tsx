import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { 
  Building2, 
  User as UserIcon, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle,
  Calendar,
  Briefcase,
  Users,
  Database
} from 'lucide-react';

export default function RegistrationPage() {
  const navigate = useNavigate();
  const { registerTenant } = useAuth();
  const { settings } = useSettings();

  // Form State
  const [formData, setFormData] = useState({
    adminName: '',
    dob: '',
    companyName: '',
    gst: '',
    companyType: '',
    employeeCount: '',
    email: '',
    pin: '',
    phone: '',
    countryCode: '+91',
    termsAccepted: false
  });

  const [showPin, setShowPin] = useState(false);
  const [captcha, setCaptcha] = useState({ q: '', a: 0 });
  const [userCaptcha, setUserCaptcha] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  // Connection Status (Simulated based on MongoDB settings)
  const isConnected = settings.mongodb.isEnabled;

  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ q: `${n1} + ${n2}`, a: n1 + n2 });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const validate = () => {
    if (!formData.adminName.trim()) return 'Admin name is required';
    if (!formData.dob) return 'Date of birth is required';
    if (!formData.companyName.trim()) return 'Company name is required';
    if (!formData.companyType) return 'Company type is required';
    if (!formData.employeeCount) return 'Number of employees is required';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return 'Invalid email address';
    
    if (!/^\d{6}$/.test(formData.pin)) return 'PIN must be exactly 6 digits';
    
    if (!/^\d{10}$/.test(formData.phone)) return 'Phone number must be 10 digits';
    
    if (parseInt(userCaptcha) !== captcha.a) return 'Incorrect Captcha answer';
    
    if (!formData.termsAccepted) return 'You must accept the terms of agreement';
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerTenant({
        name: formData.companyName,
        adminName: formData.adminName,
        dob: formData.dob,
        companyType: formData.companyType,
        employeeCount: formData.employeeCount,
        email: formData.email,
        phone: `${formData.countryCode}${formData.phone}`,
        pin: formData.pin
      });

      if (result.success && result.tenantId) {
        setSuccessId(result.tenantId);
        // Simulation: Send email
        console.log(`[Email] Sending registration confirmation to ${formData.email} for Org ID: ${result.tenantId}`);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (successId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-inter">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 flex flex-col items-center">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Registration Successful!</h1>
          <p className="text-slate-400 text-center mb-8">
            Your organization has been created. An email with these details has been sent to <span className="text-white">{formData.email}</span>.
          </p>
          
          <div className="w-full bg-slate-950 border border-slate-800 p-6 mb-8 text-center">
            <span className="text-xs uppercase tracking-widest text-slate-500 block mb-2">Your Organization ID</span>
            <span className="text-4xl font-mono font-black text-brand-400 tracking-tighter">{successId}</span>
            <p className="text-xs text-slate-500 mt-4 italic">Save this ID. You will need it to login.</p>
          </div>

          <button 
            onClick={() => navigate('/')}
            className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold transition-colors uppercase tracking-widest"
          >
            Continue to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-inter">
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
          {/* Header */}
          <div className="p-8 border-b border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight">HRMSCore Registration</h1>
              <p className="text-xs text-slate-500 uppercase tracking-widest">Create your SaaS Organization</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-500/10 border-l-4 border-red-500 p-4 flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Admin Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <UserIcon className="w-3 h-3" /> Admin Name *
                </label>
                <input
                  type="text"
                  name="adminName"
                  value={formData.adminName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 p-3 text-white focus:border-brand-500 outline-none transition-colors"
                  placeholder="John Doe"
                />
              </div>

              {/* DOB */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Date of Birth *
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 p-3 text-white focus:border-brand-500 outline-none transition-colors"
                />
              </div>

              {/* Company Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Building2 className="w-3 h-3" /> Company Name *
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 p-3 text-white focus:border-brand-500 outline-none transition-colors"
                  placeholder="Acme Corp"
                />
              </div>

              {/* GST */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Database className="w-3 h-3" /> GST (Optional)
                </label>
                <input
                  type="text"
                  name="gst"
                  value={formData.gst}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 p-3 text-white focus:border-brand-500 outline-none transition-colors"
                  placeholder="GST Number"
                />
              </div>

              {/* Company Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Briefcase className="w-3 h-3" /> Company Type *
                </label>
                <select
                  name="companyType"
                  value={formData.companyType}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 p-3 text-white focus:border-brand-500 outline-none transition-colors appearance-none"
                >
                  <option value="">Select Type</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Retail">Retail</option>
                  <option value="Service">Service</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Employee Count */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-3 h-3" /> Employees *
                </label>
                <select
                  name="employeeCount"
                  value={formData.employeeCount}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 p-3 text-white focus:border-brand-500 outline-none transition-colors appearance-none"
                >
                  <option value="">Select Count</option>
                  <option value="1-10">1-10</option>
                  <option value="11-50">11-50</option>
                  <option value="51-200">51-200</option>
                  <option value="201+">201+</option>
                </select>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Mail className="w-3 h-3" /> Email ID *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 p-3 text-white focus:border-brand-500 outline-none transition-colors"
                  placeholder="admin@company.com"
                />
              </div>

              {/* PIN */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Lock className="w-3 h-3" /> Admin PIN (6 Digits) *
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    name="pin"
                    value={formData.pin}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setFormData(prev => ({ ...prev, pin: val }));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 p-3 text-white focus:border-brand-500 outline-none transition-colors pr-12"
                    placeholder="123456"
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Phone className="w-3 h-3" /> Phone Number *
                </label>
                <div className="flex gap-2">
                  <select
                    name="countryCode"
                    value={formData.countryCode}
                    onChange={handleInputChange}
                    className="w-24 bg-slate-950 border border-slate-800 p-3 text-white focus:border-brand-500 outline-none transition-colors text-sm"
                  >
                    <option value="+91">+91 (IN)</option>
                    <option value="+1">+1 (US)</option>
                    <option value="+44">+44 (UK)</option>
                  </select>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData(prev => ({ ...prev, phone: val }));
                    }}
                    className="flex-1 bg-slate-950 border border-slate-800 p-3 text-white focus:border-brand-500 outline-none transition-colors"
                    placeholder="10 Digits"
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* Captcha */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Security Check: {captcha.q} = ?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userCaptcha}
                    onChange={e => setUserCaptcha(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 bg-slate-950 border border-slate-800 p-3 text-white focus:border-brand-500 outline-none transition-colors"
                    placeholder="Answer"
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    onClick={generateCaptcha}
                    className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer group py-2">
              <input
                type="checkbox"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={handleInputChange}
                className="mt-1 w-4 h-4 rounded-none border-slate-700 bg-slate-950 text-brand-500 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                I agree to the <span className="text-brand-400 underline underline-offset-4">Terms of Agreement</span> and understand that data is partitioned securely via multi-tenant architecture.
              </span>
            </label>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold transition-all uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Registering...
                  </>
                ) : (
                  'Confirm & Register'
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Connection Indicator - 3pt Bold Line */}
          <div 
            className={`h-[3px] w-full transition-colors duration-500 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}
            title={isConnected ? 'Database Cloud Connected' : 'Disconnected from Cloud'}
          />
        </div>
      </div>
      
      {/* Footer Branding */}
      <div className="py-6 flex flex-col items-center border-t border-slate-900 bg-slate-950">
        <p className="text-[10px] text-slate-600 uppercase tracking-[0.3em] font-black">
          Powered by HRMSCore SaaS Infrastructure
        </p>
      </div>
    </div>
  );
}
