import React, { useEffect, useState } from 'react';
import { useCRM } from '../../contexts/CRMContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Bell, AlertTriangle, MessageCircle, Instagram, 
  Facebook, Linkedin, Youtube, Users, HelpCircle, 
  X, ChevronRight, Zap
} from 'lucide-react';
import { CRMLead, CRMLeadSource } from '../../types';

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

const SOURCE_COLORS: Record<CRMLeadSource, string> = {
  whatsapp: 'text-emerald-500',
  instagram: 'text-pink-500',
  facebook: 'text-blue-600',
  linkedin: 'text-blue-700',
  youtube: 'text-red-600',
  word_of_mouth: 'text-amber-500',
  other: 'text-slate-400',
  manual: 'text-slate-500',
};

export default function TicketNotificationHub() {
  const { leads, updateLead } = useCRM();
  const { session } = useAuth();
  const [visibleTickets, setVisibleTickets] = useState<CRMLead[]>([]);

  // Monitor for breaches and new unassigned leads tagged to current user
  useEffect(() => {
    const userId = session.currentUser?.id;
    if (!userId) return;

    const relevant = leads.filter(l => {
      // 1. Unread/New leads assigned/tagged to me
      const isMine = l.primary_rep_id === userId || l.tagged_rep_ids?.includes(userId) || l.assigned_manager_id === userId;
      const isNew = new Date(l.created_at).getTime() > Date.now() - 60000; // Last 1 minute
      
      // 2. SLA Breaches
      const isBreached = l.is_breached && l.status === 'active';

      return isMine && (isNew || isBreached);
    });

    setVisibleTickets(relevant.slice(0, 3)); // Max 3 at once
  }, [leads, session.currentUser?.id]);

  const dismiss = (id: string) => {
    setVisibleTickets(prev => prev.filter(t => t.id !== id));
  };

  const acknowledge = async (id: string) => {
    await updateLead(id, { is_breached: false, last_contacted_at: new Date().toISOString() });
    dismiss(id);
  };

  if (visibleTickets.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-[100] w-80 space-y-3 pointer-events-none">
      {visibleTickets.map((ticket) => {
        const Icon = SOURCE_ICONS[ticket.source];
        const isBreached = ticket.is_breached;

        return (
          <div 
            key={ticket.id}
            className={`pointer-events-auto p-4 rounded-3xl border shadow-2xl animate-in slide-in-from-right-8 duration-300 flex flex-col gap-3 ${
              isBreached 
                ? 'bg-rose-950/90 border-rose-500/50 backdrop-blur-xl' 
                : 'bg-slate-900/90 border-slate-700 backdrop-blur-xl'
            }`}
          >
            <div className="flex items-start justify-between">
               <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isBreached ? 'bg-rose-500/20' : 'bg-slate-800'}`}>
                     <Icon className={`w-5 h-5 ${isBreached ? 'text-rose-500' : SOURCE_COLORS[ticket.source]}`} />
                  </div>
                  <div>
                     <p className={`text-[10px] font-black uppercase tracking-widest ${isBreached ? 'text-rose-400' : 'text-slate-500'}`}>
                        {isBreached ? 'SLA BREACH ALERT' : 'New Ticket Assigned'}
                     </p>
                     <h4 className="text-sm font-black text-white">{ticket.ticket_number}</h4>
                  </div>
               </div>
               <button onClick={() => dismiss(ticket.id)} className="text-slate-500 hover:text-white">
                  <X className="w-4 h-4" />
               </button>
            </div>

            <div>
               <p className="text-xs font-bold text-slate-200">{ticket.customer_name}</p>
               <p className="text-[10px] text-slate-400 font-medium">{ticket.company_name || 'Individual Lead'}</p>
            </div>

            <div className="flex items-center gap-2">
               {isBreached ? (
                  <button 
                    onClick={() => acknowledge(ticket.id)}
                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase py-2 rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-3 h-3" /> Acknowledge
                  </button>
               ) : (
                  <button 
                    onClick={() => acknowledge(ticket.id)}
                    className="flex-1 bg-custom-blue hover:bg-blue-600 text-white text-[10px] font-black uppercase py-2 rounded-xl shadow-lg shadow-custom-blue/20 transition-all flex items-center justify-center gap-2"
                  >
                    View Details <ChevronRight className="w-3 h-3" />
                  </button>
               )}
            </div>
            
            {isBreached && (
              <div className="flex items-center gap-2 text-[10px] font-black text-rose-400 animate-pulse mt-1">
                 <AlertTriangle className="w-3 h-3" /> REDIRECTED TO MANAGEMENT
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
