import React from 'react';
import { Bell, X, CheckCircle2, AlertCircle, Clock, Layout, Package, Users } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { notifications, markNotificationRead } = useApp();
  const { session } = useAuth();
  const role = session.currentUser?.role || 'Worker';

  const myNotifications = notifications.filter(n => 
    n.userId === session.currentUser?.id || 
    (n.userId === 'broadcast_all' && (role === 'Admin' || role === 'Manager'))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = myNotifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="bg-slate-900 border border-white/10 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden relative animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 flex flex-col max-h-[80vh]">
         {/* Custom Header */}
         <div className="p-8 pb-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 rounded-2xl bg-custom-blue/10 flex items-center justify-center relative">
                  <Bell className="w-7 h-7 text-custom-blue" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 rounded-full border-4 border-slate-900 flex items-center justify-center text-[10px] font-black text-white pulsing-red-shadow">
                      {unreadCount}
                    </span>
                  )}
               </div>
               <div>
                  <h2 className="text-2xl font-black text-white tracking-tight uppercase">System Hub</h2>
                  <p className="text-xs text-slate-500 font-bold tracking-widest uppercase">Global Notification Center</p>
               </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all"
            >
               <X className="w-5 h-5" />
            </button>
         </div>

         {/* Content List */}
         <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
            {myNotifications.length === 0 && (
               <div className="py-20 text-center flex flex-col items-center justify-center opacity-40">
                  <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mb-6 border border-slate-700/50">
                      <Layout className="w-10 h-10 text-slate-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Silence is Golden</p>
                  <p className="text-xs text-slate-600 max-w-[200px]">No new activities or alerts are currently queued in your dashboard.</p>
               </div>
            )}

            <div className="space-y-4">
               {myNotifications.map((n) => {
                  const isRead = n.read;
                  return (
                     <div 
                        key={n.id}
                        onClick={() => { markNotificationRead(n.id); if (n.type === 'alert') onClose(); }}
                        className={`group p-5 rounded-[24px] border transition-all cursor-pointer relative overflow-hidden ${
                           isRead 
                             ? 'bg-slate-950/20 border-white/5' 
                             : 'bg-white/[0.03] border-custom-blue/20 shadow-lg shadow-custom-blue/5'
                        }`}
                     >
                        {!isRead && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-custom-blue" />}
                        
                        <div className="flex items-start gap-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                              n.type === 'alert' 
                                ? 'bg-rose-500/20 border-rose-500/20 text-rose-500' 
                                : n.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/20 text-emerald-500' : 'bg-custom-blue/20 border-custom-blue/20 text-custom-blue'
                           }`}>
                              {n.type === 'alert' ? <AlertCircle className="w-5 h-5" /> : n.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                           </div>
                           
                           <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                 <h4 className={`text-sm font-bold uppercase tracking-tight ${!isRead ? 'text-white' : 'text-slate-400'}`}>
                                    {n.title}
                                 </h4>
                                 <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                                    {new Date(n.createdAt).toLocaleTimeString()}
                                 </span>
                              </div>
                              <p className="text-sm text-slate-500 leading-relaxed group-hover:text-slate-300 transition-colors">
                                 {n.message}
                              </p>
                              <div className="flex items-center gap-4 mt-4">
                                 <span className="px-2 py-0.5 rounded bg-slate-900 border border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">
                                    {n.type}
                                 </span>
                                 {!isRead && (
                                    <button className="text-[9px] font-black text-custom-blue uppercase tracking-widest hover:underline">
                                       Mark as Resolved
                                    </button>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>
                  );
               })}
            </div>
         </div>

         {/* Multi-tenant Info Footer */}
         <div className="p-6 bg-slate-950/50 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none">Global Sync Active</p>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase opacity-60">ID: {session.currentUser?.id.substr(0, 9)}</p>
         </div>
      </div>

      <style>{`
        @keyframes pulsing-red {
          0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
        .pulsing-red-shadow {
          animation: pulsing-red 2s infinite;
        }
      `}</style>
    </div>
  );
}
