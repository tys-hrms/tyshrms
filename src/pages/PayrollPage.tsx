import React, { useState, useMemo } from 'react';
import { 
  IndianRupee, Calendar, Search, Calculator, FileText, 
  CheckCircle2, TrendingUp, Save, Building2, Printer, MapPin, Receipt, History, Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useApp } from '../contexts/AppContext';
import { User } from '../types';
import { db } from '../lib/database';

export default function PayrollPage() {
  const { users, session, attendanceLogs } = useAuth();
  const { settings } = useSettings();
  const { leaves } = useApp();

  const [activeTab, setActiveTab] = useState<'processing' | 'structures' | 'history'>('processing');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().split('T')[0].slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [showSlip, setShowSlip] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const calculateSalary = (user: any) => {
    if (!user.salary_structure) return null;
    const { payroll_settings: ps } = settings;
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    let presentDays = 0;
    let holidays = 0;
    let paidLeaves = 0;
    let weekends = 0;
    let totalOtMinutes = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(year, month - 1, d);
      if (ps?.holiday_list.find((h: any) => h.date === dateStr)) { holidays++; continue; }
      if (ps?.weekends?.includes(dayDate.getDay())) { weekends++; continue; }
      if (leaves.find(l => l.user_id === user.id && l.status === 'approved' && dateStr >= l.date && dateStr <= (l.end_date || l.date))) { paidLeaves++; continue; }
      
      const att = attendanceLogs.find(l => l.user_id === user.id && l.date === dateStr);
      if (att?.clock_in) {
        presentDays++;
        if (att.total_minutes && att.total_minutes > 480) {
          totalOtMinutes += (att.total_minutes - 480);
        }
      }
    }

    const billableDays = presentDays + holidays + paidLeaves + weekends;
    const grossComponents = user.salary_structure.basic + user.salary_structure.hra + user.salary_structure.other_allowances;
    const dayRate = grossComponents / daysInMonth;
    const grossPayBase = Math.round(dayRate * billableDays);
    
    // OT Calculation (Hourly rate derived from gross components / month hours)
    const hourlyRate = dayRate / 8;
    const otPay = Math.round(totalOtMinutes / 60 * hourlyRate * (ps?.ot_multiplier || 1.5));
    const grossPay = grossPayBase + otPay;

    let epf = (user.salary_structure.is_epf_member && ps?.epf_enabled) 
      ? Math.round(user.salary_structure.basic * ((ps?.epf_rate || 12) / 100)) 
      : 0;
    
    let esi = (user.salary_structure.is_esi_member && ps?.esi_enabled && grossPay <= 21000) 
      ? Math.round(grossPay * ((ps?.esi_rate || 0.75) / 100)) 
      : 0;
    
    let pt = (user.salary_structure.is_pt_member && ps?.pt_enabled && grossPay > (ps?.pt_threshold || 10000)) 
      ? (ps?.pt_amount || 200) 
      : 0;

    const netPay = grossPay - epf - esi - pt;
    return { billableDays, grossPay, epf, esi, pt, netPay, otPay };
  };

  const processedList = useMemo(() => {
    return users
      .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(u => ({ ...u, payroll: calculateSalary(u) }));
  }, [users, selectedMonth, searchTerm, attendanceLogs, leaves]);

  const handleCommitBatch = async () => {
    setIsSaving(true);
    const newRecords = processedList
      .filter(item => item.payroll !== null)
      .map(item => ({
        id: crypto.randomUUID(),
        tenant_id: item.tenant_id || session.tenant?.id || 'TYS-DEFAULT',
        user_id: item.id,
        month: selectedMonth,
        working_days: item.payroll!.billableDays,
        gross_pay: item.payroll!.grossPay,
        epf_deduction: item.payroll!.epf,
        esi_deduction: item.payroll!.esi,
        pt_deduction: item.payroll!.pt,
        net_pay: item.payroll!.netPay,
        status: 'processed',
        created_at: new Date().toISOString()
      }));

    if (newRecords.length > 0) {
      await db.saveMany('salary_records', newRecords);
      alert(`Committed ${newRecords.length} records.`);
    }
    setIsSaving(false);
  };
  
  const handleBankExport = () => {
    const records = processedList.filter(item => item.payroll !== null);
    // Consolidated Indian Bank Bulk Transfer Columns: 
    // Beneficiary Account, Transfer Amount, Beneficiary Name, IFSC Code, Payment Type, Remarks
    const headers = ['Beneficiary Account Number', 'Amount', 'Beneficiary Name', 'IFSC Code', 'Payment Type', 'Remarks'];
    const rows = records.map(item => [
      item.account_no || 'NOT_SET',
      item.payroll!.netPay,
      item.name.toUpperCase(),
      item.ifsc_code || 'NOT_SET',
      'NEFT',
      `SALARY_${selectedMonth}`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bank_Transfer_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const slipUser = showSlip ? users.find(u => u.id === showSlip) : null;
  const slipData = slipUser ? calculateSalary(slipUser) : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">Payroll Hub</h1>
          <p className="text-slate-500 font-bold text-xs mt-1 tracking-widest uppercase">Statutory compliance & localized salary engine</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
              <button onClick={() => setActiveTab('processing')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'processing' ? 'bg-slate-800 text-custom-blue shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><Calculator className="w-3.5 h-3.5" /> Computation</button>
              <button onClick={() => setActiveTab('structures')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'structures' ? 'bg-slate-800 text-custom-blue shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><TrendingUp className="w-3.5 h-3.5" /> Structures</button>
           </div>
           <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-xs text-white uppercase font-black outline-none focus:border-custom-blue [color-scheme:dark]" />
        </div>
      </div>

      {activeTab === 'processing' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl print:hidden">
          <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Find employee..." className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:border-custom-blue outline-none" />
             </div>
             <div className="flex items-center gap-3">
                <button 
                  onClick={handleBankExport}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-custom-blue rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" /> Bulk Bank CSV
                </button>
                <button onClick={handleCommitBatch} disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/10 active:scale-95"><Save className="w-3.5 h-3.5" /> {isSaving ? 'Processing... ' : 'Commit Batch'}</button>
             </div>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-slate-950/50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                     <th className="px-6 py-5">Staff Identity</th>
                     <th className="px-6 py-5">Work Days</th>
                     <th className="px-6 py-5 text-right">OT Pay</th>
                     <th className="px-6 py-5 text-right">Gross Salary</th>
                     <th className="px-6 py-5 text-right">Deductions</th>
                     <th className="px-6 py-5 text-right">Net Payable</th>
                     <th className="px-6 py-5 text-center">Action</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                   {processedList.map(item => (
                      <tr key={item.id} className="hover:bg-white/[0.01] transition-colors group">
                         <td className="px-6 py-5"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-custom-blue font-black shadow-inner">{item.name[0]}</div><div><span className="text-sm font-bold text-white block uppercase tracking-wide group-hover:text-custom-blue transition-colors">{item.name}</span><span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{item.role}</span></div></div></td>
                         <td className="px-6 py-5">{item.payroll ? <div className="flex items-center gap-2"><span className="text-sm font-black text-white">{item.payroll.billableDays}</span><span className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">days</span></div> : <span className="text-[10px] text-rose-500 font-black uppercase tracking-widest italic opacity-40">No Structure</span>}</td>
                         <td className="px-6 py-5 text-right">{item.payroll && item.payroll.otPay > 0 ? <span className="text-xs font-black text-indigo-400">₹{item.payroll.otPay.toLocaleString()}</span> : <span className="text-slate-700">—</span>}</td>
                         <td className="px-6 py-5 text-right">{item.payroll && <div className="flex items-center justify-end gap-1.5 text-sm font-black text-white"><IndianRupee className="w-3 h-3" />{item.payroll.grossPay.toLocaleString()}</div>}</td>
                         <td className="px-6 py-5 text-right">{item.payroll && <div className="flex flex-col items-end"><span className="text-xs font-black text-rose-400">-{ (item.payroll.epf + item.payroll.esi + item.payroll.pt).toLocaleString()}</span><span className="text-[8px] text-slate-600 font-bold uppercase">Statutory</span></div>}</td>
                         <td className="px-6 py-5 text-right">{item.payroll && <div className="flex items-center justify-end gap-1.5 text-sm font-black text-emerald-400"><IndianRupee className="w-3 h-3" />{item.payroll.netPay.toLocaleString()}</div>}</td>
                         <td className="px-6 py-5 text-center">{item.payroll && <button onClick={() => setShowSlip(item.id)} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-custom-blue transition-all"><FileText className="w-4 h-4" /></button>}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {showSlip && slipUser && slipData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md print:p-0 print:bg-white">
           <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl print:rounded-none">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 print:hidden">
                 <div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /><span className="text-[10px] font-black text-white uppercase tracking-widest">Digital Payroll Proof</span></div>
                 <div className="flex items-center gap-4"><button onClick={() => window.print()} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all"><Printer className="w-4 h-4" /></button><button onClick={() => setShowSlip(null)} className="px-6 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Close</button></div>
              </div>
              <div id="payslip-doc" className="p-12 space-y-10 bg-slate-900 print:bg-white print:text-slate-950">
                 <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3"><div className="w-12 h-12 bg-custom-blue rounded-2xl flex items-center justify-center"><Building2 className="w-6 h-6 text-white" /></div><div><h2 className="text-2xl font-black text-white uppercase tracking-tighter print:text-slate-950">{settings.branding.company_name}</h2><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Official Pay Statement</p></div></div>
                    <div className="text-right"><p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Statement ID</p><p className="text-sm font-black text-white print:text-slate-950">PS-REST-{Date.now().toString(36).toUpperCase()}</p></div>
                 </div>
                 <div className="grid grid-cols-2 gap-12 pt-10 border-t border-slate-800/50 print:border-slate-200">
                    <div><h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Earnings</h4><div className="space-y-3"><div className="flex justify-between text-xs text-slate-500 uppercase font-bold"><span>Base Earnings</span><span className="text-white print:text-slate-950 font-black">₹{(slipData.grossPay - slipData.otPay).toLocaleString()}</span></div><div className="flex justify-between text-xs text-slate-500 uppercase font-bold"><span>Overtime Pay</span><span className="text-indigo-400 font-black">₹{slipData.otPay.toLocaleString()}</span></div></div></div>
                    <div className="border-l border-slate-800/50 pl-12 print:border-slate-200"><h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-4">Deductions</h4><div className="space-y-3"><div className="flex justify-between text-xs text-slate-500 uppercase font-bold"><span>Statutory total</span><span className="text-rose-400 font-black">₹{(slipData.epf + slipData.esi + slipData.pt).toLocaleString()}</span></div></div></div>
                 </div>
                 <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 flex items-center justify-between print:bg-slate-100 print:border-slate-300">
                    <div className="flex items-center gap-4"><div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center"><Receipt className="w-7 h-7 text-emerald-500" /></div><div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Net Credit Amount</p><p className="text-[8px] text-slate-700 font-bold uppercase mt-0.5">Approved for {slipData.billableDays} working days</p></div></div>
                    <div className="text-right"><span className="text-4xl font-black text-emerald-400 tracking-tighter flex items-center gap-2"><span className="text-xl opacity-50">₹</span>{slipData.netPay.toLocaleString()}</span></div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'structures' && (
         <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
            <History className="w-16 h-16 text-slate-800 mx-auto" />
            <h3 className="text-white font-black uppercase tracking-widest">Configuration Vault</h3>
            <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto">Access individual compensation profiles via the Staff Management portal.</p>
         </div>
      )}
    </div>
  );
}
