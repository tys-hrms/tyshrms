import React, { useState } from 'react';
import { useCRM } from '../contexts/CRMContext';
import { 
  Plus, LayoutGrid, List, Filter, Search, 
  MoreHorizontal, MessageCircle, Instagram, 
  Facebook, Linkedin, Youtube, Users, HelpCircle, 
  ChevronRight, Calendar, User, IndianRupee, Briefcase, 
  Clock, AlertCircle, CheckCircle2, Package, X,
  Thermometer, Flame, Sun, Building2, FileText
} from 'lucide-react';
import { CRMLead, CRMLeadSource } from '../types';
import LeadRegistrationForm from './crm/LeadRegistrationForm';
import LeadPricingLedger from './crm/LeadPricingLedger';
import LeadInteractionLog from './crm/LeadInteractionLog';
import { useRBAC } from '../contexts/RBACContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { Printer } from 'lucide-react';

const SOURCE_ICONS: Record<CRMLeadSource, any> = {
  whatsapp: MessageCircle,
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  youtube: Youtube,
  word_of_mouth: Users,
  other: HelpCircle,
  manual: Users,
};

export default function CRMPage() {
  const { leads, settings, isLoading, updateLead, convertToOrder } = useCRM();
  const { session } = useAuth();
  const { settings: globalSettings } = useSettings();
  const { can } = useRBAC();
  const { users } = useAuth();
  const currentRole = session.currentUser?.role || 'Worker';
  
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  if (!can(currentRole, 'crm', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-3xl text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-white uppercase tracking-tight">Access Denied</h2>
        <p className="text-slate-500 text-sm mt-2">You do not have the required permissions to access the CRM module.</p>
      </div>
    );
  }

  const filteredLeads = leads.filter(l => 
    l.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTemperatureBadge = (temp: 'Cold' | 'Warm' | 'Hot') => {
    switch (temp) {
      case 'Hot': return <span className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20"><Flame className="w-2.5 h-2.5" /> <span className="text-[8px]">HOT</span></span>;
      case 'Warm': return <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"><Sun className="w-2.5 h-2.5" /> <span className="text-[8px]">WARM</span></span>;
      default: return <span className="flex items-center gap-1 text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20"><Thermometer className="w-2.5 h-2.5" /> <span className="text-[8px]">COLD</span></span>;
    }
  };

  const renderSourceIcon = (source: CRMLeadSource) => {
    const Icon = SOURCE_ICONS[source];
    return <Icon className="w-3.5 h-3.5" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ─── Header Section ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            CRM Workspace
            <span className="text-[10px] bg-custom-blue/10 text-custom-blue px-2 py-1 rounded-full border border-custom-blue/20">Collaborative</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Multi-channel lead management and automated fulfillment.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button 
                onClick={() => setView('kanban')}
                className={`p-2 rounded-lg transition-all ${view === 'kanban' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setView('list')}
                className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <List className="w-4 h-4" />
              </button>
           </div>

           <button 
             onClick={() => setIsFormOpen(true)}
             className="flex items-center gap-2 bg-custom-blue hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-custom-blue/20"
           >
             <Plus className="w-4 h-4" /> Register Lead
           </button>
        </div>
      </div>

      {/* ─── Filters & Search ─── */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
          <input 
            type="text" 
            placeholder="Search by Ticket ID or Name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:border-custom-blue outline-none transition-all shadow-xl shadow-black/20"
          />
        </div>
        <button className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl text-slate-400 hover:text-white transition-all text-xs font-bold">
           <Filter className="w-4 h-4" /> Advanced Filters
        </button>
      </div>

      {/* ─── Main Content ─── */}
      {view === 'kanban' ? (
        <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar">
          {settings.stages.map(stage => {
            const stageLeads = filteredLeads.filter(l => l.stage === stage.id && l.status === 'active');
            return (
              <div key={stage.id} className="min-w-[320px] max-w-[320px] flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                   <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                      <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">{stage.label}</h3>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                        {stageLeads.length}
                      </span>
                   </div>
                   <button className="text-slate-600 hover:text-slate-400"><MoreHorizontal className="w-4 h-4" /></button>
                </div>

                <div className="flex flex-col gap-3 min-h-[500px]">
                   {stageLeads.map(lead => (
                      <div 
                        key={lead.id}
                        onClick={() => setSelectedLeadId(lead.id)}
                        className={`group bg-slate-900 border-2 rounded-3xl p-4 cursor-pointer transition-all hover:translate-y-[-2px] shadow-xl hover:shadow-2xl ${
                           lead.isBreached ? 'border-rose-500/30 bg-rose-500/[0.02]' : 'border-slate-800 hover:border-custom-blue/30'
                        }`}
                      >
                         <div className="flex items-center justify-between mb-3 text-[9px] font-black uppercase tracking-widest text-slate-500">
                             <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-950 rounded-lg">
                                   {renderSourceIcon(lead.source)} {lead.source}
                                </span>
                                {renderTemperatureBadge(lead.leadTemperature || 'Warm')}
                             </div>
                             <span className="group-hover:text-custom-blue transition-colors">{lead.ticketNumber}</span>
                          </div>
                         
                         <h4 className="text-sm font-bold text-white mb-1 group-hover:text-custom-blue transition-colors line-clamp-1">{lead.customerName}</h4>
                         <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium italic mb-4">
                            <Briefcase className="w-3 h-3" /> {lead.companyName || 'Individual Contact'}
                         </div>

                         <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
                            <div className="flex -space-x-1.5">
                               {[lead.primaryRepId, ...lead.taggedRepIds].filter(Boolean).map((rid, iter) => (
                                  <div key={rid} className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-900 text-[9px] font-bold text-slate-400 flex items-center justify-center">
                                     {iter + 1}
                                  </div>
                               ))}
                            </div>
                            <div className="text-right">
                               <p className="text-[10px] text-slate-600 font-bold mb-0.5">EST. VALUE</p>
                               <span className="text-xs font-black text-white font-mono">₹{lead.totalValue.toLocaleString()}</span>
                            </div>
                         </div>
                         
                         {lead.isBreached && (
                            <div className="mt-3 flex items-center gap-1.5 text-[9px] font-black text-rose-500 animate-pulse uppercase tracking-widest">
                               <Clock className="w-3 h-3" /> SLA Breach 
                            </div>
                         )}
                      </div>
                   ))}
                   {stageLeads.length === 0 && (
                      <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800/50 rounded-3xl opacity-20">
                         <div className="w-12 h-12 bg-slate-800 rounded-2xl mb-2" />
                      </div>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
           <table className="w-full text-left">
              <thead className="bg-slate-950/50 border-b border-slate-800">
                 <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                   <th className="px-6 py-4">Ticket & Source</th>
                   <th className="px-6 py-4">Customer Details</th>
                   <th className="px-6 py-4">Category</th>
                   <th className="px-6 py-4">Status & Stage</th>
                   <th className="px-6 py-4">Next Follow-up</th>
                   <th className="px-6 py-4">Est. Value</th>
                   <th className="px-6 py-4 text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                 {filteredLeads.map(lead => (
                    <tr key={lead.id} onClick={() => setSelectedLeadId(lead.id)} className="group hover:bg-white/[0.02] cursor-pointer transition-colors">
                       <td className="px-6 py-4">
                          <div className="flex gap-4 items-center">
                             <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                                {renderSourceIcon(lead.source)}
                             </div>
                             <div>
                                <p className="text-xs font-black text-white">{lead.ticketNumber}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-tighter mt-0.5">{lead.source}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <p className="text-xs font-bold text-white uppercase">{lead.customerName}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 italic">{lead.companyName || '—'}</p>
                       </td>
                       <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tight ${lead.clientCategory === 'B2B' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                             {lead.clientCategory === 'B2B' ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                             {lead.clientCategory}
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                             <span className="text-[10px] font-black px-2 py-0.5 rounded-lg border border-slate-700 bg-slate-950 inline-block w-fit uppercase">
                                {lead.stage.replace('_', ' ')}
                             </span>
                             {lead.isBreached && <span className="text-[9px] font-black text-rose-500 animate-pulse uppercase">SLA Breach</span>}
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-400">
                             <Calendar className="w-3 h-3" />
                             <span className="text-[10px] font-bold">{lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleDateString() : 'Unscheduled'}</span>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <span className="text-sm font-black text-white font-mono">₹{lead.totalValue.toLocaleString()}</span>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <button className="p-2 text-slate-500 hover:text-custom-blue">
                             <ChevronRight className="w-5 h-5" />
                          </button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {/* ─── Right Context Panel (Slack Style) ─── */}
      {selectedLead && (
         <div className="fixed inset-y-0 right-0 w-full lg:w-[600px] bg-slate-900 border-l border-slate-800 shadow-3xl z-[110] animate-in slide-in-from-right duration-500 flex flex-col">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/20 shrink-0">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-custom-blue/10 rounded-lg">
                      <Briefcase className="w-4 h-4 text-custom-blue" />
                  </div>
                  <h3 className="font-black text-white uppercase text-xs tracking-widest">{selectedLead.ticketNumber}</h3>
               </div>
               <button onClick={() => setSelectedLeadId(null)} className="p-2 text-slate-500 hover:text-white rounded-lg">
                  <X className="w-5 h-5" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
               {/* Summary Info */}
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Customer</p>
                     <p className="text-lg font-bold text-white">{selectedLead.customerName}</p>
                     <p className="text-xs text-slate-400">{selectedLead.email || 'No email provided'}</p>
                  </div>
                  <div className="text-right space-y-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status / Intelligence</p>
                      <div className="flex items-center justify-end gap-2">
                         <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tight ${selectedLead.clientCategory === 'B2B' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                            {selectedLead.clientCategory === 'B2B' ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            {selectedLead.clientCategory}
                         </div>
                         {renderTemperatureBadge(selectedLead.leadTemperature || 'Warm')}
                         <select 
                           value={selectedLead.stage}
                           onChange={e => updateLead(selectedLead.id, { stage: e.target.value })}
                           className="bg-slate-950 border border-slate-800 text-[10px] font-black uppercase text-white rounded-lg px-3 py-1.5"
                         >
                            {settings.stages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                         </select>
                      </div>
                   </div>
                </div>

                {/* Lead Brief (New V10.1 Requirement) */}
                {selectedLead.leadBrief && (
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-5 animate-in slide-in-from-top-4 duration-500">
                     <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-amber-500" />
                        <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Client Brief / Requirements</h4>
                     </div>
                     <p className="text-xs text-slate-300 leading-relaxed italic whitespace-pre-wrap">
                        "{selectedLead.leadBrief}"
                     </p>
                  </div>
                )}

               {/* Qualification Details (V8) Section */}
               <div className="grid grid-cols-2 gap-4 bg-slate-950/20 border border-slate-800/50 rounded-3xl p-5">
                  <div className="flex items-start gap-3">
                     <div className="p-2 bg-slate-800 rounded-xl">
                       <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                     </div>
                     <div>
                       <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Business Vertical</p>
                       <p className="text-xs font-bold text-slate-200 mt-0.5">{selectedLead.businessType || 'Unspecified'}</p>
                     </div>
                  </div>
                  <div className="flex items-start gap-3">
                     <div className="p-2 bg-slate-800 rounded-xl">
                       <Calendar className="w-3.5 h-3.5 text-slate-400" />
                     </div>
                     <div>
                       <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Expected Timeline</p>
                       <p className="text-xs font-bold text-slate-200 mt-0.5">{selectedLead.expectedTimeline || 'Not Disclosed'}</p>
                     </div>
                  </div>
               </div>

               {/* Rep Tagging & Follow-up Row */}
               <div className="grid grid-cols-2 gap-6 bg-slate-950/30 border border-slate-800/50 rounded-3xl p-5 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-3">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Targeted Team</p>
                     <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-2">
                        {users.filter(u => u.role !== 'Worker').map(user => {
                           const isPrimary = selectedLead.primaryRepId === user.id;
                           const isTagged = selectedLead.taggedRepIds?.includes(user.id);
                           return (
                              <button 
                                key={user.id}
                                onClick={() => {
                                   const nextTags = isTagged 
                                      ? selectedLead.taggedRepIds.filter(id => id !== user.id)
                                      : [...(selectedLead.taggedRepIds || []), user.id];
                                   updateLead(selectedLead.id, { taggedRepIds: nextTags });
                                }}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                                   isPrimary 
                                      ? 'bg-amber-500/10 border-amber-500 text-amber-500 cursor-default' 
                                      : isTagged
                                         ? 'bg-custom-blue/20 border-custom-blue text-white'
                                         : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                                }`}
                              >
                                 {user.name} {isPrimary && ' (Owner)'}
                              </button>
                           );
                        })}
                     </div>
                  </div>

                  <div className="space-y-3">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Next Action Date</p>
                     <div className="relative">
                        <input 
                          type="date" 
                          value={selectedLead.nextFollowUpAt || ''}
                          onChange={e => updateLead(selectedLead.id, { nextFollowUpAt: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:border-custom-blue outline-none transition-all shadow-lg"
                        />
                        <Calendar className="w-3.5 h-3.5 text-custom-blue absolute right-4 top-3.5" />
                     </div>
                     <p className="text-[9px] text-slate-600 font-bold uppercase pl-1 italic">Automatically triggers notification hub alerts.</p>
                  </div>
               </div>

               {/* Interaction Thread */}
               <div className="bg-slate-950/20 border border-slate-800/30 rounded-3xl p-6">
                  <LeadInteractionLog lead={selectedLead} />
               </div>

               {/* Pricing Ledger Component */}
               <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-6">
                  <div className="flex justify-end mb-4 print:hidden">
                     <button 
                       onClick={() => window.print()}
                       className="flex items-center gap-2 text-[10px] font-black uppercase text-custom-blue hover:text-white transition-colors"
                     >
                        <Printer className="w-3.5 h-3.5" /> Professional Print Quote
                     </button>
                  </div>
                  <LeadPricingLedger 
                    leadId={selectedLead.id} 
                    initialItems={selectedLead.items}
                    initialTransportation={selectedLead.transportationCharges}
                    onSave={(items, transport, total) => updateLead(selectedLead.id, { items, transportationCharges: transport, totalValue: total })}
                  />
               </div>

               {/* Fulfillment Conversion */}
               {selectedLead.status === 'active' && selectedLead.items.length > 0 && (
                  <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-700">
                     <div>
                        <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2 uppercase tracking-wide">
                           <CheckCircle2 className="w-4 h-4" /> Finalize Transaction
                        </h4>
                        <p className="text-[10px] text-emerald-500/70 mt-1 uppercase font-black">convert this lead into an operational order</p>
                     </div>
                     <button 
                        onClick={() => convertToOrder(selectedLead.id)}
                        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2"
                     >
                        Confirm Won <Package className="w-4 h-4" />
                     </button>
                  </div>
               )}

               {selectedLead.status === 'won' && (
                  <div className="p-6 bg-custom-blue/5 border border-custom-blue/20 rounded-3xl flex items-center justify-between">
                     <div>
                        <h4 className="text-sm font-bold text-custom-blue flex items-center gap-2 uppercase tracking-wide">
                           <Package className="w-4 h-4" /> Successfully Converted
                        </h4>
                        <p className="text-[10px] text-custom-blue/70 mt-1 uppercase font-black">Linked to Order ID: {selectedLead.convertedOrderId}</p>
                     </div>
                     <div className="px-4 py-2 bg-custom-blue/20 text-custom-blue text-[10px] font-black rounded-lg uppercase">Closed Won</div>
                  </div>
               )}
            </div>
         </div>
      )}

      {/* ─── Tally-Style Print Template (Hidden in Screen) ─── */}
      {selectedLead && (
        <div className="hidden print:block fixed inset-0 bg-white text-black p-8 font-serif leading-relaxed h-full overflow-visible z-[999]">
          <div className="border-[1.5px] border-black p-0.5">
            <div className="border border-black p-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-black pb-6 mb-6">
                <div>
                  <h1 className="text-4xl font-black uppercase tracking-tighter mb-1">{globalSettings.branding.companyName}</h1>
                  <p className="text-sm font-bold opacity-80 uppercase tracking-widest">Formal Commercial Proposal</p>
                  <p className="text-xs mt-4 w-64 leading-relaxed font-medium capitalize">
                    {globalSettings.branding.companyName} Operations<br/>
                    Professional HRMS & CRM Systems<br/>
                    Digital Quote Generated on {new Date().toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="bg-black text-white px-6 py-2 text-xl font-black uppercase tracking-widest mb-4">LEAD QUOTATION</div>
                  <p className="text-sm font-black">Ref: {selectedLead.ticketNumber}</p>
                  <p className="text-xs font-bold opacity-60">Status: {selectedLead.stage.toUpperCase()}</p>
                </div>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-2 border border-black mb-8">
                <div className="p-4 border-r border-black">
                  <p className="text-[10px] font-black uppercase mb-2 bg-black/5 p-1 w-fit">Supplier Details</p>
                  <p className="text-sm font-bold">{globalSettings.branding.companyName}</p>
                  <p className="text-xs mt-1 leading-relaxed opacity-75">Generated via Enterprise CRM Suite</p>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-black uppercase mb-2 bg-black/5 p-1 w-fit">Prospective Customer</p>
                  <p className="text-sm font-bold uppercase">{selectedLead.customerName}</p>
                  <p className="text-xs mt-1 leading-relaxed opacity-75">{selectedLead.companyName || 'Individual Business Lead'}</p>
                  <p className="text-xs mt-1 font-bold">GSTIN: {selectedLead.gstNumber || 'Not Provided'}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full border-collapse border border-black mb-8 text-xs">
                <thead>
                  <tr className="bg-black/5 border-b border-black">
                    <th className="p-3 text-left border-r border-black">S.No</th>
                    <th className="p-3 text-left border-r border-black">Description of Products / Services</th>
                    <th className="p-3 text-right border-r border-black">Quantity</th>
                    <th className="p-3 text-right border-r border-black">Rate / Unit</th>
                    <th className="p-3 text-right border-r border-black">GST %</th>
                    <th className="p-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedLead.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-black last:border-b-0 min-h-[40px]">
                      <td className="p-3 text-left border-r border-black font-bold">{idx + 1}</td>
                      <td className="p-3 text-left border-r border-black font-black uppercase">{item.sku}</td>
                      <td className="p-3 text-right border-r border-black">{item.quantity}</td>
                      <td className="p-3 text-right border-r border-black">₹{item.basePrice.toLocaleString()}</td>
                      <td className="p-3 text-right border-r border-black text-[10px] font-bold">{item.gstPercent}%</td>
                      <td className="p-3 text-right font-black">₹{((item.basePrice * item.quantity) - (item.basePrice * item.quantity * (item.discountPercent / 100))).toLocaleString()}</td>
                    </tr>
                  ))}
                  {/* Fill empty rows */}
                  {selectedLead.items.length < 8 && Array.from({ length: 8 - selectedLead.items.length }).map((_, i) => (
                    <tr key={`empty-${i}`} className="border-b border-black h-8 opacity-20">
                      <td className="border-r border-black" />
                      <td className="border-r border-black" />
                      <td className="border-r border-black" />
                      <td className="border-r border-black" />
                      <td className="border-r border-black" />
                      <td />
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Section */}
              <div className="flex justify-end mb-12">
                <div className="w-64 border border-black p-4 space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Subtotal</span>
                    <span>₹{selectedLead.items.reduce((acc, i) => acc + (i.basePrice * i.quantity), 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-rose-800">
                    <span>Discounts</span>
                    <span>- ₹{selectedLead.items.reduce((acc, i) => acc + (i.basePrice * i.quantity * (i.discountPercent / 100)), 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span>Transportation</span>
                    <span>₹{selectedLead.transportationCharges.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-black pt-2 flex justify-between text-lg font-black bg-black text-white px-2 py-1">
                    <span>Total (₹)</span>
                    <span>{selectedLead.totalValue.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="mt-20 flex justify-between px-10">
                <div className="text-center">
                  <div className="w-32 border-b border-black mb-2" />
                  <p className="text-[10px] font-bold uppercase">Customer Sign</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase mb-12">For {globalSettings.branding.companyName}</p>
                  <div className="w-32 border-b border-black mb-2" />
                  <p className="text-[10px] font-bold uppercase">Authorized Signatory</p>
                </div>
              </div>

              <div className="mt-20 text-[8px] font-bold text-center opacity-40 uppercase tracking-widest border-t border-black pt-4">
                This is a computer-generated quote. No physical signature required. Valid for 15 days.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Form ─── */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[150] flex items-start justify-center p-4 overflow-y-auto">
           <div className="w-full max-w-4xl my-auto">
              <LeadRegistrationForm 
                onSuccess={() => setIsFormOpen(false)} 
                onCancel={() => setIsFormOpen(false)} 
              />
           </div>
        </div>
      )}
    </div>
  );
}
