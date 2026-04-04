import React, { useState } from 'react';
import { CalendarDays, Plane, Printer, ChevronLeft, ChevronRight } from 'lucide-react';

import AttendancePage from './attendance/AttendancePage';
import LeaveManagement from './attendance/LeaveManagement';
import AttendanceGrid from '../components/hr/AttendanceGrid';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

type Tab = 'attendance' | 'leaves' | 'grid';

export default function AttendanceIndex() {
  const [activeTab, setActiveTab] = useState<Tab>('attendance');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const { settings } = useSettings();
  const { attendanceLogs } = useAuth();

  const tabs = [
    { id: 'attendance', label: 'Daily Attendance', icon: CalendarDays },
    { id: 'grid', label: 'Monthly Matrix', icon: CalendarDays },
    { id: 'leaves', label: 'Leave Requests', icon: Plane },
  ] as const;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Time & Attendance</h1>
          <p className="text-slate-400 text-sm mt-1">Track working hours, breaks, and manage time off.</p>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
        >
          <Printer className="w-4 h-4" />
          Print Report
        </button>
      </div>

      {/* Print Header (Visible only when printing) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-6 mb-8">
        <div className="flex justify-between items-end">
            <div>
                <h1 className="text-2xl font-black text-slate-900">{settings.branding.company_name}</h1>
                <p className="text-sm font-bold text-slate-600 uppercase tracking-widest mt-1">Attendance & Workforce Report</p>
            </div>
            <div className="text-right">
                <p className="text-xs font-bold text-slate-500 uppercase">Generated On</p>
                <p className="text-sm font-black text-slate-900">{new Date().toLocaleString()}</p>
            </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-800">
        <nav className="flex space-x-6 overflow-x-auto pb-px">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as Tab)}
                 className={`flex items-center pb-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                   isActive 
                     ? 'border-custom-blue text-custom-blue' 
                     : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                 }`}
               >
                 <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-custom-blue' : 'text-slate-500'}`} />
                 {tab.label}
               </button>
            );
         })}
        </nav>
      </div>

      {/* Tab Content Area */}
      <div className="pt-4">
        {activeTab === 'attendance' && <AttendancePage />}
        {activeTab === 'grid' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                        const d = new Date(selectedMonth + '-01');
                        d.setMonth(d.getMonth() - 1);
                        setSelectedMonth(d.toISOString().slice(0, 7));
                    }}
                    className="p-2 hover:bg-white/5 rounded-lg text-slate-400"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight">{new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                  <button 
                    onClick={() => {
                        const d = new Date(selectedMonth + '-01');
                        d.setMonth(d.getMonth() + 1);
                        setSelectedMonth(d.toISOString().slice(0, 7));
                    }}
                    className="p-2 hover:bg-white/5 rounded-lg text-slate-400"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-4 border-l border-white/5">
                    Monthly Performance View
                </div>
            </div>
            <AttendanceGrid month={selectedMonth} logs={attendanceLogs} />
          </div>
        )}
        {activeTab === 'leaves' && <LeaveManagement />}
      </div>
    </div>
  );
}
