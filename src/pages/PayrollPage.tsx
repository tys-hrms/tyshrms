import React, { useState, useMemo } from 'react';
import { 
  IndianRupee, Calendar, Download, Search, 
  User as UserIcon, Calculator, FileText, 
  CheckCircle2, AlertCircle, TrendingUp, Save,
  Building2, Printer, MapPin, Receipt, History
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useApp } from '../contexts/AppContext';
import { AttendanceLog, User, SalaryRecord } from '../types';
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

  const isAdmin = session.currentUser?.role === 'Admin';

  // --- Logic: Calculation Engine (V9) ---
  const calculateSalary = (user: User) => {
    if (!user.salaryStructure) return null;
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    let presentDays = 0;
    let holidays = 0;
    let paidLeaves = 0;
    let weekends = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(year, month - 1, d);
      
      // 1. Holiday check
      const holiday = settings.payrollSettings?.holidayList.find(h => h.date === dateStr);
      if (holiday) {
        holidays++;
        continue;
      }

      // 2. Weekend check
      if (dayDate.getDay() === 0 || dayDate.getDay() === 6) {
        weekends++;
        continue;
      }

      // 3. Leave check
      const leave = leaves.find(l => 
        l.userId === user.id && 
        l.status === 'approved' && 
        dateStr >= l.date && 
        dateStr <= (l.endDate || l.date)
      );
      if (leave) {
        paidLeaves++;
        continue;
      }

      // 4. Attendance check
      const record = attendanceLogs.find(l => l.userId === user.id && l.date === dateStr);
      if (record?.clockIn) {
        presentDays++;
      }
    }

    const billableDays = presentDays + holidays + paidLeaves + weekends;
    const dayRate = (user.salaryStructure.basic + user.salaryStructure.hra + user.salaryStructure.otherAllowances) / daysInMonth;
    const grossPay = Math.round(dayRate * billableDays);
    
    // Simple Statutory Deductions (V9 Logic)
    let epf = 0;
    let esi = 0;
    let pt = 0;

    if (user.salaryStructure.isEpfMember) epf = Math.round(user.salaryStructure.basic * 0.12);
    if (user.salaryStructure.isEsiMember && grossPay <= 21000) esi = Math.round(grossPay * 0.0075);
    
    // PT Logic (Maharashtra default mockup)
    if (user.salaryStructure.isPtMember && grossPay > 10000) pt = 200;

    const netPay = grossPay - epf - esi - pt;

    return {
      billableDays,
      grossPay,
      epf,
      esi,
      pt,
      netPay
    };
  };

  const processedList = useMemo(() => {
    return users
      .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(u => ({
        ...u,
        payroll: calculateSalary(u)
      }));
  }, [users, selectedMonth, searchTerm, attendanceLogs, leaves]);

  const handlePrintSlip = () => {
    window.print();
  };

  const slipUser = showSlip ? users.find(u => u.id === showSlip) : null;
  const slipData = slipUser ? calculateSalary(slipUser) : null;

  const handleCommitBatch = async () => {
    setIsSaving(true);
    const newRecords: SalaryRecord[] = processedList
      .filter(item => item.payroll !== null)
      .map(item => ({
        id: crypto.randomUUID(),
        tenantId: item.tenantId || 'TYS-DEFAULT',
        userId: item.id,
        month: selectedMonth,
        workingDays: item.payroll!.billableDays,
        grossPay: item.payroll!.grossPay,
        epfDeduction: item.payroll!.epf,
        esiDeduction: item.payroll!.esi,
        ptDeduction: item.payroll!.pt,
        otherDeductions: 0,
        netPay: item.payroll!.netPay,
        status: 'processed',
        createdAt: new Date().toISOString(),
        processedAt: new Date().toISOString()
      }));

    if (newRecords.length > 0) {
      if (settings.mongodb.isEnabled) {
        await db.saveMany('salary_records', newRecords);
        alert(`Successfully committed ${newRecords.length} salary records to cloud`);
      } else {
        alert(`Cloud sync disabled. Processed ${newRecords.length} records locally.`);
      }
    } else {
      alert('No valid payroll structures found to commit.');
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">Payroll Hub</h1>
          <p className="text-slate-500 font-bold text-xs mt-1 tracking-widest uppercase">
            Statutory compliance & localized salary engine
          </p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
              <button 
                onClick={() => setActiveTab('processing')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'processing' ? 'bg-slate-800 text-custom-blue shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Calculator className="w-3.5 h-3.5" /> Computation
              </button>
              <button 
                onClick={() => setActiveTab('structures')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'structures' ? 'bg-slate-800 text-custom-blue shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <TrendingUp className="w-3.5 h-3.5" /> Structures
              </button>
           </div>

           <input 
             type="month"
             value={selectedMonth}
             onChange={(e) => setSelectedMonth(e.target.value)}
             className="bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-xs text-white uppercase font-black outline-none focus:border-custom-blue transition-all [color-scheme:dark]"
           />
        </div>
      </div>

      {activeTab === 'processing' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl print:hidden">
          <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Find employee..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:border-custom-blue outline-none transition-all"
                />
             </div>
             <div className="flex items-center gap-3">
                <button 
                  onClick={handleCommitBatch}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/10"
                >
                   <Save className="w-3.5 h-3.5" /> {isSaving ? 'Processing... ' : 'Commit Batch'}
                </button>
             </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-slate-950/50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <th className="px-6 py-5">Staff Identity</th>
                      <th className="px-6 py-5">Work Days</th>
                      <th className="px-6 py-5 text-right">Gross Salary</th>
                      <th className="px-6 py-5 text-right">Deductions</th>
                      <th className="px-6 py-5 text-right">Net Payable</th>
                      <th className="px-6 py-5 text-center">Action</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                   {processedList.map(item => (
                      <tr key={item.id} className="hover:bg-white/[0.01] transition-colors group">
                         <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-custom-blue font-black shadow-inner">
                                  {item.name[0]}
                               </div>
                               <div>
                                  <span className="text-sm font-bold text-white block uppercase tracking-wide group-hover:text-custom-blue transition-colors">{item.name}</span>
                                  <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{item.role}</span>
                               </div>
                            </div>
                         </td>
                         <td className="px-6 py-5">
                            {item.payroll ? (
                               <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-white">{item.payroll.billableDays}</span>
                                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">/ {new Date(new Date(selectedMonth).getFullYear(), new Date(selectedMonth).getMonth() + 1, 0).getDate()} days</span>
                               </div>
                            ) : (
                               <span className="text-[10px] text-rose-500 font-black uppercase tracking-widest italic opacity-40">No Structure</span>
                            )}
                         </td>
                         <td className="px-6 py-5 text-right">
                            {item.payroll && (
                               <div className="flex items-center justify-end gap-1.5 text-sm font-black text-white">
                                  <IndianRupee className="w-3 h-3 text-slate-600" />
                                  {item.payroll.grossPay.toLocaleString()}
                               </div>
                            )}
                         </td>
                         <td className="px-6 py-5 text-right">
                            {item.payroll && (
                               <div className="flex flex-col items-end">
                                  <span className="text-xs font-black text-rose-400">-{ (item.payroll.epf + item.payroll.esi + item.payroll.pt).toLocaleString()}</span>
                                  <span className="text-[8px] text-slate-600 font-bold uppercase">PF/ESI/PT</span>
                               </div>
                            )}
                         </td>
                         <td className="px-6 py-5 text-right">
                            {item.payroll && (
                               <div className="flex items-center justify-end gap-1.5 text-sm font-black text-emerald-400">
                                  <IndianRupee className="w-3 h-3 text-emerald-400" />
                                  {item.payroll.netPay.toLocaleString()}
                               </div>
                            )}
                         </td>
                         <td className="px-6 py-5 text-center">
                            {item.payroll && (
                               <button 
                                 onClick={() => setShowSlip(item.id)}
                                 className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-custom-blue hover:border-custom-blue transition-all"
                                 title="View Pay Slip"
                               >
                                  <FileText className="w-4 h-4" />
                               </button>
                            )}
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {/* Pay Slip Modal (The "Wow" factor document view) */}
      {showSlip && slipUser && slipData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md print:p-0 print:bg-white">
           <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 print:rounded-none print:border-none print:shadow-none print:max-w-none">
              {/* Slip Toolbar */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 print:hidden">
                 <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Digital Payroll Proof</span>
                 </div>
                 <div className="flex items-center gap-4">
                    <button onClick={handlePrintSlip} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all"><Printer className="w-4 h-4" /></button>
                    <button onClick={() => setShowSlip(null)} className="px-6 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Close</button>
                 </div>
              </div>

              {/* Printable Content */}
              <div id="payslip-doc" className="p-12 space-y-10 bg-slate-900 print:bg-white print:text-slate-950">
                 {/* Branding Header */}
                 <div className="flex justify-between items-start">
                    <div className="space-y-4">
                       <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-custom-blue rounded-2xl flex items-center justify-center shadow-2xl shadow-custom-blue/20">
                             <Building2 className="w-6 h-6 text-white" />
                          </div>
                          <div>
                             <h2 className="text-2xl font-black text-white uppercase tracking-tighter print:text-slate-950 leading-none">{settings.branding.companyName}</h2>
                             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Official Pay Statement</p>
                          </div>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Statement ID</p>
                       <p className="text-sm font-black text-white uppercase print:text-slate-950">PS-{Math.random().toString(36).slice(2, 8).toUpperCase()}</p>
                    </div>
                 </div>

                 <div className="flex items-center justify-between py-6 border-y border-slate-800/50 print:border-slate-200">
                    <div>
                       <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Employee Name</p>
                       <h3 className="text-lg font-black text-white uppercase tracking-wide print:text-slate-950">{slipUser.name}</h3>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Pay Period</p>
                       <h3 className="text-lg font-black text-custom-blue uppercase tracking-wide">{selectedMonth}</h3>
                    </div>
                 </div>

                 {/* Grid for Earnings & Deductions */}
                 <div className="grid grid-cols-2 gap-12">
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4">Earnings Profile</h4>
                       <div className="space-y-3">
                          <div className="flex justify-between text-xs">
                             <span className="text-slate-500 font-bold uppercase">Basic Architecture</span>
                             <span className="text-white font-black print:text-slate-950">₹{slipUser.salaryStructure?.basic?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                             <span className="text-slate-500 font-bold uppercase">House Rent (HRA)</span>
                             <span className="text-white font-black print:text-slate-950">₹{slipUser.salaryStructure?.hra?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                             <span className="text-slate-500 font-bold uppercase">Special Allowances</span>
                             <span className="text-white font-black print:text-slate-950">₹{slipUser.salaryStructure?.otherAllowances?.toLocaleString()}</span>
                          </div>
                          <div className="pt-3 border-t border-slate-800/50 flex justify-between font-black">
                             <span className="text-[10px] text-white uppercase tracking-widest">Gross Total</span>
                             <span className="text-sm text-white print:text-slate-950 underline decoration-indigo-500">₹{slipData.grossPay.toLocaleString()}</span>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-4 border-l border-slate-800/50 pl-12 print:border-slate-200">
                       <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-4">Statutory Leayout</h4>
                       <div className="space-y-3">
                          <div className="flex justify-between text-xs">
                             <span className="text-slate-500 font-bold uppercase">PF Contribution</span>
                             <span className="text-rose-400 font-black">-₹{slipData.epf.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                             <span className="text-slate-500 font-bold uppercase">ESI Statutory</span>
                             <span className="text-rose-400 font-black">-₹{slipData.esi.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                             <span className="text-slate-500 font-bold uppercase">Professional Tax</span>
                             <span className="text-rose-400 font-black">-₹{slipData.pt.toLocaleString()}</span>
                          </div>
                          <div className="pt-3 border-t border-slate-800/50 flex justify-between font-black">
                             <span className="text-[10px] text-white uppercase tracking-widest">Total Deductions</span>
                             <span className="text-sm text-rose-500">₹{(slipData.epf + slipData.esi + slipData.pt).toLocaleString()}</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Net Take Home */}
                 <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 flex items-center justify-between shadow-2xl print:bg-slate-100 print:text-slate-950 print:border-slate-300">
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                          <Receipt className="w-7 h-7 text-emerald-500" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Net Credit Amount</p>
                          <p className="text-[8px] text-slate-700 font-bold uppercase italic mt-0.5">Payable for {slipData.billableDays} working days</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <span className="text-4xl font-black text-emerald-400 tracking-tighter flex items-center gap-2">
                          <span className="text-xl opacity-50">₹</span>
                          {slipData.netPay.toLocaleString()}
                       </span>
                    </div>
                 </div>

                 {/* Footer Context */}
                 <div className="pt-10 flex border-t border-slate-800/30 justify-between items-end print:border-slate-200">
                    <div className="space-y-4">
                       <div className="flex items-center gap-2 opacity-40">
                          <MapPin className="w-3 h-3" />
                          <span className="text-[8px] font-bold uppercase">{settings.branding.companyName} | {settings.state} Registered Office</span>
                       </div>
                       <p className="text-[8px] text-slate-600 font-bold uppercase italic max-w-xs">
                          This is a system-generated document and does not require a physical signature. Calculated based on regional compliance rules for the state of {settings.state}.
                       </p>
                    </div>
                    <div className="w-32 h-32 border-2 border-slate-800 rounded-3xl border-dashed flex items-center justify-center p-2 opacity-60 print:border-slate-300">
                        <div className="text-center opacity-40">
                           <Calculator className="w-8 h-8 mx-auto mb-2" />
                           <p className="text-[8px] font-black uppercase tracking-widest">HR Audit Stamped</p>
                        </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Salary Structure Editor (Placeholder UI for Tab 2) */}
      {activeTab === 'structures' && (
         <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
            <History className="w-16 h-16 text-slate-800 mx-auto" />
            <h3 className="text-white font-black uppercase tracking-widest">Configuration Vault</h3>
            <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto">
               To edit employee salary components, please navigate to the <span className="text-custom-blue">Users Management</span> section and select an individual profile's 'Compensation' tab.
            </p>
         </div>
      )}
    </div>
  );
}
