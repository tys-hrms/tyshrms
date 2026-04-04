import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useSettings } from '../../contexts/SettingsContext';
import { LeaveType, LeaveLog, LeaveStatus } from '../../types';
import { NotifyService } from '../../lib/NotifyService';
import { 
  Plus, CheckCircle2, XCircle, Clock, Calendar, 
  ArrowRight, Info, AlertTriangle, Briefcase, 
  Stethoscope, Plane, DollarSign, ChevronRight,
  User as UserIcon, MessageSquare, ShieldCheck, Search
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
    if (isSysAdmin) list = leaves; 
    else if (isManager) list = leaves.filter(l => { const owner = users.find(u => u.id === l.user_id); return l.user_id === currentUser?.id || (owner?.role === 'Worker'); });
    else list = leaves.filter(l => l.user_id === currentUser?.id);
    if (filter !== 'all') list = list.filter(l => l.status === filter);
    return list.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [leaves, isSysAdmin, isManager, currentUser?.id, filter, users]);

  const checkOverlaps = (leave: LeaveLog) => {
    return leaves.filter(l => 
      l.id !== leave.id && 
      l.status === 'approved' &&
      ((l.date >= leave.date && l.date <= (leave.end_date || leave.date)) ||
       ((l.end_date || l.date) >= leave.date && (l.end_date || l.date) <= (leave.end_date || leave.date)))
    );
  };

  const handleRespond = async (leave: LeaveLog, status: 'approved' | 'rejected') => {
    if (!currentUser) return;
    let nextStatus: LeaveStatus = status;
    if (status === 'approved') {
       if (leave.status === 'pending_manager' && isManager) nextStatus = 'pending_admin';
       else if (leave.status === 'pending_admin' && isSysAdmin) nextStatus = 'approved';
       else if (isSysAdmin) nextStatus = 'approved';
    }
    respondToLeave(leave.id, nextStatus, currentUser.id);
    const worker = users.find(u => u.id === leave.user_id);
    if (worker && settings.leave_automation.enabled && nextStatus === 'approved') {
       NotifyService.notifyLeaveResponse(settings.leave_automation, worker, leave, currentUser, 'approved');
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
      user_id: currentUser.id,
      date: startDate,
      end_date: endDate || startDate,
      total_days: calculatedDays,
      type,
      reason,
      status: initialStatus,
      medical_certificate_url: type === 'medical' ? (e.currentTarget as any).medicalUrl?.value || '' : undefined
    } as any);
    setIsRequesting(false); setStartDate(''); setEndDate(''); setReason(''); setType('casual');
  };

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div><h1 className="text-2xl font-black text-white tracking-tight uppercase">Absence Registry</h1><p className="text-slate-500 font-bold text-[10px] mt-1 max-w-lg tracking-widest uppercase">{canManageSomething ? 'Hierarchical Ledger Review' : 'Absence Workflow & Status'}</p></div>
        {!isRequesting && <button onClick={() => setIsRequesting(true)} className="flex items-center justify-center px-6 py-2.5 bg-custom-blue text-white font-bold rounded-2xl transition-all shadow-xl shadow-custom-blue/20 uppercase text-xs tracking-widest hover:scale-105">New Request</button>}
      </div>

      {isRequesting && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="space-y-2"><label className="text-[10px] ml-1 font-black text-slate-500 uppercase tracking-widest">Start Date</label><input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:border-custom-blue outline-none [color-scheme:dark]" /></div>
            <div className="space-y-2"><label className="text-[10px] ml-1 font-black text-slate-500 uppercase tracking-widest">End Date</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:border-custom-blue outline-none [color-scheme:dark]" /></div>
            <div className="space-y-2"><label className="text-[10px] ml-1 font-black text-slate-500 uppercase tracking-widest">Type</label><select required value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:border-custom-blue outline-none cursor-pointer"><option value="casual">Casual</option><option value="sick">Sick</option><option value="annual">Annual</option><option value="medical">Medical</option></select></div>
            <div className="md:col-span-3 space-y-2"><label className="text-[10px] ml-1 font-black text-slate-500 uppercase tracking-widest">Reason</label><textarea required value={reason} onChange={e => setReason(e.target.value)} rows={2} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:border-custom-blue outline-none resize-none transition-all" /></div>
          </div>
          <div className="flex justify-between items-center pt-6 border-t border-slate-800"><p className="text-xs font-black text-white uppercase tracking-widest">Duration: {calculatedDays} Days</p><div className="flex gap-4"><button type="button" onClick={() => setIsRequesting(false)} className="text-xs font-black uppercase text-slate-500 tracking-widest">Cancel</button><button type="submit" className="px-8 py-3 bg-custom-blue text-white rounded-2xl font-black text-xs uppercase tracking-widest">Submit</button></div></div>
        </form>
      )}

      {reviewingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden p-10"><h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Review Request</h3><p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-10">Decision required for {getUserName(reviewingLeave.user_id)}</p><div className="space-y-6 mb-10"><div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl"><p className="text-[10px] font-black text-slate-600 uppercase mb-2">Reason</p><p className="text-sm font-bold text-white italic">"{reviewingLeave.reason}"</p></div>{checkOverlaps(reviewingLeave).length > 0 && <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-500" /><span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Resource Shortage: {checkOverlaps(reviewingLeave).length} Others Approved</span></div>}</div><div className="grid grid-cols-2 gap-4"><button onClick={() => handleRespond(reviewingLeave, 'rejected')} className="py-4 bg-slate-800 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Reject</button><button onClick={() => handleRespond(reviewingLeave, 'approved')} className="py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20">Approve</button></div></div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead><tr className="bg-slate-950/50 text-[10px] font-black text-slate-500 uppercase tracking-widest"><th className="px-6 py-6">Identity</th><th className="px-6 py-6">Type</th><th className="px-6 py-6">Calendar</th><th className="px-6 py-6">Status</th>{canManageSomething && <th className="px-6 py-6 text-right">Action</th>}</tr></thead><tbody className="divide-y divide-slate-800/30">
          {displayLeaves.map(leave => (
            <tr key={leave.id} className="group hover:bg-white/[0.01] transition-colors"><td className="px-6 py-5"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-black text-custom-blue">{getUserName(leave.user_id)[0].toUpperCase()}</div><span className="text-sm font-bold text-white uppercase tracking-wide">{getUserName(leave.user_id)}</span></div></td><td className="px-6 py-5"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{leave.type}</span></td><td className="px-6 py-5"><span className="text-[10px] font-black text-white uppercase tracking-widest">{leave.date} to {leave.end_date || leave.date}</span></td><td className="px-6 py-5"><span className={`text-[10px] font-black uppercase tracking-widest ${leave.status === 'approved' ? 'text-emerald-500' : leave.status === 'rejected' ? 'text-rose-500' : 'text-amber-500'}`}>{leave.status.replace('_', ' ')}</span></td>{canManageSomething && <td className="px-6 py-5 text-right">{leave.status.includes('pending') ? <button onClick={() => setReviewingLeave(leave)} className="text-[10px] font-black text-custom-blue uppercase tracking-widest border border-custom-blue/30 px-4 py-2 rounded-xl bg-custom-blue/5 hover:bg-custom-blue hover:text-white transition-all">Review</button> : <ChevronRight className="w-4 h-4 text-slate-800 ml-auto" />}</td>}</tr>
          ))}
          {displayLeaves.length === 0 && <tr><td colSpan={5} className="px-6 py-32 text-center opacity-20 font-black uppercase tracking-[0.2em] italic text-slate-600">No Records Logged</td></tr>}
        </tbody></table></div>
      </div>
    </div>
  );
}
