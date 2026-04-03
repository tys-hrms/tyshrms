import React, { useState } from 'react';
import { useCRM } from '../../contexts/CRMContext';
import { 
  MessageCircle, Instagram, Facebook, Linkedin, 
  Youtube, Users, HelpCircle, UserPlus, Phone, 
  Mail, MapPin, Building, Briefcase, Star, Plus,
  Thermometer, Flame, Sun, Calendar
} from 'lucide-react';
import { CRMLeadSource } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface LeadFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const SOURCE_OPTIONS: { id: CRMLeadSource; label: string; icon: any; color: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-500' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-600' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-blue-700' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, color: 'text-red-600' },
  { id: 'word_of_mouth', label: 'Word of Mouth', icon: Users, color: 'text-amber-500' },
  { id: 'other', label: 'Other Social', icon: HelpCircle, color: 'text-slate-400' },
  { id: 'manual', label: 'Manual Entry', icon: UserPlus, color: 'text-slate-500' },
];

export default function LeadRegistrationForm({ onSuccess, onCancel }: LeadFormProps) {
  const { createLead } = useCRM();
  const { users } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [source, setSource] = useState<CRMLeadSource>('whatsapp');
  const [sourceNotes, setSourceNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isGstCompliant, setIsGstCompliant] = useState(false);
  const [businessType, setBusinessType] = useState('');
  const [expectedTimeline, setExpectedTimeline] = useState('Immediate');
  const [leadTemperature, setLeadTemperature] = useState<'Cold' | 'Warm' | 'Hot'>('Warm');
  const [clientCategory, setClientCategory] = useState<'B2B' | 'B2C'>('B2C');
  const [leadBrief, setLeadBrief] = useState('');
  const [taggedRepIds, setTaggedRepIds] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !phone) {
      setError('Please provide Name and Phone number.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await createLead({
        source,
        sourceNotes,
        customerName,
        companyName,
        phone,
        email,
        priority,
        isGstCompliant,
        businessType,
        expectedTimeline,
        leadTemperature,
        clientCategory,
        leadBrief,
        taggedRepIds
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create lead');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300 relative flex flex-col max-h-[88vh] overflow-y-auto">
      <div className="flex items-center gap-4 mb-8">
         <div className="w-12 h-12 bg-custom-blue/10 rounded-2xl flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-custom-blue" />
         </div>
         <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Register New Lead</h2>
            <p className="text-xs text-slate-500 font-medium lowercase">Initialize automated smart-assignment & tracking.</p>
         </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Lead Source Selection */}
        <div className="space-y-3">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Inquiry Source</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SOURCE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = source === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSource(opt.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                    isSelected 
                      ? 'bg-slate-800 border-custom-blue shadow-lg shadow-custom-blue/10' 
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${opt.color}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-tighter ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
          
          {source === 'other' && (
             <div className="mt-3 animate-in slide-in-from-top-2 duration-300">
               <input 
                  type="text" 
                  placeholder="Specify other source details..."
                  value={sourceNotes}
                  onChange={e => setSourceNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-custom-blue outline-none transition-all"
               />
             </div>
          )}
        </div>

        <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-4 mb-4">
           <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 pl-1">Client Category</label>
           <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button 
                type="button"
                onClick={() => setClientCategory('B2C')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${clientCategory === 'B2C' ? 'bg-custom-blue text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Individual (B2C)
              </button>
              <button 
                type="button"
                onClick={() => setClientCategory('B2B')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${clientCategory === 'B2B' ? 'bg-custom-blue text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Business (B2B)
              </button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Full Name *</label>
              <div className="relative">
                <input 
                  type="text" 
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-custom-blue outline-none transition-all"
                  placeholder="John Doe"
                />
                <UserPlus className="w-4 h-4 text-slate-600 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {clientCategory === 'B2B' && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Company Name</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-custom-blue outline-none transition-all"
                    placeholder="Acme Corp"
                  />
                  <Building className="w-4 h-4 text-slate-600 absolute left-3.5 top-3.5" />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Phone Number *</label>
              <div className="relative">
                <input 
                  type="tel" 
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-custom-blue outline-none transition-all"
                  placeholder="+91 98765 43210"
                />
                <Phone className="w-4 h-4 text-slate-600 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Email (Optional)</label>
              <div className="relative">
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-custom-blue outline-none transition-all"
                  placeholder="john@example.com"
                />
                <Mail className="w-4 h-4 text-slate-600 absolute left-3.5 top-3.5" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Qualification Section (New V8) */}
        <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-4 space-y-4">
           <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-custom-blue" />
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Lead Qualification</h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Business Type</label>
                <select 
                  value={businessType}
                  onChange={e => setBusinessType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-custom-blue outline-none transition-all appearance-none"
                >
                  <option value="">Select Category</option>
                  <option value="Manufacturer">Manufacturer</option>
                  <option value="Retailer">Retailer</option>
                  <option value="Wholesaler">Wholesaler / Trader</option>
                  <option value="Boutique / Designer">Boutique / Designer</option>
                  <option value="Export House">Export House</option>
                  <option value="Other">Other Business</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Expected Timeline</label>
                <select 
                  value={expectedTimeline}
                  onChange={e => setExpectedTimeline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-custom-blue outline-none transition-all appearance-none"
                >
                  <option value="Immediate">Immediate / Urgent</option>
                  <option value="Within 1 Week">Within 1 Week</option>
                  <option value="15-30 Days">15-30 Days</option>
                  <option value="Long Term (1 Month+)">Long Term (1 Month+)</option>
                  <option value="Just Researching">Just Researching</option>
                </select>
              </div>
           </div>

           <div className="space-y-3 pt-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Lead Temperature (Interest Level)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Cold', icon: Thermometer, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { id: 'Warm', icon: Sun, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                  { id: 'Hot', icon: Flame, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                ].map((temp) => {
                  const Icon = temp.icon;
                  const isSelected = leadTemperature === temp.id;
                  return (
                    <button
                      key={temp.id}
                      type="button"
                      onClick={() => setLeadTemperature(temp.id as any)}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                        isSelected 
                          ? `${temp.bg} border-custom-blue-500/50 shadow-lg shadow-custom-blue-500/10` 
                          : 'bg-slate-950 border-slate-800 opacity-60'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? temp.color : 'text-slate-600'}`} />
                      <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-slate-500'}`}>{temp.id}</span>
                    </button>
                  );
                })}
              </div>
           </div>

           <div className="pt-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Client Requirements / Brief</label>
              <textarea 
                value={leadBrief}
                onChange={e => setLeadBrief(e.target.value)}
                placeholder="Capturing specific requirements, sizes, fabric choices or event dates discussed during the brief..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:border-custom-blue outline-none transition-all min-h-[100px] resize-none"
              />
           </div>
        </div>

        {/* Multi-Rep Tagging */}
        <div className="space-y-3 pt-2">
           <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-2">
             <Star className="w-3 h-3 text-custom-blue" /> Tag Additional Representatives
           </label>
           <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
              {users.filter(u => u.role !== 'Worker').map(user => {
                 const isTagged = taggedRepIds.includes(user.id);
                 return (
                    <button
                       key={user.id}
                       type="button"
                       onClick={() => {
                          setTaggedRepIds(prev => 
                             prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
                          );
                       }}
                       className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                          isTagged 
                             ? 'bg-custom-blue/20 border-custom-blue text-white' 
                             : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                       }`}
                    >
                       {user.name}
                    </button>
                 );
              })}
           </div>
           <p className="text-[10px] text-slate-600 italic">Tagged reps will receive real-time notifications for this lead.</p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
           <div className="flex items-center gap-4">
              <div className="space-y-2">
                 <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Priority</label>
                 <select 
                   value={priority}
                   onChange={e => setPriority(e.target.value as any)}
                   className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-1.5 focus:border-custom-blue outline-none"
                 >
                   <option value="low">Low</option>
                   <option value="medium">Medium</option>
                   <option value="high">High</option>
                 </select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                 <input 
                    type="checkbox" 
                    id="gst_compliant" 
                    checked={isGstCompliant}
                    onChange={e => setIsGstCompliant(e.target.checked)}
                    className="w-4 h-4 rounded text-custom-blue focus:ring-custom-blue bg-slate-950 border-slate-800"
                 />
                 <label htmlFor="gst_compliant" className="text-xs font-bold text-slate-400 cursor-pointer">GST Registred</label>
              </div>
           </div>

           <div className="flex gap-3">
             <button 
               type="button" 
               onClick={onCancel}
               className="px-6 py-3 text-xs font-bold text-slate-500 hover:text-white transition-colors"
             >
               Discard
             </button>
             <button 
               type="submit"
               disabled={isLoading}
               className="px-8 py-3 bg-custom-blue hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-custom-blue/20 transition-all flex items-center gap-2"
             >
               {isLoading ? 'Processing...' : 'Register Lead'}
               {!isLoading && <Star className="w-3.5 h-3.5" />}
             </button>
           </div>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-500 font-bold text-center">
          {error}
        </div>
      )}
    </div>
  );
}
