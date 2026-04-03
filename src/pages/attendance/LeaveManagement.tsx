import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useSettings } from '../../contexts/SettingsContext';
import { LeaveType, LeaveLog, User, LeaveStatus } from '../../types';
import { NotifyService } from '../../lib/NotifyService';
import { 
  Plus, CheckCircle2, XCircle, Clock, Calendar, 
  ArrowRight, Info, AlertTriangle, Briefcase, 
  Stethoscope, Plane, DollarSign, Filter, ChevronRight,
  User as UserIcon, MessageSquare, ShieldCheck, Mail, Phone,
  Search, AlertCircle
} from 'lucide-react';

export default function LeaveManagement() {
  const { session, users } = useAuth();
  const { leaves, requestLeave, respondToLeave } = useApp();
  const { settings } = useSettings();
  
  const [isRequesting, setIsRequesting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState<LeaveType>('casual');
  const [reason, setReason] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [reviewingLeave, setReviewingLeave] = useState<LeaveLog | null>(null);

  const currentUser = session.currentUser;
  const isSysAdmin = currentUser?.role === 'Admin';
  const isManager = currentUser?.role === 'Manager';
  const canManageSomething = isSysAdmin || isManager;

  // Calculate total days for the new request
  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  }, [startDate, endDate]);

  const displayLeaves = useMemo(() => {
    let list = leaves;
    
    if (isSysAdmin) {
      list = leaves; 
    } else if (isManager) {
      list = leaves.filter(l => {
        const owner = users.find(u => u.id === l.userId);
        return l.userId === currentUser?.id || (owner?.role === 'Worker');
      });
    } else {
      list = leaves.filter(l => l.userId === currentUser?.id);
    }

    if (filter !== 'all') list = list.filter(l => l.status === filter);
    return list.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [leaves, isSysAdmin, isManager, currentUser?.id, filter, users]);

  const checkOverlaps = (leave: LeaveLog) => {
    return leaves.filter(l => 
      l.id !== leave.id && 
      l.status === 'approved' &&
      ((l.date >= leave.date && l.date <= (leave.endDate || leave.date)) ||
       ((l.endDate || l.date) >= leave.date && (l.endDate || l.date) <= (leave.endDate || leave.date)))
    );
  };

  const handleRespond = async (leave: LeaveLog, status: 'approved' | 'rejected') => {
    if (!currentUser) return;
    
    let nextStatus: LeaveStatus = status;
    
    if (status === 'approved') {
       if (leave.status === 'pending_manager' && isSysAdmin) {
          // Admin can override manager or final approve
          nextStatus = 'approved';
       } else if (leave.status === 'pending_manager' && isManager) {
          nextStatus = 'pending_admin';
       } else if (leave.status === 'pending_admin' && isSysAdmin) {
          nextStatus = 'approved';
       }
    }

    // Core state update
    respondToLeave(leave.id, nextStatus, currentUser.id);

    // Automated Communication Layer
    const worker = users.find(u => u.id === leave.userId);
    if (worker && settings.leaveAutomation.enabled && nextStatus === 'approved') {
      setTimeout(() => {
        NotifyService.notifyLeaveResponse(settings.leaveAutomation, worker, leave, currentUser, 'approved');
      }, 500);
    }

    setReviewingLeave(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !reason || !currentUser) return;

    let initialStatus: LeaveStatus = 'pending';
    if (currentUser.role === 'Worker') initialStatus = 'pending_manager';
    else if (currentUser.role === 'Manager') initialStatus = 'pending_admin';
    else if (currentUser.role === 'Admin') initialStatus = 'approved';

    requestLeave({
      userId: currentUser.id,
      date: startDate,
      endDate: endDate || startDate,
      totalDays: calculatedDays,
      type,
      reason,
      status: initialStatus,
      medicalCertificateUrl: type === 'medical' ? (e.currentTarget as any).medicalUrl?.value || '' : undefined
    } as any);

    setIsRequesting(false);
    setStartDate('');
    setEndDate('');
    setReason('');
    setType('casual');
  };

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';

  const getLeaveTypeIcon = (t: LeaveType) => {
    switch(t) {
      case 'casual': return <Briefcase className="w-4 h-4" />;
      case 'sick': return <Stethoscope className="w-4 h-4" />;
      case 'annual': return <Plane className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">Leave Center</h1>
          <p className="text-slate-500 font-bold text-xs mt-1 max-w-lg tracking-widest uppercase">
            {canManageSomething 
              ? 'Hierarchical review & automated management flow' 
              : 'Submit absence requests & track workflow status'}
          </p>
        </div>
        {!isRequesting && (
          <button 
            onClick={() => setIsRequesting(true)}
            className="flex items-center justify-center px-6 py-3 bg-custom-blue hover:bg-blue-600 text-white font-bold rounded-2xl transition-all shadow-xl shadow-custom-blue/20 hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" /> CREATE REQUEST
          </button>
        )}
      </div>

      {/* Modern Summary Cards for Admins */}
      {canManageSomething && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 border border-amber-500/20 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-3xl rounded-full -mr-8 -mt-8" />
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Pending Decision</p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-white">{leaves.filter(l => l.status === 'pending').length}</span>
              <Clock className="w-8 h-8 text-amber-500/20 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-emerald-500/20 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl rounded-full -mr-8 -mt-8" />
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Approved (Today)</p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-white">
                {leaves.filter(l => l.status === 'approved' && l.date === new Date().toISOString().split('T')[0]).length}
              </span>
              <CheckCircle2 className="w-8 h-8 text-emerald-500/20 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-custom-blue/20 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl rounded-full -mr-8 -mt-8" />
            <p className="text-[10px] font-black text-custom-blue uppercase tracking-widest mb-2">Automation Active</p>
            <div className="flex items-end justify-between">
              <span className="text-sm font-bold text-white uppercase">{settings.leaveAutomation.enabled ? 'Enabled' : 'Disabled'}</span>
              <ShieldCheck className="w-8 h-8 text-custom-blue/20 group-hover:scale-110 transition-transform" />
            </div>
          </div>
        </div>
      )}

      {isRequesting && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in slide-in-from-top-4 duration-400">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-custom-blue/10 rounded-xl flex items-center justify-center">
              <Plus className="w-6 h-6 text-custom-blue" />
            </div>
            <h3 className="text-xl font-bold text-white uppercase tracking-tight">Draft Application</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Start Date</label>
              <input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-white focus:border-custom-blue outline-none transition-all [color-scheme:dark]" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">End Date (Optional)</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || new Date().toISOString().split('T')[0]} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-white focus:border-custom-blue outline-none transition-all [color-scheme:dark]" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Leave Category</label>
              <select required value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-white focus:border-custom-blue outline-none appearance-none cursor-pointer">
                <option value="casual">Casual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="annual">Annual Leave</option>
                <option value="medical">Medical Leave (Cert Req)</option>
                <option value="unpaid">Loss of Pay</option>
              </select>
            </div>
            {type === 'medical' && (
               <div className="md:col-span-3 space-y-2 animate-in slide-in-from-left-2 duration-300">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Medical Certificate Link (URL / Cloud Storage)</label>
                  <input 
                    name="medicalUrl"
                    type="url"
                    placeholder="https://cloud.storage/certificate.pdf"
                    className="w-full bg-slate-950 border border-emerald-500/30 rounded-2xl px-5 py-3.5 text-white focus:border-emerald-500 outline-none transition-all"
                  />
               </div>
            )}
            <div className="md:col-span-3 space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Reason / Note</label>
              <textarea required value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Briefly explain your absence..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:border-custom-blue outline-none resize-none transition-all" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700">
              <Info className="w-4 h-4 text-custom-blue" />
              <p className="text-sm font-medium text-slate-300">Duration: <span className="text-white font-bold">{calculatedDays} day(s)</span></p>
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setIsRequesting(false)} className="px-8 py-3 text-slate-600 font-bold hover:text-white transition-colors uppercase text-sm tracking-widest">Discard</button>
              <button type="submit" className="px-10 py-3 bg-custom-blue text-white rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-xl shadow-custom-blue/20 uppercase text-sm tracking-widest">Submit Application</button>
            </div>
          </div>
        </form>
      )}

      {/* Review Modal (Admin/Manager only) */}
      {reviewingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between">
               <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Review Leave Request</h3>
                  <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-widest">System Validation & Overlap Check</p>
               </div>
               <button onClick={() => setReviewingLeave(null)} className="p-2 text-slate-500 hover:text-white"><XCircle className="w-6 h-6" /></button>
            </div>
            
            <div className="p-8 space-y-6">
              {/* Overlap Alert */}
              {checkOverlaps(reviewingLeave).length > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3">
                   <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                   <div>
                      <p className="text-xs font-black text-amber-500 uppercase tracking-wider">Attendance Overlap Detected</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {checkOverlaps(reviewingLeave).length} other workers are already approved for leave during these dates.
                      </p>
                   </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                   <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Employee</p>
                   <p className="text-sm font-bold text-white">{getUserName(reviewingLeave.userId)}</p>
                </div>
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                   <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Leave Type</p>
                   <p className="text-sm font-bold text-custom-blue uppercase">{reviewingLeave.type}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                 <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Reason for Absence</p>
                 <p className="text-sm text-slate-300 italic">"{reviewingLeave.reason}"</p>
              </div>

              {settings.leaveAutomation.enabled && (
                <div className="p-4 bg-custom-blue/10 border border-custom-blue/20 rounded-2xl flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 text-custom-blue" />
                      <span className="text-xs font-bold text-custom-blue uppercase">Auto-Communication Active</span>
                   </div>
                   <span className="text-[10px] text-slate-500 font-bold italic">WhatsApp/Email triggers on action</span>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-950/50 flex gap-4 border-t border-slate-800">
               <button 
                onClick={() => handleRespond(reviewingLeave, 'rejected')}
                className="flex-1 py-4 bg-slate-900 hover:bg-rose-500 text-slate-400 hover:text-white rounded-2xl font-bold uppercase tracking-widest text-xs transition-all border border-slate-800 hover:border-rose-500"
               >
                 Reject Request
               </button>
               <button 
                onClick={() => handleRespond(reviewingLeave, 'approved')}
                className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs transition-all shadow-xl shadow-emerald-500/20"
               >
                 Approve & Confirm
               </button>
            </div>
          </div>
        </div>
      )}

      {/* History Area */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tight">
            <Calendar className="w-6 h-6 text-slate-600" />
            Ledger & Review
          </h3>
          <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-slate-800 text-custom-blue shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-5">Employee Context</th>
                <th className="px-6 py-5">Category</th>
                <th className="px-6 py-5">Period</th>
                <th className="px-6 py-5">Log & Reason</th>
                <th className="px-6 py-5">Resolution</th>
                {canManageSomething && <th className="px-6 py-5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {displayLeaves.map(leave => {
                const isPending = leave.status === 'pending';
                const owner = users.find(u => u.id === leave.userId);
                
                return (
                  <tr key={leave.id} className="group hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-custom-blue font-black shadow-inner">
                          {getUserName(leave.userId)[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white block">{getUserName(leave.userId)}</span>
                          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1">
                             <UserIcon className="w-3 h-3" /> {owner?.role}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                       <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest ${
                         leave.type === 'casual' ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' :
                         leave.type === 'sick' ? 'bg-rose-500/5 border-rose-500/10 text-rose-400' :
                         leave.type === 'annual' ? 'bg-blue-500/5 border-blue-500/10 text-blue-400' :
                         'bg-amber-500/5 border-amber-500/10 text-amber-400'
                       }`}>
                         {getLeaveTypeIcon(leave.type)}
                         {leave.type}
                       </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <div className="text-sm text-white font-black flex items-center gap-2">
                          <span className="opacity-60 font-medium">FROM</span> {leave.date}
                        </div>
                        {leave.endDate && leave.endDate !== leave.date && (
                          <div className="text-sm text-white font-black flex items-center gap-2">
                            <span className="opacity-60 font-medium">TO</span> {leave.endDate}
                          </div>
                        )}
                        <span className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">
                          {leave.totalDays} Total Days Logged
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 max-w-xs">
                       <p className="text-xs text-slate-300 italic leading-relaxed line-clamp-2">"{leave.reason}"</p>
                    </td>
                    <td className="px-6 py-5">
                      {leave.status === 'approved' && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </span>
                          {leave.reviewedBy && (
                            <span className="text-[9px] text-slate-600 font-bold uppercase">final by {getUserName(leave.reviewedBy)}</span>
                          )}
                        </div>
                      )}
                      {leave.status === 'rejected' && (
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5" /> Denied
                        </span>
                      )}
                      {leave.status === 'pending_manager' && (
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Pending Manager
                        </span>
                      )}
                      {leave.status === 'pending_admin' && (
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" /> Pending Admin
                        </span>
                      )}
                    </td>
                    {canManageSomething && (
                      <td className="px-6 py-5 text-right">
                        {isPending ? (
                          <button 
                            onClick={() => setReviewingLeave(leave)}
                            className="px-6 py-2 bg-slate-800 hover:bg-custom-blue text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700 hover:border-custom-blue"
                          >
                            Review & Respond
                          </button>
                        ) : (
                          <div className="flex items-center justify-end gap-4">
                             {(owner?.contactNumber || owner?.phone) && (
                               <button 
                                onClick={() => NotifyService.sendWhatsApp(owner.contactNumber || owner.phone || '', `Hi ${owner.name}, following up regarding your ${leave.type} leave request...`)}
                                className="p-2 text-slate-600 hover:text-emerald-500 transition-colors"
                                title="Follow up on WhatsApp"
                               >
                                 <MessageSquare className="w-4 h-4" />
                               </button>
                             )}
                             <ChevronRight className="w-4 h-4 text-slate-800" />
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {displayLeaves.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-32 text-center">
                    <div className="flex flex-col items-center justify-center opacity-20">
                      <Search className="w-16 h-16 text-slate-500 mb-4" />
                      <p className="text-xl font-black text-white uppercase tracking-tighter italic">No Records Found</p>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-1">Adjust filters or roles to view data</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
